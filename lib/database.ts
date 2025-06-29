// 数据库持久化层 - 使用文件存储替代内存存储
import fs from 'fs'
import path from 'path'
import type {
  Candidate,
  Judge,
  Score,
  InterviewDimension,
  ScoreItem,
  Batch,
  EnhancedBatch,
  Question,
  InterviewItem,
  DisplaySession,
} from "@/types/scoring"

// 扩展的数据库结构，支持批次管理
export interface EnhancedDatabaseData {
  // 全局系统配置
  systemConfig: {
    activeBatchId?: string
    defaultSettings: {
      maxScore: number
      precision: "integer" | "decimal"
      calculationMethod: "weighted" | "average"
      autoRefresh: boolean
      refreshInterval: number
    }
  }

  // 批次数据（使用增强的批次结构）
  batches: EnhancedBatch[]

  // 系统元数据
  metadata: {
    version: string
    lastUpdated: number
    backupCount: number
    migrationVersion?: number
  }
}

// 保持向后兼容的原始数据库结构
export interface DatabaseData {
  candidates: Candidate[]
  judges: Judge[]
  interviewDimensions: InterviewDimension[]
  scoreItems: ScoreItem[]
  batches: Batch[]
  questions: Question[]
  interviewItems: InterviewItem[]
  displaySession: DisplaySession
  currentCandidateId: string | null
  currentRound: number
  metadata: {
    version: string
    lastUpdated: number
    backupCount: number
  }
}

class Database {
  private dataFile: string
  private enhancedDataFile: string
  private backupDir: string
  private isInitialized = false

  constructor() {
    // 使用项目根目录的data文件夹
    const projectRoot = process.cwd()
    this.dataFile = path.join(projectRoot, 'data', 'scoring-data.json')
    this.enhancedDataFile = path.join(projectRoot, 'data', 'enhanced-scoring-data.json')
    this.backupDir = path.join(projectRoot, 'data', 'backups')

    // 确保数据目录存在
    this.ensureDirectories()
  }

