'use client'

import { Badge } from './ui/badge'
import { Card, CardContent } from './ui/card'

interface ConnectionStatusProps {
  isConnected: boolean
  status: 'connected' | 'connecting' | 'disconnected' | 'error'
  connectionInfo?: any
}

export function ConnectionStatus({ isConnected, status, connectionInfo }: ConnectionStatusProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'connected': return 'bg-green-500'
      case 'connecting': return 'bg-yellow-500'
      case 'disconnected': return 'bg-gray-500'
      case 'error': return 'bg-red-500'
    }
  }

  const getStatusText = () => {
    switch (status) {
      case 'connected': return '已连接'
      case 'connecting': return '连接中...'
      case 'disconnected': return '已断开'
      case 'error': return '连接错误'
    }
  }

  return (
    <Card className="w-full">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${getStatusColor()}`} />
            <span className="font-medium">WebSocket状态: {getStatusText()}</span>
          </div>
          
          {connectionInfo && (
            <div className="flex space-x-2">
              <Badge variant="secondary">
                {connectionInfo.clientType}
              </Badge>
              {connectionInfo.judgeId && (
                <Badge variant="outline">
                  评委: {connectionInfo.judgeId}
                </Badge>
              )}
            </div>
          )}
        </div>
        
        {status === 'error' && (
          <p className="text-sm text-red-600 mt-2">
            连接失败，系统正在自动重连...
          </p>
        )}
      </CardContent>
    </Card>
  )
}