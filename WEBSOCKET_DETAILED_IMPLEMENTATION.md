# WebSocket迁移 - 详细实现指南

## 🎯 概述
本文档提供WebSocket迁移的具体代码实现细节，基于现有代码分析，确保100%功能兼容。

---

## 📋 第一步：核心文件创建

### 1.1 WebSocket类型定义 - `lib/websocket/types.ts`

```typescript
import { ScoringEvent } from '@/types/scoring'

// WebSocket消息协议
export interface WebSocketMessage {
  id: string                    // 消息唯一ID
  type: 'event' | 'response' | 'heartbeat' | 'error'
  event?: ScoringEvent['type']  // 复用现有事件类型
  data?: any                    // 事件数据
  timestamp: number             // 时间戳
  clientId?: string             // 客户端ID
  clientType?: ClientType       // 客户端类型
}

// 客户端类型
export type ClientType = 'admin' | 'display' | 'judge'

// 连接信息
export interface WebSocketConnection {
  id: string
  type: ClientType
  ws: WebSocket
  isAlive: boolean
  lastHeartbeat: number
  judgeId?: string              // 评委专用
}

// 连接状态
export interface ConnectionStatus {
  id: string
  type: ClientType
  connected: boolean
  lastHeartbeat: number
  judgeId?: string
}

// WebSocket配置
export interface WebSocketConfig {
  url: string
  heartbeatInterval: number     // 心跳间隔 (毫秒)
  reconnectDelay: number        // 重连延迟 (毫秒)
  maxReconnectAttempts: number  // 最大重连次数
  connectionTimeout: number     // 连接超时 (毫秒)
}
```

### 1.2 WebSocket服务器 - `lib/websocket/server.ts`

