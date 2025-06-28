# WebSocket实现方案设计文档

## 📋 项目概述

**目标：** 将现有的SSE（Server-Sent Events）通信机制替换为WebSocket，提供更稳定、实时的双向通信。

**适用场景：** 本地局域网环境，最多10台设备连接

**预期收益：**
- 🔄 双向通信能力
- 💪 连接稳定性提升
- ⚡ 实时性改善
- 🔍 准确的在线状态监控
- 🛠️ 更好的错误处理和重连机制

## 🏗️ 架构设计

### 整体架构图
```
┌─────────────────┐    WebSocket    ┌─────────────────┐
│   前端客户端     │ ←──────────────→ │   Next.js服务器  │
│                │                 │                │
│ - 管理页面      │                 │ - WebSocket服务  │
│ - 大屏显示      │                 │ - 状态管理      │
│ - 评分页面      │                 │ - 事件分发      │
└─────────────────┘                 └─────────────────┘
```

### 核心组件设计

#### 1. 服务端WebSocket管理器
```typescript
class WebSocketManager {
  - connections: Map<string, WebSocketConnection>
  - eventEmitter: EventEmitter
  - heartbeatInterval: NodeJS.Timeout
  
  + addConnection(ws, clientId): void
  + removeConnection(clientId): void
  + broadcast(event, data): void
  + sendToClient(clientId, event, data): void
  + startHeartbeat(): void
}
```

#### 2. 客户端WebSocket客户端
```typescript
class WebSocketClient {
  - ws: WebSocket
  - reconnectAttempts: number
  - heartbeatTimer: NodeJS.Timeout
  - eventHandlers: Map<string, Function[]>
  
  + connect(): Promise<void>
  + disconnect(): void
  + send(event, data): void
  + on(event, handler): void
  + startHeartbeat(): void
  + handleReconnect(): void
}
```

## 📁 文件结构

```
lib/
├── websocket/
│   ├── server.ts           # WebSocket服务器
│   ├── client.ts           # WebSocket客户端
│   ├── types.ts            # WebSocket类型定义
│   ├── events.ts           # 事件定义
│   └── manager.ts          # WebSocket管理器（替代scoring-store-enhanced.ts中的SSE部分）
│
app/api/
├── websocket/
│   └── route.ts            # WebSocket API路由
│
hooks/                      # 现有目录，需要添加
├── useWebSocket.ts         # WebSocket React Hook
└── useConnectionStatus.ts  # 连接状态Hook
│
components/
├── websocket-provider.tsx  # WebSocket上下文提供者
├── connection-status.tsx   # 连接状态组件
└── websocket-debug.tsx     # 开发调试组件
│
types/
├── scoring.ts              # 现有文件，需要扩展WebSocket事件类型
└── websocket.ts            # 新增WebSocket专用类型
```

## 🔧 依赖管理

### 需要添加的依赖
```json
{
  "dependencies": {
    "ws": "^8.14.2",              // WebSocket服务器
    "uuid": "^9.0.1"              // 客户端ID生成
  },
  "devDependencies": {
    "@types/ws": "^8.5.8",        // WebSocket类型定义
    "@types/uuid": "^9.0.7"       // UUID类型定义
  }
}
```

### Next.js配置更新
```javascript
// next.config.mjs 需要添加WebSocket支持
const nextConfig = {
  // ... 现有配置
  experimental: {
    serverComponentsExternalPackages: ['ws'],  // 允许在服务器组件中使用ws
  },
  // 开发环境WebSocket配置
  async rewrites() {
    return [
      {
        source: '/api/websocket',
        destination: '/api/websocket',
      },
    ]
  },
}
```

## 🔧 技术实现细节

### 1. 消息协议设计
```typescript
interface WebSocketMessage {
  id: string                    // 消息唯一ID
  type: 'event' | 'response' | 'heartbeat'
  event?: string               // 事件类型
  data?: any                   // 事件数据
  timestamp: number            // 时间戳
  clientId?: string            // 客户端ID
}
```

### 2. 事件类型定义（基于现有SSE事件）
```typescript
type WebSocketEvents = {
  // 系统事件
  'connection': { clientId: string, type: 'admin' | 'display' | 'judge' }
  'disconnection': { clientId: string }
  'heartbeat': { timestamp: number }

  // 业务事件（完全兼容现有SSE事件）
  'score_updated': { candidate: any, score: any }
  'candidate_changed': { candidate: any }
  'round_changed': { round: any }
  'judge_changed': { judge: any }
  'dimension_changed': { dimension: any }
  'score_item_changed': { scoreItem: any }
  'batch_changed': { batch: any }
  'batch_loaded': { batch: any }
  'stage_changed': { stage: string, displaySession: any }
  'question_changed': { question: any, displaySession: any }
  'interview_item_changed': { item: any }
  'interview_items_changed': { items: any[] }
  'interview_item_added': { item: any }
  'interview_item_updated': { item: any }
  'interview_item_deleted': { id: string, item: any }
  'timer_changed': { timerState: any }
  'connection_changed': { connected: boolean, connectionId: string, type: string }
  'data_restored': { backupFileName: string }
  'data_imported': { filePath: string }
}
```

