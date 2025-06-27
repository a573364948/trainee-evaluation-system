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
  weight: number // 在面试总分中的权重百分比
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

export interface DisplaySession {
  id: string
  currentStage: "opening" | "questioning" | "scoring"
  currentQuestion?: {
    id: string
    title: string
    content: string
    timeLimit: number // 秒
    startTime: number
  }
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
  data: any
  timestamp: number
}