```typescript
import { WebSocketServer, WebSocket } from 'ws'
import { EventEmitter } from 'events'
import { v4 as uuidv4 } from 'uuid'
import { WebSocketMessage, WebSocketConnection, ClientType } from './types'
import { ScoringEvent } from '@/types/scoring'

export class WebSocketManager extends EventEmitter {
  private wss: WebSocketServer | null = null
  private connections = new Map<string, WebSocketConnection>()
  private heartbeatInterval: NodeJS.Timeout | null = null
  private port: number

  constructor(port: number = 8080) {
    super()
    this.port = port
    this.setupHeartbeat()
  }

  // 启动WebSocket服务器
  public start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.wss = new WebSocketServer({ port: this.port })
        
        this.wss.on('connection', (ws, req) => {
          this.handleNewConnection(ws, req)
        })

        this.wss.on('error', (error) => {
          console.error('[WebSocket] Server error:', error)
          this.emit('server_error', error)
        })

        console.log(`[WebSocket] Server started on port ${this.port}`)
        resolve()
      } catch (error) {
        console.error('[WebSocket] Failed to start server:', error)
        reject(error)
      }
    })
  }

  // 处理新连接
  private handleNewConnection(ws: WebSocket, req: any) {
    const clientId = uuidv4()
    const connection: WebSocketConnection = {
      id: clientId,
      type: 'admin', // 默认类型，后续通过认证消息更新
      ws,
      isAlive: true,
      lastHeartbeat: Date.now()
    }

    this.connections.set(clientId, connection)
    console.log(`[WebSocket] Client ${clientId} connected`)

    // 设置消息处理
    ws.on('message', (data) => {
      this.handleMessage(clientId, data)
    })

    // 设置连接关闭处理
    ws.on('close', () => {
      this.handleDisconnection(clientId)
    })

    // 设置错误处理
    ws.on('error', (error) => {
      console.error(`[WebSocket] Client ${clientId} error:`, error)
      this.handleDisconnection(clientId)
    })

    // 设置心跳响应
    ws.on('pong', () => {
      const conn = this.connections.get(clientId)
      if (conn) {
        conn.isAlive = true
        conn.lastHeartbeat = Date.now()
      }
    })

    // 发送连接确认
    this.sendToClient(clientId, {
      id: uuidv4(),
      type: 'response',
      event: 'connection_established',
      data: { clientId, timestamp: Date.now() },
      timestamp: Date.now()
    })

    this.emit('client_connected', { clientId, connection })
  }

  // 处理消息
  private handleMessage(clientId: string, data: any) {
    try {
      const message: WebSocketMessage = JSON.parse(data.toString())
      
      // 更新心跳
      const connection = this.connections.get(clientId)
      if (connection) {
        connection.lastHeartbeat = Date.now()
        connection.isAlive = true
      }

      // 处理认证消息
      if (message.event === 'client_auth') {
        this.handleClientAuth(clientId, message.data)
        return
      }

      // 处理心跳
      if (message.type === 'heartbeat') {
        this.sendToClient(clientId, {
          id: uuidv4(),
          type: 'heartbeat',
          timestamp: Date.now()
        })
        return
      }

      // 转发事件到应用层
      this.emit('client_message', { clientId, message })

    } catch (error) {
      console.error(`[WebSocket] Failed to parse message from ${clientId}:`, error)
      this.sendToClient(clientId, {
        id: uuidv4(),
        type: 'error',
        data: { error: 'Invalid message format' },
        timestamp: Date.now()
      })
    }
  }

  // 处理客户端认证
  private handleClientAuth(clientId: string, authData: any) {
    const connection = this.connections.get(clientId)
    if (!connection) return

    const { type, judgeId } = authData
    connection.type = type
    if (judgeId) {
      connection.judgeId = judgeId
    }

    console.log(`[WebSocket] Client ${clientId} authenticated as ${type}${judgeId ? ` (judge: ${judgeId})` : ''}`)
    
    this.sendToClient(clientId, {
      id: uuidv4(),
      type: 'response',
      event: 'auth_success',
      data: { type, judgeId },
      timestamp: Date.now()
    })

    this.emit('client_authenticated', { clientId, type, judgeId })
  }

  // 处理连接断开
  private handleDisconnection(clientId: string) {
    const connection = this.connections.get(clientId)
    if (connection) {
      console.log(`[WebSocket] Client ${clientId} (${connection.type}) disconnected`)
      this.connections.delete(clientId)
      this.emit('client_disconnected', { clientId, connection })
    }
  }

  // 广播事件 (兼容现有ScoringEvent格式)
  public broadcastEvent(event: ScoringEvent, excludeClient?: string) {
    const message: WebSocketMessage = {
      id: uuidv4(),
      type: 'event',
      event: event.type,
      data: event.data,
      timestamp: event.timestamp
    }

    this.broadcast(message, excludeClient)
  }

  // 广播消息
  public broadcast(message: WebSocketMessage, excludeClient?: string) {
    this.connections.forEach((connection, clientId) => {
      if (clientId !== excludeClient && connection.isAlive) {
        this.sendToClient(clientId, message)
      }
    })
  }

  // 发送给特定类型的客户端
  public broadcastToType(message: WebSocketMessage, targetType: ClientType, excludeClient?: string) {
    this.connections.forEach((connection, clientId) => {
      if (clientId !== excludeClient && 
          connection.type === targetType && 
          connection.isAlive) {
        this.sendToClient(clientId, message)
      }
    })
  }

  // 发送给单个客户端
  public sendToClient(clientId: string, message: WebSocketMessage) {
    const connection = this.connections.get(clientId)
    if (connection && connection.isAlive) {
      try {
        connection.ws.send(JSON.stringify(message))
      } catch (error) {
        console.error(`[WebSocket] Failed to send message to ${clientId}:`, error)
        this.handleDisconnection(clientId)
      }
    }
  }

  // 设置心跳检测
  private setupHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now()
      const timeout = 30000 // 30秒超时

      this.connections.forEach((connection, clientId) => {
        if (now - connection.lastHeartbeat > timeout) {
          console.log(`[WebSocket] Client ${clientId} heartbeat timeout`)
          connection.isAlive = false
          connection.ws.terminate()
          this.handleDisconnection(clientId)
        } else {
          // 发送ping
          try {
            connection.ws.ping()
          } catch (error) {
            console.error(`[WebSocket] Failed to ping ${clientId}:`, error)
            this.handleDisconnection(clientId)
          }
        }
      })
    }, 15000) // 每15秒检查一次
  }

  // 获取连接状态
  public getConnectionStatus(): ConnectionStatus[] {
    return Array.from(this.connections.values()).map(conn => ({
      id: conn.id,
      type: conn.type,
      connected: conn.isAlive,
      lastHeartbeat: conn.lastHeartbeat,
      judgeId: conn.judgeId
    }))
  }

  // 关闭服务器
  public close(): Promise<void> {
    return new Promise((resolve) => {
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval)
      }

      if (this.wss) {
        this.wss.close(() => {
          console.log('[WebSocket] Server closed')
          resolve()
        })
      } else {
        resolve()
      }
    })
  }
}
```

