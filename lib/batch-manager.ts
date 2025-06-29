// 批次管理器 - 负责批次生命周期管理和数据隔离
import { database, type EnhancedDatabaseData } from './database'
import type {
  EnhancedBatch,
  BatchStatus,
  Candidate,
  Judge,
  InterviewDimension,
  ScoreItem,
  InterviewItem,
  DisplaySession,
} from "@/types/scoring"

export interface BatchConfig {
  name: string
  description: string
  judges: Judge[]
  dimensions: InterviewDimension[]
  scoreItems: ScoreItem[]
  interviewItems: InterviewItem[]
}

export interface RuntimeData {
  candidates: Candidate[]
  currentCandidateId?: string
  currentRound: number
  displaySession: DisplaySession
  currentStage: "opening" | "interviewing" | "scoring"
}

class BatchManager {
  private isInitialized = false

  async initialize(): Promise<void> {
    if (this.isInitialized) return
    
    try {
      await database.initialize()
      
      // 检查是否需要数据迁移
      await this.checkAndMigrateLegacyData()
      
      this.isInitialized = true
      console.log('[BatchManager] Initialized successfully')
    } catch (error) {
      console.error('[BatchManager] Initialization failed:', error)
      throw error
    }
  }

  // ==================== 批次生命周期管理 ====================

  async createBatch(config: BatchConfig): Promise<EnhancedBatch> {
    await this.initialize()
    
    const now = Date.now()
    const batch: EnhancedBatch = {
      id: 'batch-' + now,
      name: config.name,
      description: config.description,
      status: 'draft',
      createdAt: now,
      updatedAt: now,
      lastActiveAt: now,
      config: {
        judges: config.judges.map(({ id, ...judge }) => judge),
        dimensions: config.dimensions.map(({ id, ...dimension }) => dimension),
        scoreItems: config.scoreItems.map(({ id, ...item }) => item),
        interviewItems: config.interviewItems.map(({ id, ...item }) => item),
        systemSettings: {
          maxScore: 100,
          precision: "integer",
          calculationMethod: "weighted",
          autoRefresh: true,
          refreshInterval: 5000,
        }
      },
      runtime: {
        candidates: [],
        currentRound: 1,
        displaySession: {
          id: "main",
          currentStage: "opening",
          settings: {
            showTimer: true,
            showProgress: true,
            autoAdvance: false,
          },
        },
        currentStage: "opening",
        totalScores: 0,
        metadata: {
          totalCandidates: 0,
          completedCandidates: 0,
          averageScore: 0,
          lastUpdated: now
        }
      }
    }

    await this.saveBatch(batch)
    console.log('[BatchManager] Created new batch:', batch.id)
    return batch
  }

  async startBatch(batchId: string): Promise<void> {
    await this.initialize()
    
    // 检查是否有其他活跃批次
    const activeBatch = await this.getActiveBatch()
    if (activeBatch && activeBatch.id !== batchId) {
      throw new Error(`Cannot start batch ${batchId}: batch ${activeBatch.id} is already active`)
    }

    const batch = await this.getBatch(batchId)
    if (!batch) {
      throw new Error(`Batch ${batchId} not found`)
    }

    if (batch.status !== 'draft' && batch.status !== 'paused') {
      throw new Error(`Cannot start batch ${batchId}: current status is ${batch.status}`)
    }

    const now = Date.now()
    batch.status = 'active'
    batch.startedAt = batch.startedAt || now
    batch.updatedAt = now
    batch.lastActiveAt = now

    await this.saveBatch(batch)
    await this.setActiveBatch(batchId)
    
    console.log('[BatchManager] Started batch:', batchId)
  }

  async pauseBatch(batchId: string): Promise<void> {
    await this.initialize()
    
    const batch = await this.getBatch(batchId)
    if (!batch) {
      throw new Error(`Batch ${batchId} not found`)
    }

    if (batch.status !== 'active') {
      throw new Error(`Cannot pause batch ${batchId}: current status is ${batch.status}`)
    }

    const now = Date.now()
    batch.status = 'paused'
    batch.pausedAt = now
    batch.updatedAt = now

    await this.saveBatch(batch)
    
    console.log('[BatchManager] Paused batch:', batchId)
  }

