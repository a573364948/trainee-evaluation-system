// 增强版评分存储 - 集成数据库持久化、批次管理和并发优化
import { database, type DatabaseData, type EnhancedDatabaseData } from './database'
import { batchManager, type BatchConfig, type RuntimeData } from './batch-manager'
import { initializeWebSocketManager, broadcastEvent, isWebSocketServerRunning } from './websocket/manager'
import type {
  Candidate,
  Judge,
  Score,
  ScoringEvent,
  InterviewDimension,
  ScoreItem,
  Batch,
  EnhancedBatch,
  BatchStatus,
  DisplaySession,
  Question,
  InterviewItem,
} from "@/types/scoring"

// 连接状态管理
export interface ConnectionInfo {
  id: string
  type: 'judge' | 'admin' | 'display'
  judgeId?: string
  connectedAt: number
  lastHeartbeat: number
  isActive: boolean
}

class EnhancedScoringStore {
  // 批次管理模式标志
  private batchMode = false
  private currentBatchId: string | null = null

  // 原有数据存储（在非批次模式下使用）
  private candidates: Map<string, Candidate> = new Map()
  private judges: Map<string, Judge> = new Map()
  private interviewDimensions: Map<string, InterviewDimension> = new Map()
  private scoreItems: Map<string, ScoreItem> = new Map()
  private batches: Map<string, Batch> = new Map()
  private questions: Map<string, Question> = new Map()
  private interviewItems: Map<string, InterviewItem> = new Map()
  private currentCandidateId: string | null = null
  private currentRound = 1
  private displaySession: DisplaySession = {
    id: "main",
    currentStage: "opening",
    settings: {
      showTimer: true,
      showProgress: true,
      autoAdvance: false,
    },
  }

  // 事件监听器和连接管理
  private eventListeners: ((event: ScoringEvent) => void)[] = []
  private connections: Map<string, ConnectionInfo> = new Map()
  private heartbeatInterval: NodeJS.Timeout | null = null
  private autoSaveInterval: NodeJS.Timeout | null = null
  private isInitialized = false

  // 性能优化 - 批处理和防抖
  private pendingSave = false
  private saveTimeout: NodeJS.Timeout | null = null
  private readonly SAVE_DEBOUNCE_MS = 1000 // 1秒防抖

  constructor() {
    this.startHeartbeatMonitor()
    this.startAutoSave()
  }

