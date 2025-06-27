import { type NextRequest, NextResponse } from "next/server"
import { scoringStore } from "@/lib/scoring-store"

export async function POST(request: NextRequest) {
  try {
    const { candidateId } = await request.json()
    scoringStore.resetCandidate(candidateId)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
