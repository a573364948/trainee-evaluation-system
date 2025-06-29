import { ScoringEvent } from '../../types/scoring'

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
  ws: any                       // WebSocket实例
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