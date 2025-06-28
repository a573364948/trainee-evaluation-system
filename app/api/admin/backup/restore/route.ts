// 数据恢复API
import { NextRequest, NextResponse } from "next/server"
import { enhancedScoringStore } from "@/lib/scoring-store-enhanced"

export async function POST(request: NextRequest) {
  try {
    const { backupFileName } = await request.json()
    
    if (!backupFileName) {
      return NextResponse.json({
        success: false,
        error: "Backup file name is required"
      }, { status: 400 })
    }

    await enhancedScoringStore.restoreBackup(backupFileName)
    
    return NextResponse.json({
      success: true,
      backupFileName,
      timestamp: Date.now()
    })
  } catch (error) {
    console.error('[Restore API] Error restoring backup:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to restore backup"
    }, { status: 500 })
  }
}