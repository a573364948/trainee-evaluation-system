import { type NextRequest, NextResponse } from "next/server"
import { enhancedScoringStore } from "@/lib/scoring-store-enhanced"

export async function GET() {
  await enhancedScoringStore.initialize()
  const dimensions = enhancedScoringStore.getInterviewDimensions()
  return NextResponse.json({ dimensions })
}

export async function POST(request: NextRequest) {
  try {
    await enhancedScoringStore.initialize()
    const dimensionData = await request.json()
    const dimension = enhancedScoringStore.addInterviewDimension(dimensionData)
    return NextResponse.json({ success: true, dimension })
  } catch (error) {
    console.error("添加维度失败:", error)
    return NextResponse.json({ success: false, error: "Invalid data" }, { status: 400 })
  }
}
