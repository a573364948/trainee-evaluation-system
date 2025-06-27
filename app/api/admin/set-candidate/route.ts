import { type NextRequest, NextResponse } from "next/server"
import { scoringStore } from "@/lib/scoring-store"

export async function POST(request: NextRequest) {
  try {
    const { candidateId } = await request.json()
    console.log("[API] Setting current candidate to:", candidateId)

    scoringStore.setCurrentCandidate(candidateId)

    const currentCandidate = scoringStore.getCurrentCandidate()
    console.log("[API] Current candidate after setting:", currentCandidate?.name, currentCandidate?.id)

    return NextResponse.json({ success: true, candidateId, currentCandidate })
  } catch (error) {
    console.error("[API] Error setting current candidate:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
