'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { WebSocketClient } from '../lib/websocket/client'
import { WebSocketConfig, ClientType } from '../lib/websocket/types'
import { ScoringEvent } from '../types/scoring'

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
  onScoringEvent: (handler: (event: ScoringEvent) => void) => () => void
  connectionInfo: any
}

const defaultConfig: WebSocketConfig = {
  url: typeof window !== 'undefined'
    ? (() => {
        // 尝试多个可能的连接方式
        const hostname = window.location.hostname
        console.log('[WebSocket] Attempting connection to hostname:', hostname)

        // 如果是 localhost 或 127.0.0.1，直接使用
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
          return 'ws://localhost:8080'
        }

        // 否则使用当前主机名
        return `ws://${hostname}:8080`
      })()
    : 'ws://localhost:8080',
  heartbeatInterval: 60000,      // 60秒心跳（减少频率）
  reconnectDelay: 3000,          // 3秒重连延迟（增加延迟）
  maxReconnectAttempts: 5,       // 最大重连5次（减少重连次数）
  connectionTimeout: 10000       // 10秒连接超时（增加超时时间）
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

  // 监听所有评分事件的便捷方法
  const onScoringEvent = useCallback((handler: (event: ScoringEvent) => void) => {
    const eventHandler = (event: ScoringEvent) => {
      try {
        handler(event)
      } catch (error) {
        console.error('[WebSocket] Error in onScoringEvent handler:', error)
      }
    }

    // 如果客户端已存在，立即添加监听器
    if (clientRef.current) {
      clientRef.current.on('scoring_event', eventHandler)
    }

    // 返回取消订阅函数
    return () => {
      if (clientRef.current) {
        clientRef.current.off('scoring_event', eventHandler)
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
    onScoringEvent,
    connectionInfo
  }
}