### 1.3 WebSocket客户端 - `lib/websocket/client.ts`

```typescript
import { EventEmitter } from 'events'
import { WebSocketMessage, WebSocketConfig, ClientType } from './types'
import { ScoringEvent } from '@/types/scoring'

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
      event: 'client_auth',
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
```

### 1.4 React Hook - `hooks/useWebSocket.ts`

```typescript
'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { WebSocketClient } from '@/lib/websocket/client'
import { WebSocketConfig, ClientType } from '@/lib/websocket/types'
import { ScoringEvent } from '@/types/scoring'

interface UseWebSocketOptions {
  clientType: ClientType
  judgeId?: string
  autoConnect?: boolean
}

interface UseWebSocketReturn {
  isConnected: boolean
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'error'
  client: WebSocketClient | null
  connect: () => Promise<void>
  disconnect: () => void
  sendEvent: (eventType: ScoringEvent['type'], data: any) => boolean
  subscribe: (eventType: ScoringEvent['type'], handler: (data: any) => void) => () => void
  connectionInfo: any
}

const defaultConfig: WebSocketConfig = {
  url: process.env.NODE_ENV === 'development' 
    ? 'ws://localhost:8080' 
    : `ws://${window.location.hostname}:8080`,
  heartbeatInterval: 30000,      // 30秒心跳
  reconnectDelay: 1000,          // 1秒重连延迟
  maxReconnectAttempts: 10,      // 最大重连10次
  connectionTimeout: 5000        // 5秒连接超时
}

export function useWebSocket(options: UseWebSocketOptions): UseWebSocketReturn {
  const [isConnected, setIsConnected] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected' | 'error'>('disconnected')
  const [connectionInfo, setConnectionInfo] = useState<any>(null)
  
  const clientRef = useRef<WebSocketClient | null>(null)
  const eventHandlersRef = useRef<Map<string, Set<(data: any) => void>>>(new Map())

  // 初始化WebSocket客户端
  useEffect(() => {
    const client = new WebSocketClient(defaultConfig, options.clientType, options.judgeId)
    clientRef.current = client

    // 设置事件监听器
    client.on('connected', () => {
      setIsConnected(true)
      setConnectionStatus('connected')
      setConnectionInfo(client.getConnectionInfo())
    })

    client.on('disconnected', () => {
      setIsConnected(false)
      setConnectionStatus('disconnected')
      setConnectionInfo(client.getConnectionInfo())
    })

    client.on('error', () => {
      setConnectionStatus('error')
    })

    client.on('max_reconnect_attempts', () => {
      setConnectionStatus('error')
    })

    // 处理业务事件
    client.on('scoring_event', (event: ScoringEvent) => {
      const handlers = eventHandlersRef.current.get(event.type)
      if (handlers) {
        handlers.forEach(handler => {
          try {
            handler(event.data)
          } catch (error) {
            console.error(`[WebSocket] Error in event handler for ${event.type}:`, error)
          }
        })
      }
    })

    // 自动连接
    if (options.autoConnect !== false) {
      setConnectionStatus('connecting')
      client.connect().catch(error => {
        console.error('[WebSocket] Initial connection failed:', error)
        setConnectionStatus('error')
      })
    }

    return () => {
      client.disconnect()
      clientRef.current = null
    }
  }, [options.clientType, options.judgeId, options.autoConnect])

  // 连接方法
  const connect = useCallback(async () => {
    if (clientRef.current && !clientRef.current.isConnected()) {
      setConnectionStatus('connecting')
      try {
        await clientRef.current.connect()
      } catch (error) {
        setConnectionStatus('error')
        throw error
      }
    }
  }, [])

  // 断开连接方法
  const disconnect = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.disconnect()
    }
  }, [])

  // 发送事件方法
  const sendEvent = useCallback((eventType: ScoringEvent['type'], data: any): boolean => {
    if (clientRef.current) {
      return clientRef.current.sendEvent(eventType, data)
    }
    return false
  }, [])

  // 订阅事件方法
  const subscribe = useCallback((eventType: ScoringEvent['type'], handler: (data: any) => void) => {
    if (!eventHandlersRef.current.has(eventType)) {
      eventHandlersRef.current.set(eventType, new Set())
    }
    
    const handlers = eventHandlersRef.current.get(eventType)!
    handlers.add(handler)

    // 返回取消订阅函数
    return () => {
      handlers.delete(handler)
      if (handlers.size === 0) {
        eventHandlersRef.current.delete(eventType)
      }
    }
  }, [])

  return {
    isConnected,
    connectionStatus,
    client: clientRef.current,
    connect,
    disconnect,
    sendEvent,
    subscribe,
    connectionInfo
  }
}
```

---

## 📋 第二步：现有代码修改

### 2.1 状态管理集成 - `lib/scoring-store-enhanced.ts`

**关键修改点：第497-506行的 `emitEvent` 方法**

```typescript
// 在文件顶部添加导入
import { WebSocketManager } from './websocket/server'

