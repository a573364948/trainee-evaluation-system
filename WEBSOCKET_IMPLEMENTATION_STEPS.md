# WebSocket实施计划 - 三步走战略

## 🎯 总体目标
将现有SSE通信机制替换为WebSocket，提供更稳定的实时通信能力。

**预计总时间：** 2.5天  
**适用场景：** 本地局域网，≤10台设备

---

## 📋 第一步：基础WebSocket服务搭建
**预计时间：** 1天（8小时）  
**目标：** 建立可工作的WebSocket通信基础

### 🔧 主要任务

#### 1.1 安装依赖和创建文件结构（45分钟）

**安装WebSocket依赖：**
```bash
npm install ws uuid
npm install --save-dev @types/ws @types/uuid
```

**创建目录结构：**
```bash
# 创建新目录（hooks目录已存在）
mkdir -p lib/websocket
mkdir -p app/api/websocket
```

**文件清单：**
- [ ] `lib/websocket/types.ts` - WebSocket类型定义
- [ ] `lib/websocket/server.ts` - WebSocket服务器
- [ ] `lib/websocket/client.ts` - WebSocket客户端
- [ ] `lib/websocket/events.ts` - 事件定义
- [ ] `lib/websocket/manager.ts` - WebSocket管理器
- [ ] `app/api/websocket/route.ts` - API路由
- [ ] `hooks/useWebSocket.ts` - WebSocket Hook
- [ ] `types/websocket.ts` - WebSocket专用类型

#### 1.2 实现WebSocket服务器（2小时）
**核心功能：**
- [ ] 连接管理（建立、断开、清理）
- [ ] 消息路由（广播、单播）
- [ ] 心跳检测（30秒间隔）
- [ ] 客户端标识（唯一ID生成）

#### 1.3 实现WebSocket客户端（2小时）
**核心功能：**
- [ ] 自动连接和重连
- [ ] 事件监听系统
- [ ] 消息发送队列
- [ ] 连接状态管理

#### 1.4 Next.js集成和配置（1小时）
**集成任务：**
- [ ] 更新 `next.config.mjs` 添加WebSocket支持
- [ ] 配置WebSocket服务器启动
- [ ] 创建API路由处理
- [ ] 添加开发环境配置
- [ ] 创建测试页面

**配置更新：**
```javascript
// next.config.mjs 添加
experimental: {
  serverComponentsExternalPackages: ['ws'],
},
```

#### 1.5 基础功能测试（2.5小时）
**测试项目：**
- [ ] 连接建立和断开
- [ ] 消息发送和接收
- [ ] 自动重连机制
- [ ] 心跳保活功能
- [ ] 多客户端连接

### ✅ 第一步验收标准
- ✅ 客户端能稳定连接到WebSocket服务器
- ✅ 能正常发送和接收消息
- ✅ 连接断开后能自动重连
- ✅ 心跳机制正常工作
- ✅ 支持多个客户端同时连接

---

## 📋 第二步：业务事件迁移
**预计时间：** 1天（8小时）  
**目标：** 将所有SSE事件迁移到WebSocket

### 🔧 主要任务

#### 2.1 事件系统重构（2小时）
**事件映射：**
- [ ] `stage_changed` - 面试阶段变更
- [ ] `question_changed` - 题目变更  
- [ ] `interview_item_changed` - 面试项目变更
- [ ] `timer_changed` - 倒计时状态变更
- [ ] `scores_updated` - 评分更新

**实现任务：**
- [ ] 定义WebSocket事件类型
- [ ] 创建事件分发机制
- [ ] 实现事件验证
- [ ] 添加事件日志记录

#### 2.2 状态管理集成（2小时）
**集成任务：**
- [ ] 修改 `lib/scoring-store-enhanced.ts`
  - 替换 `emitEvent()` 方法为WebSocket广播
  - 保留现有事件类型和数据结构
  - 集成WebSocket连接管理
- [ ] 扩展 `types/scoring.ts`
  - 添加WebSocket事件类型
  - 保持现有 `ScoringEvent` 兼容性
