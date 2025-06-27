import { type NextRequest, NextResponse } from "next/server"
import { scoringStore } from "@/lib/scoring-store"

export async function GET() {
  const scoreItems = scoringStore.getScoreItems()
  return NextResponse.json({ scoreItems })
}

export async function POST(request: NextRequest) {
  try {
    const itemData = await request.json()
    const item = scoringStore.addScoreItem(itemData)
    return NextResponse.json({ success: true, item })
  } catch (error) {
    console.error("添加成绩项目失败:", error)
    return NextResponse.json({ success: false, error: "Invalid data" }, { status: 400 })
  }
}
