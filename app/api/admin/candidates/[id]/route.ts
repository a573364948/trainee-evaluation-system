import { type NextRequest, NextResponse } from "next/server"
import { scoringStore } from "@/lib/scoring-store"

// 更新候选人
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const updates = await request.json()
    const candidate = scoringStore.updateCandidate(params.id, updates)
    if (candidate) {
      return NextResponse.json({ success: true, candidate })
    } else {
      return NextResponse.json({ success: false, error: "Candidate not found" }, { status: 404 })
    }
  } catch (error) {
    return NextResponse.json({ success: false, error: "Invalid data" }, { status: 400 })
  }
}

// 删除候选人
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const success = scoringStore.deleteCandidate(params.id)
    if (success) {
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json({ success: false, error: "Candidate not found" }, { status: 404 })
    }
  } catch (error) {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
