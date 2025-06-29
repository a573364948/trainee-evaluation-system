import { type NextRequest, NextResponse } from "next/server"
import { enhancedScoringStore } from "@/lib/scoring-store-enhanced"

// 更新评委
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await enhancedScoringStore.initialize()
    const updates = await request.json()
    const judge = enhancedScoringStore.updateJudge(params.id, updates)
    if (judge) {
      return NextResponse.json({ success: true, judge })
    } else {
      return NextResponse.json({ success: false, error: "Judge not found" }, { status: 404 })
    }
  } catch (error) {
    console.error("更新评委失败:", error)
    return NextResponse.json({ success: false, error: "Invalid data" }, { status: 400 })
  }
}

// 删除评委
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await enhancedScoringStore.initialize()
    const success = enhancedScoringStore.deleteJudge(params.id)
    if (success) {
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json({ success: false, error: "Judge not found" }, { status: 404 })
    }
  } catch (error) {
    console.error("删除评委失败:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