  // ==================== 初始化和数据加载 ====================
  
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      // 即使已初始化，也要检查监听器状态
      console.log(`[EnhancedStore] Already initialized, current listeners: ${this.eventListeners.length}`)
      return
    }

    try {
      console.log('[EnhancedStore] Initializing with enhanced batch management...')

      // 初始化批次管理器
      await batchManager.initialize()

      // 检查是否有活跃批次
      const activeBatch = await batchManager.getActiveBatch()
      if (activeBatch) {
        console.log('[EnhancedStore] Found active batch, switching to batch mode:', activeBatch.name)
        await this.switchToBatchMode(activeBatch.id)
      } else {
        console.log('[EnhancedStore] No active batch found, using legacy mode')
        const data = await database.initialize()
        await this.loadFromDatabase(data)
      }

      // 初始化WebSocket服务器（只在第一次初始化时）
      if (!isWebSocketServerRunning()) {
        console.log('[EnhancedStore] Initializing WebSocket server...')
        initializeWebSocketManager()
      } else {
        console.log('[EnhancedStore] WebSocket server already running')
      }

      this.isInitialized = true
      console.log('[EnhancedStore] Initialization completed with batch management support')
    } catch (error) {
      console.error('[EnhancedStore] Initialization failed:', error)
      // 回退到内存模式
      this.initializeDefaultData()
      this.isInitialized = true
    }
  }

  // 强制重新初始化（用于开发环境热重载）
  async forceInitialize(): Promise<void> {
    console.log('[EnhancedStore] Force initializing...')
    this.isInitialized = false
    await this.initialize()
  }

  // 检查监听器状态
  getListenerCount(): number {
    return this.eventListeners.length
  }

  private async loadFromDatabase(data: DatabaseData): Promise<void> {
    // 清空现有数据
    this.candidates.clear()
    this.judges.clear()
    this.interviewDimensions.clear()
    this.scoreItems.clear()
    this.batches.clear()
    this.questions.clear()
    this.interviewItems.clear()

    // 加载数据
    data.candidates.forEach(candidate => this.candidates.set(candidate.id, candidate))
    data.judges.forEach(judge => this.judges.set(judge.id, judge))
    data.interviewDimensions.forEach(dimension => this.interviewDimensions.set(dimension.id, dimension))
    data.scoreItems.forEach(item => this.scoreItems.set(item.id, item))
    data.batches.forEach(batch => this.batches.set(batch.id, batch))
    data.questions.forEach(question => this.questions.set(question.id, question))
    data.interviewItems.forEach(item => this.interviewItems.set(item.id, item))

    this.currentCandidateId = data.currentCandidateId
    this.currentRound = data.currentRound
    this.displaySession = data.displaySession

    console.log(`[EnhancedStore] Loaded ${data.candidates.length} candidates, ${data.judges.length} judges from database`)
  }

  private initializeDefaultData(): void {
    console.log('[EnhancedStore] Initializing default data (fallback mode)')

    // 添加示例评委
    const judges: Judge[] = [
      { id: "1", name: "张主任", password: "123456", isActive: true },
      { id: "2", name: "李经理", password: "123456", isActive: true },
      { id: "3", name: "王专家", password: "123456", isActive: true },
      { id: "4", name: "赵组长", password: "123456", isActive: true },
      { id: "5", name: "陈主管", password: "123456", isActive: true },
    ]

    judges.forEach((judge) => this.judges.set(judge.id, judge))

    // 添加示例面试维度
    const dimensions: InterviewDimension[] = [
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
    ]

    dimensions.forEach((dim) => this.interviewDimensions.set(dim.id, dim))

    console.log(`[EnhancedStore] Initialized ${judges.length} judges and ${dimensions.length} dimensions`)
  }

  // ==================== 批次管理集成 ====================

  // 切换到批次模式
  async switchToBatchMode(batchId: string): Promise<void> {
    console.log('[EnhancedStore] Switching to batch mode:', batchId)

    const batch = await batchManager.getBatch(batchId)
    if (!batch) {
      throw new Error(`Batch ${batchId} not found`)
    }

    this.batchMode = true
    this.currentBatchId = batchId

    // 从批次加载数据到内存
    await this.loadFromBatch(batch)

    console.log('[EnhancedStore] Successfully switched to batch mode')
  }

  // 切换到传统模式
  async switchToLegacyMode(): Promise<void> {
    console.log('[EnhancedStore] Switching to legacy mode')

    this.batchMode = false
    this.currentBatchId = null

    // 从数据库加载传统数据
    const data = await database.initialize()
    await this.loadFromDatabase(data)

    console.log('[EnhancedStore] Successfully switched to legacy mode')
  }

  // 从批次加载数据
  private async loadFromBatch(batch: EnhancedBatch): Promise<void> {
    // 清空现有数据
    this.candidates.clear()
    this.judges.clear()
    this.interviewDimensions.clear()
    this.scoreItems.clear()
    this.questions.clear()
    this.interviewItems.clear()

    // 加载批次配置数据
    batch.config.judges.forEach((judgeData, index) => {
      const id = (index + 1).toString()
      this.judges.set(id, { ...judgeData, id })
    })

    batch.config.dimensions.forEach((dimensionData, index) => {
      const id = (index + 1).toString()
      this.interviewDimensions.set(id, { ...dimensionData, id })
    })

    batch.config.scoreItems.forEach((itemData, index) => {
      const id = (index + 1).toString()
      this.scoreItems.set(id, { ...itemData, id })
    })

    batch.config.interviewItems.forEach((itemData, index) => {
      const id = (index + 1).toString()
      this.interviewItems.set(id, { ...itemData, id })
    })

    // 加载批次运行时数据
    batch.runtime.candidates.forEach(candidate => {
      this.candidates.set(candidate.id, candidate)
    })

    this.currentCandidateId = batch.runtime.currentCandidateId || null
    this.currentRound = batch.runtime.currentRound
    this.displaySession = batch.runtime.displaySession

    console.log(`[EnhancedStore] Loaded batch data: ${batch.runtime.candidates.length} candidates, ${batch.config.judges.length} judges`)
  }

  // 保存当前状态到批次
  private async saveToBatch(): Promise<void> {
    if (!this.batchMode || !this.currentBatchId) {
      return
    }

    const batch = await batchManager.getBatch(this.currentBatchId)
    if (!batch) {
      console.error('[EnhancedStore] Current batch not found:', this.currentBatchId)
      return
    }

    // 更新批次运行时数据
    batch.runtime.candidates = Array.from(this.candidates.values())
    batch.runtime.currentCandidateId = this.currentCandidateId
    batch.runtime.currentRound = this.currentRound
    batch.runtime.displaySession = this.displaySession
    batch.runtime.currentStage = this.displaySession.currentStage

    // 更新元数据
    batch.runtime.metadata = {
      totalCandidates: this.candidates.size,
      completedCandidates: Array.from(this.candidates.values()).filter(c => c.status === 'completed').length,
      averageScore: this.calculateAverageScore(),
      lastUpdated: Date.now()
    }

    batch.runtime.totalScores = Array.from(this.candidates.values())
      .reduce((total, candidate) => total + (candidate.totalScore || 0), 0)

    batch.lastActiveAt = Date.now()
    batch.updatedAt = Date.now()

    await batchManager.saveBatch(batch)
    console.log('[EnhancedStore] Saved current state to batch:', this.currentBatchId)
  }

  // 计算平均分
  private calculateAverageScore(): number {
    const candidates = Array.from(this.candidates.values())
    if (candidates.length === 0) return 0

    const totalScore = candidates.reduce((sum, candidate) => sum + (candidate.totalScore || 0), 0)
    return Math.round((totalScore / candidates.length) * 100) / 100
  }

  // 获取当前批次信息
  getCurrentBatch(): { batchMode: boolean; batchId: string | null } {
    return {
      batchMode: this.batchMode,
      batchId: this.currentBatchId
    }
  }

  // ==================== 数据持久化 ====================

  private async saveToDatabase(): Promise<void> {
    if (this.pendingSave) return

    this.pendingSave = true
    try {
      if (this.batchMode) {
        // 批次模式：保存到批次
        await this.saveToBatch()
      } else {
        // 传统模式：保存到数据库
        const data: DatabaseData = {
          candidates: Array.from(this.candidates.values()),
          judges: Array.from(this.judges.values()),
          interviewDimensions: Array.from(this.interviewDimensions.values()),
          scoreItems: Array.from(this.scoreItems.values()),
          batches: Array.from(this.batches.values()),
          questions: Array.from(this.questions.values()),
          interviewItems: Array.from(this.interviewItems.values()),
          displaySession: this.displaySession,
          currentCandidateId: this.currentCandidateId,
          currentRound: this.currentRound,
          metadata: {
            version: "1.0.0",
            lastUpdated: Date.now(),
            backupCount: 0
          }
        }

        await database.save(data)
        console.log('[EnhancedStore] Data saved to database (legacy mode)')
      }
    } catch (error) {
      console.error('[EnhancedStore] Failed to save data:', error)
    } finally {
      this.pendingSave = false
    }
  }

  private debouncedSave(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout)
    }
    
    this.saveTimeout = setTimeout(async () => {
      await this.saveToDatabase()
      this.saveTimeout = null
    }, this.SAVE_DEBOUNCE_MS)
  }

  // ==================== 连接管理和心跳机制 ====================

  addConnection(type: 'judge' | 'admin' | 'display', judgeId?: string): string {
    const connectionId = Date.now().toString() + Math.random().toString(36).substr(2, 9)
    const connection: ConnectionInfo = {
      id: connectionId,
      type,
      judgeId,
      connectedAt: Date.now(),
      lastHeartbeat: Date.now(),
      isActive: true
    }

    this.connections.set(connectionId, connection)
    console.log(`[EnhancedStore] New ${type} connection: ${connectionId}`)

    // 连接事件现在由WebSocket管理器统一处理，避免重复发送
    // this.emitEvent({
    //   type: "connection_changed",
    //   data: { connected: true, connectionId, type, judgeId },
    //   timestamp: Date.now(),
    // })

    return connectionId
  }

  updateHeartbeat(connectionId: string): boolean {
    const connection = this.connections.get(connectionId)
    if (connection) {
      connection.lastHeartbeat = Date.now()
      connection.isActive = true
      return true
    }
    return false
  }

  removeConnection(connectionId: string): void {
    const connection = this.connections.get(connectionId)
    if (connection) {
      this.connections.delete(connectionId)
      console.log(`[EnhancedStore] Connection removed: ${connectionId}`)

      // 连接事件现在由WebSocket管理器统一处理，避免重复发送
      // this.emitEvent({
      //   type: "connection_changed",
      //   data: {
      //     connected: false,
      //     connectionId,
      //     type: connection.type,
      //     judgeId: connection.judgeId
      //   },
      //   timestamp: Date.now(),
      // })
    }
  }

  getActiveConnections(): ConnectionInfo[] {
    return Array.from(this.connections.values()).filter(conn => conn.isActive)
  }

  private startHeartbeatMonitor(): void {
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now()
      const HEARTBEAT_TIMEOUT = 30000 // 30秒超时

      for (const [connectionId, connection] of this.connections.entries()) {
        if (now - connection.lastHeartbeat > HEARTBEAT_TIMEOUT) {
          connection.isActive = false
          console.log(`[EnhancedStore] Connection timeout: ${connectionId}`)
          
          // 连接事件现在由WebSocket管理器统一处理，避免重复发送
          // this.emitEvent({
          //   type: "connection_changed",
          //   data: {
          //     connected: false,
          //     connectionId,
          //     type: connection.type,
          //     judgeId: connection.judgeId,
          //     reason: 'timeout'
          //   },
          //   timestamp: Date.now(),
          // })
        }
      }

      // 清理超时连接
      const expiredConnections = Array.from(this.connections.entries())
        .filter(([_, conn]) => now - conn.lastHeartbeat > HEARTBEAT_TIMEOUT * 2)
      
      for (const [connectionId] of expiredConnections) {
        this.connections.delete(connectionId)
      }
    }, 10000) // 每10秒检查一次
  }

  private startAutoSave(): void {
    // 每5分钟自动保存一次
    this.autoSaveInterval = setInterval(async () => {
      await this.saveToDatabase()
    }, 5 * 60 * 1000)
  }

  // ==================== 数据备份和恢复 ====================

  async createBackup(): Promise<string> {
    try {
      await this.saveToDatabase() // 确保最新数据已保存
      await database.createBackup()
      const backups = database.listBackups()
      return backups[0]?.name || 'backup-created'
    } catch (error) {
      console.error('[EnhancedStore] Failed to create backup:', error)
      throw error
    }
  }

  async restoreBackup(backupFileName: string): Promise<void> {
    try {
      const data = await database.restoreBackup(backupFileName)
      await this.loadFromDatabase(data)
      
      this.emitEvent({
        type: "data_restored",
        data: { backupFileName },
        timestamp: Date.now(),
      })
      
      console.log(`[EnhancedStore] Data restored from backup: ${backupFileName}`)
    } catch (error) {
      console.error('[EnhancedStore] Failed to restore backup:', error)
      throw error
    }
  }

  listBackups(): Array<{ name: string; date: Date; size: number }> {
    return database.listBackups()
  }

  async exportData(filePath: string): Promise<void> {
    await this.saveToDatabase()
    await database.exportData(filePath)
  }

  async importData(filePath: string): Promise<void> {
    const data = await database.importData(filePath)
    await this.loadFromDatabase(data)
    
    this.emitEvent({
      type: "data_imported",
      data: { filePath },
      timestamp: Date.now(),
    })
  }

  // ==================== 现有的所有方法保持不变 ====================
  
  getCandidates(): Candidate[] {
    return Array.from(this.candidates.values())
  }

  // ==================== 候选人管理 ====================

  updateCandidate(id: string, updates: Partial<Candidate>) {
    const candidate = this.candidates.get(id)
    if (candidate) {
      Object.assign(candidate, updates)

      // 重新计算最终得分
      this.calculateFinalScore(id)

      this.debouncedSave() // 触发保存

      this.emitEvent({
        type: "candidate_changed",
        data: candidate,
        timestamp: Date.now(),
      })
      return candidate
    }
    return null
  }

  getJudges(): Judge[] {
    return Array.from(this.judges.values())
  }

  getInterviewDimensions(): InterviewDimension[] {
    return Array.from(this.interviewDimensions.values()).sort((a, b) => a.order - b.order)
  }

  // ==================== 面试维度管理 ====================

  addInterviewDimension(dimension: Omit<InterviewDimension, "id">) {
    const id = Date.now().toString()
    const newDimension: InterviewDimension = { ...dimension, id }
    this.interviewDimensions.set(id, newDimension)

    this.debouncedSave() // 触发保存

    this.emitEvent({
      type: "dimension_changed",
      data: newDimension,
      timestamp: Date.now(),
    })
    return newDimension
  }

  updateInterviewDimension(id: string, updates: Partial<Omit<InterviewDimension, "id">>) {
    const dimension = this.interviewDimensions.get(id)
    if (dimension) {
      Object.assign(dimension, updates)

      this.debouncedSave() // 触发保存

      this.emitEvent({
        type: "dimension_changed",
        data: dimension,
        timestamp: Date.now(),
      })
      return dimension
    }
    return null
  }

  deleteInterviewDimension(id: string) {
    const dimension = this.interviewDimensions.get(id)
    if (dimension) {
      this.interviewDimensions.delete(id)

      this.debouncedSave() // 触发保存

      this.emitEvent({
        type: "dimension_changed",
        data: { deleted: true, id },
        timestamp: Date.now(),
      })
      return true
    }
    return false
  }

  getScoreItems(): ScoreItem[] {
    return Array.from(this.scoreItems.values()).sort((a, b) => a.order - b.order)
  }

  getQuestions(): Question[] {
    return Array.from(this.questions.values()).sort((a, b) => a.order - b.order)
  }

  getDisplaySession(): DisplaySession {
    return this.displaySession
  }

  setDisplayStage(stage: "opening" | "interviewing" | "scoring") {
    this.displaySession.currentStage = stage

    // 切换环节时重置倒计时状态
    if (stage !== "interviewing") {
      // 非答题环节时，清除倒计时状态
      this.displaySession.timerState = undefined
      console.log('[Stage] Cleared timer state for non-interviewing stage:', stage)
    } else {
      // 切换到答题环节时，如果有当前面试项目且有时间限制，重置倒计时
      const currentItem = this.displaySession.currentInterviewItem
      if (currentItem && currentItem.timeLimit) {
        this.displaySession.timerState = {
          isRunning: false,
          isPaused: false,
          remainingTime: currentItem.timeLimit * 1000,
          totalTime: currentItem.timeLimit * 1000,
          startTime: undefined,
          pausedTime: undefined,
        }
        console.log('[Stage] Reset timer state for interviewing stage, duration:', currentItem.timeLimit, 'seconds')
      }
    }

    this.debouncedSave() // 触发保存

    // 创建一个干净的 displaySession 副本以避免序列化问题
    const cleanDisplaySession = {
      id: this.displaySession.id,
      currentStage: this.displaySession.currentStage,
      currentQuestion: this.displaySession.currentQuestion,
      currentInterviewItem: this.displaySession.currentInterviewItem,
      timerState: this.displaySession.timerState,
      settings: this.displaySession.settings
    }

    this.emitEvent({
      type: "stage_changed",
      data: { stage, displaySession: cleanDisplaySession },
      timestamp: Date.now(),
    })

    // 发送倒计时状态更新事件
    this.emitTimerEvent()
  }

  setCurrentQuestion(questionId: string) {
    const question = this.questions.get(questionId)
    if (question) {
      this.displaySession.currentQuestion = {
        id: question.id,
        title: question.title,
        content: question.content,
        timeLimit: question.timeLimit,
        startTime: Date.now(),
      }
      
      this.debouncedSave() // 触发保存
      
      // 创建一个干净的 displaySession 副本以避免序列化问题
      const cleanDisplaySession = {
        id: this.displaySession.id,
        currentStage: this.displaySession.currentStage,
        currentQuestion: this.displaySession.currentQuestion,
        currentInterviewItem: this.displaySession.currentInterviewItem,
        timerState: this.displaySession.timerState,
        settings: this.displaySession.settings
      }

      this.emitEvent({
        type: "question_changed",
        data: { question: this.displaySession.currentQuestion, displaySession: cleanDisplaySession },
        timestamp: Date.now(),
      })
    }
  }

  getCurrentCandidate(): Candidate | null {
    return this.currentCandidateId ? this.candidates.get(this.currentCandidateId) || null : null
  }

  setCurrentCandidate(candidateId: string) {
    const candidate = this.candidates.get(candidateId)
    if (candidate) {
      // 重置之前候选人状态
      if (this.currentCandidateId && this.currentCandidateId !== candidateId) {
        const previousCandidate = this.candidates.get(this.currentCandidateId)
        if (previousCandidate && previousCandidate.status === "interviewing") {
          previousCandidate.status = "waiting"
          this.emitEvent({
            type: "candidate_changed",
            data: previousCandidate,
            timestamp: Date.now(),
          })
        }
      }

      this.currentCandidateId = candidateId
      candidate.status = "interviewing"
      
      this.debouncedSave() // 触发保存
      
      this.emitEvent({
        type: "candidate_changed",
        data: candidate,
        timestamp: Date.now(),
      })
    }
  }

  submitScore(candidateId: string, judgeId: string, categories: Record<string, number>) {
    const candidate = this.candidates.get(candidateId)
    const judge = this.judges.get(judgeId)

    if (!candidate || !judge) return false

    // 确保所有分数都是数字类型
    const normalizedCategories: Record<string, number> = {}
    Object.entries(categories).forEach(([key, value]) => {
      normalizedCategories[key] = Number(value) || 0
    })

    // 直接相加各维度分数，不使用权重
    const totalScore = Object.values(normalizedCategories).reduce((sum, score) => sum + score, 0)

    const score: Score = {
      judgeId,
      judgeName: judge.name,
      round: this.currentRound,
      categories: normalizedCategories,
      totalScore: Number(totalScore) || 0,
      timestamp: Date.now(),
    }

    // 移除该评委在当前轮次的旧评分
    candidate.scores = candidate.scores.filter((s) => !(s.judgeId === judgeId && s.round === this.currentRound))
    candidate.scores.push(score)

    // 计算总分
    const currentRoundScores = candidate.scores.filter((s) => s.round === this.currentRound)
    candidate.totalScore =
      currentRoundScores.length > 0
        ? Math.round(currentRoundScores.reduce((sum, s) => sum + (Number(s.totalScore) || 0), 0) / currentRoundScores.length)
        : 0

    // 重新计算最终得分
    this.calculateFinalScore(candidateId)
    
    this.debouncedSave() // 触发保存

    this.emitEvent({
      type: "score_updated",
      data: { candidate, score },
      timestamp: Date.now(),
    })

    return true
  }

  private calculateFinalScore(candidateId: string) {
    const candidate = this.candidates.get(candidateId)
    if (!candidate) return

    const scoreItems = Array.from(this.scoreItems.values()).filter((item) => item.isActive)
    let totalWeightedScore = 0
    let totalWeight = 0

    scoreItems.forEach((item) => {
      let score = 0

      if (item.name === "面试成绩") {
        score = candidate.totalScore
      } else {
        const otherScore = candidate.otherScores.find((s) => s.itemId === item.id)
        score = otherScore ? otherScore.score : 0
      }

      totalWeightedScore += (score * item.weight) / 100
      totalWeight += item.weight
    })

    candidate.finalScore = totalWeight > 0 ? Math.round(totalWeightedScore) : 0
  }

  addEventListener(listener: (event: ScoringEvent) => void) {
    this.eventListeners.push(listener)
    console.log(`[EnhancedStore] Event listener added, total listeners: ${this.eventListeners.length}`)
  }

  removeEventListener(listener: (event: ScoringEvent) => void) {
    const index = this.eventListeners.indexOf(listener)
    if (index > -1) {
      this.eventListeners.splice(index, 1)
      console.log(`[EnhancedStore] Event listener removed, remaining listeners: ${this.eventListeners.length}`)
    }
  }

  private emitEvent(event: ScoringEvent) {
    // 发送到SSE监听器（向后兼容）
    console.log(`[EnhancedStore] Emitting event ${event.type} to ${this.eventListeners.length} SSE listeners`)
    this.eventListeners.forEach((listener, index) => {
      try {
        listener(event)
      } catch (error) {
        console.error(`[EnhancedStore] Error in SSE listener ${index} for event ${event.type}:`, error)
      }
    })

    // 发送到WebSocket客户端
    if (isWebSocketServerRunning()) {
      try {
        broadcastEvent(event)
        console.log(`[EnhancedStore] Event ${event.type} broadcasted via WebSocket`)
      } catch (error) {
        console.error(`[EnhancedStore] Error broadcasting WebSocket event ${event.type}:`, error)
      }
    } else {
      console.warn(`[EnhancedStore] WebSocket server not running, event ${event.type} only sent via SSE`)
    }
  }

  // ==================== 评委管理 ====================

  addJudge(judge: Omit<Judge, "id">) {
    const id = Date.now().toString()
    const newJudge: Judge = { ...judge, id }
    this.judges.set(id, newJudge)

    this.debouncedSave() // 触发保存

    this.emitEvent({
      type: "judge_changed",
      data: newJudge,
      timestamp: Date.now(),
    })
    return newJudge
  }

  updateJudge(id: string, updates: Partial<Omit<Judge, "id">>) {
    const judge = this.judges.get(id)
    if (judge) {
      Object.assign(judge, updates)

      this.debouncedSave() // 触发保存

      this.emitEvent({
        type: "judge_changed",
        data: judge,
        timestamp: Date.now(),
      })
      return judge
    }
    return null
  }

  deleteJudge(id: string) {
    const judge = this.judges.get(id)
    if (judge) {
      this.judges.delete(id)

      this.debouncedSave() // 触发保存

      this.emitEvent({
        type: "judge_changed",
        data: { ...judge, deleted: true },
        timestamp: Date.now(),
      })
      return true
    }
    return false
  }

  setJudgeOnlineStatus(id: string, isActive: boolean) {
    const judge = this.judges.get(id)
    if (judge) {
      judge.isActive = isActive

      this.debouncedSave() // 触发保存

      this.emitEvent({
        type: "judge_changed",
        data: judge,
        timestamp: Date.now(),
      })
      return judge
    }
    return null
  }

  // 更新评委在线状态（不影响启用状态）
  updateJudgeOnlineStatus(id: string, isOnline: boolean) {
    const judge = this.judges.get(id)
    if (judge) {
      // 这里我们可以添加一个 isOnline 字段，或者通过连接管理来跟踪
      // 暂时通过连接管理来处理在线状态
      console.log(`[Store] Judge ${judge.name} online status updated:`, isOnline)

      // 发送在线状态变更事件
      this.emitEvent({
        type: "judge_online_status_changed",
        data: { judgeId: id, isOnline, judge },
        timestamp: Date.now(),
      })
      return judge
    }
    return null
  }

  // ==================== 面试项目管理 ====================

  getInterviewItems(): InterviewItem[] {
    return Array.from(this.interviewItems.values()).sort((a, b) => a.order - b.order)
  }

  setInterviewItems(items: InterviewItem[]) {
    this.interviewItems.clear()
    this.questions.clear()

    items.forEach(item => {
      this.interviewItems.set(item.id, item)

      // 如果是题目类型，同时更新questions
      if (item.type === 'question') {
        const question: Question = {
          id: item.id,
          title: item.title,
          content: item.content || '',
          timeLimit: item.timeLimit || 300,
          category: item.subtitle || '通用',
          difficulty: 'medium',
          order: item.order,
          isActive: item.isActive
        }
        this.questions.set(item.id, question)
      }
    })

    this.saveToDatabase()
    this.emitEvent({
      type: "interview_items_changed",
      data: { items },
      timestamp: Date.now(),
    })
  }

  addInterviewItem(item: InterviewItem) {
    this.interviewItems.set(item.id, item)

    // 如果是题目类型，同时更新questions
    if (item.type === 'question') {
      const question: Question = {
        id: item.id,
        title: item.title,
        content: item.content || '',
        timeLimit: item.timeLimit || 300,
        category: item.subtitle || '通用',
        difficulty: 'medium',
        order: item.order,
        isActive: item.isActive
      }
      this.questions.set(item.id, question)
    }

    this.saveToDatabase()
    this.emitEvent({
      type: "interview_item_added",
      data: { item },
      timestamp: Date.now(),
    })
  }

  updateInterviewItem(item: InterviewItem) {
    this.interviewItems.set(item.id, item)

    // 如果是题目类型，同时更新questions
    if (item.type === 'question') {
      const question: Question = {
        id: item.id,
        title: item.title,
        content: item.content || '',
        timeLimit: item.timeLimit || 300,
        category: item.subtitle || '通用',
        difficulty: 'medium',
        order: item.order,
        isActive: item.isActive
      }
      this.questions.set(item.id, question)
    } else {
      // 如果不是题目类型，从questions中删除
      this.questions.delete(item.id)
    }

    // 检查是否是当前选中的面试项目，如果是则需要更新相关状态
    const currentItem = this.displaySession.currentInterviewItem
    if (currentItem && currentItem.id === item.id) {
      console.log('[UpdateItem] Updating current interview item:', item.id, 'new timeLimit:', item.timeLimit)

      // 更新当前面试项目的信息
      this.displaySession.currentInterviewItem = {
        id: item.id,
        type: item.type,
        title: item.title,
        subtitle: item.subtitle,
        content: item.content,
        timeLimit: item.timeLimit,
        startTime: currentItem.startTime, // 保持原有的开始时间
      }

      // 更新倒计时状态（重置为新的时间限制）
      if (item.timeLimit) {
        this.displaySession.timerState = {
          isRunning: false,
          isPaused: false,
          remainingTime: item.timeLimit * 1000, // 转换为毫秒
          totalTime: item.timeLimit * 1000,
          startTime: undefined,
          pausedTime: undefined,
        }
        console.log('[UpdateItem] Updated timer state with new duration:', item.timeLimit, 'seconds')
      } else {
        this.displaySession.timerState = undefined
        console.log('[UpdateItem] Cleared timer state (no time limit)')
      }

      // 如果是题目类型，也更新currentQuestion
      if (item.type === 'question') {
        this.displaySession.currentQuestion = {
          id: item.id,
          title: item.title,
          content: item.content || '',
          timeLimit: item.timeLimit || 300,
          startTime: currentItem.startTime, // 保持原有的开始时间
        }
      }

      // 发送更新事件
      this.emitEvent({
        type: "interview_item_changed",
        data: { item: this.displaySession.currentInterviewItem },
        timestamp: Date.now(),
      })

      // 发送倒计时状态更新事件
      this.emitTimerEvent()

      // 如果是题目类型，也发送question_changed事件以保持兼容性
      if (item.type === 'question') {
        this.emitEvent({
          type: "question_changed",
          data: { question: this.displaySession.currentQuestion },
          timestamp: Date.now(),
        })
      }
    }

    this.saveToDatabase()
    this.emitEvent({
      type: "interview_item_updated",
      data: { item },
      timestamp: Date.now(),
    })
  }

  deleteInterviewItem(id: string) {
    const item = this.interviewItems.get(id)
    if (item) {
      this.interviewItems.delete(id)

      // 如果是题目类型，同时从questions中删除
      if (item.type === 'question') {
        this.questions.delete(id)
      }

      this.saveToDatabase()
      this.emitEvent({
        type: "interview_item_deleted",
        data: { id, item },
        timestamp: Date.now(),
      })
    }
  }

  setCurrentInterviewItem(itemId: string) {
    const item = this.interviewItems.get(itemId)
    if (item) {
      this.displaySession.currentInterviewItem = {
        id: item.id,
        type: item.type,
        title: item.title,
        subtitle: item.subtitle,
        content: item.content,
        timeLimit: item.timeLimit,
        startTime: Date.now(),
      }

      // 初始化倒计时状态（但不自动开始）
      if (item.timeLimit) {
        this.displaySession.timerState = {
          isRunning: false,
          isPaused: false,
          remainingTime: item.timeLimit * 1000, // 转换为毫秒
          totalTime: item.timeLimit * 1000,
          startTime: undefined,
          pausedTime: undefined,
        }
      } else {
        this.displaySession.timerState = undefined
      }

      // 确保互斥性：根据类型设置或清除currentQuestion
      if (item.type === 'question') {
        // 如果是题目类型，更新currentQuestion
        this.displaySession.currentQuestion = {
          id: item.id,
          title: item.title,
          content: item.content || '',
          timeLimit: item.timeLimit || 300,
          startTime: Date.now(),
        }
      } else {
        // 如果是面试环节类型，清除currentQuestion以确保互斥
        this.displaySession.currentQuestion = undefined
      }

      this.saveToDatabase()
      this.emitEvent({
        type: "interview_item_changed",
        data: { item: this.displaySession.currentInterviewItem },
        timestamp: Date.now(),
      })

      // 如果是题目类型，也发送question_changed事件以保持兼容性
      if (item.type === 'question') {
        this.emitEvent({
          type: "question_changed",
          data: { question: this.displaySession.currentQuestion },
          timestamp: Date.now(),
        })
      }
    }
  }

  // ==================== 倒计时控制 ====================

  startTimer() {
    if (!this.displaySession.timerState) return

    const now = Date.now()
    this.displaySession.timerState.isRunning = true
    this.displaySession.timerState.isPaused = false
    this.displaySession.timerState.startTime = now

    console.log('[Timer] Started timer')
    this.emitTimerEvent()
    this.saveToDatabase()
  }

  pauseTimer() {
    if (!this.displaySession.timerState || !this.displaySession.timerState.isRunning) return

    const now = Date.now()
    const elapsed = now - (this.displaySession.timerState.startTime || now)

    this.displaySession.timerState.isRunning = false
    this.displaySession.timerState.isPaused = true
    this.displaySession.timerState.remainingTime = Math.max(0, this.displaySession.timerState.remainingTime - elapsed)
    this.displaySession.timerState.pausedTime = now

    console.log('[Timer] Paused timer, remaining:', this.displaySession.timerState.remainingTime)
    this.emitTimerEvent()
    this.saveToDatabase()
  }

  resumeTimer() {
    if (!this.displaySession.timerState || !this.displaySession.timerState.isPaused) return

    const now = Date.now()
    this.displaySession.timerState.isRunning = true
    this.displaySession.timerState.isPaused = false
    this.displaySession.timerState.startTime = now

    console.log('[Timer] Resumed timer')
    this.emitTimerEvent()
    this.saveToDatabase()
  }

  resetTimer() {
    if (!this.displaySession.timerState) return

    this.displaySession.timerState.isRunning = false
    this.displaySession.timerState.isPaused = false
    this.displaySession.timerState.remainingTime = this.displaySession.timerState.totalTime
    this.displaySession.timerState.startTime = undefined
    this.displaySession.timerState.pausedTime = undefined

    console.log('[Timer] Reset timer to:', this.displaySession.timerState.totalTime)
    this.emitTimerEvent()
    this.saveToDatabase()
  }

  setTimerDuration(seconds: number) {
    const milliseconds = seconds * 1000

    if (!this.displaySession.timerState) {
      this.displaySession.timerState = {
        isRunning: false,
        isPaused: false,
        remainingTime: milliseconds,
        totalTime: milliseconds,
        startTime: undefined,
        pausedTime: undefined,
      }
    } else {
      this.displaySession.timerState.totalTime = milliseconds
      this.displaySession.timerState.remainingTime = milliseconds
      this.displaySession.timerState.isRunning = false
      this.displaySession.timerState.isPaused = false
      this.displaySession.timerState.startTime = undefined
      this.displaySession.timerState.pausedTime = undefined
    }

    console.log('[Timer] Set duration to:', seconds, 'seconds')
    this.emitTimerEvent()
    this.saveToDatabase()
  }

  // 新增：倒计时归零功能
  setTimerToZero() {
    if (!this.displaySession.timerState) return

    this.displaySession.timerState.isRunning = false
    this.displaySession.timerState.isPaused = false
    this.displaySession.timerState.remainingTime = 0
    this.displaySession.timerState.startTime = undefined
    this.displaySession.timerState.pausedTime = undefined
    // 保持原有的 totalTime，这样重置时可以恢复

    console.log('[Timer] Set timer to zero, totalTime preserved:', this.displaySession.timerState.totalTime)
    this.emitTimerEvent()
    this.saveToDatabase()
  }

  getTimerState() {
    return this.displaySession.timerState
  }

  private emitTimerEvent() {
    this.emitEvent({
      type: "timer_changed",
      data: { timerState: this.displaySession.timerState },
      timestamp: Date.now(),
    })
  }

  // ==================== 增强批次管理 ====================

  // 获取所有批次（增强版）
  async getEnhancedBatches(): Promise<EnhancedBatch[]> {
    return await batchManager.getAllBatches()
  }

  // 获取传统批次（向后兼容）
  getBatches(): Batch[] {
    return Array.from(this.batches.values()).sort((a, b) => b.updatedAt - a.updatedAt)
  }

  // 创建新批次（增强版）
  async createEnhancedBatch(name: string, description: string): Promise<EnhancedBatch> {
    const config: BatchConfig = {
      name,
      description,
      judges: Array.from(this.judges.values()),
      dimensions: Array.from(this.interviewDimensions.values()),
      scoreItems: Array.from(this.scoreItems.values()),
      interviewItems: Array.from(this.interviewItems.values())
    }

    const batch = await batchManager.createBatch(config)

    this.emitEvent({
      type: "batch_changed",
      data: batch,
      timestamp: Date.now(),
    })

    return batch
  }

  // 开始批次
  async startBatch(batchId: string): Promise<void> {
    await batchManager.startBatch(batchId)
    await this.switchToBatchMode(batchId)

    this.emitEvent({
      type: "batch_started",
      data: { batchId },
      timestamp: Date.now(),
    })
  }

  // 暂停批次
  async pauseBatch(batchId: string): Promise<void> {
    await batchManager.pauseBatch(batchId)

    this.emitEvent({
      type: "batch_paused",
      data: { batchId },
      timestamp: Date.now(),
    })
  }

  // 恢复批次
  async resumeBatch(batchId: string): Promise<void> {
    await batchManager.resumeBatch(batchId)
    await this.switchToBatchMode(batchId)

    this.emitEvent({
      type: "batch_resumed",
      data: { batchId },
      timestamp: Date.now(),
    })
  }

  // 完成批次
  async completeBatch(batchId: string): Promise<void> {
    await batchManager.completeBatch(batchId)
    await this.switchToLegacyMode()

    this.emitEvent({
      type: "batch_completed",
      data: { batchId },
      timestamp: Date.now(),
    })
  }

  // 获取活跃批次
  async getActiveBatch(): Promise<EnhancedBatch | null> {
    return await batchManager.getActiveBatch()
  }

  // 传统批次保存（向后兼容）
  saveBatch(batchData: Omit<Batch, "id" | "createdAt" | "updatedAt">): Batch {
    const id = Date.now().toString()
    const now = Date.now()

    const batch: Batch = {
      ...batchData,
      id,
      createdAt: now,
      updatedAt: now,
      config: {
        judges: Array.from(this.judges.values()).map(({ id, ...judge }) => judge),
        dimensions: Array.from(this.interviewDimensions.values()).map(({ id, ...dimension }) => dimension),
        scoreItems: Array.from(this.scoreItems.values()).map(({ id, ...item }) => item),
        systemSettings: {
          maxScore: 100,
          precision: "integer",
          calculationMethod: "weighted",
          autoRefresh: true,
          refreshInterval: 5000,
        },
      },
    }

    this.batches.set(id, batch)
    this.saveToDatabase()
    this.emitEvent({
      type: "batch_changed",
      data: batch,
      timestamp: Date.now(),
    })

    return batch
  }

  // 加载增强批次
  async loadEnhancedBatch(batchId: string): Promise<boolean> {
    try {
      const batch = await batchManager.getBatch(batchId)
      if (!batch) return false

      await this.switchToBatchMode(batchId)

      this.emitEvent({
        type: "batch_loaded",
        data: batch,
        timestamp: Date.now(),
      })

      return true
    } catch (error) {
      console.error('[EnhancedStore] Failed to load enhanced batch:', error)
      return false
    }
  }

  // 传统批次加载（向后兼容）
  loadBatch(batchId: string): boolean {
    const batch = this.batches.get(batchId)
    if (!batch) return false

    // 清空现有数据（保留候选人）
    this.judges.clear()
    this.interviewDimensions.clear()
    this.scoreItems.clear()

    // 加载批次配置
    batch.config.judges.forEach((judgeData, index) => {
      const id = (index + 1).toString()
      this.judges.set(id, { ...judgeData, id })
    })

    batch.config.dimensions.forEach((dimensionData, index) => {
      const id = (index + 1).toString()
      this.interviewDimensions.set(id, { ...dimensionData, id })
    })

    batch.config.scoreItems.forEach((itemData, index) => {
      const id = (index + 1).toString()
      this.scoreItems.set(id, { ...itemData, id })
    })

    this.saveToDatabase()
    this.emitEvent({
      type: "batch_loaded",
      data: batch,
      timestamp: Date.now(),
    })

    return true
  }

  // ==================== 系统状态和监控 ====================

  getSystemStatus(): {
    isInitialized: boolean
    activeConnections: number
    lastSaved: Date | null
    database: {
      exists: boolean
      size: number
      lastModified: Date | null
      backupCount: number
    }
  } {
    const dbStatus = database.getStatus()

    return {
      isInitialized: this.isInitialized,
      activeConnections: this.getActiveConnections().length,
      lastSaved: dbStatus.lastModified,
      database: dbStatus
    }
  }

  // 优雅关闭
  async shutdown(): Promise<void> {
    console.log('[EnhancedStore] Shutting down...')
    
    // 清理定时器
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
    }
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval)
    }
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout)
    }

    // 最后保存一次
    await this.saveToDatabase()
    
    // 关闭所有连接
    this.connections.clear()
    this.eventListeners.length = 0
    
    console.log('[EnhancedStore] Shutdown completed')
  }

  // 强制立即保存
  async forceSave(): Promise<void> {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout)
      this.saveTimeout = null
    }
    await this.saveToDatabase()
  }
}

// 导出增强版单例
export const enhancedScoringStore = new EnhancedScoringStore()