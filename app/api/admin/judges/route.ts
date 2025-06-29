import { type NextRequest, NextResponse } from "next/server"
import { enhancedScoringStore } from "@/lib/scoring-store-enhanced"

// 获取所有评委
export async function GET() {
  await enhancedScoringStore.initialize()
  const judges = enhancedScoringStore.getJudges()
  return NextResponse.json({ judges })
}

// 添加评委
export async function POST(request: NextRequest) {
  try {
    await enhancedScoringStore.initialize()
    const judgeData = await request.json()
    const judge = enhancedScoringStore.addJudge(judgeData)
    return NextResponse.json({ success: true, judge })
  } catch (error) {
    console.error("添加评委失败:", error)
    return NextResponse.json({ success: false, error: "Invalid data" }, { status: 400 })
  }
}
