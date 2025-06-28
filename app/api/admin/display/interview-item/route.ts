import { type NextRequest, NextResponse } from "next/server"
import { enhancedScoringStore } from "@/lib/scoring-store-enhanced"

// 设置当前面试项目（统一处理题目和面试环节）
export async function POST(request: NextRequest) {
  try {
    await enhancedScoringStore.initialize()
    const { itemId } = await request.json()
    console.log("API: Setting interview item to:", itemId)

    enhancedScoringStore.setCurrentInterviewItem(itemId)
    console.log("API: Interview item set successfully to:", itemId)
    return NextResponse.json({ success: true, itemId })
  } catch (error) {
    console.error("设置当前面试项目失败:", error)
    return NextResponse.json({ success: false, error: "Invalid data" }, { status: 400 })
  }
}
