import { type NextRequest, NextResponse } from "next/server"
import { scoringStore } from "@/lib/scoring-store"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ success: false, error: "No file uploaded" }, { status: 400 })
    }

    // 检查文件类型
    const allowedTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
      "application/vnd.ms-excel", // .xls
      "text/csv", // .csv
    ]

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: "不支持的文件格式，请上传Excel文件(.xlsx, .xls)或CSV文件" },
        { status: 400 },
      )
    }

    // 读取文件内容
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    let candidates: any[] = []

    if (file.type.includes("csv")) {
      // 处理CSV文件
      const text = buffer.toString("utf-8")
      const lines = text.trim().split("\n")

      // 跳过标题行（如果存在）
      const dataLines = lines[0].includes("姓名") || lines[0].includes("name") ? lines.slice(1) : lines

      candidates = dataLines.map((line, index) => {
        const columns = line.split(",").map((s) => s.trim())
        const [name, number, department] = columns

        if (!name || !number) {
          throw new Error(`第${index + 1}行数据格式错误：姓名或工号为空`)
        }

        return {
          name,
          number,
          department: department || "未分配", // 如果没有部门信息，使用默认值
          currentRound: 1,
          status: "waiting" as const,
        }
      })
    } else {
      // 处理Excel文件
      const text = buffer.toString("utf-8")

      try {
        // 尝试解析为CSV格式（Excel导出的CSV）
        const lines = text.trim().split("\n")
        const dataLines = lines[0].includes("姓名") || lines[0].includes("name") ? lines.slice(1) : lines

        candidates = dataLines.map((line, index) => {
          const columns = line.split(/[,\t]/).map((s) => s.trim())
          const [name, number, department] = columns

          if (!name || !number) {
            throw new Error(`第${index + 1}行数据格式错误：姓名或工号为空`)
          }

          return {
            name,
            number,
            department: department || "未分配",
            currentRound: 1,
            status: "waiting" as const,
          }
        })
      } catch (error) {
        return NextResponse.json(
          { success: false, error: "Excel文件格式错误，请确保包含姓名、工号、部门三列" },
          { status: 400 },
        )
      }
    }

    if (candidates.length === 0) {
      return NextResponse.json({ success: false, error: "文件中没有找到有效的候选人数据" }, { status: 400 })
    }

    // 批量添加候选人
    const addedCandidates = scoringStore.batchAddCandidates(candidates)

    return NextResponse.json({
      success: true,
      message: `成功导入 ${addedCandidates.length} 个候选人`,
      candidates: addedCandidates,
    })
  } catch (error) {
    console.error("文件上传处理错误:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "文件处理失败" },
      { status: 500 },
    )
  }
}