// 在类中添加WebSocket管理器属性
export class EnhancedScoringStore {
  // ... 现有属性 ...
  private webSocketManager: WebSocketManager | null = null

  // 修改构造函数，添加WebSocket初始化
  constructor() {
    // ... 现有构造函数代码 ...
    
    // 初始化WebSocket服务器 (仅在服务端)
    if (typeof window === 'undefined') {
      this.initializeWebSocket()
    }
  }

  // 新增：初始化WebSocket服务器
  private async initializeWebSocket() {
    try {
      this.webSocketManager = new WebSocketManager(8080)
      await this.webSocketManager.start()
      
      // 监听客户端连接事件
      this.webSocketManager.on('client_connected', ({ clientId, connection }) => {
        console.log(`[Store] WebSocket client connected: ${clientId} (${connection.type})`)
        // 向新客户端发送当前状态
        this.sendCurrentStateToClient(clientId)
      })

      // 监听客户端断开事件
      this.webSocketManager.on('client_disconnected', ({ clientId, connection }) => {
        console.log(`[Store] WebSocket client disconnected: ${clientId} (${connection.type})`)
        // 从连接列表中移除
        this.removeConnection(clientId)
      })

      // 监听客户端认证事件
      this.webSocketManager.on('client_authenticated', ({ clientId, type, judgeId }) => {
        // 添加到连接管理中
        this.addConnection(type, judgeId, clientId)
      })

      console.log('[Store] WebSocket server initialized successfully')
    } catch (error) {
      console.error('[Store] Failed to initialize WebSocket server:', error)
    }
  }

  // **关键修改：替换emitEvent方法 (第497-506行)**
  private emitEvent(event: ScoringEvent) {
    console.log(`[EnhancedStore] Emitting event ${event.type} to listeners`)
    
    // 1. 向现有EventEmitter监听器发送 (保持兼容性)
    this.eventListeners.forEach((listener, index) => {
      try {
        listener(event)
      } catch (error) {
        console.error(`[EnhancedStore] Error in listener ${index} for event ${event.type}:`, error)
      }
    })

    // 2. 通过WebSocket广播 (新增功能)
    if (this.webSocketManager) {
      try {
        this.webSocketManager.broadcastEvent(event)
        console.log(`[EnhancedStore] Event ${event.type} broadcasted via WebSocket`)
      } catch (error) {
        console.error(`[EnhancedStore] Failed to broadcast event ${event.type} via WebSocket:`, error)
      }
    }
  }

  // 新增：向特定客户端发送当前状态
  private sendCurrentStateToClient(clientId: string) {
    if (!this.webSocketManager) return

    try {
      // 发送当前状态快照
      const currentState = {
        currentBatch: this.currentBatch,
        currentCandidate: this.currentCandidate,
        currentRound: this.currentRound,
        currentJudge: this.currentJudge,
        currentDimension: this.currentDimension,
        currentScoreItem: this.currentScoreItem,
        displaySession: this.displaySession,
        timerState: this.timerState,
        interviewItems: this.interviewItems
      }

      this.webSocketManager.sendToClient(clientId, {
        id: `state-${Date.now()}`,
        type: 'event',
        event: 'initial_state',
        data: currentState,
        timestamp: Date.now()
      })

      console.log(`[Store] Current state sent to client ${clientId}`)
    } catch (error) {
      console.error(`[Store] Failed to send current state to client ${clientId}:`, error)
    }
  }

