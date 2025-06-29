"use client"

import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Clock, User, Users, CheckCircle } from "lucide-react"

interface LayoutSplitProps {
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

export function LayoutSplit({ 
  currentItem, 
  currentCandidate, 
  timeRemaining, 
  formatTime, 
  judges 
}: LayoutSplitProps) {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex">
      {/* 左侧：候选人和计时信息 */}
      <div className="w-2/5 bg-gradient-to-br from-blue-900/20 to-purple-900/20 p-8 flex flex-col">
        {/* 候选人信息 */}
        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-8 mb-8">
          <div className="text-center">
            <div className="w-24 h-24 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <User className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">
              {currentCandidate?.name || "候选人"}
            </h2>
            <div className="space-y-2 text-gray-300">
              <div className="flex justify-between">
                <span>工号：</span>
                <span className="text-white">{currentCandidate?.number || "N/A"}</span>
              </div>
              <div className="flex justify-between">
                <span>部门：</span>
                <span className="text-white">{currentCandidate?.department || "N/A"}</span>
              </div>
              <div className="flex justify-between">
                <span>状态：</span>
                <Badge className="bg-green-500 text-white">面试中</Badge>
              </div>
            </div>
          </div>
        </div>

        {/* 计时器区域 */}
        {currentItem.timeLimit && (
          <div className="bg-gradient-to-r from-orange-500/20 to-red-500/20 backdrop-blur-sm border border-orange-500/30 rounded-2xl p-8 mb-8">
            <div className="text-center">
              <Clock className="w-16 h-16 text-orange-400 mx-auto mb-4" />
              <div className="text-7xl font-bold text-orange-400 mb-4">
                {formatTime(timeRemaining)}
              </div>
              <div className="text-orange-200 text-xl mb-6">剩余时间</div>
              <Progress
                value={(() => {
                  const totalTime = currentItem.timeLimit * 1000
                  return totalTime > 0 ? Math.max(0, Math.min(100, (timeRemaining / totalTime) * 100)) : 0
                })()}
                className="w-full h-4"
              />
              <div className="flex justify-between text-sm text-orange-300 mt-2">
                <span>0:00</span>
                <span>{formatTime(currentItem.timeLimit * 1000)}</span>
              </div>
            </div>
          </div>
        )}

        {/* 评委状态 */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 flex-1">
          <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
            <Users className="w-6 h-6" />
            评委状态
          </h3>
          <div className="space-y-4">
            {judges.filter(j => j.isActive).map((judge) => (
              <div key={judge.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                <span className="text-white">{judge.name}</span>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-green-400 text-sm">在线</span>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-6 p-4 bg-blue-900/30 border border-blue-500/30 rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-300">
                {judges.filter(j => j.isActive).length}位
              </div>
              <div className="text-blue-200 text-sm">在线评委</div>
            </div>
          </div>
        </div>
      </div>

      {/* 右侧：环节内容 */}
      <div className="flex-1 p-8 flex flex-col justify-center">
        <div className="max-w-3xl mx-auto">
          {/* 环节标题 */}
          <div className="text-center mb-12">
            <h1 className="text-6xl font-bold text-white mb-6">
              {currentItem.title}
            </h1>
            {currentItem.subtitle && (
              <h2 className="text-4xl text-blue-300 mb-8">
                {currentItem.subtitle}
              </h2>
            )}
            <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto"></div>
          </div>

          {/* 环节内容 */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-10">
            {currentItem.subtitle?.includes('自我介绍') && (
              <div>
                <h3 className="text-2xl font-semibold text-blue-300 mb-6 text-center">
                  请开始您的自我介绍
                </h3>
                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-blue-900/30 border border-blue-500/30 rounded-xl p-6">
                    <h4 className="text-lg font-semibold text-blue-300 mb-4">介绍要点</h4>
                    <ul className="text-blue-200 space-y-2">
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                        个人基本情况
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                        工作经历
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                        专业技能
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                        应聘优势
                      </li>
                    </ul>
                  </div>
                  <div className="bg-purple-900/30 border border-purple-500/30 rounded-xl p-6">
                    <h4 className="text-lg font-semibold text-purple-300 mb-4">注意事项</h4>
                    <ul className="text-purple-200 space-y-2">
                      <li>• 语言表达清晰流畅</li>
                      <li>• 重点突出，条理分明</li>
                      <li>• 控制好时间节奏</li>
                      <li>• 保持自信的状态</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {currentItem.subtitle?.includes('专业问答') && (
              <div className="text-center">
                <h3 className="text-2xl font-semibold text-purple-300 mb-6">
                  专业问答环节
                </h3>
                <p className="text-xl text-gray-300 mb-8">
                  评委将根据您的专业背景进行相关提问，请认真听题并作答
                </p>
                <div className="bg-purple-900/30 border border-purple-500/30 rounded-xl p-6">
                  <div className="text-purple-200 space-y-3">
                    <p>• 仔细听取评委的问题</p>
                    <p>• 可以适当思考后再回答</p>
                    <p>• 结合实际工作经验阐述</p>
                    <p>• 如有疑问可请评委重复</p>
                  </div>
                </div>
              </div>
            )}

            {!currentItem.subtitle?.includes('自我介绍') && !currentItem.subtitle?.includes('专业问答') && (
              <div className="text-center">
                <h3 className="text-2xl font-semibold text-white mb-6">
                  {currentItem.subtitle || '面试环节'}
                </h3>
                <p className="text-xl text-gray-300">
                  请按照评委要求进行本环节的面试内容
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
