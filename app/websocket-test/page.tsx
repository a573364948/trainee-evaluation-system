'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function WebSocketTestPage() {
  const [connectionStatus, setConnectionStatus] = useState<string>('未连接')
  const [messages, setMessages] = useState<string[]>([])
  const [ws, setWs] = useState<WebSocket | null>(null)

  const addMessage = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setMessages(prev => [`${timestamp}: ${message}`, ...prev.slice(0, 9)])
  }

  const testConnection = () => {
    if (ws) {
      ws.close()
    }

    const wsUrl = `ws://${window.location.hostname}:8080`
    addMessage(`尝试连接到: ${wsUrl}`)
    setConnectionStatus('连接中...')

    try {
      const newWs = new WebSocket(wsUrl)

      newWs.onopen = () => {
        addMessage('WebSocket 连接成功！')
        setConnectionStatus('已连接')
        
        // 发送认证消息
        const authMessage = {
          type: 'auth',
          clientType: 'admin',
          timestamp: Date.now()
        }
        newWs.send(JSON.stringify(authMessage))
        addMessage('发送认证消息')
      }

      newWs.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          addMessage(`收到消息: ${data.type} - ${JSON.stringify(data.data || {})}`)
        } catch (error) {
          addMessage(`收到原始消息: ${event.data}`)
        }
      }

      newWs.onclose = (event) => {
        addMessage(`连接关闭: 代码=${event.code}, 原因=${event.reason}`)
        setConnectionStatus('已断开')
      }

      newWs.onerror = (error) => {
        addMessage(`连接错误: ${error}`)
        setConnectionStatus('连接错误')
        console.error('WebSocket error:', error)
      }

      setWs(newWs)
    } catch (error) {
      addMessage(`创建连接失败: ${error}`)
      setConnectionStatus('创建失败')
    }
  }

  const disconnect = () => {
    if (ws) {
      ws.close()
      setWs(null)
    }
  }

  const sendTestMessage = () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      const testMessage = {
        type: 'test',
        data: { message: 'Hello from test page!' },
        timestamp: Date.now()
      }
      ws.send(JSON.stringify(testMessage))
      addMessage('发送测试消息')
    } else {
      addMessage('WebSocket 未连接，无法发送消息')
    }
  }

  useEffect(() => {
    return () => {
      if (ws) {
        ws.close()
      }
    }
  }, [ws])

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>WebSocket 连接测试</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="text-sm">
              <strong>连接状态:</strong> 
              <span className={`ml-2 px-2 py-1 rounded text-xs ${
                connectionStatus === '已连接' ? 'bg-green-100 text-green-800' :
                connectionStatus === '连接中...' ? 'bg-yellow-100 text-yellow-800' :
                connectionStatus === '连接错误' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {connectionStatus}
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={testConnection} variant="default">
              连接 WebSocket
            </Button>
            <Button onClick={disconnect} variant="outline">
              断开连接
            </Button>
            <Button onClick={sendTestMessage} variant="secondary">
              发送测试消息
            </Button>
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold">连接日志</h3>
            <div className="bg-gray-50 p-4 rounded-lg max-h-96 overflow-y-auto">
              {messages.length === 0 ? (
                <p className="text-gray-500 text-sm">暂无日志消息</p>
              ) : (
                messages.map((message, index) => (
                  <div key={index} className="text-sm font-mono mb-1">
                    {message}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="text-xs text-gray-500 space-y-1">
            <p><strong>测试信息:</strong></p>
            <p>当前页面主机: {typeof window !== 'undefined' ? window.location.hostname : 'N/A'}</p>
            <p>WebSocket URL: {typeof window !== 'undefined' ? `ws://${window.location.hostname}:8080` : 'N/A'}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
