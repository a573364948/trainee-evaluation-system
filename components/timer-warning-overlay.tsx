"use client"

import { useEffect, useState } from "react"

interface TimerWarningOverlayProps {
  timeRemaining: number
  warningThreshold?: number // 警告阈值（毫秒），默认30秒
}

export function TimerWarningOverlay({
  timeRemaining,
  warningThreshold = 30000
}: TimerWarningOverlayProps) {
  const [showWarning, setShowWarning] = useState(false)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // 当倒计时不足30秒时开始显示警告，倒计时结束后继续显示5秒
    const shouldShow = timeRemaining <= warningThreshold && timeRemaining >= -5000

    // 详细调试日志
    if (timeRemaining <= warningThreshold + 5000 && timeRemaining > warningThreshold - 5000) {
      console.log(`[TimerWarning] 时间检查: ${timeRemaining}ms, 阈值: ${warningThreshold}ms, 应该显示: ${shouldShow}`)
    }

    // 只在关键时刻输出日志
    if (timeRemaining <= warningThreshold && timeRemaining > warningThreshold - 1000) {
      console.log(`[TimerWarning] 警告开始: ${timeRemaining}ms`)
    }

    setShowWarning(shouldShow)
  }, [timeRemaining, warningThreshold])

  useEffect(() => {
    if (!showWarning) {
      console.log(`[TimerWarning] 隐藏警告覆盖层`)
      setIsVisible(false)
      return
    }

    console.log(`[TimerWarning] 开始闪烁动画`)

    // 使用更温和的闪烁间隔 - 1200ms (更慢)
    const interval = setInterval(() => {
      setIsVisible(prev => {
        console.log(`[TimerWarning] 闪烁切换: ${!prev}`)
        return !prev
      })
    }, 1200)

    return () => {
      console.log(`[TimerWarning] 清除闪烁动画`)
      clearInterval(interval)
    }
  }, [showWarning])

  if (!showWarning) {
    console.log(`[TimerWarning] 组件返回 null - showWarning: ${showWarning}`)
    return null
  }

  // 计算透明度，使用更温和的值
  const opacity = timeRemaining > 0
    ? Math.max(0.03, Math.min(0.12, (warningThreshold - timeRemaining) / warningThreshold * 0.12))
    : 0.15 // 倒计时结束后使用稍高的透明度

  console.log(`[TimerWarning] 渲染覆盖层 - isVisible: ${isVisible}, opacity: ${opacity}`)

  return (
    <div
      className={`fixed inset-0 pointer-events-none z-[60] transition-opacity duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      style={{
        background: `radial-gradient(circle, rgba(239, 68, 68, ${Math.max(0.08, opacity)}) 0%, rgba(239, 68, 68, ${Math.max(0.02, opacity * 0.3)}) 60%, transparent 100%)`,
      }}
    />
  )
}
