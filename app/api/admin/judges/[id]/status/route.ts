import { type NextRequest, NextResponse } from "next/server"
import { scoringStore } from "@/lib/scoring-store"

// 更新评委在线状态
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { isActive } = await request.json()
    const judge = scoringStore.setJudgeOnlineStatus(params.id, isActive)
    if (judge) {
      return NextResponse.json({ success: true, judge })
    } else {
      return NextResponse.json({ success: false, error: "Judge not found" }, { status: 404 })
    }
  } catch (error) {
    return NextResponse.json({ success: false, error: "Invalid data" }, { status: 400 })
  }
}
