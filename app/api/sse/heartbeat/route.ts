// SSE心跳处理端点
import { NextRequest, NextResponse } from "next/server"
import { enhancedScoringStore } from "@/lib/scoring-store-enhanced"

export async function POST(request: NextRequest) {
  try {
    const { connectionId, timestamp } = await request.json()
    
    if (!connectionId) {
      return NextResponse.json({ 
        success: false, 
        error: "Connection ID required" 
      }, { status: 400 })
    }

    // 更新心跳时间
    const success = enhancedScoringStore.updateHeartbeat(connectionId)
    
    if (success) {
      return NextResponse.json({
        success: true,
        timestamp: Date.now(),
        connectionId
      })
    } else {
      return NextResponse.json({
        success: false,
        error: "Connection not found"
      }, { status: 404 })
    }
  } catch (error) {
    console.error('[Heartbeat] Error processing heartbeat:', error)
    return NextResponse.json({
      success: false,
      error: "Invalid request"
    }, { status: 400 })
  }
}