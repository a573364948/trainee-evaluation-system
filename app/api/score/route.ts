import { type NextRequest, NextResponse } from "next/server"
import { scoringStore } from "@/lib/scoring-store"

export async function POST(request: NextRequest) {
  try {
    const { candidateId, judgeId, categories } = await request.json()

    const success = scoringStore.submitScore(candidateId, judgeId, categories)

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
  const candidates = scoringStore.getCandidates()
  const judges = scoringStore.getJudges()
  const currentCandidate = scoringStore.getCurrentCandidate()

  return NextResponse.json({
    candidates,
    judges,
    currentCandidate,
  })
}
