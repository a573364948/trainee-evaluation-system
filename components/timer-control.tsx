"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Play, Pause, RotateCcw, Clock } from "lucide-react"
import type { TimerState } from "@/types/scoring"

interface TimerControlProps {
  timerState?: TimerState
  onTimerAction: (action: string, duration?: number) => void
}

export function TimerControl({ timerState, onTimerAction }: TimerControlProps) {
  const [currentTime, setCurrentTime] = useState(0)

  // 计算当前剩余时间
  useEffect(() => {
    if (!timerState) return

    if (timerState.isRunning && timerState.startTime) {
      const interval = setInterval(() => {
        const elapsed = Date.now() - timerState.startTime!
        const remaining = Math.max(0, timerState.remainingTime - elapsed)
        setCurrentTime(remaining)
      }, 100) // 100ms更新一次，更平滑

      return () => clearInterval(interval)
    } else {
      setCurrentTime(timerState.remainingTime)
    }
  }, [timerState])

  // 格式化时间显示
  const formatTime = (milliseconds: number) => {
    const totalSeconds = Math.ceil(milliseconds / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  // 获取状态显示
  const getStatusInfo = () => {
    if (!timerState) return { text: "无计时", color: "secondary" }
    if (timerState.isRunning) return { text: "运行中", color: "default" }
    if (timerState.isPaused) return { text: "已暂停", color: "secondary" }
    return { text: "已停止", color: "outline" }
  }

  const statusInfo = getStatusInfo()

  if (!timerState) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Clock className="w-4 h-4" />
            倒计时控制
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-500 py-4">
            当前环节无时间限制
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Clock className="w-4 h-4" />
          倒计时控制
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 时间显示 */}
        <div className="text-center">
          <div className="text-3xl font-bold text-blue-600 mb-1">
            {formatTime(currentTime)}
          </div>
          <div className="text-sm text-gray-500">
            总时长: {formatTime(timerState.totalTime)}
          </div>
          <Badge variant={statusInfo.color as any} className="mt-2">
            {statusInfo.text}
          </Badge>
        </div>

        {/* 进度条 */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ 
              width: `${Math.max(0, (currentTime / timerState.totalTime) * 100)}%` 
            }}
          />
        </div>

        {/* 控制按钮 */}
        <div className="flex gap-2">
          {!timerState.isRunning ? (
            <Button
              onClick={() => onTimerAction(timerState.isPaused ? 'resume' : 'start')}
              className="flex-1"
              size="sm"
            >
              <Play className="w-4 h-4 mr-1" />
              {timerState.isPaused ? '继续' : '开始'}
            </Button>
          ) : (
            <Button
              onClick={() => onTimerAction('pause')}
              variant="outline"
              className="flex-1"
              size="sm"
            >
              <Pause className="w-4 h-4 mr-1" />
              暂停
            </Button>
          )}
          
          <Button
            onClick={() => onTimerAction('reset')}
            variant="outline"
            size="sm"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>

        {/* 快速设置 */}
        <div className="border-t pt-3">
          <div className="text-xs text-gray-500 mb-2">快速设置:</div>
          <div className="grid grid-cols-4 gap-1">
            {[5, 10, 15, 30].map((minutes) => (
              <Button
                key={minutes}
                onClick={() => onTimerAction('setDuration', minutes * 60)}
                variant="outline"
                size="sm"
                className="text-xs"
              >
                {minutes}分
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
