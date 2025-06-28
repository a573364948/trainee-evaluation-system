// 增强的SSE客户端 - 支持自动重连和心跳机制
"use client"

export interface SSEClientOptions {
  url: string
  maxRetries?: number
  retryDelay?: number
  heartbeatInterval?: number
  connectionTimeout?: number
  onMessage?: (event: MessageEvent) => void
  onError?: (error: Event) => void
  onOpen?: (event: Event) => void
  onClose?: (event: Event) => void
  onReconnecting?: (attempt: number) => void
  onReconnected?: () => void
  onMaxRetriesReached?: () => void
}

export class EnhancedSSEClient {
  private eventSource: EventSource | null = null
  private options: Required<SSEClientOptions>
  private retryCount = 0
  private reconnectTimer: NodeJS.Timeout | null = null
  private heartbeatTimer: NodeJS.Timeout | null = null
  private connectionTimer: NodeJS.Timeout | null = null
  private isManualClose = false
  private connectionId: string | null = null
  private lastMessageTime = 0

  constructor(options: SSEClientOptions) {
    this.options = {
      maxRetries: 10,
      retryDelay: 3000,
      heartbeatInterval: 25000, // 25秒发送心跳
      connectionTimeout: 30000, // 30秒连接超时
      onMessage: () => {},
      onError: () => {},
      onOpen: () => {},
      onClose: () => {},
      onReconnecting: () => {},
      onReconnected: () => {},
      onMaxRetriesReached: () => {},
      ...options
    }
  }

  connect(): void {
    if (this.eventSource && this.eventSource.readyState === EventSource.OPEN) {
      console.log('[SSE] Already connected')
      return
    }

    this.isManualClose = false
    this.createConnection()
  }

  private createConnection(): void {
    try {
      console.log(`[SSE] Connecting to ${this.options.url} (attempt ${this.retryCount + 1})`)
      
      // 清理现有连接
      this.cleanup()

      // 创建新连接
      this.eventSource = new EventSource(this.options.url)
      
      // 设置连接超时
      this.connectionTimer = setTimeout(() => {
        if (this.eventSource && this.eventSource.readyState === EventSource.CONNECTING) {
          console.log('[SSE] Connection timeout')
          this.eventSource.close()
          this.handleReconnect()
        }
      }, this.options.connectionTimeout)

      // 监听事件
      this.eventSource.onopen = (event) => {
        console.log('[SSE] Connection opened')
        this.retryCount = 0
        this.lastMessageTime = Date.now()
        
        if (this.connectionTimer) {
          clearTimeout(this.connectionTimer)
          this.connectionTimer = null
        }
        
        // 如果是重连成功
        if (this.retryCount > 0) {
          this.options.onReconnected()
        }
        
        this.options.onOpen(event)
        this.startHeartbeat()
      }

      this.eventSource.onmessage = (event) => {
        this.lastMessageTime = Date.now()
        
        try {
          const data = JSON.parse(event.data)
          
          // 处理连接ID
          if (data.type === 'connection_established' && data.connectionId) {
            this.connectionId = data.connectionId
            console.log(`[SSE] Connection established with ID: ${this.connectionId}`)
          }
          
          // 处理心跳响应
          if (data.type === 'heartbeat_response') {
            console.log('[SSE] Heartbeat acknowledged')
            return
          }
          
          this.options.onMessage(event)
        } catch (error) {
          console.error('[SSE] Error parsing message:', error)
          this.options.onMessage(event) // 仍然传递原始事件
        }
      }

      this.eventSource.onerror = (event) => {
        console.error('[SSE] Connection error:', event)
        
        if (this.connectionTimer) {
          clearTimeout(this.connectionTimer)
          this.connectionTimer = null
        }
        
        this.options.onError(event)
        
        // 只有在非手动关闭时才重连
        if (!this.isManualClose) {
          this.handleReconnect()
        }
      }

      this.eventSource.onclose = (event) => {
        console.log('[SSE] Connection closed')
        this.stopHeartbeat()
        
        if (this.connectionTimer) {
          clearTimeout(this.connectionTimer)
          this.connectionTimer = null
        }
        
        this.options.onClose(event)
        
        // 非手动关闭且未达到最大重试次数时重连
        if (!this.isManualClose && this.retryCount < this.options.maxRetries) {
          this.handleReconnect()
        }
      }

    } catch (error) {
      console.error('[SSE] Failed to create connection:', error)
      if (!this.isManualClose) {
        this.handleReconnect()
      }
    }
  }

