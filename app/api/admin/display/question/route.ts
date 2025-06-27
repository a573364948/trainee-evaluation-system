import { type NextRequest, NextResponse } from "next/server"
import { scoringStore } from "@/lib/scoring-store"

// 设置当前题目
export async function POST(request: NextRequest) {
  try {
    const { questionId } = await request.json()
    console.log("API: Setting question to:", questionId) // 添加调试日志

    scoringStore.setCurrentQuestion(questionId)
    console.log("API: Question set successfully to:", questionId)
    return NextResponse.json({ success: true, questionId })
  } catch (error) {
    console.error("设置当前题目失败:", error)
    return NextResponse.json({ success: false, error: "Invalid data" }, { status: 400 })
  }
}
