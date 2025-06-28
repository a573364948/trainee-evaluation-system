import { type NextRequest, NextResponse } from "next/server"
import { enhancedScoringStore } from "@/lib/scoring-store-enhanced"

// 清空所有数据
export async function POST(request: NextRequest) {
  try {
    await enhancedScoringStore.initialize()
    enhancedScoringStore.clearAllData()
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("清空数据失败:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
