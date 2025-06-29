'use client'

import { EventEmitter } from 'events'
import { WebSocketMessage, WebSocketConfig, ClientType } from './types'
import { ScoringEvent } from '../../types/scoring'

export class WebSocketClient extends EventEmitter {
  private ws: WebSocket | null = null
  private config: WebSocketConfig
  private clientId: string | null = null
  private clientType: ClientType
  private judgeId?: string
  private reconnectAttempts = 0
  private reconnectTimer: NodeJS.Timeout | null = null
  private heartbeatTimer: NodeJS.Timeout | null = null
  private isConnecting = false
  private shouldReconnect = true

  constructor(config: WebSocketConfig, clientType: ClientType, judgeId?: string) {
    super()
    this.config = config
    this.clientType = clientType
    this.judgeId = judgeId
  }

  // 连接到WebSocket服务器
  public async connect(): Promise<void> {
    if (this.isConnecting || this.isConnected()) {
      return
    }

    this.isConnecting = true
    this.shouldReconnect = true

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.config.url)

        const connectTimeout = setTimeout(() => {
          if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
            this.ws.close()
            this.isConnecting = false
            reject(new Error('Connection timeout'))
          }
        }, this.config.connectionTimeout)

        this.ws.onopen = () => {
          clearTimeout(connectTimeout)
          this.isConnecting = false
          this.reconnectAttempts = 0
          console.log(`[WebSocket] Connected as ${this.clientType}`)
          
          // 发送认证信息
          this.authenticate()
          
          this.emit('connected')
          resolve()
        }

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data)
        }

        this.ws.onclose = (event) => {
          clearTimeout(connectTimeout)
          this.isConnecting = false
          this.cleanup()
          console.log(`[WebSocket] Connection closed: ${event.code} - ${event.reason}`)
          this.emit('disconnected', { code: event.code, reason: event.reason })
          
          if (this.shouldReconnect) {
            this.scheduleReconnect()
          }
        }

        this.ws.onerror = (error) => {
          clearTimeout(connectTimeout)
          this.isConnecting = false
          console.error('[WebSocket] Connection error:', error)
          console.error('[WebSocket] Connection URL:', this.config.url)
          console.error('[WebSocket] WebSocket readyState:', this.ws?.readyState)
          console.error('[WebSocket] Error details:', {
            type: error.type,
            target: error.target,
            currentTarget: error.currentTarget
          })
          this.emit('error', error)

          if (this.ws?.readyState === WebSocket.CONNECTING) {
            reject(error)
          }
        }

      } catch (error) {
        this.isConnecting = false
        reject(error)
      }
    })
  }

  // 认证客户端
  private authenticate() {
    const authMessage: WebSocketMessage = {
      id: this.generateMessageId(),
      type: 'event',
      event: 'client_auth' as any,
      data: {
        type: this.clientType,
        judgeId: this.judgeId
      },
      timestamp: Date.now()
    }

    this.send(authMessage)
  }

  // 处理接收到的消息
  private handleMessage(data: string) {
    try {
      const message: WebSocketMessage = JSON.parse(data)

      // 处理连接确认
      if (message.event === 'connection_established') {
        this.clientId = message.data.clientId
        this.startHeartbeat()
        return
      }

      // 处理认证确认
      if (message.event === 'auth_success') {
        console.log(`[WebSocket] Authentication successful: ${message.data.type}`)
        return
      }

      // 处理心跳响应
      if (message.type === 'heartbeat') {
        return
      }

      // 处理业务事件 (兼容现有ScoringEvent格式)
      if (message.type === 'event' && message.event) {
        const scoringEvent: ScoringEvent = {
          type: message.event,
          data: message.data,
          timestamp: message.timestamp
        }
        this.emit('scoring_event', scoringEvent)
        this.emit(message.event, message.data) // 兼容现有事件监听方式
      }

      // 处理错误消息
      if (message.type === 'error') {
        console.error('[WebSocket] Server error:', message.data)
        this.emit('server_error', message.data)
      }

    } catch (error) {
      console.error('[WebSocket] Failed to parse message:', error)
    }
  }

  // 发送消息
  public send(message: WebSocketMessage) {
    if (!this.isConnected()) {
      console.warn('[WebSocket] Cannot send message: not connected')
      return false
    }

    try {
      this.ws!.send(JSON.stringify(message))
      return true
    } catch (error) {
      console.error('[WebSocket] Failed to send message:', error)
      return false
    }
  }

  // 发送事件 (兼容现有代码调用方式)
  public sendEvent(eventType: ScoringEvent['type'], data: any) {
    const message: WebSocketMessage = {
      id: this.generateMessageId(),
      type: 'event',
      event: eventType,
      data,
      timestamp: Date.now(),
      clientId: this.clientId || undefined
    }

    return this.send(message)
  }

  // 开始心跳
  private startHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
    }

    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected()) {
        const heartbeatMessage: WebSocketMessage = {
          id: this.generateMessageId(),
          type: 'heartbeat',
          timestamp: Date.now(),
          clientId: this.clientId || undefined
        }
        this.send(heartbeatMessage)
      }
    }, this.config.heartbeatInterval)
  }

  // 安排重连
  private scheduleReconnect() {
    if (this.reconnectTimer || !this.shouldReconnect) {
      return
    }

    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.error('[WebSocket] Max reconnection attempts reached')
      this.emit('max_reconnect_attempts')
      return
    }

    const delay = Math.min(
      this.config.reconnectDelay * Math.pow(2, this.reconnectAttempts),
      30000 // 最大30秒
    )

    console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts + 1})`)

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.reconnectAttempts++
      this.connect().catch((error) => {
        console.error('[WebSocket] Reconnection failed:', error)
      })
    }, delay)
  }

  // 清理资源
  private cleanup() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }

  // 断开连接
  public disconnect() {
    this.shouldReconnect = false
    this.cleanup()

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect')
      this.ws = null
    }

    this.clientId = null
    this.emit('disconnected', { code: 1000, reason: 'Client disconnect' })
  }

  // 检查连接状态
  public isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }

  // 生成消息ID
  private generateMessageId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  // 获取连接信息
  public getConnectionInfo() {
    return {
      clientId: this.clientId,
      clientType: this.clientType,
      judgeId: this.judgeId,
      connected: this.isConnected(),
      reconnectAttempts: this.reconnectAttempts
    }
  }
}