// 数据备份和恢复API
import { NextRequest, NextResponse } from "next/server"
import { enhancedScoringStore } from "@/lib/scoring-store-enhanced"
import { database } from "@/lib/database"

// 创建备份
export async function POST(request: NextRequest) {
  try {
    const backupName = await enhancedScoringStore.createBackup()
    
    return NextResponse.json({
      success: true,
      backupName,
      timestamp: Date.now()
    })
  } catch (error) {
    console.error('[Backup API] Error creating backup:', error)
    return NextResponse.json({
      success: false,
      error: "Failed to create backup"
    }, { status: 500 })
  }
}

// 获取备份列表
export async function GET() {
  try {
    const backups = enhancedScoringStore.listBackups()
    const systemStatus = enhancedScoringStore.getSystemStatus()
    
    return NextResponse.json({
      success: true,
      backups,
      systemStatus
    })
  } catch (error) {
    console.error('[Backup API] Error listing backups:', error)
    return NextResponse.json({
      success: false,
      error: "Failed to list backups"
    }, { status: 500 })
  }
}