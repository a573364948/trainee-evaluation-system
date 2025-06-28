"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { SystemStatusPanel } from "@/components/system-status"
import { useSSE } from "@/lib/sse-client"
import { 
  Wifi, 
  WifiOff, 
  Activity, 
  Database,
  Users,
  CheckCircle
} from "lucide-react"

export default function EnhancedSystemTest() {
  const [connectionTest, setConnectionTest] = useState<{
    status: 'connecting' | 'connected' | 'error' | 'disconnected'
    messages: string[]
    lastMessage: string
  }>({
    status: 'disconnected',
    messages: [],
    lastMessage: ''
  })

  // 测试SSE连接
  const { connectionState, error, reconnect, disconnect } = useSSE({
    url: '/api/sse/enhanced?type=admin',
    enabled: true,
    onMessage: (event) => {
      try {
        const data = JSON.parse(event.data)
        setConnectionTest(prev => ({
          ...prev,
          status: 'connected',
          lastMessage: `${data.type} - ${new Date().toLocaleTimeString()}`,
          messages: [
            `${new Date().toLocaleTimeString()}: ${data.type}`,
            ...prev.messages.slice(0, 9) // 保留最近10条
          ]
        }))
      } catch (error) {
        console.error('Error parsing message:', error)
      }
    },
    onOpen: () => {
      setConnectionTest(prev => ({
        ...prev,
        status: 'connected',
        messages: [
          `${new Date().toLocaleTimeString()}: 连接已建立`,
          ...prev.messages.slice(0, 9)
        ]
      }))
    },
    onError: () => {
      setConnectionTest(prev => ({
        ...prev,
        status: 'error'
      }))
    },
    onClose: () => {
      setConnectionTest(prev => ({
        ...prev,
        status: 'disconnected'
      }))
    },
    onReconnecting: (attempt) => {
      setConnectionTest(prev => ({
        ...prev,
        status: 'connecting',
        messages: [
          `${new Date().toLocaleTimeString()}: 重连尝试 ${attempt}`,
          ...prev.messages.slice(0, 9)
        ]
      }))
    },
    onReconnected: () => {
      setConnectionTest(prev => ({
        ...prev,
        status: 'connected',
        messages: [
          `${new Date().toLocaleTimeString()}: 重连成功`,
          ...prev.messages.slice(0, 9)
        ]
      }))
    }
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'text-green-500'
      case 'connecting': return 'text-yellow-500'
      case 'error': return 'text-red-500'
      case 'disconnected': return 'text-gray-500'
      default: return 'text-gray-500'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected': return <Wifi className="h-4 w-4" />
      case 'connecting': return <Activity className="h-4 w-4 animate-pulse" />
      case 'error':
      case 'disconnected': return <WifiOff className="h-4 w-4" />
      default: return <WifiOff className="h-4 w-4" />
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">增强系统测试</h1>
          <p className="text-muted-foreground">测试新的持久化存储和SSE连接功能</p>
        </div>
      </div>

      {/* 连接状态测试 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            SSE连接测试
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* 连接状态 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={getStatusColor(connectionTest.status)}>
                  {getStatusIcon(connectionTest.status)}
                </div>
                <span className="font-medium">连接状态</span>
              </div>
              <Badge variant={connectionTest.status === 'connected' ? 'default' : 'secondary'}>
                {connectionTest.status}
              </Badge>
            </div>

            {/* 连接详情 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">连接ID</div>
                <div className="font-mono">
                  {connectionState.connectionId || '未连接'}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">重连次数</div>
                <div>{connectionState.retryCount}</div>
              </div>
              <div>
                <div className="text-muted-foreground">最后消息</div>
                <div>{new Date(connectionState.lastMessageTime || 0).toLocaleTimeString() || '无'}</div>
              </div>
              <div>
                <div className="text-muted-foreground">连接状态</div>
                <div>{connectionState.isConnected ? '已连接' : '未连接'}</div>
              </div>
            </div>

            {/* 控制按钮 */}
            <div className="flex gap-2">
              <Button 
                onClick={reconnect} 
                size="sm"
                variant="outline"
              >
                手动重连
              </Button>
              <Button 
                onClick={disconnect} 
                size="sm"
                variant="outline"
              >
                断开连接
              </Button>
            </div>

            {/* 消息日志 */}
            <div>
              <div className="text-sm font-medium mb-2">实时消息日志</div>
              <div className="bg-muted rounded p-3 h-32 overflow-y-auto">
                {connectionTest.messages.length === 0 ? (
                  <div className="text-muted-foreground text-sm">等待消息...</div>
                ) : (
                  <div className="space-y-1">
                    {connectionTest.messages.map((message, index) => (
                      <div key={index} className="text-xs font-mono">
                        {message}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 系统状态面板 */}
      <SystemStatusPanel />

      {/* 测试说明 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            测试说明
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div>
              <strong>🔗 SSE连接测试:</strong>
              <p className="text-muted-foreground">
                上方面板显示SSE连接的实时状态，包括自动重连、心跳检测等功能。
                如果连接中断，系统会自动尝试重连。
              </p>
            </div>
            
            <div>
              <strong>💾 数据持久化测试:</strong>
              <p className="text-muted-foreground">
                所有数据现在会自动保存到文件系统。即使服务器重启，数据也不会丢失。
                您可以在"系统状态概览"中查看数据库文件信息。
              </p>
            </div>
            
            <div>
              <strong>🔄 备份功能测试:</strong>
              <p className="text-muted-foreground">
                使用"数据管理"部分的"创建备份"按钮测试备份功能。
                系统会自动管理备份文件，保留最近10个备份。
              </p>
            </div>
            
            <div>
              <strong>📤 导出功能测试:</strong>
              <p className="text-muted-foreground">
                点击"导出数据"可以下载完整的系统数据JSON文件，
                便于数据迁移或外部分析。
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}