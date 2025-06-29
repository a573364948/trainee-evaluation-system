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

    console.log("[API] 接收到面试项目保存请求，项目数量:", items?.length)
    console.log("[API] 面试项目详细数据:", JSON.stringify(items, null, 2))

    if (!Array.isArray(items)) {
      return NextResponse.json({ error: "Invalid data format" }, { status: 400 })
    }

    // 验证每个项目的数据格式
    for (const item of items) {
      if (!item.id || !item.title || !item.type) {
        console.error("[API] 项目数据验证失败:", item)
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
      }

      if (!['question', 'interview_stage'].includes(item.type)) {
        console.error("[API] 项目类型无效:", item.type)
        return NextResponse.json({ error: "Invalid item type" }, { status: 400 })
      }
    }

    console.log("[API] 开始保存面试项目到数据库...")
    console.log("[API] 保存前检查题目2:", items.find(item => item.id === "2"))

    enhancedScoringStore.setInterviewItems(items)

    // 等待一下确保保存完成
    await new Promise(resolve => setTimeout(resolve, 100))

    // 验证保存结果
    const savedItems = enhancedScoringStore.getInterviewItems()
    const savedItem2 = savedItems.find(item => item.id === "2")
    console.log("[API] 保存后检查题目2:", savedItem2)
    console.log("[API] 面试项目保存成功")

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("保存面试项目失败:", error)
    return NextResponse.json({ error: "保存面试项目失败" }, { status: 500 })
  }
}
