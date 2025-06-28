"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { LayoutMinimal } from "@/components/interview-stage-layouts/layout-minimal"
import { ArrowRight, Users, FileText } from "lucide-react"

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

// 面试环节数据
const mockInterviewStage = {
  id: "stage1",
  type: 'interview_stage' as const,
  title: "面试环节1",
  subtitle: "自我介绍",
  content: "",
  timeLimit: 300,
  startTime: Date.now()
}

// 题目数据
const mockQuestion = {
  id: "question1",
  type: 'question' as const,
  title: "专业知识问答",
  subtitle: "技术能力评估",
  content: "请详细介绍您在前端开发方面的经验，包括使用过的技术栈、参与过的项目以及遇到的技术难题和解决方案。请结合具体案例说明您的技术能力和解决问题的思路。",
  timeLimit: 600,
  startTime: Date.now()
}

// 模拟原有答题布局组件
function OriginalQuestionLayout({ currentItem, currentCandidate, timeRemaining, formatTime, judges }: any) {
  return (
    <div className="min-h-screen bg-[#1a1a1a] text-white flex">
      {/* 左侧候选人信息 */}
      <div className="w-80 bg-[#2a2a2a] p-6 flex flex-col">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-4">面试答题环节</h1>
          <div className="text-sm text-gray-400 mb-4">
            {new Date().toLocaleDateString("zh-CN")} {new Date().toLocaleTimeString("zh-CN")}
          </div>
        </div>

        {currentCandidate && (
          <div className="bg-[#3a3a3a] rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">当前候选人</h2>
            <div className="space-y-3">
              <div>
                <span className="text-gray-400 text-sm">姓名：</span>
                <span className="text-white font-medium">{currentCandidate.name}</span>
              </div>
              <div>
                <span className="text-gray-400 text-sm">工号：</span>
                <span className="text-white">{currentCandidate.number}</span>
              </div>
              <div>
                <span className="text-gray-400 text-sm">部门：</span>
                <span className="text-white">{currentCandidate.department}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 主内容区域 */}
      <div className="flex-1 p-8">
        <div className="max-w-4xl mx-auto">
          {/* 题目标题和计时器 */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">{currentItem.title}</h1>
              <div className="text-gray-400">类型：题目</div>
            </div>
            <div className="text-right">
              <div className="text-6xl font-bold text-blue-400 mb-2">{formatTime(timeRemaining)}</div>
              <div className="text-gray-400">剩余时间</div>
            </div>
          </div>

          {/* 题目内容 */}
          <div className="bg-[#2a2a2a] rounded-xl p-8 mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">题目内容</h2>
            <div className="text-lg text-gray-200 leading-relaxed">{currentItem.content}</div>
          </div>

          {/* 答题提示 */}
          <div className="bg-blue-900/30 border border-blue-500/30 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-blue-300 mb-3">答题提示</h3>
            <ul className="text-blue-200 space-y-2">
              <li>• 请仔细阅读题目，理解题意后再开始回答</li>
              <li>• 回答要条理清晰，逻辑性强</li>
              <li>• 可以结合实际工作经验进行阐述</li>
              <li>• 注意时间控制，合理分配答题时间</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LayoutTestPage() {
  const [currentMode, setCurrentMode] = useState<'interview_stage' | 'question'>('interview_stage')
  const [timeRemaining, setTimeRemaining] = useState(300000)

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
  }

  const currentItem = currentMode === 'interview_stage' ? mockInterviewStage : mockQuestion

  return (
    <div className="relative">
      {/* 控制面板 */}
      <div className="absolute top-4 left-4 z-50">
        <Card className="w-80 bg-black/90 text-white border-white/20">
          <CardHeader>
            <CardTitle className="text-white">布局对比测试</CardTitle>
            <CardDescription className="text-gray-300">
              对比面试环节和答题模式的不同布局
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="text-sm text-gray-400">当前模式：</div>
              <Badge className={currentMode === 'interview_stage' ? 'bg-blue-500' : 'bg-green-500'}>
                {currentMode === 'interview_stage' ? '面试环节' : '答题模式'}
              </Badge>
              <div className="text-sm text-white">{currentItem.title}</div>
            </div>

            <div className="space-y-2">
              <Button
                onClick={() => {
                  setCurrentMode('interview_stage')
                  setTimeRemaining(300000)
                }}
                disabled={currentMode === 'interview_stage'}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                <Users className="w-4 h-4 mr-2" />
                面试环节模式
              </Button>
              
              <Button
                onClick={() => {
                  setCurrentMode('question')
                  setTimeRemaining(600000)
                }}
                disabled={currentMode === 'question'}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                <FileText className="w-4 h-4 mr-2" />
                答题模式
              </Button>
            </div>

            <div className="text-xs text-gray-400 pt-2 border-t border-white/20">
              <div className="font-medium mb-2">布局说明：</div>
              <div>• 面试环节：使用极简大屏布局</div>
              <div>• 答题模式：使用原有详细布局</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 主显示区域 */}
      <div>
        {currentMode === 'interview_stage' ? (
          <LayoutMinimal
            currentItem={currentItem}
            currentCandidate={mockCandidate}
            timeRemaining={timeRemaining}
            formatTime={formatTime}
            judges={mockJudges}
          />
        ) : (
          <OriginalQuestionLayout
            currentItem={currentItem}
            currentCandidate={mockCandidate}
            timeRemaining={timeRemaining}
            formatTime={formatTime}
            judges={mockJudges}
          />
        )}
      </div>

      {/* 说明信息 */}
      <div className="absolute bottom-4 right-4 z-50">
        <Card className="w-80 bg-black/90 text-white border-white/20">
          <CardContent className="p-4">
            <div className="text-sm space-y-2">
              <div className="font-medium text-blue-300">当前显示：</div>
              <div className="text-gray-300">
                {currentMode === 'interview_stage' ? (
                  <div>
                    <div className="font-medium">极简大屏布局</div>
                    <div className="text-xs mt-1">• 候选人信息突出</div>
                    <div className="text-xs">• 计时器醒目</div>
                    <div className="text-xs">• 侧边栏简化</div>
                  </div>
                ) : (
                  <div>
                    <div className="font-medium">原有答题布局</div>
                    <div className="text-xs mt-1">• 详细的侧边栏信息</div>
                    <div className="text-xs">• 完整的题目内容</div>
                    <div className="text-xs">• 答题提示和指导</div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