  private handleReconnect(): void {
    if (this.isManualClose) return
    
    if (this.retryCount >= this.options.maxRetries) {
      console.error('[SSE] Max retries reached')
      this.options.onMaxRetriesReached()
      return
    }

    this.retryCount++
    this.options.onReconnecting(this.retryCount)
    
    const delay = Math.min(this.options.retryDelay * Math.pow(1.5, this.retryCount - 1), 30000)
    console.log(`[SSE] Reconnecting in ${delay}ms...`)
    
    this.reconnectTimer = setTimeout(() => {
      this.createConnection()
    }, delay)
  }

  private startHeartbeat(): void {
    this.stopHeartbeat()
    
    this.heartbeatTimer = setInterval(() => {
      // 检查是否长时间没有收到消息
      const timeSinceLastMessage = Date.now() - this.lastMessageTime
      if (timeSinceLastMessage > this.options.heartbeatInterval + 10000) {
        console.log('[SSE] No message received for too long, reconnecting...')
        this.handleReconnect()
        return
      }
      
      // 发送心跳请求
      this.sendHeartbeat()
    }, this.options.heartbeatInterval)
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  private async sendHeartbeat(): Promise<void> {
    if (!this.connectionId) return

    try {
      const response = await fetch('/api/sse/heartbeat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          connectionId: this.connectionId,
          timestamp: Date.now()
        })
      })

      if (!response.ok) {
        console.warn('[SSE] Heartbeat failed:', response.status)
      }
    } catch (error) {
      console.error('[SSE] Heartbeat error:', error)
    }
  }

  close(): void {
    console.log('[SSE] Manually closing connection')
    this.isManualClose = true
    this.cleanup()
  }

  private cleanup(): void {
    if (this.eventSource) {
      this.eventSource.close()
      this.eventSource = null
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    if (this.connectionTimer) {
      clearTimeout(this.connectionTimer)
      this.connectionTimer = null
    }

    this.stopHeartbeat()
  }

  // 获取连接状态
  getConnectionState(): {
    readyState: number | null
    connectionId: string | null
    retryCount: number
    lastMessageTime: number
    isConnected: boolean
  } {
    return {
      readyState: this.eventSource?.readyState || null,
      connectionId: this.connectionId,
      retryCount: this.retryCount,
      lastMessageTime: this.lastMessageTime,
      isConnected: this.eventSource?.readyState === EventSource.OPEN
    }
  }

  // 重置连接（手动触发重连）
  reconnect(): void {
    console.log('[SSE] Manual reconnect requested')
    this.retryCount = 0
    this.isManualClose = false
    this.createConnection()
  }
}

// React Hook for SSE
import { useEffect, useRef, useState } from 'react'

export interface UseSSEOptions extends SSEClientOptions {
  enabled?: boolean
}

export function useSSE(options: UseSSEOptions) {
  const clientRef = useRef<EnhancedSSEClient | null>(null)
  const [connectionState, setConnectionState] = useState({
    isConnected: false,
    retryCount: 0,
    lastMessageTime: 0,
    connectionId: null as string | null
  })
  const [error, setError] = useState<Event | null>(null)

  useEffect(() => {
    if (!options.enabled) return

    const client = new EnhancedSSEClient({
      ...options,
      onOpen: (event) => {
        setConnectionState(prev => ({ ...prev, isConnected: true }))
        setError(null)
        options.onOpen?.(event)
      },
      onClose: (event) => {
        setConnectionState(prev => ({ ...prev, isConnected: false }))
        options.onClose?.(event)
      },
      onError: (event) => {
        setError(event)
        options.onError?.(event)
      },
      onReconnecting: (attempt) => {
        setConnectionState(prev => ({ ...prev, retryCount: attempt }))
        options.onReconnecting?.(attempt)
      },
      onReconnected: () => {
        setConnectionState(prev => ({ ...prev, isConnected: true, retryCount: 0 }))
        setError(null)
        options.onReconnected?.()
      },
      onMessage: (event) => {
        setConnectionState(prev => ({ ...prev, lastMessageTime: Date.now() }))
        options.onMessage?.(event)
      }
    })

    clientRef.current = client
    client.connect()

    // 定期更新连接状态
    const statusInterval = setInterval(() => {
      if (clientRef.current) {
        const state = clientRef.current.getConnectionState()
        setConnectionState({
          isConnected: state.isConnected,
          retryCount: state.retryCount,
          lastMessageTime: state.lastMessageTime,
          connectionId: state.connectionId
        })
      }
    }, 1000)

    return () => {
      clearInterval(statusInterval)
      client.close()
      clientRef.current = null
    }
  }, [options.enabled, options.url])

  const reconnect = () => {
    clientRef.current?.reconnect()
  }

  const disconnect = () => {
    clientRef.current?.close()
  }

  return {
    connectionState,
    error,
    reconnect,
    disconnect
  }
}