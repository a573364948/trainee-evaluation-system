import { type NextRequest, NextResponse } from "next/server"
import { enhancedScoringStore } from "@/lib/scoring-store-enhanced"

// 获取所有批次（增强版）
export async function GET(request: NextRequest) {
  try {
    await enhancedScoringStore.initialize()

    // 检查是否请求增强批次
    const { searchParams } = new URL(request.url)
    const enhanced = searchParams.get('enhanced') === 'true'

    if (enhanced) {
      const batches = await enhancedScoringStore.getEnhancedBatches()
      const activeBatch = await enhancedScoringStore.getActiveBatch()
      const currentBatch = enhancedScoringStore.getCurrentBatch()

      return NextResponse.json({
        success: true,
        batches,
        activeBatch,
        currentBatch
      })
    } else {
      // 传统模式
      const batches = enhancedScoringStore.getBatches()
      return NextResponse.json({ batches })
    }
  } catch (error) {
    console.error("获取批次失败:", error)
    return NextResponse.json({ success: false, error: "Failed to get batches" }, { status: 500 })
  }
}

// 创建新批次（增强版）
export async function POST(request: NextRequest) {
  try {
    await enhancedScoringStore.initialize()
    const { name, description, enhanced } = await request.json()

    if (enhanced) {
      // 创建增强批次
      const batch = await enhancedScoringStore.createEnhancedBatch(name, description)
      return NextResponse.json({ success: true, batch, enhanced: true })
    } else {
      // 传统批次创建
      const batchData = { name, description }
      const batch = enhancedScoringStore.saveBatch(batchData)
      return NextResponse.json({ success: true, batch, enhanced: false })
    }
  } catch (error) {
    console.error("创建批次失败:", error)
    return NextResponse.json({ success: false, error: "Failed to create batch" }, { status: 400 })
  }
}
