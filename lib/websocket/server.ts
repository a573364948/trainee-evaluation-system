import { WebSocketServer, WebSocket } from 'ws'
import { EventEmitter } from 'events'
import { v4 as uuidv4 } from 'uuid'
import { WebSocketMessage, WebSocketConnection, ClientType } from './types'
import { ScoringEvent } from '../../types/scoring'

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
        // 检查服务器是否已经启动
        if (this.wss) {
          console.log(`[WebSocket] Server already running on port ${this.port}`)
          resolve()
          return
        }

        this.wss = new WebSocketServer({
          port: this.port,
          host: '0.0.0.0',  // 绑定到所有网络接口，允许局域网连接
          // 添加 Origin 验证
          verifyClient: (info) => {
            const origin = info.origin
            console.log(`[WebSocket] Connection attempt from origin: ${origin}`)

            // 允许本地开发环境的所有连接
            if (process.env.NODE_ENV === 'development') {
              return true
            }

            // 生产环境可以添加更严格的验证
            return true
          }
        })
        
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
    const activeConnections = Array.from(this.connections.values()).filter(c => c.isAlive)
    console.log(`[WebSocket] Broadcasting to ${activeConnections.length} active connections`)

    this.connections.forEach((connection, clientId) => {
      if (clientId !== excludeClient && connection.isAlive) {
        console.log(`[WebSocket] Sending to client ${clientId} (${connection.type})`)
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
      const timeout = 90000 // 90秒超时（增加超时时间）

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
    }, 30000) // 每30秒检查一次（减少检查频率）
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

  // 检查服务器是否正在运行
  public isRunning(): boolean {
    return this.wss !== null
  }
}