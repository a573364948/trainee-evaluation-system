// 数据导出API
import { NextRequest, NextResponse } from "next/server"
import { enhancedScoringStore } from "@/lib/scoring-store-enhanced"
import path from 'path'

export async function POST(request: NextRequest) {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const fileName = `scoring-export-${timestamp}.json`
    const filePath = path.join(process.cwd(), 'data', 'exports', fileName)
    
    // 确保导出目录存在
    const fs = require('fs')
    const exportDir = path.dirname(filePath)
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true })
    }

    await enhancedScoringStore.exportData(filePath)
    
    return NextResponse.json({
      success: true,
      fileName,
      filePath,
      timestamp: Date.now()
    })
  } catch (error) {
    console.error('[Export API] Error exporting data:', error)
    return NextResponse.json({
      success: false,
      error: "Failed to export data"
    }, { status: 500 })
  }
}

// 下载导出文件
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const fileName = searchParams.get('file')
    
    if (!fileName) {
      return NextResponse.json({
        success: false,
        error: "File name is required"
      }, { status: 400 })
    }

    const filePath = path.join(process.cwd(), 'data', 'exports', fileName)
    const fs = require('fs')
    
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({
        success: false,
        error: "File not found"
      }, { status: 404 })
    }

    const fileContent = fs.readFileSync(filePath)
    
    return new NextResponse(fileContent, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    })
  } catch (error) {
    console.error('[Export API] Error downloading file:', error)
    return NextResponse.json({
      success: false,
      error: "Failed to download file"
    }, { status: 500 })
  }
}