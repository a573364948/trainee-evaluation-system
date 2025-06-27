import { type NextRequest, NextResponse } from "next/server"
import { scoringStore } from "@/lib/scoring-store"

// 获取所有候选人
export async function GET() {
  const candidates = scoringStore.getCandidates()
  return NextResponse.json({ candidates })
}

// 添加候选人
export async function POST(request: NextRequest) {
  try {
    const candidateData = await request.json()
    const candidate = scoringStore.addCandidate(candidateData)
    return NextResponse.json({ success: true, candidate })
  } catch (error) {
    return NextResponse.json({ success: false, error: "Invalid data" }, { status: 400 })
  }
}

// 批量添加候选人
export async function PUT(request: NextRequest) {
  try {
    const { candidates } = await request.json()
    const addedCandidates = scoringStore.batchAddCandidates(candidates)
    return NextResponse.json({ success: true, candidates: addedCandidates })
  } catch (error) {
    return NextResponse.json({ success: false, error: "Invalid data" }, { status: 400 })
  }
}
