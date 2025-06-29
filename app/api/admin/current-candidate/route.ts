import { type NextRequest, NextResponse } from "next/server"
import { enhancedScoringStore } from "@/lib/scoring-store-enhanced"

// 获取当前候选人
export async function GET() {
  try {
    await enhancedScoringStore.initialize()
    const currentCandidate = enhancedScoringStore.getCurrentCandidate()
    
    return NextResponse.json({
      success: true,
      candidate: currentCandidate
    })
  } catch (error) {
    console.error("[Current Candidate] Get error:", error)
    return NextResponse.json(
      { success: false, error: "获取当前候选人失败" },
      { status: 500 }
    )
  }
}

// 设置当前候选人
export async function POST(request: NextRequest) {
  try {
    await enhancedScoringStore.initialize()
    const { candidateId } = await request.json()

    if (!candidateId) {
      return NextResponse.json(
        { success: false, error: "候选人ID不能为空" },
        { status: 400 }
      )
    }

    // 验证候选人存在
    const candidates = enhancedScoringStore.getCandidates()
    const candidate = candidates.find(c => c.id === candidateId)
    
    if (!candidate) {
      return NextResponse.json(
        { success: false, error: "候选人不存在" },
        { status: 404 }
      )
    }

    // 设置当前候选人
    enhancedScoringStore.setCurrentCandidate(candidateId)
    
    console.log(`[Current Candidate] Set to: ${candidate.name} (${candidateId})`)

    return NextResponse.json({
      success: true,
      candidate: candidate,
      message: `已设置当前候选人为: ${candidate.name}`
    })

  } catch (error) {
    console.error("[Current Candidate] Set error:", error)
    return NextResponse.json(
      { success: false, error: "设置当前候选人失败" },
      { status: 500 }
    )
  }
}
