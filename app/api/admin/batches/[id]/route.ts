import { type NextRequest, NextResponse } from "next/server"
import { scoringStore } from "@/lib/scoring-store"

// 更新批次
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const updates = await request.json()
    const batch = scoringStore.updateBatch(params.id, updates)
    if (batch) {
      return NextResponse.json({ success: true, batch })
    } else {
      return NextResponse.json({ success: false, error: "Batch not found" }, { status: 404 })
    }
  } catch (error) {
    console.error("更新批次失败:", error)
    return NextResponse.json({ success: false, error: "Invalid data" }, { status: 400 })
  }
}

// 删除批次
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const success = scoringStore.deleteBatch(params.id)
    if (success) {
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json({ success: false, error: "Batch not found" }, { status: 404 })
    }
  } catch (error) {
    console.error("删除批次失败:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
