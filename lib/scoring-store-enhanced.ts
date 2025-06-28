// 增强版评分存储 - 集成数据库持久化和并发优化
import { database, type DatabaseData } from './database'
import type {
  Candidate,
  Judge,
  Score,
  ScoringEvent,
  InterviewDimension,
  ScoreItem,
  Batch,
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
      console.log('[EnhancedStore] Initializing with database...')
      const data = await database.initialize()
      await this.loadFromDatabase(data)
      this.isInitialized = true
      console.log('[EnhancedStore] Initialization completed')
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
    // 和原来的 initializeData 方法相同的逻辑
    // 这里简化处理，实际使用时从原始的 scoring-store.ts 复制
    console.log('[EnhancedStore] Using default data (fallback mode)')
  }

  // ==================== 数据持久化 ====================

  private async saveToDatabase(): Promise<void> {
    if (this.pendingSave) return

    this.pendingSave = true
    try {
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
      console.log('[EnhancedStore] Data saved to database')
    } catch (error) {
      console.error('[EnhancedStore] Failed to save to database:', error)
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

    this.emitEvent({
      type: "connection_changed",
      data: { connected: true, connectionId, type, judgeId },
      timestamp: Date.now(),
    })

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

      this.emitEvent({
        type: "connection_changed",
        data: { 
          connected: false, 
          connectionId, 
          type: connection.type, 
          judgeId: connection.judgeId 
        },
        timestamp: Date.now(),
      })
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
          
          this.emitEvent({
            type: "connection_changed",
            data: { 
              connected: false, 
              connectionId, 
              type: connection.type, 
              judgeId: connection.judgeId,
              reason: 'timeout'
            },
            timestamp: Date.now(),
          })
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

  getJudges(): Judge[] {
    return Array.from(this.judges.values())
  }

  getInterviewDimensions(): InterviewDimension[] {
    return Array.from(this.interviewDimensions.values()).sort((a, b) => a.order - b.order)
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

  setDisplayStage(stage: "opening" | "questioning" | "scoring") {
    this.displaySession.currentStage = stage
    this.debouncedSave() // 触发保存
    
    this.emitEvent({
      type: "stage_changed",
      data: { stage, displaySession: this.displaySession },
      timestamp: Date.now(),
    })
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
      
      this.emitEvent({
        type: "question_changed",
        data: { question: this.displaySession.currentQuestion, displaySession: this.displaySession },
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

    const totalScore = Object.values(categories).reduce((sum, score) => sum + score, 0)

    const score: Score = {
      judgeId,
      judgeName: judge.name,
      round: this.currentRound,
      categories,
      totalScore,
      timestamp: Date.now(),
    }

    // 移除该评委在当前轮次的旧评分
    candidate.scores = candidate.scores.filter((s) => !(s.judgeId === judgeId && s.round === this.currentRound))
    candidate.scores.push(score)

    // 计算总分
    const currentRoundScores = candidate.scores.filter((s) => s.round === this.currentRound)
    candidate.totalScore =
      currentRoundScores.length > 0
        ? Math.round(currentRoundScores.reduce((sum, s) => sum + s.totalScore, 0) / currentRoundScores.length)
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
    console.log(`[EnhancedStore] Emitting event ${event.type} to ${this.eventListeners.length} listeners`)
    this.eventListeners.forEach((listener, index) => {
      try {
        listener(event)
      } catch (error) {
        console.error(`[EnhancedStore] Error in listener ${index} for event ${event.type}:`, error)
      }
    })
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

  // ==================== 批次管理 ====================

  getBatches(): Batch[] {
    return Array.from(this.batches.values()).sort((a, b) => b.updatedAt - a.updatedAt)
  }

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