  // 修改连接管理方法以支持WebSocket
  addConnection(type: 'judge' | 'admin' | 'display', judgeId?: string, webSocketClientId?: string): string {
    const connectionId = `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    const connection: ConnectionInfo = {
      id: connectionId,
      type,
      judgeId,
      timestamp: Date.now(),
      lastHeartbeat: Date.now(),
      webSocketClientId // 新增：关联WebSocket客户端ID
    }

    this.connections.set(connectionId, connection)
    
    // 发送连接状态变更事件
    this.emitEvent({
      type: 'connection_changed',
      data: { 
        connected: true, 
        connectionId, 
        type,
        webSocketClientId 
      },
      timestamp: Date.now()
    })

    console.log(`[EnhancedStore] Added ${type} connection: ${connectionId}${judgeId ? ` (judge: ${judgeId})` : ''}`)
    return connectionId
  }

  // 获取WebSocket连接状态
  getWebSocketConnections() {
    return this.webSocketManager?.getConnectionStatus() || []
  }

  // 新增：向特定类型客户端发送事件
  emitEventToType(event: ScoringEvent, targetType: 'admin' | 'display' | 'judge') {
    if (this.webSocketManager) {
      this.webSocketManager.broadcastToType({
        id: `${event.type}-${Date.now()}`,
        type: 'event',
        event: event.type,
        data: event.data,
        timestamp: event.timestamp
      }, targetType)
    }
  }

  // 关闭WebSocket服务器
  async closeWebSocket() {
    if (this.webSocketManager) {
      await this.webSocketManager.close()
      this.webSocketManager = null
      console.log('[Store] WebSocket server closed')
    }
  }
}

// 扩展ConnectionInfo接口以支持WebSocket
interface ConnectionInfo {
  id: string
  type: 'judge' | 'admin' | 'display'
  judgeId?: string
  timestamp: number
  lastHeartbeat: number
  webSocketClientId?: string  // 新增：关联的WebSocket客户端ID
}
```

### 2.2 类型定义扩展 - `types/scoring.ts`

```typescript
// 在现有文件末尾添加以下内容

// WebSocket扩展事件类型
export interface WebSocketScoringEvent extends ScoringEvent {
  clientId?: string
  targetType?: 'admin' | 'display' | 'judge'
}

// 新增事件类型
export type ExtendedScoringEventType = ScoringEvent['type'] | 
  'initial_state' |           // 初始状态同步
  'connection_status' |       // 连接状态更新
  'client_auth' |            // 客户端认证
  'heartbeat_response'       // 心跳响应

// 扩展ScoringEvent接口
export interface ExtendedScoringEvent {
  type: ExtendedScoringEventType
  data: any
  timestamp: number
  clientId?: string
  targetType?: 'admin' | 'display' | 'judge'
}

// WebSocket连接统计
export interface ConnectionStats {
  total: number
  admins: number
  displays: number
  judges: number
  lastUpdate: number
}
```

### 2.3 前端页面修改

#### A. 管理页面 - `app/admin/page.tsx` (第87-172行修改)

```typescript
// 替换原有的SSE代码块 (第87-172行)

'use client'

import { useWebSocket } from '@/hooks/useWebSocket'
import { ConnectionStatus } from '@/components/connection-status'

export default function AdminPage() {
  // ... 现有状态定义 ...

  // **替换SSE连接为WebSocket**
  const { 
    isConnected, 
    connectionStatus, 
    subscribe, 
    sendEvent,
    connectionInfo 
  } = useWebSocket({ 
    clientType: 'admin',
    autoConnect: true 
  })

  // **替换原有的SSE事件监听设置**
  useEffect(() => {
    if (!isConnected) return

    console.log("[Admin] WebSocket connected, setting up event listeners")

    // 设置事件监听器 (保持原有逻辑)
    const unsubscribers = [
      // 候选人变更事件
      subscribe('candidate_changed', (data) => {
        console.log("[Admin] Candidate changed:", data)
        setCurrentCandidate(data)
        setSelectedScore(null)
      }),

      // 阶段变更事件
      subscribe('stage_changed', (data) => {
        console.log("[Admin] Stage changed:", data)
        setDisplaySession(data.displaySession)
      }),

      // 题目变更事件
      subscribe('question_changed', (data) => {
        console.log("[Admin] Question changed:", data)
        setDisplaySession(data.displaySession)
      }),

      // 面试项目变更事件
      subscribe('interview_item_changed', (data) => {
        console.log("[Admin] Interview item changed:", data)
        // 重新加载面试项目列表
        loadInterviewItems()
      }),

      // 倒计时状态变更事件
      subscribe('timer_changed', (data) => {
        console.log("[Admin] Timer changed:", data.timerState)
        setTimerState(data.timerState)
      }),

      // 评分更新事件
      subscribe('score_updated', (data) => {
        console.log("[Admin] Score updated:", data)
        // 更新评分显示
        loadScores()
      }),

      // 连接状态变更事件
      subscribe('connection_changed', (data) => {
        console.log("[Admin] Connection changed:", data)
        // 重新加载连接信息
        loadConnections()
      }),

      // 初始状态同步事件
      subscribe('initial_state', (data) => {
        console.log("[Admin] Received initial state:", data)
        // 同步所有状态
        if (data.currentCandidate) setCurrentCandidate(data.currentCandidate)
        if (data.displaySession) setDisplaySession(data.displaySession)
        if (data.timerState) setTimerState(data.timerState)
        // ... 其他状态同步
      })
    ]

    return () => {
      // 清理事件监听器
      unsubscribers.forEach(unsubscribe => unsubscribe())
    }
  }, [isConnected, subscribe])

  // **连接状态监控**
  useEffect(() => {
    console.log(`[Admin] Connection status: ${connectionStatus}`)
    if (connectionStatus === 'error') {
      // 显示错误提示
      console.error("[Admin] WebSocket connection failed")
    }
  }, [connectionStatus])

  // ... 现有的其他代码保持不变 ...

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* 添加连接状态显示 */}
      <ConnectionStatus 
        isConnected={isConnected}
        status={connectionStatus}
        connectionInfo={connectionInfo}
      />
      
      {/* ... 现有的UI组件保持不变 ... */}
    </div>
  )
}
```

#### B. 大屏显示页面 - `app/display/page.tsx` (第57-291行修改)

```typescript
// 替换原有的SSE代码块 (第57-291行)

'use client'

import { useWebSocket } from '@/hooks/useWebSocket'

export default function DisplayPage() {
  // ... 现有状态定义 ...

  // **替换SSE连接为WebSocket**
  const { 
    isConnected, 
    connectionStatus, 
    subscribe 
  } = useWebSocket({ 
    clientType: 'display',
    autoConnect: true 
  })

  // **替换原有的SSE事件监听和心跳逻辑**
  useEffect(() => {
    if (!isConnected) return

    console.log("[Display] WebSocket connected, setting up event listeners")

    const unsubscribers = [
      // 阶段变更事件
      subscribe('stage_changed', (data) => {
        console.log("[Display] Stage changed:", data)
        setDisplaySession(data.displaySession)
        
        // 触发布局过渡动画 (保持原有逻辑)
        setLayoutTransition(true)
        setTimeout(() => setLayoutTransition(false), 300)
      }),

      // 题目变更事件
      subscribe('question_changed', (data) => {
        console.log("[Display] Question changed:", data)
        setDisplaySession(data.displaySession)
        
        // 触发布局过渡动画
        setLayoutTransition(true)
        setTimeout(() => setLayoutTransition(false), 300)
      }),

      // 倒计时状态变更事件
      subscribe('timer_changed', (data) => {
        console.log("[Display] Timer state changed:", data.timerState)
        setTimerState(data.timerState)
      }),

      // 候选人变更事件
      subscribe('candidate_changed', (data) => {
        console.log("[Display] Candidate changed:", data)
        setCurrentCandidate(data)
      }),

      // 初始状态同步事件
      subscribe('initial_state', (data) => {
        console.log("[Display] Received initial state:", data)
        if (data.displaySession) setDisplaySession(data.displaySession)
        if (data.timerState) setTimerState(data.timerState)
        if (data.currentCandidate) setCurrentCandidate(data.currentCandidate)
      })
    ]

    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe())
    }
  }, [isConnected, subscribe])

  // **连接状态显示** (替换原有心跳显示逻辑)
  const getConnectionStatusDisplay = () => {
    switch (connectionStatus) {
      case 'connected':
        return '🟢 已连接'
      case 'connecting':
        return '🟡 连接中...'
      case 'disconnected':
        return '🔴 已断开'
      case 'error':
        return '🔴 连接错误'
      default:
        return '⚪ 未知状态'
    }
  }

  // ... 现有的其他代码保持不变 ...

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* 连接状态指示器 (替换原有心跳显示) */}
      <div className="fixed top-4 right-4 z-50">
        <div className="bg-white/80 backdrop-blur-sm rounded-lg px-3 py-2 shadow-sm">
          <span className="text-sm font-medium">
            {getConnectionStatusDisplay()}
          </span>
        </div>
      </div>

      {/* ... 现有的UI组件保持不变 ... */}
    </div>
  )
}
```

#### C. 评委页面 - `app/judge/page.tsx` (第98-172行修改)

```typescript
// 替换原有的SSE代码块 (第98-172行)

'use client'

import { useWebSocket } from '@/hooks/useWebSocket'

export default function JudgePage({ params }: { params: { judgeId: string } }) {
  // ... 现有状态定义 ...
  
  const judgeId = params.judgeId

  // **替换SSE连接为WebSocket (带评委ID)**
  const { 
    isConnected, 
    connectionStatus, 
    subscribe,
    sendEvent 
  } = useWebSocket({ 
    clientType: 'judge',
    judgeId: judgeId,
    autoConnect: true 
  })

  // **替换原有的SSE事件监听**
  useEffect(() => {
    if (!isConnected) return

    console.log(`[Judge ${judgeId}] WebSocket connected, setting up event listeners`)

    const unsubscribers = [
      // 候选人变更事件
      subscribe('candidate_changed', (data) => {
        console.log(`[Judge ${judgeId}] Candidate changed:`, data)
        setCurrentCandidate(data)
        setHasSubmitted(false)
        setCurrentStep(0)
        
        // 重置评分 (保持原有逻辑)
        const resetScores: Record<string, number> = {}
        dimensions.forEach((dim) => {
          resetScores[dim.id] = 0
        })
        setScores(resetScores)
      }),

      // 维度变更事件
      subscribe('dimension_changed', (data) => {
        console.log(`[Judge ${judgeId}] Dimension changed:`, data)
        setCurrentDimension(data)
      }),

      // 轮次变更事件
      subscribe('round_changed', (data) => {
        console.log(`[Judge ${judgeId}] Round changed:`, data)
        setCurrentRound(data)
        setHasSubmitted(false)
      }),

      // 评分项目变更事件
      subscribe('score_item_changed', (data) => {
        console.log(`[Judge ${judgeId}] Score item changed:`, data)
        setCurrentScoreItem(data)
      }),

      // 初始状态同步事件
      subscribe('initial_state', (data) => {
        console.log(`[Judge ${judgeId}] Received initial state:`, data)
        if (data.currentCandidate) setCurrentCandidate(data.currentCandidate)
        if (data.currentDimension) setCurrentDimension(data.currentDimension)
        if (data.currentRound) setCurrentRound(data.currentRound)
        if (data.currentScoreItem) setCurrentScoreItem(data.currentScoreItem)
      })
    ]

    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe())
    }
  }, [isConnected, subscribe, judgeId, dimensions])

  // **连接状态监控**
  useEffect(() => {
    console.log(`[Judge ${judgeId}] Connection status: ${connectionStatus}`)
  }, [connectionStatus, judgeId])

  // ... 现有的其他代码保持不变 ...

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 连接状态显示 */}
      {connectionStatus !== 'connected' && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                连接状态: {connectionStatus === 'connecting' ? '连接中...' : 
                         connectionStatus === 'error' ? '连接错误，请刷新页面' : '已断开连接'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ... 现有的UI组件保持不变 ... */}
    </div>
  )
}
```

### 2.4 连接状态组件 - `components/connection-status.tsx`

```typescript
'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

interface ConnectionStatusProps {
  isConnected: boolean
  status: 'connected' | 'connecting' | 'disconnected' | 'error'
  connectionInfo?: any
}

export function ConnectionStatus({ isConnected, status, connectionInfo }: ConnectionStatusProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'connected': return 'bg-green-500'
      case 'connecting': return 'bg-yellow-500'
      case 'disconnected': return 'bg-gray-500'
      case 'error': return 'bg-red-500'
    }
  }

  const getStatusText = () => {
    switch (status) {
      case 'connected': return '已连接'
      case 'connecting': return '连接中...'
      case 'disconnected': return '已断开'
      case 'error': return '连接错误'
    }
  }

  return (
    <Card className="w-full">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${getStatusColor()}`} />
            <span className="font-medium">WebSocket状态: {getStatusText()}</span>
          </div>
          
