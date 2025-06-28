"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { LayoutMinimal } from "@/components/interview-stage-layouts/layout-minimal"
import { LayoutTransition } from "@/components/layout-transition"
import { ArrowRight, Play, RotateCcw } from "lucide-react"

// 模拟数据
const mockCandidate = {
  id: "candidate1",
  name: "张三",
  number: "EMP001",
  department: "技术部",
  status: "interviewing"
}

const mockJudges = [
  { id: "judge1", name: "李评委", isActive: true },
  { id: "judge2", name: "王评委", isActive: true },
  { id: "judge3", name: "赵评委", isActive: false },
  { id: "judge4", name: "刘评委", isActive: true },
]

const mockInterviewStage = {
  id: "stage1",
  type: 'interview_stage' as const,
  title: "面试环节1",
  subtitle: "自我介绍",
  content: "",
  timeLimit: 300,
  startTime: Date.now()
}

const mockQuestion = {
  id: "question1",
  type: 'question' as const,
  title: "专业知识问答",
  subtitle: "技术能力评估",
  content: "请详细介绍您在前端开发方面的经验，包括使用过的技术栈、参与过的项目以及遇到的技术难题和解决方案。",
  timeLimit: 600,
  startTime: Date.now()
}

export default function TransitionDemoPage() {
  const [currentItem, setCurrentItem] = useState(mockInterviewStage)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [transitionType, setTransitionType] = useState<'to_interview_stage' | 'to_question'>('to_question')
  const [previousItem, setPreviousItem] = useState<any>(null)
  const [timeRemaining, setTimeRemaining] = useState(300000)

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
  }

  const handleTransition = (toType: 'interview_stage' | 'question') => {
    if (isTransitioning) return

    const newItem = toType === 'interview_stage' ? mockInterviewStage : mockQuestion
    
    setPreviousItem(currentItem)
    setTransitionType(toType === 'interview_stage' ? 'to_interview_stage' : 'to_question')
    setIsTransitioning(true)

    // 模拟过渡完成后更新内容
    setTimeout(() => {
      setCurrentItem(newItem)
      setTimeRemaining(newItem.timeLimit * 1000)
    }, 1200)
  }

  const resetDemo = () => {
    setCurrentItem(mockInterviewStage)
    setTimeRemaining(300000)
    setIsTransitioning(false)
    setPreviousItem(null)
  }

  return (
    <div className="relative">
      {/* 控制面板 */}
      {!isTransitioning && (
        <div className="absolute top-4 left-4 z-50 space-y-4">
          <Card className="w-80 bg-black/80 text-white border-white/20">
            <CardHeader>
              <CardTitle className="text-white">过渡动画演示</CardTitle>
              <CardDescription className="text-gray-300">
                体验面试环节和题目模式之间的切换效果
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="text-sm text-gray-400">当前模式：</div>
                <Badge className={currentItem.type === 'interview_stage' ? 'bg-blue-500' : 'bg-green-500'}>
                  {currentItem.type === 'interview_stage' ? '面试环节' : '题目模式'}
                </Badge>
                <div className="text-sm text-white">{currentItem.title}</div>
              </div>

              <div className="space-y-2">
                <Button
                  onClick={() => handleTransition('question')}
                  disabled={currentItem.type === 'question'}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  <ArrowRight className="w-4 h-4 mr-2" />
                  切换到题目模式
                </Button>
                
                <Button
                  onClick={() => handleTransition('interview_stage')}
                  disabled={currentItem.type === 'interview_stage'}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  <ArrowRight className="w-4 h-4 mr-2" />
                  切换到面试环节
                </Button>

                <Button
                  onClick={resetDemo}
                  variant="outline"
                  className="w-full border-white/20 text-white hover:bg-white/10"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  重置演示
                </Button>
              </div>

              <div className="text-xs text-gray-400 pt-2 border-t border-white/20">
                <div>• 过渡动画时长：1.2秒</div>
                <div>• 暗色主题，无突兀闪烁</div>
                <div>• 快速切换，直接显示</div>
                <div>• 显示切换信息和进度条</div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 主显示区域 */}
      <div className="relative">
        {/* 当前布局 */}
        <div className={isTransitioning ? "opacity-20" : "opacity-100"}>
          <LayoutMinimal
            currentItem={currentItem}
            currentCandidate={mockCandidate}
            timeRemaining={timeRemaining}
            formatTime={formatTime}
            judges={mockJudges}
          />
        </div>

        {/* 过渡动画 */}
        {isTransitioning && (
          <LayoutTransition
            isTransitioning={isTransitioning}
            transitionType={transitionType}
            fromType={previousItem?.type}
            toType={currentItem.type}
            fromTitle={previousItem?.title}
            toTitle={currentItem.title}
            onTransitionComplete={() => {
              setIsTransitioning(false)
              setPreviousItem(null)
            }}
          />
        )}
      </div>

      {/* 说明信息 */}
      {!isTransitioning && (
        <div className="absolute bottom-4 right-4 z-50">
          <Card className="w-80 bg-black/80 text-white border-white/20">
            <CardContent className="p-4">
              <div className="text-sm space-y-2">
                <div className="font-medium text-blue-300">过渡效果特点：</div>
                <div className="text-gray-300 space-y-1">
                  <div>• 直接显示过渡动画</div>
                  <div>• 清晰的切换状态提示</div>
                  <div>• 进度条显示切换进度</div>
                  <div>• 无淡入淡出干扰</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
