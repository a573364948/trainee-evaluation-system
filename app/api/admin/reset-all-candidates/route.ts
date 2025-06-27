import { type NextRequest, NextResponse } from "next/server"
import { scoringStore } from "@/lib/scoring-store"

export async function POST(request: NextRequest) {
  try {
    console.log("[API] Resetting all candidates status...")
    
    scoringStore.resetAllCandidatesStatus()
    
    const candidates = scoringStore.getCandidates()
    const currentCandidate = scoringStore.getCurrentCandidate()
    
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
