import { type NextRequest, NextResponse } from "next/server"
import { scoringStore } from "@/lib/scoring-store"

// 加载批次配置
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const success = scoringStore.loadBatch(params.id)
    if (success) {
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json({ success: false, error: "Batch not found" }, { status: 404 })
    }
  } catch (error) {
    console.error("加载批次失败:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
