import { type NextRequest, NextResponse } from "next/server"
import { enhancedScoringStore } from "@/lib/scoring-store-enhanced"

export async function POST(request: NextRequest) {
  try {
    await enhancedScoringStore.initialize()
    console.log("[API] Resetting all candidates status...")

    enhancedScoringStore.resetAllCandidatesStatus()

    const candidates = enhancedScoringStore.getCandidates()
    const currentCandidate = enhancedScoringStore.getCurrentCandidate()

    console.log("[API] All candidates status reset. Current candidate:", currentCandidate?.name || "none")

    return NextResponse.json({
      success: true,
      message: "所有候选人状态已重置",
      candidates,
      currentCandidate
    })
  } catch (error) {
    console.error("[API] Error resetting all candidates:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
