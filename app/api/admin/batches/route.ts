import { type NextRequest, NextResponse } from "next/server"
import { enhancedScoringStore } from "@/lib/scoring-store-enhanced"

// 获取所有批次
export async function GET() {
  await enhancedScoringStore.initialize()
  const batches = enhancedScoringStore.getBatches()
  return NextResponse.json({ batches })
}

// 保存新批次
export async function POST(request: NextRequest) {
  try {
    await enhancedScoringStore.initialize()
    const batchData = await request.json()
    const batch = enhancedScoringStore.saveBatch(batchData)
    return NextResponse.json({ success: true, batch })
  } catch (error) {
    console.error("保存批次失败:", error)
    return NextResponse.json({ success: false, error: "Invalid data" }, { status: 400 })
  }
}
