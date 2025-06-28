import { NextResponse } from "next/server"
import { enhancedScoringStore } from "@/lib/scoring-store-enhanced"

// 获取所有题目
export async function GET() {
  await enhancedScoringStore.initialize()
  const questions = enhancedScoringStore.getQuestions()
  return NextResponse.json({ questions })
}
