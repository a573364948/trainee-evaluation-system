// 增强的SSE服务端 - 支持连接管理和心跳
import { NextRequest } from "next/server"
import { enhancedScoringStore } from "@/lib/scoring-store-enhanced"

// 连接管理
const connections = new Map<string, {
  writer: WritableStreamDefaultWriter
  controller: AbortController
  type: string
  judgeId?: string
  lastHeartbeat: number
}>()

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const type = searchParams.get('type') || 'unknown'
  const judgeId = searchParams.get('judgeId') || undefined

  // 创建可读流
  const stream = new ReadableStream({
    start(controller) {
      // 生成连接ID
      const connectionId = enhancedScoringStore.addConnection(type as any, judgeId)
      
      // SSE 头部设置
      const encoder = new TextEncoder()
      
      // 发送连接建立消息
      const connectionMessage = `data: ${JSON.stringify({
        type: 'connection_established',
        connectionId,
        timestamp: Date.now()
      })}\n\n`
      controller.enqueue(encoder.encode(connectionMessage))

      // 创建写入器
      const writer = controller
      const abortController = new AbortController()
      
      // 存储连接信息
      connections.set(connectionId, {
        writer: writer as any,
        controller: abortController,
        type,
        judgeId,
        lastHeartbeat: Date.now()
      })

      console.log(`[SSE Enhanced] New ${type} connection established: ${connectionId}`)

      // 事件监听器
      const eventListener = (event: any) => {
        try {
          const message = `data: ${JSON.stringify(event)}\n\n`
          controller.enqueue(encoder.encode(message))
        } catch (error) {
          console.error(`[SSE Enhanced] Error sending event to ${connectionId}:`, error)
        }
      }

      // 添加事件监听
      enhancedScoringStore.addEventListener(eventListener)

      // 发送初始数据
      try {
        const initialData = {
          type: 'initial_data',
          data: {
            candidates: enhancedScoringStore.getCandidates(),
            judges: enhancedScoringStore.getJudges(),
            dimensions: enhancedScoringStore.getInterviewDimensions(),
            scoreItems: enhancedScoringStore.getScoreItems(),
            questions: enhancedScoringStore.getQuestions(),
            displaySession: enhancedScoringStore.getDisplaySession(),
            currentCandidate: enhancedScoringStore.getCurrentCandidate(),
            systemStatus: enhancedScoringStore.getSystemStatus()
          },
          timestamp: Date.now()
        }
        
        const initialMessage = `data: ${JSON.stringify(initialData)}\n\n`
        controller.enqueue(encoder.encode(initialMessage))
      } catch (error) {
        console.error(`[SSE Enhanced] Error sending initial data to ${connectionId}:`, error)
      }

      // 心跳检查定时器
      const heartbeatInterval = setInterval(() => {
        const connection = connections.get(connectionId)
        if (!connection) {
          clearInterval(heartbeatInterval)
          return
        }

        const now = Date.now()
        const timeSinceLastHeartbeat = now - connection.lastHeartbeat

        // 如果超过60秒没有心跳，断开连接
        if (timeSinceLastHeartbeat > 60000) {
          console.log(`[SSE Enhanced] Connection ${connectionId} heartbeat timeout`)
          connection.controller.abort()
          connections.delete(connectionId)
          enhancedScoringStore.removeConnection(connectionId)
          clearInterval(heartbeatInterval)
          return
        }

        // 发送服务端心跳
        try {
          const heartbeatMessage = `data: ${JSON.stringify({
            type: 'server_heartbeat',
            timestamp: now,
            connectionId
          })}\n\n`
          controller.enqueue(encoder.encode(heartbeatMessage))
        } catch (error) {
          console.error(`[SSE Enhanced] Error sending heartbeat to ${connectionId}:`, error)
        }
      }, 30000) // 每30秒发送一次心跳

      // 清理函数
      const cleanup = () => {
        console.log(`[SSE Enhanced] Cleaning up connection: ${connectionId}`)
        clearInterval(heartbeatInterval)
        enhancedScoringStore.removeEventListener(eventListener)
        enhancedScoringStore.removeConnection(connectionId)
        connections.delete(connectionId)
      }

      // 监听中断信号
      abortController.signal.addEventListener('abort', cleanup)

      // 监听关闭
      request.signal?.addEventListener('abort', () => {
        console.log(`[SSE Enhanced] Client disconnected: ${connectionId}`)
        abortController.abort()
      })
    },

    cancel() {
      console.log('[SSE Enhanced] Stream cancelled')
    }
  })

  // 返回SSE响应
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    },
  })
}