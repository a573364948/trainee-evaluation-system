import { type NextRequest, NextResponse } from "next/server"
import { enhancedScoringStore } from "@/lib/scoring-store-enhanced"

export async function POST(request: NextRequest) {
  try {
    await enhancedScoringStore.initialize()
    
    // 获取所有候选人
    const candidates = enhancedScoringStore.getCandidates()
    
    // 清空所有候选人的非面试成绩（保留面试成绩）
    candidates.forEach(candidate => {
      candidate.otherScores = []
      // 重新计算最终得分
      enhancedScoringStore.updateCandidate(candidate.id, candidate)
    })
    
    return NextResponse.json({ success: true, message: "成绩清空成功" })
  } catch (error) {
    console.error("清空成绩失败:", error)
    return NextResponse.json({ success: false, error: "清空成绩失败" }, { status: 500 })
  }
}