  async resumeBatch(batchId: string): Promise<void> {
    await this.initialize()
    
    const batch = await this.getBatch(batchId)
    if (!batch) {
      throw new Error(`Batch ${batchId} not found`)
    }

    if (batch.status !== 'paused') {
      throw new Error(`Cannot resume batch ${batchId}: current status is ${batch.status}`)
    }

    const now = Date.now()
    batch.status = 'active'
    batch.updatedAt = now
    batch.lastActiveAt = now

    await this.saveBatch(batch)
    await this.setActiveBatch(batchId)
    
    console.log('[BatchManager] Resumed batch:', batchId)
  }

  async completeBatch(batchId: string): Promise<void> {
    await this.initialize()
    
    const batch = await this.getBatch(batchId)
    if (!batch) {
      throw new Error(`Batch ${batchId} not found`)
    }

    if (batch.status !== 'active' && batch.status !== 'paused') {
      throw new Error(`Cannot complete batch ${batchId}: current status is ${batch.status}`)
    }

    const now = Date.now()
    batch.status = 'completed'
    batch.completedAt = now
    batch.updatedAt = now

    await this.saveBatch(batch)
    
    // 清除活跃批次状态
    await this.clearActiveBatch()
    
    console.log('[BatchManager] Completed batch:', batchId)
  }

  // ==================== 批次数据管理 ====================

  async getBatch(batchId: string): Promise<EnhancedBatch | null> {
    await this.initialize()
    
    try {
      const data = await this.loadEnhancedData()
      return data.batches.find(batch => batch.id === batchId) || null
    } catch (error) {
      console.error('[BatchManager] Error getting batch:', error)
      return null
    }
  }

  async getAllBatches(): Promise<EnhancedBatch[]> {
    await this.initialize()
    
    try {
      const data = await this.loadEnhancedData()
      return data.batches.sort((a, b) => b.lastActiveAt - a.lastActiveAt)
    } catch (error) {
      console.error('[BatchManager] Error getting all batches:', error)
      return []
    }
  }

  async getActiveBatch(): Promise<EnhancedBatch | null> {
    await this.initialize()
    
    try {
      const data = await this.loadEnhancedData()
      if (!data.systemConfig.activeBatchId) return null
      
      return data.batches.find(batch => 
        batch.id === data.systemConfig.activeBatchId && batch.status === 'active'
      ) || null
    } catch (error) {
      console.error('[BatchManager] Error getting active batch:', error)
      return null
    }
  }

  async saveBatch(batch: EnhancedBatch): Promise<void> {
    await this.initialize()
    
    try {
      const data = await this.loadEnhancedData()
      const index = data.batches.findIndex(b => b.id === batch.id)
      
      if (index >= 0) {
        data.batches[index] = batch
      } else {
        data.batches.push(batch)
      }
      
      data.metadata.lastUpdated = Date.now()
      await this.saveEnhancedData(data)
      
      console.log('[BatchManager] Saved batch:', batch.id)
    } catch (error) {
      console.error('[BatchManager] Error saving batch:', error)
      throw error
    }
  }

  // ==================== 私有辅助方法 ====================

  private async setActiveBatch(batchId: string): Promise<void> {
    const data = await this.loadEnhancedData()
    data.systemConfig.activeBatchId = batchId
    await this.saveEnhancedData(data)
  }

  private async clearActiveBatch(): Promise<void> {
    const data = await this.loadEnhancedData()
    data.systemConfig.activeBatchId = undefined
    await this.saveEnhancedData(data)
  }

  private async loadEnhancedData(): Promise<EnhancedDatabaseData> {
    return await database.initializeEnhanced()
  }

  private async saveEnhancedData(data: EnhancedDatabaseData): Promise<void> {
    await database.saveEnhanced(data)
  }

  private async checkAndMigrateLegacyData(): Promise<void> {
    // 数据迁移在 database.initializeEnhanced() 中自动处理
    console.log('[BatchManager] Legacy data migration handled by database layer')
  }
}

// 导出单例实例
export const batchManager = new BatchManager()
