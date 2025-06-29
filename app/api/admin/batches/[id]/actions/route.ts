import { type NextRequest, NextResponse } from "next/server"
import { enhancedScoringStore } from "@/lib/scoring-store-enhanced"

// 批次操作API - 开始、暂停、恢复、完成批次
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await enhancedScoringStore.initialize()
    const { action } = await request.json()
    const batchId = params.id

    console.log(`[BatchActions] Executing action: ${action} for batch: ${batchId}`)

    switch (action) {
      case 'start':
        await enhancedScoringStore.startBatch(batchId)
        return NextResponse.json({ 
          success: true, 
          message: '批次已开始',
          action: 'start',
          batchId 
        })

      case 'pause':
        await enhancedScoringStore.pauseBatch(batchId)
        return NextResponse.json({ 
          success: true, 
          message: '批次已暂停',
          action: 'pause',
          batchId 
        })

      case 'resume':
        await enhancedScoringStore.resumeBatch(batchId)
        return NextResponse.json({ 
          success: true, 
          message: '批次已恢复',
          action: 'resume',
          batchId 
        })

      case 'complete':
        await enhancedScoringStore.completeBatch(batchId)
        return NextResponse.json({ 
          success: true, 
          message: '批次已完成',
          action: 'complete',
          batchId 
        })

      default:
        return NextResponse.json({ 
          success: false, 
          error: `Unknown action: ${action}` 
        }, { status: 400 })
    }
  } catch (error) {
    console.error(`批次操作失败:`, error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 })
  }
}
