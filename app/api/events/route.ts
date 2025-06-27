import type { NextRequest } from "next/server"
import { scoringStore } from "@/lib/scoring-store"

// 跟踪活跃连接数
let activeConnections = 0

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder()
  const connectionId = Date.now().toString()

  activeConnections++
  console.log(`[SSE] New connection ${connectionId}, total active: ${activeConnections}`)

  const stream = new ReadableStream({
    start(controller) {
      const listener = (event: any) => {
        try {
          const data = `data: ${JSON.stringify(event)}\n\n`
          controller.enqueue(encoder.encode(data))
          console.log(`[SSE] Event sent to connection ${connectionId}:`, event.type)
        } catch (error) {
          console.error(`[SSE] Error sending event to connection ${connectionId}:`, error)
        }
      }

      scoringStore.addEventListener(listener)
      console.log(`[SSE] Listener added for connection ${connectionId}`)

      // 发送初始数据
      const initialData = {
        type: "initial",
        data: {
          candidates: scoringStore.getCandidates(),
          judges: scoringStore.getJudges(),
          currentCandidate: scoringStore.getCurrentCandidate(),
          displaySession: scoringStore.getDisplaySession(),
          interviewItems: scoringStore.getInterviewItems(),
        },
        timestamp: Date.now(),
      }

      try {
        const data = `data: ${JSON.stringify(initialData)}\n\n`
        controller.enqueue(encoder.encode(data))
        console.log(`[SSE] Initial data sent to connection ${connectionId}`)
      } catch (error) {
        console.error(`[SSE] Error sending initial data to connection ${connectionId}:`, error)
      }

      // 发送心跳包
      const heartbeat = setInterval(() => {
        try {
          const heartbeatData = `data: ${JSON.stringify({ type: "heartbeat", timestamp: Date.now() })}\n\n`
          controller.enqueue(encoder.encode(heartbeatData))
        } catch (error) {
          console.error(`[SSE] Heartbeat error for connection ${connectionId}:`, error)
          clearInterval(heartbeat)
        }
      }, 30000) // 每30秒发送一次心跳

      // 清理函数
      const cleanup = () => {
        activeConnections--
        console.log(`[SSE] Connection ${connectionId} closed, remaining active: ${activeConnections}`)
        scoringStore.removeEventListener(listener)
        clearInterval(heartbeat)
        try {
          controller.close()
        } catch (error) {
          console.error(`[SSE] Error closing controller for connection ${connectionId}:`, error)
        }
      }

      request.signal.addEventListener("abort", cleanup)

      // 监听控制器关闭
      controller.closed?.then(cleanup).catch(cleanup)
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Cache-Control",
    },
  })
}
