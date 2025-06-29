import { NextRequest } from 'next/server'
import { getWebSocketManager, getConnectionStatus } from '@/lib/websocket/manager'

export async function GET(request: NextRequest) {
  try {
    // 构建WebSocket URL信息
    const protocol = request.headers.get('x-forwarded-proto') || 'http'
    const host = request.headers.get('host') || 'localhost:3000'
    const wsProtocol = protocol === 'https' ? 'wss' : 'ws'
    const wsPort = process.env.WEBSOCKET_PORT || '8080'
    const wsHost = host.split(':')[0]
    const wsUrl = `${wsProtocol}://${wsHost}:${wsPort}`

    // 只通过管理器检测，不创建新连接
    const manager = getWebSocketManager()
    let connections: any[] = []

    if (manager) {
      // 如果管理器存在，获取连接状态
      connections = getConnectionStatus()
      const activeConnections = connections.filter(conn => conn.connected)

      return Response.json({
        success: true,
        data: {
          serverRunning: true,
          connectionCount: activeConnections.length,
          websocketUrl: wsUrl,
          status: 'online',
          managerAvailable: true,
          connections: activeConnections.map(conn => ({
            id: conn.id,
            type: conn.type,
            judgeId: conn.judgeId,
            connected: conn.connected,
            lastHeartbeat: conn.lastHeartbeat
          }))
        }
      })
    } else {
      // 如果管理器不存在，假设服务器运行但无管理器
      return Response.json({
        success: true,
        data: {
          serverRunning: true,
          connectionCount: 0,
          websocketUrl: wsUrl,
          status: 'online',
          managerAvailable: false,
          connections: []
        }
      })
    }
  } catch (error) {
    console.error('[API] WebSocket status error:', error)
    return Response.json({
      success: false,
      error: 'Failed to get WebSocket status'
    }, { status: 500 })
  }
}

// 检测WebSocket服务器是否运行
async function checkWebSocketServer(host: string, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const ws = new WebSocket(`ws://${host}:${port}`)

      const timeout = setTimeout(() => {
        ws.close()
        resolve(false)
      }, 3000) // 3秒超时

      ws.on('open', () => {
        clearTimeout(timeout)
        ws.close()
        resolve(true)
      })

      ws.on('error', () => {
        clearTimeout(timeout)
        resolve(false)
      })

    } catch (error) {
      resolve(false)
    }
  })
}