          {connectionInfo && (
            <div className="flex space-x-2">
              <Badge variant="secondary">
                {connectionInfo.clientType}
              </Badge>
              {connectionInfo.judgeId && (
                <Badge variant="outline">
                  评委: {connectionInfo.judgeId}
                </Badge>
              )}
            </div>
          )}
        </div>
        
        {status === 'error' && (
          <p className="text-sm text-red-600 mt-2">
            连接失败，系统正在自动重连...
          </p>
        )}
      </CardContent>
    </Card>
  )
}
```

### 2.5 API路由 - `app/api/websocket/route.ts`

```typescript
import { NextRequest } from 'next/server'

// 由于Next.js API路由不支持WebSocket升级，
// 实际的WebSocket服务器将在应用启动时独立启动
// 这个路由用于提供WebSocket连接信息

export async function GET(request: NextRequest) {
  const protocol = request.headers.get('x-forwarded-proto') || 'http'
  const host = request.headers.get('host') || 'localhost:3000'
  
  const wsProtocol = protocol === 'https' ? 'wss' : 'ws'
  const wsPort = process.env.WEBSOCKET_PORT || '8080'
  const wsHost = host.split(':')[0]
  
  const wsUrl = `${wsProtocol}://${wsHost}:${wsPort}`

  return Response.json({
    websocketUrl: wsUrl,
    status: 'available',
    protocol: wsProtocol,
    host: wsHost,
    port: wsPort
  })
}
```

---

## 📋 第三步：部署和启动配置

### 3.1 应用启动脚本 - `scripts/start-websocket-server.js`

```javascript
const { WebSocketManager } = require('../lib/websocket/server')

