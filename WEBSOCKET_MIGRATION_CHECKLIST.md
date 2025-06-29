# WebSocket迁移检查清单

## 📋 基于现有代码的详细迁移计划

### 🔍 现有代码分析结果

#### 已发现的关键文件和功能
- ✅ **SSE事件系统** - `app/api/events/route.ts`
- ✅ **状态管理** - `lib/scoring-store-enhanced.ts` 
- ✅ **事件类型定义** - `types/scoring.ts`
- ✅ **前端SSE集成** - 3个主要页面
- ✅ **现有依赖** - 无WebSocket相关依赖
- ✅ **Next.js配置** - 需要添加WebSocket支持

#### 现有事件类型（需要完全兼容）
```typescript
// 来自 types/scoring.ts
export interface ScoringEvent {
  type:
    | "score_updated"           // ✅ 评分更新
    | "candidate_changed"       // ✅ 候选人变更
    | "round_changed"           // ✅ 轮次变更
    | "judge_changed"           // ✅ 评委变更
    | "dimension_changed"       // ✅ 维度变更
    | "score_item_changed"      // ✅ 评分项变更
    | "batch_changed"           // ✅ 批次变更
    | "stage_changed"           // ✅ 阶段变更
    | "question_changed"        // ✅ 题目变更
    | "interview_item_changed"  // ✅ 面试项目变更
  data: any
  timestamp: number
}
```

---

## 📝 详细迁移检查清单

### 第一阶段：环境准备

#### ✅ 依赖安装
- [ ] 安装 `ws` 包 - WebSocket服务器
- [ ] 安装 `uuid` 包 - 客户端ID生成
- [ ] 安装 `@types/ws` - WebSocket类型
- [ ] 安装 `@types/uuid` - UUID类型

#### ✅ 配置更新
- [ ] 更新 `next.config.mjs` 添加WebSocket支持
- [ ] 添加WebSocket服务器配置
- [ ] 配置开发环境端口

### 第二阶段：核心文件创建

#### ✅ WebSocket核心文件
- [ ] `lib/websocket/types.ts` - 类型定义
- [ ] `lib/websocket/server.ts` - 服务器实现
- [ ] `lib/websocket/client.ts` - 客户端实现
- [ ] `lib/websocket/manager.ts` - 连接管理器
- [ ] `lib/websocket/events.ts` - 事件映射

#### ✅ API路由
- [ ] `app/api/websocket/route.ts` - WebSocket API端点

#### ✅ React集成
- [ ] `hooks/useWebSocket.ts` - WebSocket Hook
- [ ] `hooks/useConnectionStatus.ts` - 连接状态Hook
- [ ] `components/websocket-provider.tsx` - 上下文提供者
- [ ] `components/connection-status.tsx` - 状态显示组件

### 第三阶段：现有代码修改

#### ✅ 状态管理修改 - `lib/scoring-store-enhanced.ts`

**需要修改的方法：**
- [ ] `emitEvent()` - 替换为WebSocket广播
- [ ] `initialize()` - 添加WebSocket初始化
- [ ] 所有状态变更方法 - 确保事件正确发送

**修改示例：**
```typescript
// 旧代码 (第497-506行)
private emitEvent(event: ScoringEvent) {
  this.eventListeners.forEach((listener, index) => {
    try {
      listener(event)
    } catch (error) {
      console.error(`Error in listener ${index}:`, error)
    }
  })
}

// 新代码 (双重发送：保持兼容性 + 添加WebSocket)
private emitEvent(event: ScoringEvent) {
  // 1. 保持现有EventEmitter (兼容性)
  this.eventListeners.forEach((listener, index) => {
    try {
      listener(event)
    } catch (error) {
      console.error(`Error in listener ${index}:`, error)
    }
  })
  
  // 2. 新增WebSocket广播
  if (this.webSocketManager) {
    this.webSocketManager.broadcastEvent(event)
  }
}
```

#### ✅ 类型定义扩展 - `types/scoring.ts`

**需要添加：**
- [ ] WebSocket连接状态类型
- [ ] WebSocket消息类型
- [ ] 客户端类型定义

**扩展示例：**
```typescript
// 添加到现有文件
export interface WebSocketConnection {
  id: string
  type: 'admin' | 'display' | 'judge'
  connected: boolean
  lastHeartbeat: number
}

export interface WebSocketMessage {
  id: string
  type: 'event' | 'response' | 'heartbeat'
  event?: ScoringEvent['type']
  data?: any
  timestamp: number
}
```

#### ✅ 前端页面修改

**1. 管理页面 - `app/admin/page.tsx`**
- [ ] 移除 `EventSource` 相关代码
- [ ] 添加 `useWebSocket` Hook
- [ ] 保持现有事件处理逻辑
- [ ] 添加连接状态显示

**修改位置：**
```typescript
// 查找并替换这些模式
// 旧: useEffect(() => { const eventSource = new EventSource...
// 新: const { subscribe, isConnected } = useWebSocket()
```

**2. 大屏显示页面 - `app/display/page.tsx`**
- [ ] 替换SSE连接为WebSocket (第57-291行)
- [ ] 保持现有事件监听 (stage_changed, question_changed, timer_changed)
- [ ] 优化重连处理 (移除原有reconnectTimer逻辑)
- [ ] 添加连接质量显示 (替换心跳显示)

**3. 评委页面 - `app/judge/page.tsx`** ⚠️ 修正路径
- [ ] 集成WebSocket连接 (第98-172行，带judgeId参数)
- [ ] 保持评分同步功能 (candidate_changed事件处理)
- [ ] 添加离线提示 (连接状态监控)

### 第四阶段：测试验证

#### ✅ 功能测试
- [ ] 基础连接测试
- [ ] 事件发送接收测试
- [ ] 自动重连测试
- [ ] 多客户端同步测试

#### ✅ 兼容性测试
- [ ] 所有现有功能正常工作
- [ ] 事件数据格式一致
- [ ] 状态同步准确
- [ ] 性能无明显下降

#### ✅ 压力测试
- [ ] 10个客户端并发连接
- [ ] 长时间稳定性测试
- [ ] 网络异常恢复测试

### 第五阶段：清理和优化

#### ✅ 代码清理
- [ ] 移除SSE相关代码（保留备份）
- [ ] 清理未使用的导入
- [ ] 更新注释和文档

#### ✅ 性能优化
- [ ] 消息批处理
- [ ] 连接池管理
- [ ] 内存泄漏检查

---

## 🚨 关键注意事项

### 兼容性保证
- **事件名称** - 必须与现有SSE事件完全一致
- **数据格式** - 保持现有数据结构不变
- **时间戳** - 保持现有时间戳格式
- **错误处理** - 保持现有错误处理逻辑

### 回退策略
- **保留SSE代码** - 作为紧急回退方案
- **配置开关** - 支持运行时切换通信方式
- **数据备份** - 确保数据不丢失

### 测试策略
- **并行测试** - WebSocket和SSE同时运行对比
- **渐进切换** - 逐个页面切换到WebSocket
- **用户验收** - 确保用户体验无差异

---

## 📞 实施支持

**准备就绪指标：**
- ✅ 所有依赖已安装
- ✅ 配置文件已更新
- ✅ 核心文件已创建
- ✅ 测试环境已准备

**开始实施时请确认：**
1. 当前系统功能正常
2. 已备份重要代码
3. 有足够时间进行测试
4. 准备好回退方案

---

**文档版本：** v1.0  
**创建日期：** 2025-06-28  
**基于代码分析：** 完成  
**负责人：** Augment Agent
