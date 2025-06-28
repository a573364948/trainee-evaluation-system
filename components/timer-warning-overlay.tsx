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

  useEffect(() => {
    const shouldShow = timeRemaining > 0 && timeRemaining <= warningThreshold
    setShowWarning(shouldShow)
  }, [timeRemaining, warningThreshold])

  if (!showWarning) return null

  // 计算闪烁强度，时间越少闪烁越快
  const intensity = Math.max(0.1, timeRemaining / warningThreshold)
  const animationDuration = Math.max(0.5, intensity * 2) // 0.5秒到2秒

  return (
    <div 
      className="fixed inset-0 pointer-events-none z-50"
      style={{
        background: `radial-gradient(circle, rgba(239, 68, 68, 0.1) 0%, rgba(239, 68, 68, 0.05) 50%, transparent 100%)`,
        animation: `pulse-red ${animationDuration}s ease-in-out infinite`,
      }}
    >
      <style jsx>{`
        @keyframes pulse-red {
          0%, 100% {
            opacity: 0;
          }
          50% {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  )
}
