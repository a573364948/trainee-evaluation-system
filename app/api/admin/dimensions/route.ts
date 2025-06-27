import { type NextRequest, NextResponse } from "next/server"
import { scoringStore } from "@/lib/scoring-store"

export async function GET() {
  const dimensions = scoringStore.getInterviewDimensions()
  return NextResponse.json({ dimensions })
}

export async function POST(request: NextRequest) {
  try {
    const dimensionData = await request.json()
    const dimension = scoringStore.addInterviewDimension(dimensionData)
    return NextResponse.json({ success: true, dimension })
  } catch (error) {
    console.error("添加维度失败:", error)
    return NextResponse.json({ success: false, error: "Invalid data" }, { status: 400 })
  }
}
