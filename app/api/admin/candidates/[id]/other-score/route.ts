import { type NextRequest, NextResponse } from "next/server"
import { scoringStore } from "@/lib/scoring-store"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { itemId, score } = await request.json()
    const success = scoringStore.updateOtherScore(params.id, itemId, score)
    if (success) {
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json({ success: false, error: "Candidate or score item not found" }, { status: 404 })
    }
  } catch (error) {
    return NextResponse.json({ success: false, error: "Invalid data" }, { status: 400 })
  }
}
