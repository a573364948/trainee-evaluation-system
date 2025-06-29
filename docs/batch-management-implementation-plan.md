# 面试批次管理系统实施方案

## 📋 需求分析

### 当前问题
1. **数据持久化不完整**：批次只保存配置信息，运行时数据（候选人、评分、面试进度）仍存储在内存中
2. **状态丢失**：重启系统或更换设备会丢失面试进度和评分数据
3. **批次生命周期缺失**：缺乏真正的批次开始、暂停、结束管理
4. **状态恢复能力弱**：无法恢复到关闭前的面试状态

### 目标功能
1. **完整的批次生命周期管理**：创建 → 开始 → 进行 → 暂停 → 结束
2. **全面数据持久化**：所有运行时数据实时保存到数据库
3. **状态恢复能力**：重启后完全恢复到关闭前状态
4. **批次隔离**：每个批次拥有独立的数据空间
5. **历史批次管理**：可以重新加载和查看历史批次

## 🏗️ 系统架构设计

### 1. 批次状态模型

```typescript
interface EnhancedBatch {
  // 基础信息
  id: string
  name: string
  description: string
  status: 'draft' | 'active' | 'paused' | 'completed' | 'archived'
  
  // 时间戳
  createdAt: number
  startedAt?: number
  pausedAt?: number
  completedAt?: number
  lastActiveAt: number
  
  // 批次配置（静态）
  config: {
    judges: Judge[]
    dimensions: InterviewDimension[]
    scoreItems: ScoreItem[]
    interviewItems: InterviewItem[]
    systemSettings: SystemSettings
  }
  
  // 批次运行时数据（动态）
  runtime: {
    // 候选人数据
    candidates: Candidate[]
    currentCandidateId?: string
    currentRound: number
    
    // 面试状态
    displaySession: DisplaySession
    currentStage: 'opening' | 'interviewing' | 'scoring'
    currentInterviewItem?: CurrentInterviewItem
    currentQuestion?: CurrentQuestion
    timerState?: TimerState
    
    // 评分数据
    scores: Score[]
    
    // 系统状态
    metadata: {
      totalCandidates: number
      completedCandidates: number
      averageScore: number
      lastUpdated: number
    }
  }
}
```

### 2. 数据库结构扩展

```typescript
interface DatabaseData {
  // 全局设置
  systemConfig: {
    activeBatchId?: string
    defaultSettings: SystemSettings
  }
  
  // 批次数据
  batches: EnhancedBatch[]
  
  // 系统元数据
  metadata: {
    version: string
    lastUpdated: number
    backupCount: number
  }
}
```

### 3. 批次管理器

```typescript
class BatchManager {
  // 批次生命周期
  async createBatch(config: BatchConfig): Promise<EnhancedBatch>
  async startBatch(batchId: string): Promise<void>
  async pauseBatch(batchId: string): Promise<void>
  async resumeBatch(batchId: string): Promise<void>
  async completeBatch(batchId: string): Promise<void>
  
  // 批次切换
  async loadBatch(batchId: string): Promise<void>
  async getActiveBatch(): Promise<EnhancedBatch | null>
  
  // 数据同步
  async saveRuntimeData(batchId: string, data: Partial<RuntimeData>): Promise<void>
  async restoreSystemState(batchId: string): Promise<void>
}
```

## 🔧 实施计划

### 阶段一：核心批次管理（高优先级）

#### 1.1 扩展批次数据模型
- [ ] 更新 `Batch` 接口，添加 `status` 和 `runtime` 字段
- [ ] 扩展数据库结构，支持运行时数据存储
- [ ] 创建批次状态枚举和验证逻辑

#### 1.2 实现批次生命周期管理
- [ ] 创建 `BatchManager` 类
- [ ] 实现批次状态转换逻辑
- [ ] 添加批次互斥性检查（只能有一个活跃批次）
- [ ] 实现批次数据隔离

#### 1.3 运行时数据持久化
- [ ] 修改 `EnhancedScoringStore`，所有数据变更实时保存到当前批次
- [ ] 实现候选人、评分、面试进度的批次级存储
- [ ] 添加数据变更的防抖保存机制

#### 1.4 系统状态恢复
- [ ] 实现系统启动时自动加载活跃批次
- [ ] 恢复面试进度、当前候选人、显示状态等
- [ ] 恢复倒计时状态和面试项目状态

### 阶段二：用户界面改进（中优先级）

#### 2.1 批次管理界面升级
- [ ] 添加批次状态显示（草稿、进行中、已完成等）
- [ ] 实现"开始批次"、"暂停批次"、"结束批次"操作
- [ ] 添加当前活跃批次的明显标识
- [ ] 显示批次进度和统计信息

#### 2.2 系统状态指示器
- [ ] 在顶部导航显示当前批次信息
- [ ] 添加批次状态的实时更新
- [ ] 实现数据保存状态指示器
- [ ] 添加批次切换确认对话框

#### 2.3 批次操作优化
- [ ] 实现批次间的安全切换
- [ ] 添加批次数据预览功能
- [ ] 实现批次复制和模板创建
- [ ] 添加批次导出功能

### 阶段三：增强功能（低优先级）

