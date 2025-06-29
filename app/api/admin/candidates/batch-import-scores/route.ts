import { type NextRequest, NextResponse } from "next/server"
import { enhancedScoringStore } from "@/lib/scoring-store-enhanced"

export async function POST(request: NextRequest) {
  try {
    await enhancedScoringStore.initialize()
    
    const { importData } = await request.json()
    
    if (!Array.isArray(importData)) {
      return NextResponse.json({ success: false, error: "导入数据格式错误" }, { status: 400 })
    }
    
    const candidates = enhancedScoringStore.getCandidates()
    const scoreItems = enhancedScoringStore.getScoreItems()
    
    let successCount = 0
    let errorCount = 0
    const errors: string[] = []
    
    for (const row of importData) {
      try {
        const { candidateIdentifier, ...scores } = row
        
        // 查找候选人（按编号或姓名）
        const candidate = candidates.find(c => 
          c.number === candidateIdentifier || c.name === candidateIdentifier
        )
        
        if (!candidate) {
          errors.push(`未找到候选人: ${candidateIdentifier}`)
          errorCount++
          continue
        }
        
        // 更新成绩
        for (const [itemName, score] of Object.entries(scores)) {
          if (typeof score === 'number' && !isNaN(score)) {
            // 查找对应的成绩项目
            const scoreItem = scoreItems.find(item => 
              item.name === itemName && item.isActive && item.name !== '面试成绩'
            )
            
            if (scoreItem) {
              // 更新或添加成绩
              const existingScoreIndex = candidate.otherScores.findIndex(s => s.itemId === scoreItem.id)
              if (existingScoreIndex >= 0) {
                candidate.otherScores[existingScoreIndex].score = score
              } else {
                candidate.otherScores.push({
                  itemId: scoreItem.id,
                  score: score,
                  timestamp: Date.now()
                })
              }
            }
          }
        }
        
        // 更新候选人数据
        enhancedScoringStore.updateCandidate(candidate.id, candidate)
        successCount++
        
      } catch (error) {
        errors.push(`处理候选人 ${row.candidateIdentifier} 时出错: ${error}`)
        errorCount++
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      message: `导入完成：成功 ${successCount} 条，失败 ${errorCount} 条`,
      details: {
        successCount,
        errorCount,
        errors: errors.slice(0, 10) // 只返回前10个错误
      }
    })
    
  } catch (error) {
    console.error("批量导入成绩失败:", error)
    return NextResponse.json({ success: false, error: "批量导入失败" }, { status: 500 })
  }
}
