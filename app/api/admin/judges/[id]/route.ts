import { type NextRequest, NextResponse } from "next/server"
import { scoringStore } from "@/lib/scoring-store"

// 更新评委
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const updates = await request.json()
    const judge = scoringStore.updateJudge(params.id, updates)
    if (judge) {
      return NextResponse.json({ success: true, judge })
    } else {
      return NextResponse.json({ success: false, error: "Judge not found" }, { status: 404 })
    }
  } catch (error) {
    return NextResponse.json({ success: false, error: "Invalid data" }, { status: 400 })
  }
}

// 删除评委
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const success = scoringStore.deleteJudge(params.id)
    if (success) {
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json({ success: false, error: "Judge not found" }, { status: 404 })
    }
  } catch (error) {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