async function startWebSocketServer() {
  const port = process.env.WEBSOCKET_PORT || 8080
  const wsManager = new WebSocketManager(port)
  
  try {
    await wsManager.start()
    console.log(`WebSocket server started on port ${port}`)
    
    // 优雅关闭处理
    process.on('SIGTERM', async () => {
      console.log('Shutting down WebSocket server...')
      await wsManager.close()
      process.exit(0)
    })
    
    process.on('SIGINT', async () => {
      console.log('Shutting down WebSocket server...')
      await wsManager.close()
      process.exit(0)
    })
    
  } catch (error) {
    console.error('Failed to start WebSocket server:', error)
    process.exit(1)
  }
}

startWebSocketServer()
```

### 3.2 Package.json 脚本更新

```json
{
  "scripts": {
    "dev": "concurrently \"next dev\" \"node scripts/start-websocket-server.js\"",
    "build": "next build",
    "start": "concurrently \"next start\" \"node scripts/start-websocket-server.js\"",
    "websocket": "node scripts/start-websocket-server.js"
  },
  "dependencies": {
    "ws": "^8.14.2",
    "uuid": "^9.0.1",
    "concurrently": "^8.2.2"
  },
  "devDependencies": {
    "@types/ws": "^8.5.8",
    "@types/uuid": "^9.0.7"
  }
}
```

### 3.3 环境变量配置 - `.env.local`

```env
# WebSocket配置
WEBSOCKET_PORT=8080
WEBSOCKET_HOST=localhost

