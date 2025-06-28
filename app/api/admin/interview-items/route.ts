import { type NextRequest, NextResponse } from "next/server"
import { enhancedScoringStore } from "@/lib/scoring-store-enhanced"
import type { InterviewItem } from "@/types/scoring"

// 获取所有面试项目
export async function GET() {
  try {
    await enhancedScoringStore.initialize()
    const items = enhancedScoringStore.getInterviewItems()
    return NextResponse.json({ items })
  } catch (error) {
    console.error("获取面试项目失败:", error)
    return NextResponse.json({ error: "获取面试项目失败" }, { status: 500 })
  }
}

// 保存面试项目
export async function POST(request: NextRequest) {
  try {
    await enhancedScoringStore.initialize()
    const { items } = await request.json()

    if (!Array.isArray(items)) {
      return NextResponse.json({ error: "Invalid data format" }, { status: 400 })
    }

    // 验证每个项目的数据格式
    for (const item of items) {
      if (!item.id || !item.title || !item.type) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
      }

      if (!['question', 'interview_stage'].includes(item.type)) {
        return NextResponse.json({ error: "Invalid item type" }, { status: 400 })
      }
    }

    enhancedScoringStore.setInterviewItems(items)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("保存面试项目失败:", error)
    return NextResponse.json({ error: "保存面试项目失败" }, { status: 500 })
  }
}
