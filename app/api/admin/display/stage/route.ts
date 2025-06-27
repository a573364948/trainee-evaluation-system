import { type NextRequest, NextResponse } from "next/server"
import { scoringStore } from "@/lib/scoring-store"

// 获取当前显示环节
export async function GET() {
  const session = scoringStore.getDisplaySession()
  return NextResponse.json({ session })
}

// 设置显示环节
export async function POST(request: NextRequest) {
  try {
    const { stage } = await request.json()
    console.log("API: Setting stage to:", stage) // 添加调试日志

    if (!["opening", "questioning", "scoring"].includes(stage)) {
      return NextResponse.json({ success: false, error: "Invalid stage" }, { status: 400 })
    }

    scoringStore.setDisplayStage(stage)
    console.log("API: Stage set successfully to:", stage)
    return NextResponse.json({ success: true, stage })
  } catch (error) {
    console.error("设置显示环节失败:", error)
    return NextResponse.json({ success: false, error: "Invalid data" }, { status: 400 })
  }
}
