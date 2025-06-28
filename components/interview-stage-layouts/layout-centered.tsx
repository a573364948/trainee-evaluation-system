"use client"

import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Clock, User, Users } from "lucide-react"

interface LayoutCenteredProps {
  currentItem: {
    id: string
    type: 'question' | 'interview_stage'
    title: string
    subtitle?: string
    content?: string
    timeLimit: number | null
    startTime: number
  }
  currentCandidate: any
  timeRemaining: number
  formatTime: (ms: number) => string
  judges: any[]
}

export function LayoutCentered({ 
  currentItem, 
  currentCandidate, 
  timeRemaining, 
  formatTime, 
  judges 
}: LayoutCenteredProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0f23] via-[#1a1a2e] to-[#16213e] text-white">
      {/* 顶部状态栏 - 简化 */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-black/20 backdrop-blur-sm border-b border-white/10">
        <div className="flex justify-between items-center px-8 py-4">
          <div className="flex items-center gap-4">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-gray-300">面试进行中</span>
          </div>
          <div className="text-sm text-gray-300">
            {new Date().toLocaleString("zh-CN")}
          </div>
        </div>
      </div>

      {/* 主内容区域 - 居中布局 */}
      <div className="flex items-center justify-center min-h-screen pt-20 pb-8">
        <div className="max-w-4xl w-full mx-8">
          {/* 候选人信息卡片 - 突出显示 */}
          <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 backdrop-blur-sm border border-blue-500/30 rounded-2xl p-8 mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center">
                  <User className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-white mb-2">
                    {currentCandidate?.name || "候选人"}
                  </h2>
                  <div className="flex items-center gap-4 text-blue-200">
                    <span>工号：{currentCandidate?.number || "N/A"}</span>
                    <span>部门：{currentCandidate?.department || "N/A"}</span>
                  </div>
                </div>
              </div>
              <Badge className="bg-blue-500 text-white px-4 py-2 text-lg">
                面试中
              </Badge>
            </div>
          </div>

          {/* 环节信息 - 主要内容 */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-10 mb-8">
            <div className="text-center">
              <h1 className="text-5xl font-bold text-white mb-4">
                {currentItem.title}
              </h1>
              {currentItem.subtitle && (
                <h2 className="text-3xl text-blue-300 mb-6">
                  {currentItem.subtitle}
                </h2>
              )}
              
              {/* 环节说明 */}
              <div className="max-w-2xl mx-auto">
                {currentItem.subtitle?.includes('自我介绍') && (
                  <div className="bg-blue-900/30 border border-blue-500/30 rounded-xl p-6 mb-6">
                    <h3 className="text-xl font-semibold text-blue-300 mb-4">环节要求</h3>
                    <div className="text-blue-200 space-y-2 text-left">
                      <p>• 请简要介绍个人基本情况和工作经历</p>
                      <p>• 重点说明专业技能和工作优势</p>
                      <p>• 阐述应聘本岗位的理由和期望</p>
                      <p>• 请在规定时间内完成介绍</p>
                    </div>
                  </div>
                )}
                
                {currentItem.subtitle?.includes('专业问答') && (
                  <div className="bg-purple-900/30 border border-purple-500/30 rounded-xl p-6 mb-6">
                    <h3 className="text-xl font-semibold text-purple-300 mb-4">环节说明</h3>
                    <div className="text-purple-200 space-y-2 text-left">
                      <p>• 评委将针对您的专业背景进行提问</p>
                      <p>• 请结合实际工作经验回答问题</p>
                      <p>• 回答要条理清晰，逻辑性强</p>
                      <p>• 如有不明确的地方可以请评委重复问题</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 计时器 - 突出显示 */}
          {currentItem.timeLimit && (
            <div className="bg-gradient-to-r from-orange-600/20 to-red-600/20 backdrop-blur-sm border border-orange-500/30 rounded-2xl p-8">
              <div className="flex items-center justify-center gap-8">
                <Clock className="w-12 h-12 text-orange-400" />
                <div className="text-center">
                  <div className="text-6xl font-bold text-orange-400 mb-2">
                    {formatTime(timeRemaining)}
                  </div>
                  <div className="text-orange-200 text-lg">剩余时间</div>
                  <Progress
                    value={(timeRemaining / (currentItem.timeLimit * 1000)) * 100}
                    className="w-64 h-3 mt-4"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 底部评委状态 - 简化显示 */}
      <div className="absolute bottom-0 left-0 right-0 bg-black/20 backdrop-blur-sm border-t border-white/10">
        <div className="flex items-center justify-center px-8 py-4">
          <div className="flex items-center gap-6">
            <Users className="w-5 h-5 text-gray-400" />
            <span className="text-gray-300">
              在线评委：{judges.filter(j => j.isActive).length} / {judges.length}
            </span>
            <div className="flex gap-2">
              {judges.filter(j => j.isActive).map((judge, index) => (
                <div key={judge.id} className="w-2 h-2 bg-green-500 rounded-full"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