### 3. 连接管理策略
- **连接标识：** 每个连接分配唯一的clientId
- **客户端类型：** admin（管理端）、display（大屏）、judge（评分端）
- **心跳机制：** 每30秒发送心跳，60秒无响应视为断线
- **重连策略：** 指数退避算法，最大重试10次

### 4. 状态同步机制
- **初始状态同步：** 连接建立后立即发送完整状态
- **增量更新：** 状态变化时只发送变更部分
- **状态恢复：** 重连后自动同步最新状态

## � 现有代码集成分析

### 需要修改的现有文件

#### 1. lib/scoring-store-enhanced.ts
**当前状态：** 包含完整的SSE事件发送逻辑
**需要修改：**
- 替换 `emitEvent()` 方法为WebSocket广播
- 保留现有的事件类型和数据结构
- 添加WebSocket连接管理

#### 2. app/api/events/route.ts
**当前状态：** SSE事件流处理
**处理方案：**
- 保留文件作为备用方案
- 新建 `app/api/websocket/route.ts` 处理WebSocket连接

#### 3. 前端页面SSE集成
**需要修改的页面：**
- `app/admin/page.tsx` - 管理页面
- `app/display/page.tsx` - 大屏显示页面
- `app/score/page.tsx` - 评分页面

**修改内容：**
- 替换 `EventSource` 为 `WebSocket`
- 保持现有的事件处理逻辑不变
- 添加连接状态显示

#### 4. types/scoring.ts
**当前状态：** 包含 `ScoringEvent` 类型定义
**需要扩展：**
- 添加WebSocket特有的事件类型
- 保持现有事件类型兼容性

### 兼容性保证策略

#### 事件名称映射
```typescript
// 保持100%兼容现有事件
const SSE_TO_WEBSOCKET_EVENTS = {
  'score_updated': 'score_updated',
  'candidate_changed': 'candidate_changed',
  'stage_changed': 'stage_changed',
  'question_changed': 'question_changed',
  'interview_item_changed': 'interview_item_changed',
  'timer_changed': 'timer_changed',
  // ... 其他事件保持一致
}
```

#### 数据格式兼容
```typescript
// 保持现有数据格式不变
interface WebSocketEventData {
  type: ScoringEvent['type']  // 复用现有类型
  data: any                   // 保持现有数据结构
  timestamp: number           // 保持现有时间戳
}
```

## �🚀 实施计划

### 第一步：基础WebSocket服务搭建（预计1天）

#### 1.1 创建WebSocket服务器
- 实现基础WebSocket服务器
- 添加连接管理功能
- 实现消息路由机制

#### 1.2 创建WebSocket客户端
- 实现客户端连接逻辑
- 添加自动重连机制
- 实现事件监听系统

#### 1.3 集成到Next.js
- 创建WebSocket API路由
- 配置WebSocket服务器
- 测试基础连接功能

**验收标准：**
- ✅ 客户端能成功连接到WebSocket服务器
- ✅ 能发送和接收基础消息
- ✅ 连接断开后能自动重连

### 第二步：业务事件迁移（预计1天）

#### 2.1 事件系统重构
- 定义WebSocket事件类型
- 实现事件分发机制
- 创建事件处理器

#### 2.2 状态管理集成
- 将现有状态管理与WebSocket集成
- 实现状态变化的WebSocket广播
- 添加状态同步机制

#### 2.3 前端页面适配
- 管理页面WebSocket集成
- 大屏显示页面WebSocket集成
- 评分页面WebSocket集成

**验收标准：**
- ✅ 所有现有SSE事件都能通过WebSocket正常工作
- ✅ 状态变化能实时同步到所有客户端
- ✅ 页面功能与原有SSE版本完全一致

### 第三步：优化和完善（预计0.5天）

#### 3.1 连接状态监控
- 实现连接状态显示组件
- 添加在线用户列表
- 实现连接质量监控

#### 3.2 错误处理优化
- 完善错误处理机制
- 添加详细的日志记录
- 实现优雅的降级处理

#### 3.3 性能优化
- 优化消息传输效率
- 实现消息队列机制
- 添加连接池管理

**验收标准：**
- ✅ 连接状态准确显示
- ✅ 错误处理完善，用户体验良好
- ✅ 系统性能稳定，无内存泄漏

