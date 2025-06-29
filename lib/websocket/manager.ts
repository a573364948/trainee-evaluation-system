// WebSocket管理器 - 集成到现有状态管理系统
import { WebSocketManager } from './server'
import { ScoringEvent } from '@/types/scoring'

// 使用全局对象来保持状态，避免热重载时丢失
declare global {
  var __websocket_manager: WebSocketManager | undefined
  var __websocket_connection_timeout: NodeJS.Timeout | undefined
  var __websocket_connection_queue: Set<string> | undefined
}

// 全局WebSocket管理器实例
let globalWebSocketManager: WebSocketManager | null = global.__websocket_manager || null
// 连接事件防抖
let connectionEventTimeout: NodeJS.Timeout | null = global.__websocket_connection_timeout || null
const connectionEventQueue = global.__websocket_connection_queue || new Set<string>()

// 初始化WebSocket管理器
export function initializeWebSocketManager(): WebSocketManager {
  if (!globalWebSocketManager || !globalWebSocketManager.isRunning()) {
    if (globalWebSocketManager) {
      console.log('[WebSocketManager] Existing manager found but not running, recreating...')
    } else {
      console.log('[WebSocketManager] Creating new WebSocket manager instance')
    }

    globalWebSocketManager = new WebSocketManager(8080)

    // 保存到全局状态
    global.__websocket_manager = globalWebSocketManager

    // 设置事件监听
    setupEventListeners(globalWebSocketManager)

    // 启动服务器
    globalWebSocketManager.start().catch((error) => {
      console.error('[WebSocketManager] Failed to start server:', error)
    })

    console.log('[WebSocketManager] WebSocket server initialized')
  } else {
    console.log('[WebSocketManager] Using existing WebSocket manager instance')
  }

  return globalWebSocketManager
}

// 防抖广播连接变更事件
function debouncedBroadcastConnectionChange(manager: WebSocketManager) {
  if (connectionEventTimeout) {
    clearTimeout(connectionEventTimeout)
  }

  connectionEventTimeout = setTimeout(() => {
    // 保存到全局状态
    global.__websocket_connection_timeout = connectionEventTimeout
    if (connectionEventQueue.size > 0) {
      // 广播连接状态摘要，减少事件频率
      const connections = manager.getConnectionStatus()
      manager.broadcastEvent({
        type: 'connection_status_update' as any,
        data: {
          totalConnections: connections.length,
          activeConnections: connections.filter(c => c.connected).length,
          connectionTypes: connections.reduce((acc, conn) => {
            acc[conn.type] = (acc[conn.type] || 0) + 1
            return acc
          }, {} as Record<string, number>),
          timestamp: Date.now()
        },
        timestamp: Date.now()
      })
      connectionEventQueue.clear()
    }
  }, 2000) // 2秒防抖，进一步减少频率
}

// 设置事件监听器
function setupEventListeners(manager: WebSocketManager) {
  manager.on('client_connected', ({ clientId, connection }) => {
    console.log(`[WebSocketManager] Client connected: ${clientId} (${connection.type})`)

    // 添加到队列并防抖广播摘要事件
    connectionEventQueue.add(clientId)
    debouncedBroadcastConnectionChange(manager)
  })

  manager.on('client_disconnected', async ({ clientId, connection }) => {
    console.log(`[WebSocketManager] Client disconnected: ${clientId} (${connection.type})`)

    // 如果是评委断开连接，更新离线状态
    if (connection.type === 'judge' && connection.judgeId) {
      try {
        const { enhancedScoringStore } = await import('@/lib/scoring-store-enhanced')
        await enhancedScoringStore.initialize()
        enhancedScoringStore.updateJudgeOnlineStatus(connection.judgeId, false)
        console.log(`[WebSocketManager] Judge ${connection.judgeId} marked as offline`)
      } catch (error) {
        console.error(`[WebSocketManager] Failed to update judge offline status:`, error)
      }
    }

    // 添加到队列并防抖广播摘要事件
    connectionEventQueue.add(clientId)
    debouncedBroadcastConnectionChange(manager)
  })

  manager.on('client_authenticated', async ({ clientId, type, judgeId }) => {
    console.log(`[WebSocketManager] Client authenticated: ${clientId} as ${type}${judgeId ? ` (judge: ${judgeId})` : ''}`)

    // 如果是评委连接，更新在线状态
    if (type === 'judge' && judgeId) {
      console.log(`[WebSocketManager] Attempting to update judge ${judgeId} online status...`)
      try {
        const { enhancedScoringStore } = await import('@/lib/scoring-store-enhanced')
        console.log(`[WebSocketManager] Store imported successfully`)
        await enhancedScoringStore.initialize()
        console.log(`[WebSocketManager] Store initialized successfully`)
        const result = enhancedScoringStore.updateJudgeOnlineStatus(judgeId, true)
        console.log(`[WebSocketManager] updateJudgeOnlineStatus result:`, result)
        console.log(`[WebSocketManager] Judge ${judgeId} marked as online`)
      } catch (error) {
        console.error(`[WebSocketManager] Failed to update judge online status:`, error)
      }
    }
  })

  manager.on('client_message', ({ clientId, message }) => {
    console.log(`[WebSocketManager] Message from ${clientId}:`, message.event)
    // 这里可以添加自定义消息处理逻辑
  })

  manager.on('server_error', (error) => {
    console.error('[WebSocketManager] Server error:', error)
  })
}

