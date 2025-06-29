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
    // 确保负数和0都显示为00:00
    const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000))
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
      <div className="bg-gray-50 rounded-lg border p-3">
        <div className="flex items-center gap-2 text-gray-500">
          <Clock className="w-4 h-4" />
          <span className="text-sm">当前环节无时间限制</span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border p-3 space-y-3">
      {/* 标题和时间显示 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">倒计时</span>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-blue-600">
            {formatTime(currentTime)}
          </div>
          <Badge variant={statusInfo.color as any} className="text-xs">
            {statusInfo.text}
          </Badge>
        </div>
      </div>

      {/* 进度条 */}
      <div className="w-full bg-gray-200 rounded-full h-1.5">
        <div
          className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
          style={{
            width: `${Math.max(0, (currentTime / timerState.totalTime) * 100)}%`
          }}
        />
      </div>

      {/* 控制按钮 - 紧凑布局 */}
      <div className="flex gap-1">
        {!timerState.isRunning ? (
          <Button
            onClick={() => onTimerAction(timerState.isPaused ? 'resume' : 'start')}
            size="sm"
            className="flex-1 h-8 text-xs"
          >
            <Play className="w-3 h-3 mr-1" />
            {timerState.isPaused ? '继续' : '开始'}
          </Button>
        ) : (
          <Button
            onClick={() => onTimerAction('pause')}
            variant="outline"
            size="sm"
            className="flex-1 h-8 text-xs"
          >
            <Pause className="w-3 h-3 mr-1" />
            暂停
          </Button>
        )}

        <Button
          onClick={() => onTimerAction('reset')}
          variant="outline"
          size="sm"
          className="h-8 px-2"
          title="重置计时"
        >
          <RotateCcw className="w-3 h-3" />
        </Button>

        <Button
          onClick={() => onTimerAction('setToZero')}
          variant="outline"
          size="sm"
          className="h-8 px-2"
          title="倒计时归零"
        >
          <span className="text-xs font-mono">00</span>
        </Button>
      </div>
    </div>
  )
}
