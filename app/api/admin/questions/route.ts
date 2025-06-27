import { NextResponse } from "next/server"
import { scoringStore } from "@/lib/scoring-store"

// 获取所有题目
export async function GET() {
  const questions = scoringStore.getQuestions()
  return NextResponse.json({ questions })
}
