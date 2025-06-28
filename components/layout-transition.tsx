"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, RefreshCw } from "lucide-react"

interface LayoutTransitionProps {
  isTransitioning: boolean
  transitionType: 'to_interview_stage' | 'to_question' | 'stage_change'
  fromType?: 'question' | 'interview_stage'
  toType?: 'question' | 'interview_stage'
  fromTitle?: string
  toTitle?: string
  onTransitionComplete?: () => void
}

export function LayoutTransition({
  isTransitioning,
  transitionType,
  fromType,
  toType,
  fromTitle,
  toTitle,
  onTransitionComplete
}: LayoutTransitionProps) {
  const [phase, setPhase] = useState<'fade-out' | 'show-message' | 'fade-in'>('fade-out')
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (!isTransitioning) return

    const timeline = [
      { phase: 'show-message', duration: 1200 }
    ]

    let currentTime = 0
    setPhase('show-message') // 直接进入显示阶段

    const interval = setInterval(() => {
      currentTime += 50

      // 计算总进度
      const totalDuration = timeline[0].duration
      setProgress((currentTime / totalDuration) * 100)

      // 完成过渡
      if (currentTime >= totalDuration) {
        clearInterval(interval)
        onTransitionComplete?.()
      }
    }, 50)

    return () => clearInterval(interval)
  }, [isTransitioning, onTransitionComplete])

  if (!isTransitioning) return null

  const getTransitionMessage = () => {
    switch (transitionType) {
      case 'to_interview_stage':
        return {
          title: "切换到面试环节",
          subtitle: toTitle || "面试环节",
          icon: <RefreshCw className="w-12 h-12 text-blue-300 animate-spin" />,
          color: "from-blue-800 to-purple-800"
        }
      case 'to_question':
        return {
          title: "切换到答题模式",
          subtitle: toTitle || "题目",
          icon: <ArrowRight className="w-12 h-12 text-green-300" />,
          color: "from-green-800 to-blue-800"
        }
      case 'stage_change':
        return {
          title: "环节切换",
          subtitle: "正在切换面试环节",
          icon: <RefreshCw className="w-12 h-12 text-orange-300 animate-spin" />,
          color: "from-orange-800 to-red-800"
        }
      default:
        return {
          title: "正在切换",
          subtitle: "请稍候",
          icon: <RefreshCw className="w-12 h-12 text-blue-300 animate-spin" />,
          color: "from-blue-800 to-purple-800"
        }
    }
  }

  const message = getTransitionMessage()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md">
      {/* 过渡内容 */}
      <div className="text-center opacity-100 scale-100">
        {/* 主要图标和标题 */}
        <div className="mb-8">
          <div className="flex justify-center mb-6">
            {message.icon}
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">
            {message.title}
          </h1>
          <h2 className="text-2xl text-gray-300">
            {message.subtitle}
          </h2>
        </div>

        {/* 切换信息 */}
        {(fromType && toType) && (
          <div className="mb-8">
            <div className="flex items-center justify-center gap-6">
              <div className="text-center">
                <Badge variant="outline" className="text-gray-500 border-gray-700 bg-gray-800/50 mb-2">
                  {fromType === 'interview_stage' ? '面试环节' : '题目'}
                </Badge>
                <div className="text-lg text-gray-400">{fromTitle}</div>
              </div>

              <ArrowRight className="w-8 h-8 text-gray-500" />

              <div className="text-center">
                <Badge className={`bg-gradient-to-r ${message.color} text-white mb-2 shadow-lg`}>
                  {toType === 'interview_stage' ? '面试环节' : '题目'}
                </Badge>
                <div className="text-lg text-gray-200 font-medium">{toTitle}</div>
              </div>
            </div>
          </div>
        )}

        {/* 进度条 */}
        <div className="w-80 mx-auto">
          <div className="bg-gray-800 rounded-full h-2 overflow-hidden border border-gray-700">
            <div
              className={`h-full bg-gradient-to-r ${message.color} transition-all duration-100 ease-out shadow-sm`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="text-sm text-gray-500 mt-2">
            {Math.round(progress)}%
          </div>
        </div>

        {/* 提示文字 */}
        <div className="mt-8 text-gray-500 text-sm">
          切换中，请稍候...
        </div>
      </div>

      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r ${message.color} rounded-full blur-3xl opacity-10 animate-pulse`}></div>
        <div className={`absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-r ${message.color} rounded-full blur-3xl opacity-10 animate-pulse`} style={{ animationDelay: '1s' }}></div>
      </div>
    </div>
  )
}
