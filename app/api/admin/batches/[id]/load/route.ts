import { type NextRequest, NextResponse } from "next/server"
import { enhancedScoringStore } from "@/lib/scoring-store-enhanced"

// 加载批次配置（增强版）
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await enhancedScoringStore.initialize()
    const { enhanced } = await request.json().catch(() => ({ enhanced: true }))

    let success = false

    if (enhanced) {
      // 加载增强批次
      success = await enhancedScoringStore.loadEnhancedBatch(params.id)
    } else {
      // 加载传统批次
      success = enhancedScoringStore.loadBatch(params.id)
    }

    if (success) {
      return NextResponse.json({
        success: true,
        enhanced,
        batchId: params.id
      })
    } else {
      return NextResponse.json({
        success: false,
        error: "Batch not found"
      }, { status: 404 })
    }
  } catch (error) {
    console.error("加载批次失败:", error)
    return NextResponse.json({
      success: false,
      error: "Internal server error"
    }, { status: 500 })
  }
}
