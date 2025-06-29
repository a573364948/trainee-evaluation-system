import { type NextRequest, NextResponse } from "next/server"
import { enhancedScoringStore } from "@/lib/scoring-store-enhanced"

// 获取显示会话信息
export async function GET() {
  try {
    await enhancedScoringStore.initialize()
    const session = enhancedScoringStore.getDisplaySession()
    
    return NextResponse.json({
      success: true,
      session: session
    })
  } catch (error) {
    console.error("[Display Session] Get error:", error)
    return NextResponse.json(
      { success: false, error: "获取显示会话失败" },
      { status: 500 }
    )
  }
}

// 更新显示会话
export async function POST(request: NextRequest) {
  try {
    await enhancedScoringStore.initialize()
    const sessionData = await request.json()

    // 更新会话数据
    if (sessionData.currentStage) {
      enhancedScoringStore.setDisplayStage(sessionData.currentStage)
    }

    if (sessionData.currentQuestion) {
      enhancedScoringStore.setCurrentQuestion(sessionData.currentQuestion.id)
    }

    if (sessionData.currentInterviewItem) {
      enhancedScoringStore.setCurrentInterviewItem(sessionData.currentInterviewItem.id)
    }

    if (sessionData.currentCandidate) {
      enhancedScoringStore.setCurrentCandidate(sessionData.currentCandidate.id)
    }

    const updatedSession = enhancedScoringStore.getDisplaySession()
    
    console.log("[Display Session] Updated session data")

    return NextResponse.json({
      success: true,
      session: updatedSession,
      message: "显示会话已更新"
    })

  } catch (error) {
    console.error("[Display Session] Update error:", error)
    return NextResponse.json(
      { success: false, error: "更新显示会话失败" },
      { status: 500 }
    )
  }
}
