"use client"

import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Clock, User, Users, Mic, Video } from "lucide-react"

interface LayoutStudioProps {
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

export function LayoutStudio({ 
  currentItem, 
  currentCandidate, 
  timeRemaining, 
  formatTime, 
  judges 
}: LayoutStudioProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a0a] to-[#1a1a1a] text-white relative">
      {/* 顶部新闻条 */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 h-2"></div>
      
      {/* 主标题栏 */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 border-b border-gray-700">
        <div className="flex items-center justify-between px-8 py-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <Video className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">面试直播间</h1>
                <div className="text-sm text-gray-400">INTERVIEW STUDIO</div>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-red-600 px-3 py-1 rounded-full">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              <span className="text-white text-sm font-medium">LIVE</span>
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-lg font-semibold text-white">
              {new Date().toLocaleTimeString("zh-CN")}
            </div>
            <div className="text-sm text-gray-400">
              {new Date().toLocaleDateString("zh-CN")}
            </div>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-80px)]">
        {/* 左侧信息面板 */}
        <div className="w-80 bg-gradient-to-b from-gray-800 to-gray-900 border-r border-gray-700 p-6">
          {/* 候选人信息卡 */}
          <div className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 border border-blue-500/30 rounded-xl p-6 mb-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                <User className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">当前候选人</h3>
                <div className="text-blue-300 text-sm">CANDIDATE</div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">姓名</span>
                <span className="text-white font-medium">
                  {currentCandidate?.name || "候选人"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">工号</span>
                <span className="text-white">{currentCandidate?.number || "N/A"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">部门</span>
                <span className="text-white">{currentCandidate?.department || "N/A"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">状态</span>
                <Badge className="bg-green-500 text-white">面试中</Badge>
              </div>
            </div>
          </div>

          {/* 计时器 */}
          {currentItem.timeLimit && (
            <div className="bg-gradient-to-r from-orange-900/50 to-red-900/50 border border-orange-500/30 rounded-xl p-6 mb-6">
              <div className="flex items-center gap-3 mb-4">
                <Clock className="w-6 h-6 text-orange-400" />
                <div>
                  <h3 className="text-lg font-bold text-white">计时器</h3>
                  <div className="text-orange-300 text-sm">TIMER</div>
                </div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-orange-400 mb-3">
                  {formatTime(timeRemaining)}
                </div>
                <Progress
                  value={(() => {
                    const totalTime = currentItem.timeLimit * 1000
                    return totalTime > 0 ? Math.max(0, Math.min(100, (timeRemaining / totalTime) * 100)) : 0
                  })()}
                  className="w-full h-3 mb-2"
                />
                <div className="flex justify-between text-xs text-orange-300">
                  <span>已用时: {formatTime(Date.now() - currentItem.startTime)}</span>
                  <span>总时长: {formatTime(currentItem.timeLimit * 1000)}</span>
                </div>
              </div>
            </div>
          )}

          {/* 评委面板 */}
          <div className="bg-gray-800/50 border border-gray-600 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Users className="w-6 h-6 text-blue-400" />
              <div>
                <h3 className="text-lg font-bold text-white">评委团</h3>
                <div className="text-blue-300 text-sm">JUDGES PANEL</div>
              </div>
            </div>
            <div className="space-y-3">
              {judges.filter(j => j.isActive).map((judge) => (
                <div key={judge.id} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Mic className="w-4 h-4 text-gray-400" />
                    <span className="text-white">{judge.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-green-400 text-xs">在线</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-blue-900/30 border border-blue-500/30 rounded-lg text-center">
              <div className="text-xl font-bold text-blue-300">
                {judges.filter(j => j.isActive).length}位
              </div>
              <div className="text-blue-200 text-sm">在线评委</div>
            </div>
          </div>
        </div>

        {/* 主显示区域 */}
        <div className="flex-1 flex flex-col">
          {/* 环节标题栏 */}
          <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 border-b border-blue-500/30 p-8">
            <div className="text-center">
              <h1 className="text-5xl font-bold text-white mb-4">
                {currentItem.title}
              </h1>
              {currentItem.subtitle && (
                <h2 className="text-3xl text-blue-300 mb-4">
                  {currentItem.subtitle}
                </h2>
              )}
              <div className="inline-block bg-blue-500/20 border border-blue-500/30 rounded-full px-6 py-2">
                <span className="text-blue-300 text-lg">
                  {currentItem.type === 'interview_stage' ? '面试环节' : '题目'}
                </span>
              </div>
            </div>
          </div>

          {/* 内容区域 */}
          <div className="flex-1 p-8 flex items-center justify-center">
            <div className="max-w-4xl w-full">
              {currentItem.subtitle?.includes('自我介绍') && (
                <div className="bg-gradient-to-r from-blue-900/20 to-blue-800/20 border border-blue-500/30 rounded-2xl p-10">
                  <h3 className="text-3xl font-bold text-blue-300 mb-8 text-center">
                    自我介绍环节
                  </h3>
                  <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <h4 className="text-xl font-semibold text-white mb-4">介绍要点</h4>
                      <div className="space-y-3 text-blue-200">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                          <span>个人基本情况</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                          <span>教育背景与工作经历</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                          <span>专业技能与特长</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                          <span>应聘理由与期望</span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h4 className="text-xl font-semibold text-white mb-4">注意事项</h4>
                      <div className="space-y-3 text-blue-200">
                        <div>• 语言表达清晰流畅</div>
                        <div>• 内容重点突出</div>
                        <div>• 时间控制得当</div>
                        <div>• 保持自信状态</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {currentItem.subtitle?.includes('专业问答') && (
                <div className="bg-gradient-to-r from-purple-900/20 to-purple-800/20 border border-purple-500/30 rounded-2xl p-10 text-center">
                  <h3 className="text-3xl font-bold text-purple-300 mb-8">
                    专业问答环节
                  </h3>
                  <div className="text-xl text-gray-300 mb-8">
                    评委将根据您的专业背景进行相关提问
                  </div>
                  <div className="bg-purple-900/30 border border-purple-500/30 rounded-xl p-6">
                    <div className="text-purple-200 space-y-3">
                      <p>• 仔细听取评委的问题，可适当思考后回答</p>
                      <p>• 结合实际工作经验进行阐述</p>
                      <p>• 回答要条理清晰，逻辑性强</p>
                      <p>• 如有疑问可请评委重复或澄清问题</p>
                    </div>
                  </div>
                </div>
              )}

              {!currentItem.subtitle?.includes('自我介绍') && !currentItem.subtitle?.includes('专业问答') && (
                <div className="bg-gradient-to-r from-gray-800/50 to-gray-700/50 border border-gray-600 rounded-2xl p-10 text-center">
                  <h3 className="text-3xl font-bold text-white mb-8">
                    {currentItem.subtitle || '面试环节'}
                  </h3>
                  <div className="text-xl text-gray-300">
                    请按照评委要求进行本环节的面试内容
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 底部状态栏 */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 border-t border-gray-700 px-8 py-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-6">
            <div className="text-sm text-gray-400">面试评分系统</div>
            <div className="text-sm text-green-400">● 系统运行正常</div>
          </div>
          <div className="text-sm text-gray-400">
            Powered by Interview System v2.0
          </div>
        </div>
      </div>
    </div>
  )
}
