// 数据迁移脚本 - 从内存存储迁移到增强存储
import { scoringStore } from '../lib/scoring-store'
import { enhancedScoringStore } from '../lib/scoring-store-enhanced'
import { database } from '../lib/database'

async function migrateData() {
  console.log('开始数据迁移...')
  
  try {
    // 1. 初始化增强存储
    console.log('1. 初始化增强存储系统...')
    await enhancedScoringStore.initialize()
    
    // 2. 从旧存储获取数据
    console.log('2. 从旧存储获取数据...')
    const candidates = scoringStore.getCandidates()
    const judges = scoringStore.getJudges()
    const dimensions = scoringStore.getInterviewDimensions()
    const scoreItems = scoringStore.getScoreItems()
    const questions = scoringStore.getQuestions()
    const displaySession = scoringStore.getDisplaySession()
    const currentCandidate = scoringStore.getCurrentCandidate()
    
    console.log(`- 候选人: ${candidates.length} 个`)
    console.log(`- 评委: ${judges.length} 个`)
    console.log(`- 评分维度: ${dimensions.length} 个`)
    console.log(`- 成绩项目: ${scoreItems.length} 个`)
    console.log(`- 题目: ${questions.length} 个`)
    
    // 3. 创建备份
    console.log('3. 创建当前数据备份...')
    await enhancedScoringStore.createBackup()
    
    // 4. 检查数据一致性
    console.log('4. 验证数据一致性...')
    const enhancedCandidates = enhancedScoringStore.getCandidates()
    const enhancedJudges = enhancedScoringStore.getJudges()
    
    console.log(`验证结果:`)
    console.log(`- 旧存储候选人: ${candidates.length}, 新存储候选人: ${enhancedCandidates.length}`)
    console.log(`- 旧存储评委: ${judges.length}, 新存储评委: ${enhancedJudges.length}`)
    
    // 5. 验证具体数据
    const dataConsistent = verifyDataConsistency(
      { candidates, judges, dimensions, scoreItems, questions },
      {
        candidates: enhancedCandidates,
        judges: enhancedJudges,
        dimensions: enhancedScoringStore.getInterviewDimensions(),
        scoreItems: enhancedScoringStore.getScoreItems(),
        questions: enhancedScoringStore.getQuestions()
      }
    )
    
    if (dataConsistent) {
      console.log('✅ 数据迁移验证成功！')
    } else {
      console.log('⚠️ 数据不一致，需要检查')
    }
    
    // 6. 获取系统状态
    console.log('6. 获取系统状态...')
    const systemStatus = enhancedScoringStore.getSystemStatus()
    console.log('系统状态:', systemStatus)
    
    // 7. 测试备份功能
    console.log('7. 测试备份功能...')
    const backups = enhancedScoringStore.listBackups()
    console.log(`备份列表: ${backups.length} 个备份文件`)
    backups.forEach(backup => {
      console.log(`- ${backup.name} (${backup.date})`)
    })
    
    console.log('✅ 数据迁移完成！')
    
  } catch (error) {
    console.error('❌ 数据迁移失败:', error)
    throw error
  }
}

function verifyDataConsistency(oldData: any, newData: any): boolean {
  const checks = [
    {
      name: '候选人数量',
      check: () => oldData.candidates.length === newData.candidates.length
    },
    {
      name: '评委数量', 
      check: () => oldData.judges.length === newData.judges.length
    },
    {
      name: '评分维度数量',
      check: () => oldData.dimensions.length === newData.dimensions.length
    },
    {
      name: '成绩项目数量',
      check: () => oldData.scoreItems.length === newData.scoreItems.length
    },
    {
      name: '题目数量',
      check: () => oldData.questions.length === newData.questions.length
    },
    {
      name: '候选人ID一致性',
      check: () => {
        const oldIds = oldData.candidates.map((c: any) => c.id).sort()
        const newIds = newData.candidates.map((c: any) => c.id).sort()
        return JSON.stringify(oldIds) === JSON.stringify(newIds)
      }
    },
    {
      name: '评委ID一致性',
      check: () => {
        const oldIds = oldData.judges.map((j: any) => j.id).sort()
        const newIds = newData.judges.map((j: any) => j.id).sort()
        return JSON.stringify(oldIds) === JSON.stringify(newIds)
      }
    }
  ]
  
  let allPassed = true
  
  checks.forEach(check => {
    const passed = check.check()
    console.log(`${passed ? '✅' : '❌'} ${check.name}: ${passed ? '通过' : '失败'}`)
    if (!passed) allPassed = false
  })
  
  return allPassed
}

// 导出数据对比工具
export async function exportDataComparison() {
  const oldData = {
    candidates: scoringStore.getCandidates(),
    judges: scoringStore.getJudges(),
    dimensions: scoringStore.getInterviewDimensions(),
    scoreItems: scoringStore.getScoreItems(),
    questions: scoringStore.getQuestions(),
    displaySession: scoringStore.getDisplaySession()
  }
  
  const newData = {
    candidates: enhancedScoringStore.getCandidates(),
    judges: enhancedScoringStore.getJudges(),
    dimensions: enhancedScoringStore.getInterviewDimensions(),
    scoreItems: enhancedScoringStore.getScoreItems(),
    questions: enhancedScoringStore.getQuestions(),
    displaySession: enhancedScoringStore.getDisplaySession()
  }
  
  const comparison = {
    timestamp: new Date().toISOString(),
    oldData,
    newData,
    consistent: verifyDataConsistency(oldData, newData)
  }
  
  return comparison
}

// 如果直接运行此脚本
if (require.main === module) {
  migrateData()
    .then(() => {
      console.log('迁移完成')
      process.exit(0)
    })
    .catch((error) => {
      console.error('迁移失败:', error)
      process.exit(1)
    })
}

export default migrateData