## 📊 迁移策略

### 渐进式迁移方案
1. **并行运行期：** WebSocket和SSE同时运行，WebSocket作为备用
2. **切换测试期：** 逐步将功能切换到WebSocket，保留SSE作为回退
3. **完全迁移期：** 移除SSE相关代码，完全使用WebSocket

### 回退计划
- 保留现有SSE代码作为备份
- 实现一键切换机制
- 准备快速回退脚本

## 🧪 测试计划

### 功能测试
- [ ] 基础连接测试
- [ ] 消息发送接收测试
- [ ] 自动重连测试
- [ ] 多客户端同步测试
- [ ] 状态恢复测试

### 性能测试
- [ ] 10个客户端并发连接测试
- [ ] 长时间稳定性测试
- [ ] 网络异常恢复测试
- [ ] 内存使用监控测试

### 兼容性测试
- [ ] 不同浏览器兼容性测试
- [ ] 移动设备兼容性测试
- [ ] 网络环境适应性测试

## 🔍 监控和维护

### 关键指标监控
- 连接数量和状态
- 消息传输延迟
- 重连频率和成功率
- 错误发生率

### 日志记录
- 连接建立和断开日志
- 消息传输日志
- 错误和异常日志
- 性能指标日志

## 📝 注意事项

### 开发注意事项
- 保持与现有API的兼容性
- 确保事件名称和数据格式一致
- 注意内存泄漏和资源清理
- 做好错误边界处理

### 部署注意事项
- 确保WebSocket端口可访问
- 配置适当的超时设置
- 准备监控和告警机制
- 制定应急响应计划

## 💻 核心代码实现示例

### WebSocket服务器实现
```typescript
// lib/websocket/server.ts
import { WebSocketServer } from 'ws'
import { EventEmitter } from 'events'

export class WebSocketManager extends EventEmitter {
  private wss: WebSocketServer
  private connections = new Map<string, WebSocketConnection>()
  private heartbeatInterval: NodeJS.Timeout

  constructor(port: number) {
    super()
    this.wss = new WebSocketServer({ port })
    this.setupServer()
    this.startHeartbeat()
  }

  private setupServer() {
    this.wss.on('connection', (ws, req) => {
      const clientId = this.generateClientId()
      const connection = new WebSocketConnection(clientId, ws, this)
      this.connections.set(clientId, connection)

      console.log(`[WebSocket] Client ${clientId} connected`)
      this.emit('client_connected', { clientId, connection })
    })
  }

  broadcast(event: string, data: any, excludeClient?: string) {
    const message = this.createMessage('event', event, data)
    this.connections.forEach((conn, clientId) => {
      if (clientId !== excludeClient && conn.isAlive) {
        conn.send(message)
      }
    })
  }

  sendToClient(clientId: string, event: string, data: any) {
    const connection = this.connections.get(clientId)
    if (connection && connection.isAlive) {
      const message = this.createMessage('event', event, data)
      connection.send(message)
    }
  }
}
```

### WebSocket客户端实现
```typescript
// lib/websocket/client.ts
export class WebSocketClient extends EventEmitter {
  private ws: WebSocket | null = null
  private url: string
  private reconnectAttempts = 0
  private maxReconnectAttempts = 10
  private reconnectDelay = 1000
  private heartbeatTimer: NodeJS.Timeout | null = null
  private isConnecting = false

  constructor(url: string) {
    super()
    this.url = url
  }

  async connect(): Promise<void> {
    if (this.isConnecting || this.isConnected()) {
      return
    }

    this.isConnecting = true

    try {
      this.ws = new WebSocket(this.url)
      this.setupEventHandlers()

      await new Promise((resolve, reject) => {
        this.ws!.onopen = () => {
          this.isConnecting = false
          this.reconnectAttempts = 0
          this.startHeartbeat()
          this.emit('connected')
          resolve(void 0)
        }

        this.ws!.onerror = (error) => {
          this.isConnecting = false
          reject(error)
        }
      })
    } catch (error) {
      this.isConnecting = false
      this.handleReconnect()
      throw error
    }
  }

  private setupEventHandlers() {
    if (!this.ws) return

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        this.handleMessage(message)
      } catch (error) {
        console.error('[WebSocket] Failed to parse message:', error)
      }
    }

    this.ws.onclose = () => {
      this.cleanup()
      this.emit('disconnected')
      this.handleReconnect()
    }

    this.ws.onerror = (error) => {
      console.error('[WebSocket] Connection error:', error)
      this.emit('error', error)
    }
  }

  send(event: string, data: any) {
    if (!this.isConnected()) {
      console.warn('[WebSocket] Cannot send message: not connected')
      return
    }

    const message = {
      id: this.generateMessageId(),
      type: 'event',
      event,
      data,
      timestamp: Date.now()
    }

    this.ws!.send(JSON.stringify(message))
  }
}
```