  private ensureDirectories() {
    const dataDir = path.dirname(this.dataFile)
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true })
    }
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true })
    }
  }

  // 初始化数据库，如果文件不存在则创建默认数据
  async initialize(): Promise<DatabaseData> {
    if (this.isInitialized) {
      return this.load()
    }

    try {
      if (fs.existsSync(this.dataFile)) {
        console.log('[Database] Loading existing data from file')
        const data = this.load()
        this.isInitialized = true
        return data
      } else {
        console.log('[Database] Creating new database with default data')
        const defaultData = this.createDefaultData()
        await this.save(defaultData)
        this.isInitialized = true
        return defaultData
      }
    } catch (error) {
      console.error('[Database] Error during initialization:', error)
      // 如果加载失败，返回默认数据
      const defaultData = this.createDefaultData()
      this.isInitialized = true
      return defaultData
    }
  }

  // 加载数据
  load(): DatabaseData {
    try {
      const data = fs.readFileSync(this.dataFile, 'utf8')
      const parsed = JSON.parse(data) as DatabaseData
      
      // 验证数据结构
      if (!this.validateData(parsed)) {
        throw new Error('Invalid data structure')
      }
      
      console.log(`[Database] Loaded data with ${parsed.candidates.length} candidates, ${parsed.judges.length} judges`)
      return parsed
    } catch (error) {
      console.error('[Database] Error loading data:', error)
      throw error
    }
  }

  // 保存数据
  async save(data: DatabaseData): Promise<void> {
    try {
      // 创建备份
      await this.createBackup()
      
      // 更新元数据
      data.metadata = {
        ...data.metadata,
        lastUpdated: Date.now(),
        backupCount: (data.metadata?.backupCount || 0) + 1
      }
      
      // 原子写入 - 先写临时文件，再重命名
      const tempFile = this.dataFile + '.tmp'
      fs.writeFileSync(tempFile, JSON.stringify(data, null, 2))
      fs.renameSync(tempFile, this.dataFile)
      
      console.log('[Database] Data saved successfully')
    } catch (error) {
      console.error('[Database] Error saving data:', error)
      throw error
    }
  }

  // 创建备份
  async createBackup(): Promise<void> {
    try {
      if (!fs.existsSync(this.dataFile)) return
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const backupFile = path.join(this.backupDir, `scoring-data-${timestamp}.json`)
      
      fs.copyFileSync(this.dataFile, backupFile)
      
      // 清理旧备份，只保留最近10个
      await this.cleanupOldBackups()
      
      console.log(`[Database] Backup created: ${backupFile}`)
    } catch (error) {
      console.error('[Database] Error creating backup:', error)
    }
  }

  // 清理旧备份
  private async cleanupOldBackups(): Promise<void> {
    try {
      const files = fs.readdirSync(this.backupDir)
        .filter(file => file.startsWith('scoring-data-') && file.endsWith('.json'))
        .map(file => ({
          name: file,
          path: path.join(this.backupDir, file),
          mtime: fs.statSync(path.join(this.backupDir, file)).mtime
        }))
        .sort((a, b) => b.mtime.getTime() - a.mtime.getTime())

      // 删除超过10个的旧备份
      if (files.length > 10) {
        const filesToDelete = files.slice(10)
        for (const file of filesToDelete) {
          fs.unlinkSync(file.path)
          console.log(`[Database] Deleted old backup: ${file.name}`)
        }
      }
    } catch (error) {
      console.error('[Database] Error cleaning up backups:', error)
    }
  }

  // 恢复备份
  async restoreBackup(backupFileName: string): Promise<DatabaseData> {
    try {
      const backupFile = path.join(this.backupDir, backupFileName)
      if (!fs.existsSync(backupFile)) {
        throw new Error(`Backup file not found: ${backupFileName}`)
      }

      const data = fs.readFileSync(backupFile, 'utf8')
      const parsed = JSON.parse(data) as DatabaseData
      
      if (!this.validateData(parsed)) {
        throw new Error('Invalid backup data structure')
      }

      // 创建当前数据的备份
      await this.createBackup()
      
      // 恢复数据
      await this.save(parsed)
      
      console.log(`[Database] Data restored from backup: ${backupFileName}`)
      return parsed
    } catch (error) {
      console.error('[Database] Error restoring backup:', error)
      throw error
    }
  }

  // 列出所有备份
  listBackups(): Array<{ name: string; date: Date; size: number }> {
    try {
      const files = fs.readdirSync(this.backupDir)
        .filter(file => file.startsWith('scoring-data-') && file.endsWith('.json'))
        .map(file => {
          const filePath = path.join(this.backupDir, file)
          const stats = fs.statSync(filePath)
          return {
            name: file,
            date: stats.mtime,
            size: stats.size
          }
        })
        .sort((a, b) => b.date.getTime() - a.date.getTime())

      return files
    } catch (error) {
      console.error('[Database] Error listing backups:', error)
      return []
    }
  }

  // 导出数据
  async exportData(filePath: string): Promise<void> {
    try {
      const data = this.load()
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
      console.log(`[Database] Data exported to: ${filePath}`)
    } catch (error) {
      console.error('[Database] Error exporting data:', error)
      throw error
    }
  }

  // 导入数据
  async importData(filePath: string): Promise<DatabaseData> {
    try {
      const data = fs.readFileSync(filePath, 'utf8')
      const parsed = JSON.parse(data) as DatabaseData
      
      if (!this.validateData(parsed)) {
        throw new Error('Invalid import data structure')
      }

      // 创建当前数据的备份
      await this.createBackup()
      
      // 导入数据
      await this.save(parsed)
      
      console.log(`[Database] Data imported from: ${filePath}`)
      return parsed
    } catch (error) {
      console.error('[Database] Error importing data:', error)
      throw error
    }
  }

  // 验证数据结构
  private validateData(data: any): data is DatabaseData {
    return (
      data &&
      Array.isArray(data.candidates) &&
      Array.isArray(data.judges) &&
      Array.isArray(data.interviewDimensions) &&
      Array.isArray(data.scoreItems) &&
      Array.isArray(data.batches) &&
      Array.isArray(data.questions) &&
      Array.isArray(data.interviewItems) &&
      data.displaySession &&
      typeof data.currentRound === 'number'
    )
  }

  // 创建默认数据
  private createDefaultData(): DatabaseData {
    const now = Date.now()
    
    return {
      candidates: [
        {
          id: "1",
          name: "刘明",
          number: "TC001",
          department: "运营部",
          currentRound: 1,
          totalScore: 0,
          scores: [],
          otherScores: [
            { itemId: "1", itemName: "笔试成绩", score: 85, timestamp: now },
            { itemId: "3", itemName: "日常表现", score: 90, timestamp: now },
          ],
          finalScore: 0,
          status: "waiting",
        },
        {
          id: "2",
          name: "王芳",
          number: "TC002",
          department: "调度部",
          currentRound: 1,
          totalScore: 0,
          scores: [],
          otherScores: [
            { itemId: "1", itemName: "笔试成绩", score: 92, timestamp: now },
            { itemId: "3", itemName: "日常表现", score: 88, timestamp: now },
          ],
          finalScore: 0,
          status: "waiting",
        },
        {
          id: "3",
          name: "张强",
          number: "TC003",
          department: "运营部",
          currentRound: 1,
          totalScore: 0,
          scores: [],
          otherScores: [
            { itemId: "1", itemName: "笔试成绩", score: 78, timestamp: now },
            { itemId: "3", itemName: "日常表现", score: 85, timestamp: now },
          ],
          finalScore: 0,
          status: "waiting",
        },
        {
          id: "4",
          name: "李娜",
          number: "TC004",
          department: "安全部",
          currentRound: 1,
          totalScore: 0,
          scores: [],
          otherScores: [
            { itemId: "1", itemName: "笔试成绩", score: 88, timestamp: now },
            { itemId: "3", itemName: "日常表现", score: 92, timestamp: now },
          ],
          finalScore: 0,
          status: "waiting",
        },
        {
          id: "5",
          name: "陈伟",
          number: "TC005",
          department: "调度部",
          currentRound: 1,
          totalScore: 0,
          scores: [],
          otherScores: [
            { itemId: "1", itemName: "笔试成绩", score: 82, timestamp: now },
            { itemId: "3", itemName: "日常表现", score: 87, timestamp: now },
          ],
          finalScore: 0,
          status: "waiting",
        },
      ],
      judges: [
        { id: "1", name: "张主任", password: "123456", isActive: true },
        { id: "2", name: "李经理", password: "123456", isActive: true },
        { id: "3", name: "王专家", password: "123456", isActive: true },
        { id: "4", name: "赵组长", password: "123456", isActive: true },
        { id: "5", name: "陈主管", password: "123456", isActive: true },
      ],
      interviewDimensions: [
        {
          id: "1",
          name: "专业能力",
          description: "专业知识掌握程度和实际应用能力",
          maxScore: 25,
          order: 1,
          isActive: true,
        },
        {
          id: "2",
          name: "沟通表达",
          description: "语言表达清晰度和沟通技巧",
          maxScore: 20,
          order: 2,
          isActive: true,
        },
        {
          id: "3",
          name: "领导能力",
          description: "团队管理和决策能力",
          maxScore: 25,
          order: 3,
          isActive: true,
        },
        {
          id: "4",
          name: "应急处理",
          description: "突发情况的应对和处理能力",
          maxScore: 15,
          order: 4,
          isActive: true,
        },
        {
          id: "5",
          name: "综合素质",
          description: "整体素养和职业形象",
          maxScore: 15,
          order: 5,
          isActive: true,
        },
      ],
      scoreItems: [
        {
          id: "1",
          name: "笔试成绩",
          description: "理论知识考试成绩",
          maxScore: 100,
          weight: 30,
          order: 1,
          isActive: true,
        },
        {
          id: "2",
          name: "面试成绩",
          description: "面试综合评分",
          maxScore: 100,
          weight: 50,
          order: 2,
          isActive: true,
        },
        {
          id: "3",
          name: "日常表现",
          description: "工作表现和综合评价",
          maxScore: 100,
          weight: 20,
          order: 3,
          isActive: true,
        },
      ],
      questions: [
        {
          id: "1",
          title: "专业知识问答",
          content: "请简述列车长在日常工作中的主要职责和安全管理要点。",
          timeLimit: 300,
          category: "专业能力",
          difficulty: "medium",
          order: 1,
          isActive: true,
        },
        {
          id: "2",
          title: "应急处理场景",
          content: "假设列车在运行过程中遇到突发故障，作为列车长您将如何处理？请详细说明处理流程。",
          timeLimit: 420,
          category: "应急处理",
          difficulty: "hard",
          order: 2,
          isActive: true,
        },
        {
          id: "3",
          title: "团队管理案例",
          content: "描述一次您成功解决团队内部矛盾或协调不同部门合作的经历。",
          timeLimit: 360,
          category: "领导能力",
          difficulty: "medium",
          order: 3,
          isActive: true,
        },
        {
          id: "4",
          title: "服务理念阐述",
          content: "谈谈您对铁路客运服务理念的理解，以及如何在实际工作中体现。",
          timeLimit: 240,
          category: "综合素质",
          difficulty: "easy",
          order: 4,
          isActive: true,
        },
      ],
      interviewItems: [
        {
          id: "1",
          type: 'question' as const,
          title: "专业知识问答",
          subtitle: "专业能力",
          content: "请简述列车长在日常工作中的主要职责和安全管理要点。",
          timeLimit: 300,
          order: 1,
          isActive: true
        },
        {
          id: "2",
          type: 'question' as const,
          title: "应急处理场景",
          subtitle: "应急处理",
          content: "假设列车在运行过程中遇到突发故障，作为列车长您将如何处理？请详细说明处理流程。",
          timeLimit: 420,
          order: 2,
          isActive: true
        },
        {
          id: "3",
          type: 'question' as const,
          title: "团队管理案例",
          subtitle: "领导能力",
          content: "描述一次您成功解决团队内部矛盾或协调不同部门合作的经历。",
          timeLimit: 360,
          order: 3,
          isActive: true
        },
        {
          id: "4",
          type: 'question' as const,
          title: "服务理念阐述",
          subtitle: "综合素质",
          content: "谈谈您对铁路客运服务理念的理解，以及如何在实际工作中体现。",
          timeLimit: 240,
          order: 4,
          isActive: true
        },
      ],
      batches: [],
      displaySession: {
        id: "main",
        currentStage: "opening",
        settings: {
          showTimer: true,
          showProgress: true,
          autoAdvance: false,
        },
      },
      currentCandidateId: "1",
      currentRound: 1,
      metadata: {
        version: "1.0.0",
        lastUpdated: now,
        backupCount: 0
      }
    }
  }

  // 获取数据库状态
  getStatus(): {
    exists: boolean
    size: number
    lastModified: Date | null
    backupCount: number
  } {
    try {
      if (fs.existsSync(this.dataFile)) {
        const stats = fs.statSync(this.dataFile)
        const backups = this.listBackups()
        return {
          exists: true,
          size: stats.size,
          lastModified: stats.mtime,
          backupCount: backups.length
        }
      } else {
        return {
          exists: false,
          size: 0,
          lastModified: null,
          backupCount: 0
        }
      }
    } catch (error) {
      console.error('[Database] Error getting status:', error)
      return {
        exists: false,
        size: 0,
        lastModified: null,
        backupCount: 0
      }
    }
  }

  // ==================== 增强数据处理方法 ====================

  // 初始化增强数据结构
  async initializeEnhanced(): Promise<EnhancedDatabaseData> {
    try {
      if (fs.existsSync(this.enhancedDataFile)) {
        console.log('[Database] Loading existing enhanced data from file')
        const data = this.loadEnhanced()
        return data
      } else {
        console.log('[Database] Creating new enhanced database')

        // 检查是否需要从旧数据迁移
        const legacyData = await this.checkLegacyDataMigration()
        if (legacyData) {
          console.log('[Database] Migrating legacy data to enhanced format')
          await this.saveEnhanced(legacyData)
          return legacyData
        }

        // 创建全新的增强数据
        const defaultData = this.createDefaultEnhancedData()
        await this.saveEnhanced(defaultData)
        return defaultData
      }
    } catch (error) {
      console.error('[Database] Error during enhanced initialization:', error)
      // 如果加载失败，返回默认数据
      const defaultData = this.createDefaultEnhancedData()
      return defaultData
    }
  }

  // 加载增强数据
  loadEnhanced(): EnhancedDatabaseData {
    try {
      const data = fs.readFileSync(this.enhancedDataFile, 'utf8')
      const parsed = JSON.parse(data) as EnhancedDatabaseData

      // 验证数据结构
      if (!this.validateEnhancedData(parsed)) {
        throw new Error('Invalid enhanced data structure')
      }

      console.log(`[Database] Loaded enhanced data with ${parsed.batches.length} batches`)
      return parsed
    } catch (error) {
      console.error('[Database] Error loading enhanced data:', error)
      throw error
    }
  }

  // 保存增强数据
  async saveEnhanced(data: EnhancedDatabaseData): Promise<void> {
    try {
      // 更新时间戳
      data.metadata.lastUpdated = Date.now()

      // 创建备份
      if (fs.existsSync(this.enhancedDataFile)) {
        await this.createEnhancedBackup()
      }

      // 保存数据
      const jsonData = JSON.stringify(data, null, 2)
      fs.writeFileSync(this.enhancedDataFile, jsonData, 'utf8')

      console.log('[Database] Enhanced data saved successfully')
    } catch (error) {
      console.error('[Database] Error saving enhanced data:', error)
      throw error
    }
  }

  // 创建默认增强数据
  private createDefaultEnhancedData(): EnhancedDatabaseData {
    return {
      systemConfig: {
        defaultSettings: {
          maxScore: 100,
          precision: "integer",
          calculationMethod: "weighted",
          autoRefresh: true,
          refreshInterval: 5000,
        }
      },
      batches: [],
      metadata: {
        version: "2.0.0",
        lastUpdated: Date.now(),
        backupCount: 0,
        migrationVersion: 1
      }
    }
  }

  // 验证增强数据结构
  private validateEnhancedData(data: any): data is EnhancedDatabaseData {
    return (
      data &&
      typeof data === 'object' &&
      data.systemConfig &&
      Array.isArray(data.batches) &&
      data.metadata &&
      typeof data.metadata.version === 'string'
    )
  }

  // 检查是否需要从旧数据迁移
  private async checkLegacyDataMigration(): Promise<EnhancedDatabaseData | null> {
    try {
      if (!fs.existsSync(this.dataFile)) {
        return null
      }

      console.log('[Database] Found legacy data, preparing migration...')
      const legacyData = this.load()

      // 创建包装旧数据的增强批次
      const migrationBatch: EnhancedBatch = {
        id: 'legacy-batch-' + Date.now(),
        name: '历史数据批次',
        description: '系统升级前的数据自动迁移',
        status: 'active',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastActiveAt: Date.now(),
        config: {
          judges: legacyData.judges.map(({ id, ...judge }) => judge),
          dimensions: legacyData.interviewDimensions.map(({ id, ...dimension }) => dimension),
          scoreItems: legacyData.scoreItems.map(({ id, ...item }) => item),
          interviewItems: legacyData.interviewItems?.map(({ id, ...item }) => item) || [],
          systemSettings: {
            maxScore: 100,
            precision: "integer",
            calculationMethod: "weighted",
            autoRefresh: true,
            refreshInterval: 5000,
          }
        },
        runtime: {
          candidates: legacyData.candidates || [],
          currentCandidateId: legacyData.currentCandidateId || undefined,
          currentRound: legacyData.currentRound || 1,
          displaySession: legacyData.displaySession,
          currentStage: legacyData.displaySession?.currentStage || "opening",
          totalScores: this.calculateTotalScores(legacyData.candidates || []),
          metadata: {
            totalCandidates: (legacyData.candidates || []).length,
            completedCandidates: (legacyData.candidates || []).filter(c => c.status === 'completed').length,
            averageScore: this.calculateAverageScore(legacyData.candidates || []),
            lastUpdated: Date.now()
          }
        }
      }

      const enhancedData: EnhancedDatabaseData = {
        systemConfig: {
          activeBatchId: migrationBatch.id,
          defaultSettings: {
            maxScore: 100,
            precision: "integer",
            calculationMethod: "weighted",
            autoRefresh: true,
            refreshInterval: 5000,
          }
        },
        batches: [migrationBatch],
        metadata: {
          version: "2.0.0",
          lastUpdated: Date.now(),
          backupCount: 0,
          migrationVersion: 1
        }
      }

      return enhancedData
    } catch (error) {
      console.error('[Database] Error during legacy data migration:', error)
      return null
    }
  }

  // 计算总分数
  private calculateTotalScores(candidates: Candidate[]): number {
    return candidates.reduce((total, candidate) => total + (candidate.totalScore || 0), 0)
  }

  // 计算平均分
  private calculateAverageScore(candidates: Candidate[]): number {
    if (candidates.length === 0) return 0
    const totalScore = this.calculateTotalScores(candidates)
    return Math.round((totalScore / candidates.length) * 100) / 100
  }

  // 创建增强数据备份
  private async createEnhancedBackup(): Promise<string> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const backupName = `enhanced-backup-${timestamp}.json`
      const backupPath = path.join(this.backupDir, backupName)

      fs.copyFileSync(this.enhancedDataFile, backupPath)
      console.log(`[Database] Enhanced backup created: ${backupName}`)

      return backupName
    } catch (error) {
      console.error('[Database] Error creating enhanced backup:', error)
      throw error
    }
  }
}

// 导出单例
export const database = new Database()