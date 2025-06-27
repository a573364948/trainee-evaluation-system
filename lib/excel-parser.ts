// Excel解析工具类
// 注意：在实际项目中，建议使用专门的Excel解析库如 'xlsx' 或 'exceljs'

export interface ExcelRow {
  name: string
  number: string
}

export class ExcelParser {
  static parseCSV(content: string): ExcelRow[] {
    const lines = content.trim().split("\n")
    const results: ExcelRow[] = []

    // 检测是否有标题行
    const firstLine = lines[0].toLowerCase()
    const hasHeader = firstLine.includes("姓名") || firstLine.includes("name") || firstLine.includes("编号")

    const dataLines = hasHeader ? lines.slice(1) : lines

    for (let i = 0; i < dataLines.length; i++) {
      const line = dataLines[i].trim()
      if (!line) continue

      // 支持逗号和制表符分隔
      const columns = line.split(/[,\t]/).map((col) => col.trim().replace(/"/g, ""))

      if (columns.length < 2) {
        throw new Error(`第${i + 1}行数据不完整，需要包含姓名和编号`)
      }

      const [name, number] = columns

      if (!name || !number) {
        throw new Error(`第${i + 1}行数据格式错误：姓名或编号为空`)
      }

      // 验证编号格式（可选）
      if (!/^[A-Za-z0-9]+$/.test(number)) {
        console.warn(`第${i + 1}行编号格式可能不规范：${number}`)
      }

      results.push({ name, number })
    }

    return results
  }

  static validateData(data: ExcelRow[]): { valid: ExcelRow[]; errors: string[] } {
    const valid: ExcelRow[] = []
    const errors: string[] = []
    const seenNumbers = new Set<string>()

    for (let i = 0; i < data.length; i++) {
      const row = data[i]

      // 检查重复编号
      if (seenNumbers.has(row.number)) {
        errors.push(`编号 ${row.number} 重复出现`)
        continue
      }

      seenNumbers.add(row.number)
      valid.push(row)
    }

    return { valid, errors }
  }

  static generateSampleData(): string {
    return `姓名,编号
张三,TC001
李四,TC002
王五,TC003
赵六,TC004
钱七,TC005
孙八,TC006
周九,TC007
吴十,TC008`
  }
}
