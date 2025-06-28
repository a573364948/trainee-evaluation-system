import { type NextRequest, NextResponse } from "next/server"
import { enhancedScoringStore } from "@/lib/scoring-store-enhanced"

export async function POST(request: NextRequest) {
  try {
    await enhancedScoringStore.initialize()
    const { candidateId, judgeId, categories } = await request.json()

    const success = enhancedScoringStore.submitScore(candidateId, judgeId, categories)

    if (success) {
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json({ success: false, error: "Invalid candidate or judge" }, { status: 400 })
    }
  } catch (error) {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

export async function GET() {
  await enhancedScoringStore.initialize()
  const candidates = enhancedScoringStore.getCandidates()
  const judges = enhancedScoringStore.getJudges()
  const currentCandidate = enhancedScoringStore.getCurrentCandidate()

  return NextResponse.json({
    candidates,
    judges,
    currentCandidate,
  })
}