- [ ] 实现状态同步机制
- [ ] 添加状态恢复逻辑

**关键修改点：**
```typescript
// scoring-store-enhanced.ts 中的关键修改
// 替换: this.emitEvent(eventType, eventData)
// 为: this.webSocketManager.broadcast(eventType, eventData)
```

#### 2.3 前端页面适配（3小时）
**页面修改：**
- [ ] 创建 `hooks/useWebSocket.ts` React Hook
- [ ] 修改 `app/admin/page.tsx` - 管理页面
  - 替换 `EventSource` 为 `useWebSocket`
  - 保持现有事件处理逻辑
  - 添加连接状态显示
- [ ] 修改 `app/display/page.tsx` - 大屏显示页面
  - 替换SSE连接为WebSocket
  - 保持现有事件监听逻辑
  - 优化重连处理
- [ ] 修改 `app/score/page.tsx` - 评分页面
  - 集成WebSocket连接
  - 保持评分同步功能
- [ ] 移除SSE相关代码（保留作为备份）

**关键修改模式：**
```typescript
// 替换模式
// 旧: const eventSource = new EventSource('/api/events')
// 新: const { subscribe, isConnected } = useWebSocket()
```

#### 2.4 功能验证测试（1小时）
**测试项目：**
- [ ] 倒计时手动控制功能
- [ ] 面试项目切换功能
- [ ] 实时评分同步功能
- [ ] 多页面状态同步

### ✅ 第二步验收标准
- ✅ 所有原有SSE功能通过WebSocket正常工作
- ✅ 状态变化能实时同步到所有客户端
- ✅ 页面功能与SSE版本完全一致
- ✅ 无SSE相关代码残留

---

## 📋 第三步：优化和完善
**预计时间：** 0.5天（4小时）  
**目标：** 提升用户体验和系统稳定性

### 🔧 主要任务

#### 3.1 连接状态监控（1小时）
**监控功能：**
- [ ] 连接状态实时显示
- [ ] 在线用户列表
- [ ] 连接质量指示器
- [ ] 连接统计面板

#### 3.2 错误处理优化（1小时）
**优化项目：**
- [ ] 完善错误处理机制
- [ ] 用户友好的错误提示
- [ ] 自动错误恢复策略
- [ ] 详细的错误日志

#### 3.3 性能优化（1小时）
**优化项目：**
- [ ] 消息批处理机制
- [ ] 内存使用优化
- [ ] 连接池管理
- [ ] 消息队列优化

#### 3.4 最终测试验证（1小时）
**测试项目：**
- [ ] 10个客户端并发测试
- [ ] 长时间稳定性测试
- [ ] 网络异常恢复测试
- [ ] 性能基准测试

### ✅ 第三步验收标准
- ✅ 连接状态准确显示
- ✅ 错误处理完善，用户体验良好
- ✅ 系统性能稳定，无内存泄漏
- ✅ 通过所有压力和稳定性测试

---

## 🚀 实施建议

### 开发顺序
1. **先搭建基础** - 确保WebSocket通信正常
2. **再迁移功能** - 逐个迁移现有功能
3. **最后优化** - 提升性能和用户体验

### 风险控制
- **保留SSE代码** - 作为回退方案
- **并行测试** - WebSocket和SSE同时运行
- **渐进切换** - 逐步将功能切换到WebSocket

### 测试策略
- **单元测试** - 每个组件独立测试
- **集成测试** - 端到端功能测试
- **压力测试** - 多客户端并发测试

---

## 📞 实施支持

**如需开始实施，请告知：**
1. 希望从第几步开始
2. 是否需要详细的代码实现
3. 是否需要实时指导和答疑

**预期收益：**
- 🔄 连接稳定性提升90%
- ⚡ 实时响应速度提升50%
- 🔍 在线状态监控准确率100%
- 🛠️ 错误处理和恢复能力显著增强

---

**文档版本：** v1.0  
**创建日期：** 2025-06-28  
**负责人：** Augment Agent
