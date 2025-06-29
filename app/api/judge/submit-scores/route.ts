import { type NextRequest, NextResponse } from "next/server"
import { enhancedScoringStore } from "@/lib/scoring-store-enhanced"

export async function POST(request: NextRequest) {
  try {
    await enhancedScoringStore.initialize()
    const { candidateId, judgeId, scores } = await request.json()

    if (!candidateId || !judgeId || !scores || !Array.isArray(scores)) {
      return NextResponse.json(
        { success: false, error: "缺少必要参数" },
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

    // 验证评委存在
    const judges = enhancedScoringStore.getJudges()
    const judge = judges.find(j => j.id === judgeId)
    if (!judge) {
      return NextResponse.json(
        { success: false, error: "评委不存在" },
        { status: 404 }
      )
    }

    // 验证评分数据格式
    const dimensions = enhancedScoringStore.getInterviewDimensions()
    for (const scoreData of scores) {
      if (!scoreData.dimensionId || typeof scoreData.score !== 'number') {
        return NextResponse.json(
          { success: false, error: "评分数据格式错误" },
          { status: 400 }
        )
      }

      const dimension = dimensions.find(d => d.id === scoreData.dimensionId)
      if (!dimension) {
        return NextResponse.json(
          { success: false, error: `评分维度 ${scoreData.dimensionId} 不存在` },
          { status: 400 }
        )
      }

      if (scoreData.score < 0 || scoreData.score > dimension.maxScore) {
        return NextResponse.json(
          { success: false, error: `评分超出范围 (0-${dimension.maxScore})` },
          { status: 400 }
        )
      }
    }

    // 提交评分
    try {
      // 将评分数据转换为categories格式
      const categories: Record<string, number> = {}
      scores.forEach(scoreData => {
        categories[scoreData.dimensionId] = scoreData.score
      })

      // 提交评分
      const success = enhancedScoringStore.submitScore(candidateId, judgeId, categories)

      if (!success) {
        return NextResponse.json(
          { success: false, error: "评分提交失败" },
          { status: 500 }
        )
      }

      // 获取更新后的候选人信息
      const updatedCandidate = enhancedScoringStore.getCandidates()
        .find(c => c.id === candidateId)

      console.log(`[Judge Scores] Judge ${judge.name} submitted scores for candidate ${candidate.name}`)

      return NextResponse.json({
        success: true,
        message: "评分提交成功",
        candidate: updatedCandidate,
        judge: judge,
        scores: scores
      })

    } catch (submitError) {
      console.error("[Judge Scores] Error submitting scores:", submitError)
      return NextResponse.json(
        { success: false, error: "评分提交失败" },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error("[Judge Scores] Submit scores error:", error)
    return NextResponse.json(
      { success: false, error: "服务器内部错误" },
      { status: 500 }
    )
  }
}
