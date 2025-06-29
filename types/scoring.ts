export interface Candidate {
  id: string
  name: string
  number: string // 工号
  department: string // 部门
  currentRound: number
  totalScore: number
  scores: Score[]
  otherScores: OtherScore[] // 其他成绩（笔试、日常表现等）
  finalScore: number // 最终综合得分
  status: "waiting" | "interviewing" | "completed"
}

export interface Score {
  judgeId: string
  judgeName: string
  round: number
  categories: Record<string, number> // 动态维度评分
  totalScore: number
  timestamp: number
}

export interface Judge {
  id: string
  name: string
  password: string
  isActive: boolean
}

export interface InterviewDimension {
  id: string
  name: string
  description: string
  maxScore: number
  order: number
  isActive: boolean
}

export interface ScoreItem {
  id: string
  name: string
  description: string
  maxScore: number
  weight: number // 在最终得分中的权重百分比
  order: number
  isActive: boolean
}

export interface OtherScore {
  itemId: string
  itemName: string
  score: number
  timestamp: number
}

// 批次状态枚举
export type BatchStatus = 'draft' | 'active' | 'paused' | 'completed' | 'archived'

// 增强的批次接口
export interface EnhancedBatch {
  // 基础信息
  id: string
  name: string
  description: string
  status: BatchStatus

  // 时间戳
  createdAt: number
  updatedAt: number
  startedAt?: number
  pausedAt?: number
  completedAt?: number
  lastActiveAt: number

  // 批次配置（静态）
  config: {
    judges: Omit<Judge, "id">[]
    dimensions: Omit<InterviewDimension, "id">[]
    scoreItems: Omit<ScoreItem, "id">[]
    interviewItems: Omit<InterviewItem, "id">[]
    systemSettings: {
      maxScore: number
      precision: "integer" | "decimal"
      calculationMethod: "weighted" | "average"
      autoRefresh: boolean
      refreshInterval: number
    }
  }

  // 批次运行时数据（动态）
  runtime: {
    // 候选人数据
    candidates: Candidate[]
    currentCandidateId?: string
    currentRound: number

    // 面试状态
    displaySession: DisplaySession
    currentStage: "opening" | "interviewing" | "scoring"

    // 评分数据（从candidates中提取的汇总）
    totalScores: number

    // 系统状态元数据
    metadata: {
      totalCandidates: number
      completedCandidates: number
      averageScore: number
      lastUpdated: number
    }
  }
}

// 保持向后兼容的原始Batch接口
export interface Batch {
  id: string
  name: string
  description: string
  createdAt: number
  updatedAt: number
  config: {
    judges: Omit<Judge, "id">[]
    dimensions: Omit<InterviewDimension, "id">[]
    scoreItems: Omit<ScoreItem, "id">[]
    systemSettings: {
      maxScore: number
      precision: "integer" | "decimal"
      calculationMethod: "weighted" | "average"
      autoRefresh: boolean
      refreshInterval: number
    }
  }
}

// 倒计时状态
export interface TimerState {
  isRunning: boolean      // 是否正在运行
  isPaused: boolean       // 是否暂停
  remainingTime: number   // 剩余时间（毫秒）
  totalTime: number       // 总时间（毫秒）
  startTime?: number      // 开始时间戳
  pausedTime?: number     // 暂停时间戳
}

export interface DisplaySession {
  id: string
  currentStage: "opening" | "interviewing" | "scoring"
  currentQuestion?: {
    id: string
    title: string
    content: string
    timeLimit: number // 秒
    startTime: number
  }
  // 新增：当前面试项目（替代currentQuestion）
  currentInterviewItem?: {
    id: string
    type: 'question' | 'interview_stage'
    title: string
    subtitle?: string
    content?: string
    timeLimit: number | null
    startTime: number
  }
  // 新增：倒计时状态
  timerState?: TimerState
  settings: {
    showTimer: boolean
    showProgress: boolean
    autoAdvance: boolean
  }
}

export interface Question {
  id: string
  title: string
  content: string
  timeLimit: number
  category: string
  difficulty: "easy" | "medium" | "hard"
  order: number
  isActive: boolean
}

// 新的统一面试项目接口
export interface InterviewItem {
  id: string
  type: 'question' | 'interview_stage'
  title: string                    // "专业知识问答" 或 "面试环节1"
  subtitle?: string               // "自我介绍"、"应急处置"
  content?: string                // 题目内容（仅题目类型）
  timeLimit: number | null        // 时间限制（秒），null表示无限制
  order: number
  isActive: boolean
}

export interface ScoringEvent {
  type:
    | "score_updated"
    | "candidate_changed"
    | "round_changed"
    | "judge_changed"
    | "dimension_changed"
    | "score_item_changed"
    | "batch_changed"
    | "stage_changed"
    | "question_changed"
    | "interview_item_changed"  // 新增事件类型
  data: any
  timestamp: number
}
