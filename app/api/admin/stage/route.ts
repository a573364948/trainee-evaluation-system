import { type NextRequest, NextResponse } from "next/server"
import { enhancedScoringStore } from "@/lib/scoring-store-enhanced"

// 获取当前阶段
export async function GET() {
  try {
    await enhancedScoringStore.initialize()
    const session = enhancedScoringStore.getDisplaySession()
    
    return NextResponse.json({
      success: true,
      stage: session?.currentStage || null,
      session: session
    })
  } catch (error) {
    console.error("[Stage] Get error:", error)
    return NextResponse.json(
      { success: false, error: "获取当前阶段失败" },
      { status: 500 }
    )
  }
}

// 设置当前阶段
export async function POST(request: NextRequest) {
  try {
    await enhancedScoringStore.initialize()
    const { stage } = await request.json()

    if (!stage) {
      return NextResponse.json(
        { success: false, error: "阶段不能为空" },
        { status: 400 }
      )
    }

    // 验证阶段值
    const validStages = ['opening', 'interviewing', 'scoring']
    if (!validStages.includes(stage)) {
      return NextResponse.json(
        { success: false, error: "无效的阶段值" },
        { status: 400 }
      )
    }

    // 设置阶段
    enhancedScoringStore.setDisplayStage(stage)
    
    const stageNames = {
      'opening': '开场介绍',
      'interviewing': '面试环节',
      'scoring': '评分阶段'
    }

    console.log(`[Stage] Changed to: ${stageNames[stage as keyof typeof stageNames]} (${stage})`)

    return NextResponse.json({
      success: true,
      stage: stage,
      message: `已切换到: ${stageNames[stage as keyof typeof stageNames]}`
    })

  } catch (error) {
    console.error("[Stage] Set error:", error)
    return NextResponse.json(
      { success: false, error: "设置阶段失败" },
      { status: 500 }
    )
  }
}
