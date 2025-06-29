import { NextRequest, NextResponse } from "next/server"
import { enhancedScoringStore } from "@/lib/scoring-store-enhanced"

export async function POST(request: NextRequest) {
  try {
    await enhancedScoringStore.initialize()
    
    const { action, duration } = await request.json()
    
    console.log(`API: Timer action: ${action}`, duration ? `duration: ${duration}` : '')
    
    switch (action) {
      case 'start':
        enhancedScoringStore.startTimer()
        break
      case 'pause':
        enhancedScoringStore.pauseTimer()
        break
      case 'resume':
        enhancedScoringStore.resumeTimer()
        break
      case 'reset':
        enhancedScoringStore.resetTimer()
        break
      case 'setDuration':
        if (duration !== undefined) {
          if (duration === 0) {
            // 特殊处理：归零操作
            enhancedScoringStore.setTimerToZero()
          } else {
            enhancedScoringStore.setTimerDuration(duration)
          }
        }
        break
      case 'setToZero':
        enhancedScoringStore.setTimerToZero()
        break
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }
    
    console.log(`API: Timer action ${action} completed successfully`)
    
    return NextResponse.json({ 
      success: true,
      timerState: enhancedScoringStore.getTimerState()
    })
  } catch (error) {
    console.error("Timer control error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET() {
  try {
    await enhancedScoringStore.initialize()
    
    return NextResponse.json({
      timerState: enhancedScoringStore.getTimerState()
    })
  } catch (error) {
    console.error("Get timer state error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
