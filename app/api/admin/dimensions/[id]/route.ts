import { type NextRequest, NextResponse } from "next/server"
import { enhancedScoringStore } from "@/lib/scoring-store-enhanced"

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await enhancedScoringStore.initialize()
    const updates = await request.json()
    const { id } = await params
    const dimension = enhancedScoringStore.updateInterviewDimension(id, updates)
    if (dimension) {
      return NextResponse.json({ success: true, dimension })
    } else {
      return NextResponse.json({ success: false, error: "Dimension not found" }, { status: 404 })
    }
  } catch (error) {
    console.error("更新维度失败:", error)
    return NextResponse.json({ success: false, error: "Invalid data" }, { status: 400 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await enhancedScoringStore.initialize()
    const { id } = await params
    const success = enhancedScoringStore.deleteInterviewDimension(id)
    if (success) {
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json({ success: false, error: "Dimension not found" }, { status: 404 })
    }
  } catch (error) {
    console.error("删除维度失败:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