// 获取WebSocket管理器实例
export function getWebSocketManager(): WebSocketManager | null {
  return globalWebSocketManager
}

// 广播事件到所有客户端（兼容现有ScoringEvent格式）
export function broadcastEvent(event: ScoringEvent, excludeClient?: string) {
  let manager = getWebSocketManager()

  // 如果管理器不存在或未运行，尝试初始化
  if (!manager || !manager.isRunning()) {
    console.log('[WebSocketManager] Manager not available, attempting to initialize...')
    manager = initializeWebSocketManager()
  }

  if (manager && manager.isRunning()) {
    manager.broadcastEvent(event, excludeClient)
    console.log(`[WebSocketManager] Broadcasted event: ${event.type}`)
  } else {
    console.warn('[WebSocketManager] Cannot broadcast event: manager not available')
  }
}

// 广播事件到特定类型的客户端
export function broadcastToType(event: ScoringEvent, targetType: 'admin' | 'display' | 'judge', excludeClient?: string) {
  const manager = getWebSocketManager()
  if (manager) {
    const message = {
      id: `broadcast_${Date.now()}`,
      type: 'event' as const,
      event: event.type,
      data: event.data,
      timestamp: event.timestamp
    }
    manager.broadcastToType(message, targetType, excludeClient)
    console.log(`[WebSocketManager] Broadcasted event to ${targetType}: ${event.type}`)
  } else {
    console.warn('[WebSocketManager] Cannot broadcast event: manager not initialized')
  }
}

// 发送事件到特定客户端
export function sendToClient(clientId: string, event: ScoringEvent) {
  const manager = getWebSocketManager()
  if (manager) {
    const message = {
      id: `send_${Date.now()}`,
      type: 'event' as const,
      event: event.type,
      data: event.data,
      timestamp: event.timestamp
    }
    manager.sendToClient(clientId, message)
    console.log(`[WebSocketManager] Sent event to ${clientId}: ${event.type}`)
  } else {
    console.warn('[WebSocketManager] Cannot send event: manager not initialized')
  }
}

// 获取连接状态
export function getConnectionStatus() {
  const manager = getWebSocketManager()
  if (manager) {
    return manager.getConnectionStatus()
  }
  return []
}

// 关闭WebSocket服务器
export async function closeWebSocketManager() {
  if (globalWebSocketManager) {
    await globalWebSocketManager.close()
    globalWebSocketManager = null
    console.log('[WebSocketManager] WebSocket server closed')
  }
}

// 检查WebSocket服务器是否运行
export function isWebSocketServerRunning(): boolean {
  return globalWebSocketManager !== null && globalWebSocketManager.isRunning()
}

// 重启WebSocket服务器
export async function restartWebSocketManager() {
  console.log('[WebSocketManager] Restarting WebSocket server...')
  await closeWebSocketManager()
  return initializeWebSocketManager()
}
