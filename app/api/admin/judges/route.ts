import { type NextRequest, NextResponse } from "next/server"
import { scoringStore } from "@/lib/scoring-store"

// 获取所有评委
export async function GET() {
  const judges = scoringStore.getJudges()
  return NextResponse.json({ judges })
}

// 添加评委
export async function POST(request: NextRequest) {
  try {
    const judgeData = await request.json()
    const judge = scoringStore.addJudge(judgeData)
    return NextResponse.json({ success: true, judge })
  } catch (error) {
    return NextResponse.json({ success: false, error: "Invalid data" }, { status: 400 })
  }
}
