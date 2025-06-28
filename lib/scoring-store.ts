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

class ScoringStore {
  private candidates: Map<string, Candidate> = new Map()
  private judges: Map<string, Judge> = new Map()
  private interviewDimensions: Map<string, InterviewDimension> = new Map()
  private scoreItems: Map<string, ScoreItem> = new Map()
  private currentCandidateId: string | null = null
  private currentRound = 1
  private eventListeners: ((event: ScoringEvent) => void)[] = []
  private batches: Map<string, Batch> = new Map()
  private questions: Map<string, Question> = new Map()
  private interviewItems: Map<string, InterviewItem> = new Map()
  private displaySession: DisplaySession = {
    id: "main",
    currentStage: "opening",
    settings: {
      showTimer: true,
      showProgress: true,
      autoAdvance: false,
    },
  }

  constructor() {
    // 初始化示例数据
    this.initializeData()
  }

  private initializeData() {
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
        weight: 25,
        order: 1,
        isActive: true,
      },
      {
        id: "2",
        name: "沟通表达",
        description: "语言表达清晰度和沟通技巧",
        maxScore: 20,
        weight: 20,
        order: 2,
        isActive: true,
      },
      {
        id: "3",
        name: "领导能力",
        description: "团队管理和决策能力",
        maxScore: 25,
        weight: 25,
        order: 3,
        isActive: true,
      },
      {
        id: "4",
        name: "应急处理",
        description: "突发情况的应对和处理能力",
        maxScore: 15,
        weight: 15,
        order: 4,
        isActive: true,
      },
      {
        id: "5",
        name: "综合素质",
        description: "整体素养和职业形象",
        maxScore: 15,
        weight: 15,
        order: 5,
        isActive: true,
      },
    ]

    dimensions.forEach((dimension) => this.interviewDimensions.set(dimension.id, dimension))

    // 添加示例成绩项目
    const scoreItems: ScoreItem[] = [
      {
        id: "1",
        name: "笔试成绩",
        description: "理论知识考试成绩",
        maxScore: 100,
        weight: 30,
        order: 1,
        isActive: true,
      },
      { id: "2", name: "面试成绩", description: "面试综合评分", maxScore: 100, weight: 50, order: 2, isActive: true },
      {
        id: "3",
        name: "日常表现",
        description: "工作表现和综合评价",
        maxScore: 100,
        weight: 20,
        order: 3,
        isActive: true,
      },
    ]

    scoreItems.forEach((item) => this.scoreItems.set(item.id, item))

    // 添加示例题目
    const questions: Question[] = [
      {
        id: "1",
        title: "专业知识问答",
        content: "请简述列车长在日常工作中的主要职责和安全管理要点。",
        timeLimit: 300, // 5分钟
        category: "专业能力",
        difficulty: "medium",
        order: 1,
        isActive: true,
      },
      {
        id: "2",
        title: "应急处理场景",
        content: "假设列车在运行过程中遇到突发故障，作为列车长您将如何处理？请详细说明处理流程。",
        timeLimit: 420, // 7分钟
        category: "应急处理",
        difficulty: "hard",
        order: 2,
        isActive: true,
      },
      {
        id: "3",
        title: "团队管理案例",
        content: "描述一次您成功解决团队内部矛盾或协调不同部门合作的经历。",
        timeLimit: 360, // 6分钟
        category: "领导能力",
        difficulty: "medium",
        order: 3,
        isActive: true,
      },
      {
        id: "4",
        title: "服务理念阐述",
        content: "谈谈您对铁路客运服务理念的理解，以及如何在实际工作中体现。",
        timeLimit: 240, // 4分钟
        category: "综合素质",
        difficulty: "easy",
        order: 4,
        isActive: true,
      },
    ]

    questions.forEach((question) => this.questions.set(question.id, question))

    // 将现有题目转换为InterviewItem格式
    const interviewItems: InterviewItem[] = questions.map(question => ({
      id: question.id,
      type: 'question' as const,
      title: question.title,
      subtitle: question.category,
      content: question.content,
      timeLimit: question.timeLimit,
      order: question.order,
      isActive: question.isActive
    }))

    interviewItems.forEach((item) => this.interviewItems.set(item.id, item))

    // 添加示例候选人（包含部门信息和其他成绩）
    const candidates: Candidate[] = [
      {
        id: "1",
        name: "刘明",
        number: "TC001",
        department: "运营部",
        currentRound: 1,
        totalScore: 0,
        scores: [],
        otherScores: [
          { itemId: "1", itemName: "笔试成绩", score: 85, timestamp: Date.now() },
          { itemId: "3", itemName: "日常表现", score: 90, timestamp: Date.now() },
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
          { itemId: "1", itemName: "笔试成绩", score: 92, timestamp: Date.now() },
          { itemId: "3", itemName: "日常表现", score: 88, timestamp: Date.now() },
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
          { itemId: "1", itemName: "笔试成绩", score: 78, timestamp: Date.now() },
          { itemId: "3", itemName: "日常表现", score: 85, timestamp: Date.now() },
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
          { itemId: "1", itemName: "笔试成绩", score: 88, timestamp: Date.now() },
          { itemId: "3", itemName: "日常表现", score: 92, timestamp: Date.now() },
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
          { itemId: "1", itemName: "笔试成绩", score: 82, timestamp: Date.now() },
          { itemId: "3", itemName: "日常表现", score: 87, timestamp: Date.now() },
        ],
        finalScore: 0,
        status: "waiting",
      },
    ]

    candidates.forEach((candidate) => {
      this.candidates.set(candidate.id, candidate)
      this.calculateFinalScore(candidate.id)
    })
    this.currentCandidateId = candidates[0].id

    // 添加示例批次
    const sampleBatch: Batch = {
      id: "sample-1",
      name: "列车长面试标准配置",
      description: "适用于列车长岗位的标准面试配置，包含5个评分维度和3个成绩项目",
      createdAt: Date.now() - 86400000, // 1天前
      updatedAt: Date.now() - 86400000,
      config: {
        judges: [
          { name: "张主任", isActive: true },
          { name: "李经理", isActive: true },
          { name: "王专家", isActive: true },
          { name: "赵组长", isActive: true },
          { name: "陈主管", isActive: true },
        ],
        dimensions: [
          {
            name: "专业能力",
            description: "专业知识掌握程度和实际应用能力",
            maxScore: 25,
            weight: 25,
            order: 1,
            isActive: true,
          },
          {
            name: "沟通表达",
            description: "语言表达清晰度和沟通技巧",
            maxScore: 20,
            weight: 20,
            order: 2,
            isActive: true,
          },
          {
            name: "领导能力",
            description: "团队管理和决策能力",
            maxScore: 25,
            weight: 25,
            order: 3,
            isActive: true,
          },
          {
            name: "应急处理",
            description: "突发情况的应对和处理能力",
            maxScore: 15,
            weight: 15,
            order: 4,
            isActive: true,
          },
          {
            name: "综合素质",
            description: "整体素养和职业形象",
            maxScore: 15,
            weight: 15,
            order: 5,
            isActive: true,
          },
        ],
        scoreItems: [
          {
            name: "笔试成绩",
            description: "理论知识考试成绩",
            maxScore: 100,
            weight: 30,
            order: 1,
            isActive: true,
          },
          {
            name: "面试成绩",
            description: "面试综合评分",
            maxScore: 100,
            weight: 50,
            order: 2,
            isActive: true,
          },
          {
            name: "日常表现",
            description: "工作表现和综合评价",
            maxScore: 100,
            weight: 20,
            order: 3,
            isActive: true,
          },
        ],
        systemSettings: {
          maxScore: 100,
          precision: "integer",
          calculationMethod: "weighted",
          autoRefresh: true,
          refreshInterval: 5000,
        },
      },
    }

    this.batches.set(sampleBatch.id, sampleBatch)
  }

  // 计算最终得分
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

  // 获取所有候选人
  getCandidates(): Candidate[] {
    return Array.from(this.candidates.values())
  }

  // 获取所有评委
  getJudges(): Judge[] {
    return Array.from(this.judges.values())
  }

  // 获取面试维度
  getInterviewDimensions(): InterviewDimension[] {
    return Array.from(this.interviewDimensions.values()).sort((a, b) => a.order - b.order)
  }

  // 获取成绩项目
  getScoreItems(): ScoreItem[] {
    return Array.from(this.scoreItems.values()).sort((a, b) => a.order - b.order)
  }

  // 获取题目
  getQuestions(): Question[] {
    return Array.from(this.questions.values()).sort((a, b) => a.order - b.order)
  }

  // 获取显示会话
  getDisplaySession(): DisplaySession {
    return this.displaySession
  }

  // 设置显示环节
  setDisplayStage(stage: "opening" | "questioning" | "scoring") {
    this.displaySession.currentStage = stage
    console.log("Setting display stage to:", stage) // 添加调试日志
    this.emitEvent({
      type: "stage_changed",
      data: { stage, displaySession: this.displaySession },
      timestamp: Date.now(),
    })
  }

  // 设置当前题目
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
      console.log("Setting current question:", this.displaySession.currentQuestion) // 添加调试日志
      this.emitEvent({
        type: "question_changed",
        data: { question: this.displaySession.currentQuestion, displaySession: this.displaySession },
        timestamp: Date.now(),
      })
    }
  }

  // 新增：设置当前面试项目（统一处理题目和面试环节）
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

      // 为了向后兼容，如果是题目类型，也更新currentQuestion
      if (item.type === 'question') {
        this.displaySession.currentQuestion = {
          id: item.id,
          title: item.title,
          content: item.content || '',
          timeLimit: item.timeLimit || 300,
          startTime: Date.now(),
        }
      }

      console.log("Setting current interview item:", this.displaySession.currentInterviewItem)
      this.emitEvent({
        type: "interview_item_changed",
        data: {
          item: this.displaySession.currentInterviewItem,
          displaySession: this.displaySession
        },
        timestamp: Date.now(),
      })

      // 为了向后兼容，也发送question_changed事件
      if (item.type === 'question') {
        this.emitEvent({
          type: "question_changed",
          data: { question: this.displaySession.currentQuestion, displaySession: this.displaySession },
          timestamp: Date.now(),
        })
      }
    }
  }

  // 获取当前候选人
  getCurrentCandidate(): Candidate | null {
    return this.currentCandidateId ? this.candidates.get(this.currentCandidateId) || null : null
  }

  // 设置当前候选人
  setCurrentCandidate(candidateId: string) {
    const candidate = this.candidates.get(candidateId)
    if (candidate) {
      // 首先将之前的当前候选人状态重置为等待中
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

      // 设置新的当前候选人
      this.currentCandidateId = candidateId
      candidate.status = "interviewing"
      this.emitEvent({
        type: "candidate_changed",
        data: candidate,
        timestamp: Date.now(),
      })
    }
  }

  // 提交评分
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

    // 计算总分（当前轮次所有评委的平均分）
    const currentRoundScores = candidate.scores.filter((s) => s.round === this.currentRound)
    candidate.totalScore =
      currentRoundScores.length > 0
        ? Math.round(currentRoundScores.reduce((sum, s) => sum + s.totalScore, 0) / currentRoundScores.length)
        : 0

    // 重新计算最终得分
    this.calculateFinalScore(candidateId)

    this.emitEvent({
      type: "score_updated",
      data: { candidate, score },
      timestamp: Date.now(),
    })

    return true
  }

  // 更新候选人其他成绩
  updateOtherScore(candidateId: string, itemId: string, score: number) {
    const candidate = this.candidates.get(candidateId)
    const scoreItem = this.scoreItems.get(itemId)

    if (!candidate || !scoreItem) return false

    // 移除旧成绩
    candidate.otherScores = candidate.otherScores.filter((s) => s.itemId !== itemId)

    // 添加新成绩
    candidate.otherScores.push({
      itemId,
      itemName: scoreItem.name,
      score,
      timestamp: Date.now(),
    })

    // 重新计算最终得分
    this.calculateFinalScore(candidateId)

    this.emitEvent({
      type: "score_updated",
      data: { candidate },
      timestamp: Date.now(),
    })

    return true
  }

  // 面试维度管理
  addInterviewDimension(dimension: Omit<InterviewDimension, "id">) {
    const id = Date.now().toString()
    const newDimension: InterviewDimension = { ...dimension, id }
    this.interviewDimensions.set(id, newDimension)
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
      this.emitEvent({
        type: "dimension_changed",
        data: { deleted: true, id },
        timestamp: Date.now(),
      })
      return true
    }
    return false
  }

  // 成绩项目管理
  addScoreItem(item: Omit<ScoreItem, "id">) {
    const id = Date.now().toString()
    const newItem: ScoreItem = { ...item, id }
    this.scoreItems.set(id, newItem)
    this.emitEvent({
      type: "score_item_changed",
      data: newItem,
      timestamp: Date.now(),
    })
    return newItem
  }

  updateScoreItem(id: string, updates: Partial<Omit<ScoreItem, "id">>) {
    const item = this.scoreItems.get(id)
    if (item) {
      Object.assign(item, updates)
      // 重新计算所有候选人的最终得分
      this.candidates.forEach((candidate) => {
        this.calculateFinalScore(candidate.id)
      })
      this.emitEvent({
        type: "score_item_changed",
        data: item,
        timestamp: Date.now(),
      })
      return item
    }
    return null
  }

  deleteScoreItem(id: string) {
    const item = this.scoreItems.get(id)
    if (item) {
      this.scoreItems.delete(id)
      // 删除所有候选人的相关成绩
      this.candidates.forEach((candidate) => {
        candidate.otherScores = candidate.otherScores.filter((s) => s.itemId !== id)
        this.calculateFinalScore(candidate.id)
      })
      this.emitEvent({
        type: "score_item_changed",
        data: { deleted: true, id },
        timestamp: Date.now(),
      })
      return true
    }
    return false
  }

  // 其他现有方法保持不变...
  getCandidateScores(candidateId: string): Score[] {
    const candidate = this.candidates.get(candidateId)
    return candidate ? candidate.scores : []
  }

  addCandidate(candidate: Omit<Candidate, "id" | "scores" | "totalScore" | "otherScores" | "finalScore">) {
    const id = Date.now().toString()
    const newCandidate: Candidate = {
      ...candidate,
      id,
      scores: [],
      totalScore: 0,
      otherScores: [],
      finalScore: 0,
    }
    this.candidates.set(id, newCandidate)
    this.emitEvent({
      type: "candidate_changed",
      data: newCandidate,
      timestamp: Date.now(),
    })
    return newCandidate
  }

  updateCandidate(id: string, updates: Partial<Omit<Candidate, "id" | "scores">>) {
    const candidate = this.candidates.get(id)
    if (candidate) {
      Object.assign(candidate, updates)
      this.emitEvent({
        type: "candidate_changed",
        data: candidate,
        timestamp: Date.now(),
      })
      return candidate
    }
    return null
  }

  deleteCandidate(id: string) {
    const candidate = this.candidates.get(id)
    if (candidate) {
      this.candidates.delete(id)
      if (this.currentCandidateId === id) {
        this.currentCandidateId = null
      }
      this.emitEvent({
        type: "candidate_changed",
        data: { deleted: true, id },
        timestamp: Date.now(),
      })
      return true
    }
    return false
  }

  batchAddCandidates(candidates: Omit<Candidate, "id" | "scores" | "totalScore" | "otherScores" | "finalScore">[]) {
    const addedCandidates: Candidate[] = []
    candidates.forEach((candidateData) => {
      const candidate = this.addCandidate(candidateData)
      addedCandidates.push(candidate)
    })
    return addedCandidates
  }

  clearAllCandidates() {
    this.candidates.clear()
    this.currentCandidateId = null
    this.emitEvent({
      type: "candidate_changed",
      data: { cleared: true },
      timestamp: Date.now(),
    })
  }

  addJudge(judge: Omit<Judge, "id">) {
    const id = Date.now().toString()
    const newJudge: Judge = { ...judge, id }
    this.judges.set(id, newJudge)
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
      this.candidates.forEach((candidate) => {
        candidate.scores = candidate.scores.filter((score) => score.judgeId !== id)
        const currentRoundScores = candidate.scores.filter((s) => s.round === this.currentRound)
        candidate.totalScore =
          currentRoundScores.length > 0
            ? Math.round(currentRoundScores.reduce((sum, s) => sum + s.totalScore, 0) / currentRoundScores.length)
            : 0
        this.calculateFinalScore(candidate.id)
      })
      this.emitEvent({
        type: "judge_changed",
        data: { deleted: true, id },
        timestamp: Date.now(),
      })
      return true
    }
    return false
  }

  setJudgeOnlineStatus(id: string, isOnline: boolean) {
    const judge = this.judges.get(id)
    if (judge) {
      judge.isActive = isOnline
      this.emitEvent({
        type: "judge_changed",
        data: judge,
        timestamp: Date.now(),
      })
      return judge
    }
    return null
  }

  addEventListener(listener: (event: ScoringEvent) => void) {
    this.eventListeners.push(listener)
    console.log(`[Store] Event listener added, total listeners: ${this.eventListeners.length}`)
  }

  removeEventListener(listener: (event: ScoringEvent) => void) {
    const index = this.eventListeners.indexOf(listener)
    if (index > -1) {
      this.eventListeners.splice(index, 1)
      console.log(`[Store] Event listener removed, remaining listeners: ${this.eventListeners.length}`)
    }
  }

  private emitEvent(event: ScoringEvent) {
    console.log(`[Store] Emitting event ${event.type} to ${this.eventListeners.length} listeners`)
    this.eventListeners.forEach((listener, index) => {
      try {
        listener(event)
      } catch (error) {
        console.error(`[Store] Error in listener ${index} for event ${event.type}:`, error)
      }
    })
  }

  resetCandidate(candidateId: string) {
    const candidate = this.candidates.get(candidateId)
    if (candidate) {
      candidate.scores = []
      candidate.totalScore = 0
      candidate.status = "waiting"
      // 如果重置的是当前候选人，清除当前候选人ID
      if (this.currentCandidateId === candidateId) {
        this.currentCandidateId = null
      }
      this.calculateFinalScore(candidateId)
      this.emitEvent({
        type: "candidate_changed",
        data: candidate,
        timestamp: Date.now(),
      })
    }
  }

  // 重置所有候选人状态（修复错误状态用）
  resetAllCandidatesStatus() {
    this.candidates.forEach((candidate) => {
      if (candidate.id !== this.currentCandidateId) {
        candidate.status = "waiting"
      } else {
        candidate.status = "interviewing"
      }
      this.emitEvent({
        type: "candidate_changed",
        data: candidate,
        timestamp: Date.now(),
      })
    })
  }

  // 批次管理方法
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

    // 重新计算所有候选人的最终得分
    this.candidates.forEach((candidate) => {
      candidate.scores = [] // 清空评分记录
      candidate.totalScore = 0
      candidate.otherScores = [] // 清空其他成绩
      this.calculateFinalScore(candidate.id)
    })

    this.emitEvent({
      type: "batch_changed",
      data: { loaded: true, batchId },
      timestamp: Date.now(),
    })

    return true
  }

  updateBatch(id: string, updates: Partial<Omit<Batch, "id" | "createdAt">>): Batch | null {
    const batch = this.batches.get(id)
    if (!batch) return null

    const updatedBatch = {
      ...batch,
      ...updates,
      updatedAt: Date.now(),
    }

    this.batches.set(id, updatedBatch)
    this.emitEvent({
      type: "batch_changed",
      data: updatedBatch,
      timestamp: Date.now(),
    })

    return updatedBatch
  }

  deleteBatch(id: string): boolean {
    const batch = this.batches.get(id)
    if (!batch) return false

    this.batches.delete(id)
    this.emitEvent({
      type: "batch_changed",
      data: { deleted: true, id },
      timestamp: Date.now(),
    })

    return true
  }

  clearAllData(): void {
    this.candidates.clear()
    this.judges.clear()
    this.interviewDimensions.clear()
    this.scoreItems.clear()
    this.currentCandidateId = null

    this.emitEvent({
      type: "batch_changed",
      data: { cleared: true },
      timestamp: Date.now(),
    })
  }

  // 面试项目管理
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

      this.emitEvent({
        type: "interview_item_deleted",
        data: { id, item },
        timestamp: Date.now(),
      })
    }
  }
}

export const scoringStore = new ScoringStore()