### React Hook实现
```typescript
// hooks/useWebSocket.ts
export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false)
  const [connectionQuality, setConnectionQuality] = useState<'good' | 'poor' | 'disconnected'>('disconnected')
  const wsClient = useRef<WebSocketClient | null>(null)

  useEffect(() => {
    const client = new WebSocketClient(getWebSocketUrl())
    wsClient.current = client

    client.on('connected', () => {
      setIsConnected(true)
      setConnectionQuality('good')
    })

    client.on('disconnected', () => {
      setIsConnected(false)
      setConnectionQuality('disconnected')
    })

    client.connect().catch(console.error)

    return () => {
      client.disconnect()
    }
  }, [])

  const sendEvent = useCallback((event: string, data: any) => {
    wsClient.current?.send(event, data)
  }, [])

  const subscribe = useCallback((event: string, handler: Function) => {
    wsClient.current?.on(event, handler)
    return () => wsClient.current?.off(event, handler)
  }, [])

  return {
    isConnected,
    connectionQuality,
    sendEvent,
    subscribe
  }
}
```

## 🎯 详细实施步骤

### 第一步具体任务清单

#### 1.1 创建基础文件结构（30分钟）
- [ ] 创建 `lib/websocket/` 目录
- [ ] 创建 `lib/websocket/types.ts` - 类型定义
- [ ] 创建 `lib/websocket/server.ts` - 服务器实现
- [ ] 创建 `lib/websocket/client.ts` - 客户端实现
- [ ] 创建 `lib/websocket/events.ts` - 事件定义

#### 1.2 实现WebSocket服务器（2小时）
- [ ] 实现 `WebSocketManager` 类
- [ ] 实现 `WebSocketConnection` 类
- [ ] 添加连接管理功能
- [ ] 实现消息路由机制
- [ ] 添加心跳检测

#### 1.3 实现WebSocket客户端（2小时）
- [ ] 实现 `WebSocketClient` 类
- [ ] 添加自动重连逻辑
- [ ] 实现事件系统
- [ ] 添加连接状态管理
- [ ] 实现消息队列

#### 1.4 Next.js集成（1小时）
- [ ] 创建 `app/api/websocket/route.ts`
- [ ] 配置WebSocket服务器启动
- [ ] 添加开发环境配置
- [ ] 创建基础测试页面

#### 1.5 基础测试（1小时）
- [ ] 测试连接建立
- [ ] 测试消息发送接收
- [ ] 测试自动重连
- [ ] 验证心跳机制

### 第二步具体任务清单

#### 2.1 事件系统迁移（2小时）
- [ ] 定义WebSocket事件类型
- [ ] 创建事件映射表（SSE -> WebSocket）
- [ ] 实现事件分发器
- [ ] 添加事件验证机制

#### 2.2 状态管理集成（2小时）
- [ ] 修改 `scoring-store-enhanced.ts`
- [ ] 集成WebSocket事件发送
- [ ] 实现状态同步机制
- [ ] 添加状态恢复逻辑

#### 2.3 前端页面适配（2小时）
- [ ] 创建 `useWebSocket` Hook
- [ ] 修改管理页面 (`app/admin/page.tsx`)
- [ ] 修改大屏页面 (`app/display/page.tsx`)
- [ ] 修改评分页面 (`app/score/page.tsx`)

#### 2.4 功能验证（2小时）
- [ ] 测试倒计时功能
- [ ] 测试面试控制功能
- [ ] 测试评分同步功能
- [ ] 测试多客户端同步

### 第三步具体任务清单

#### 3.1 连接状态监控（1小时）
- [ ] 创建 `ConnectionStatus` 组件
- [ ] 实现在线用户列表
- [ ] 添加连接质量指示器
- [ ] 创建连接统计面板

#### 3.2 错误处理优化（1小时）
- [ ] 完善错误处理机制
- [ ] 添加错误恢复策略
- [ ] 实现用户友好的错误提示
- [ ] 添加详细日志记录

#### 3.3 性能优化（1小时）
- [ ] 实现消息批处理
- [ ] 添加消息压缩
- [ ] 优化内存使用
- [ ] 实现连接池管理

#### 3.4 最终测试（1小时）
- [ ] 压力测试（10个并发连接）
- [ ] 稳定性测试（长时间运行）
- [ ] 兼容性测试（不同浏览器）
- [ ] 性能基准测试

---

**文档版本：** v1.0
**创建日期：** 2025-06-28
**最后更新：** 2025-06-28
**负责人：** Augment Agent
