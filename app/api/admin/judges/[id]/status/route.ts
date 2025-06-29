import { type NextRequest, NextResponse } from "next/server"
import { enhancedScoringStore } from "@/lib/scoring-store-enhanced"

// 更新评委在线状态
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await enhancedScoringStore.initialize()
    const body = await request.json()
    const { isActive, isOnline } = body
    const { id } = await params

    // 支持两种参数：isActive（启用/禁用）和 isOnline（在线/离线）
    let judge
    if (typeof isActive !== 'undefined') {
      // 更新启用状态 - 只有管理员操作才应该修改这个状态
      console.log(`[Judge Status API] Updating isActive status for judge ${id}:`, isActive)
      judge = enhancedScoringStore.setJudgeOnlineStatus(id, isActive)
    } else if (typeof isOnline !== 'undefined') {
      // 更新在线状态 - 评委登录/登出时调用，不影响启用状态
      console.log(`[Judge Status API] Updating online status for judge ${id}:`, isOnline)
      judge = enhancedScoringStore.updateJudgeOnlineStatus(id, isOnline)
    } else {
      console.error(`[Judge Status API] No valid parameters provided for judge ${id}`)
      return NextResponse.json({ success: false, error: "Missing parameters" }, { status: 400 })
    }

    if (judge) {
      console.log(`[Judge Status] Updated judge ${judge.name} status:`, { isActive: judge.isActive, isOnline })
      return NextResponse.json({ success: true, judge })
    } else {
      return NextResponse.json({ success: false, error: "Judge not found" }, { status: 404 })
    }
  } catch (error) {
    console.error("更新评委状态失败:", error)
    return NextResponse.json({ success: false, error: "Invalid data" }, { status: 400 })
  }
}
