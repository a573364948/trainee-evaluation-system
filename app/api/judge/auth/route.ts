import { type NextRequest, NextResponse } from "next/server"
import { enhancedScoringStore } from "@/lib/scoring-store-enhanced"

export async function POST(request: NextRequest) {
  try {
    await enhancedScoringStore.initialize()
    const { judgeId, password } = await request.json()

    if (!judgeId || !password) {
      return NextResponse.json(
        { success: false, error: "评委ID和密码不能为空" },
        { status: 400 }
      )
    }

    // 获取评委信息
    const judges = enhancedScoringStore.getJudges()
    const judge = judges.find(j => j.id === judgeId)

    console.log(`[Judge Auth] Authentication attempt for judgeId: ${judgeId}`)
    console.log(`[Judge Auth] Total judges in system: ${judges.length}`)
    console.log(`[Judge Auth] Judge found:`, judge ? `${judge.name} (isActive: ${judge.isActive})` : 'Not found')

    if (!judge) {
      console.log(`[Judge Auth] Judge not found for ID: ${judgeId}`)
      return NextResponse.json(
        { success: false, error: "评委不存在" },
        { status: 404 }
      )
    }

    // 验证密码
    if (judge.password !== password) {
      console.log(`[Judge Auth] Password mismatch for judge: ${judge.name}`)
      return NextResponse.json(
        { success: false, error: "密码错误" },
        { status: 401 }
      )
    }

    // 检查评委是否激活
    if (!judge.isActive) {
      console.log(`[Judge Auth] Judge ${judge.name} is not active (isActive: ${judge.isActive})`)
      return NextResponse.json(
        { success: false, error: "账户已被禁用，请联系管理员" },
        { status: 403 }
      )
    }

    // 认证成功
    console.log(`[Judge Auth] Judge ${judge.name} authenticated successfully`)
    
    return NextResponse.json({
      success: true,
      judge: {
        id: judge.id,
        name: judge.name,
        title: judge.title,
        isActive: judge.isActive
      }
    })

  } catch (error) {
    console.error("[Judge Auth] Authentication error:", error)
    return NextResponse.json(
      { success: false, error: "认证过程中发生错误" },
      { status: 500 }
    )
  }
}