#### 3.1 历史批次管理
- [ ] 实现历史批次的完整加载
- [ ] 添加批次数据的只读查看模式
- [ ] 实现批次数据的统计分析
- [ ] 添加批次比较功能

#### 3.2 数据备份和恢复
- [ ] 实现批次级别的数据备份
- [ ] 添加批次数据的导入导出
- [ ] 实现批次数据的版本管理
- [ ] 添加数据恢复向导

#### 3.3 高级功能
- [ ] 实现批次模板系统
- [ ] 添加批次调度功能
- [ ] 实现多批次并行管理
- [ ] 添加批次数据的云同步

## 🎯 技术实现要点

### 1. 数据一致性保证
- 使用事务性操作确保数据完整性
- 实现乐观锁防止并发冲突
- 添加数据校验和修复机制

### 2. 性能优化
- 实现增量保存，只保存变更的数据
- 使用防抖机制减少频繁的磁盘写入
- 添加数据压缩和索引优化

### 3. 错误处理
- 实现批次数据的自动备份
- 添加数据损坏检测和修复
- 实现优雅的错误恢复机制

### 4. 向后兼容
- 保持现有API接口的兼容性
- 实现数据迁移脚本
- 添加版本检测和升级逻辑

## 📊 预期效果

### 用户体验改进
1. **无缝恢复**：重启系统后自动恢复到关闭前状态
2. **数据安全**：所有面试数据实时保存，不会丢失
3. **批次管理**：清晰的批次生命周期，便于管理多个面试流程
4. **状态透明**：实时显示当前批次状态和数据保存情况

### 系统稳定性提升
1. **数据持久化**：彻底解决数据丢失问题
2. **状态一致性**：确保所有客户端状态同步
3. **错误恢复**：系统异常后能快速恢复正常状态
4. **扩展性**：为未来功能扩展奠定基础

## 🔄 数据迁移策略

### 现有数据兼容性
```typescript
// 数据迁移函数
async function migrateLegacyData(): Promise<void> {
  // 1. 检测现有数据格式
  const currentData = await database.load()

  // 2. 创建默认批次包装现有数据
  if (!currentData.systemConfig?.activeBatchId) {
    const legacyBatch: EnhancedBatch = {
      id: 'legacy-batch-' + Date.now(),
      name: '历史数据批次',
      description: '系统升级前的数据',
      status: 'active',
      createdAt: Date.now(),
      lastActiveAt: Date.now(),
      config: {
        judges: currentData.judges,
        dimensions: currentData.interviewDimensions,
        scoreItems: currentData.scoreItems,
        interviewItems: currentData.interviewItems || [],
        systemSettings: currentData.systemSettings || getDefaultSettings()
      },
      runtime: {
        candidates: currentData.candidates,
        currentCandidateId: currentData.currentCandidateId,
        currentRound: currentData.currentRound || 1,
        displaySession: currentData.displaySession,
        currentStage: currentData.displaySession?.currentStage || 'opening',
        scores: extractScoresFromCandidates(currentData.candidates),
        metadata: {
          totalCandidates: currentData.candidates.length,
          completedCandidates: currentData.candidates.filter(c => c.status === 'completed').length,
          averageScore: calculateAverageScore(currentData.candidates),
          lastUpdated: Date.now()
        }
      }
    }

    // 3. 保存迁移后的数据
    await saveMigratedData(legacyBatch)
  }
}
```

## 🧪 测试策略

### 单元测试
- [ ] 批次状态转换逻辑测试
- [ ] 数据持久化功能测试
- [ ] 批次隔离性测试
- [ ] 数据迁移功能测试

### 集成测试
- [ ] 完整面试流程测试
- [ ] 多客户端同步测试
- [ ] 系统重启恢复测试
- [ ] 批次切换功能测试

### 压力测试
- [ ] 大量候选人数据处理
- [ ] 频繁数据保存性能
- [ ] 长时间运行稳定性
- [ ] 并发访问处理能力

## 📋 实施检查清单

### 阶段一完成标准
- [ ] 批次状态管理正常工作
- [ ] 所有运行时数据实时保存
- [ ] 系统重启后状态完全恢复
- [ ] 现有功能无回归问题
- [ ] 数据迁移成功完成

### 阶段二完成标准
- [ ] 批次管理界面功能完整
- [ ] 用户操作流程顺畅
- [ ] 状态指示器准确显示
- [ ] 错误处理机制完善
- [ ] 用户体验显著改善

### 阶段三完成标准
- [ ] 历史批次管理功能完整
- [ ] 数据备份恢复机制可靠
- [ ] 高级功能稳定运行
- [ ] 系统扩展性良好
- [ ] 文档和培训材料完整

## 🚀 开始实施

建议按照阶段一的顺序开始实施，首先完成核心的批次管理和数据持久化功能，确保系统的基本稳定性，然后再逐步添加用户界面和增强功能。

每个阶段完成后都应该进行充分的测试，确保新功能不影响现有系统的稳定性。

### 立即开始的任务
1. **扩展批次数据模型** - 更新类型定义
2. **实现批次管理器** - 创建核心管理类
3. **修改数据存储** - 集成批次级数据保存
4. **添加状态恢复** - 实现系统启动时的状态恢复

准备好开始实施了吗？我们可以从第一个任务开始！
