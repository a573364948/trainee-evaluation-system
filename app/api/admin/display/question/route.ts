import { type NextRequest, NextResponse } from "next/server"
import { enhancedScoringStore } from "@/lib/scoring-store-enhanced"

// 设置当前题目（向后兼容，实际使用interview-item系统）
export async function POST(request: NextRequest) {
  try {
    await enhancedScoringStore.initialize()
    const { questionId } = await request.json()
    console.log("API: Setting question to:", questionId) // 添加调试日志

    // 使用新的interview-item系统
    enhancedScoringStore.setCurrentInterviewItem(questionId)
    console.log("API: Question set successfully to:", questionId)
    return NextResponse.json({ success: true, questionId })
  } catch (error) {
    console.error("设置当前题目失败:", error)
    return NextResponse.json({ success: false, error: "Invalid data" }, { status: 400 })
  }
}
