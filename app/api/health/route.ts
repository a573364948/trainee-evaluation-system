import { NextResponse } from "next/server"
import { database } from "@/lib/database"

export async function GET() {
  try {
    // 检查数据库状态
    const dbStatus = database.getStatus()
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: dbStatus,
      enhanced: true
    })
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}