# 开发环境配置
NODE_ENV=development
```

---

## 🧪 验证和测试

### 测试脚本 - `scripts/test-websocket.js`

```javascript
const WebSocket = require('ws')

function testWebSocketConnection() {
  const ws = new WebSocket('ws://localhost:8080')
  
  ws.on('open', () => {
    console.log('✅ WebSocket connection established')
    
    // 发送认证消息
    ws.send(JSON.stringify({
      id: 'test-auth',
      type: 'event',
      event: 'client_auth',
      data: { type: 'admin' },
      timestamp: Date.now()
    }))
  })
  
  ws.on('message', (data) => {
    const message = JSON.parse(data.toString())
    console.log('📨 Received message:', message)
    
    if (message.event === 'auth_success') {
      console.log('✅ Authentication successful')
      
      // 发送测试事件
      ws.send(JSON.stringify({
        id: 'test-event',
        type: 'event',
        event: 'candidate_changed',
        data: { name: 'Test Candidate' },
        timestamp: Date.now()
      }))
    }
  })
  
  ws.on('close', () => {
    console.log('🔌 Connection closed')
  })
  
  ws.on('error', (error) => {
    console.error('❌ Connection error:', error)
  })
}

testWebSocketConnection()
```

---

## 📝 总结

这份详细实现指南提供了：

1. **完整的代码实现** - 每个文件的具体代码内容
2. **精确的修改位置** - 具体到行号的修改说明
3. **兼容性保证** - 保持现有事件格式和处理逻辑
4. **渐进式迁移** - 支持与SSE并行运行
5. **错误处理** - 完善的重连和错误恢复机制
6. **测试验证** - 提供测试脚本验证功能

现在你有了完整的实现方案，可以按步骤进行WebSocket迁移了。