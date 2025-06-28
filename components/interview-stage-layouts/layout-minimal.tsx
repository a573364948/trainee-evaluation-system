"use client"

import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Clock, User } from "lucide-react"

interface LayoutMinimalProps {
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

export function LayoutMinimal({ 
  currentItem, 
  currentCandidate, 
  timeRemaining, 
  formatTime, 
  judges 
}: LayoutMinimalProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#0a0a0a] text-white relative overflow-hidden">
      {/* 背景装饰 */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500 rounded-full blur-3xl"></div>
      </div>

      {/* 顶部状态栏 - 极简 */}
      <div className="absolute top-0 left-0 right-0 z-10 p-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-gray-400">LIVE</span>
          </div>
          <div className="text-sm text-gray-400">
            {new Date().toLocaleTimeString("zh-CN")}
          </div>
        </div>
      </div>

      {/* 主内容 - 居中极简布局 */}
      <div className="flex items-center justify-center min-h-screen relative z-10">
        <div className="text-center max-w-5xl mx-auto px-8">
          
          {/* 候选人信息 - 顶部简洁显示 */}
          <div className="mb-16">
            <div className="inline-flex items-center gap-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-full px-8 py-4">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <div className="text-xl font-semibold text-white">
                  {currentCandidate?.name || "候选人"}
                </div>
                <div className="text-sm text-gray-400">
                  {currentCandidate?.department || "部门"} · {currentCandidate?.number || "工号"}
                </div>
              </div>
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                面试中
              </Badge>
            </div>
          </div>

          {/* 环节标题 - 超大显示 */}
          <div className="mb-16">
            <h1 className="text-8xl font-bold text-white mb-8 tracking-tight">
              {currentItem.title}
            </h1>
            {currentItem.subtitle && (
              <h2 className="text-5xl text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 font-light">
                {currentItem.subtitle}
              </h2>
            )}
          </div>

          {/* 计时器 - 突出显示 */}
          {currentItem.timeLimit && (
            <div className="mb-16">
              <div className="inline-block bg-gradient-to-r from-orange-500/10 to-red-500/10 backdrop-blur-sm border border-orange-500/20 rounded-3xl p-12">
                <div className="flex items-center gap-8">
                  <Clock className="w-16 h-16 text-orange-400" />
                  <div>
                    <div className="text-8xl font-bold text-orange-400 mb-2">
                      {formatTime(timeRemaining)}
                    </div>
                    <Progress
                      value={(timeRemaining / (currentItem.timeLimit * 1000)) * 100}
                      className="w-80 h-3"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 环节提示 - 简洁版 */}
          <div className="max-w-3xl mx-auto">
            {currentItem.subtitle?.includes('自我介绍') && (
              <div className="bg-blue-500/10 backdrop-blur-sm border border-blue-500/20 rounded-2xl p-8">
                <h3 className="text-2xl font-semibold text-blue-300 mb-6">
                  请开始您的自我介绍
                </h3>
                <div className="text-blue-200 text-lg leading-relaxed">
                  简要介绍个人情况、工作经历、专业技能及应聘优势
                </div>
              </div>
            )}

            {currentItem.subtitle?.includes('专业问答') && (
              <div className="bg-purple-500/10 backdrop-blur-sm border border-purple-500/20 rounded-2xl p-8">
                <h3 className="text-2xl font-semibold text-purple-300 mb-6">
                  专业问答环节
                </h3>
                <div className="text-purple-200 text-lg leading-relaxed">
                  请认真听取评委提问，结合实际经验进行回答
                </div>
              </div>
            )}

            {currentItem.subtitle?.includes('应急处置') && (
              <div className="bg-red-500/10 backdrop-blur-sm border border-red-500/20 rounded-2xl p-8">
                <h3 className="text-2xl font-semibold text-red-300 mb-6">
                  应急处置环节
                </h3>
                <div className="text-red-200 text-lg leading-relaxed">
                  请根据给定情景，阐述您的处置方案和应对措施
                </div>
              </div>
            )}

            {!currentItem.subtitle?.includes('自我介绍') && 
             !currentItem.subtitle?.includes('专业问答') && 
             !currentItem.subtitle?.includes('应急处置') && (
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
                <h3 className="text-2xl font-semibold text-white mb-6">
                  {currentItem.subtitle || '面试环节'}
                </h3>
                <div className="text-gray-300 text-lg leading-relaxed">
                  请按照评委要求进行本环节内容
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 底部评委状态 - 极简显示 */}
      <div className="absolute bottom-0 left-0 right-0 z-10 p-6">
        <div className="flex justify-center">
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-full px-6 py-3">
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-400">评委在线</span>
              <div className="flex gap-1">
                {judges.map((judge) => (
                  <div
                    key={judge.id}
                    className={`w-2 h-2 rounded-full ${
                      judge.isActive ? 'bg-green-500' : 'bg-gray-600'
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm text-white">
                {judges.filter(j => j.isActive).length}/{judges.length}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
