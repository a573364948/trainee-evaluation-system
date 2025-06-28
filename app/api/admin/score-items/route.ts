import { type NextRequest, NextResponse } from "next/server"
import { enhancedScoringStore } from "@/lib/scoring-store-enhanced"

export async function GET() {
  await enhancedScoringStore.initialize()
  const scoreItems = enhancedScoringStore.getScoreItems()
  return NextResponse.json({ scoreItems })
}

export async function POST(request: NextRequest) {
  try {
    await enhancedScoringStore.initialize()
    const itemData = await request.json()
    const item = enhancedScoringStore.addScoreItem(itemData)
    return NextResponse.json({ success: true, item })
  } catch (error) {
    console.error("添加成绩项目失败:", error)
    return NextResponse.json({ success: false, error: "Invalid data" }, { status: 400 })
  }
}
