import { type NextRequest, NextResponse } from "next/server"
import { scoringStore } from "@/lib/scoring-store"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const updates = await request.json()
    const dimension = scoringStore.updateInterviewDimension(params.id, updates)
    if (dimension) {
      return NextResponse.json({ success: true, dimension })
    } else {
      return NextResponse.json({ success: false, error: "Dimension not found" }, { status: 404 })
    }
  } catch (error) {
    return NextResponse.json({ success: false, error: "Invalid data" }, { status: 400 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const success = scoringStore.deleteInterviewDimension(params.id)
    if (success) {
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json({ success: false, error: "Dimension not found" }, { status: 404 })
    }
  } catch (error) {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
