"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Search, User, Clock, Play, MessageSquare, Award, ArrowRight, RotateCcw } from "lucide-react"
import type { Candidate, Judge, InterviewDimension, ScoreItem, DisplaySession, Question } from "@/types/scoring"
import { LayoutCentered } from "@/components/interview-stage-layouts/layout-centered"
import { LayoutMinimal } from "@/components/interview-stage-layouts/layout-minimal"
import { LayoutTransition } from "@/components/layout-transition"
import { TimerWarningOverlay } from "@/components/timer-warning-overlay"

export default function DisplayPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [judges, setJudges] = useState<Judge[]>([])
  const [dimensions, setDimensions] = useState<InterviewDimension[]>([])
  const [scoreItems, setScoreItems] = useState<ScoreItem[]>([])
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentCandidate, setCurrentCandidate] = useState<Candidate | null>(null)
  const [displaySession, setDisplaySession] = useState<DisplaySession | null>(null)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [forceUpdate, setForceUpdate] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [transitionText, setTransitionText] = useState("")
  const [previousStage, setPreviousStage] = useState<string | null>(null) // 添加强制更新状态

  // 新增：布局切换过渡状态
  const [isLayoutTransitioning, setIsLayoutTransitioning] = useState(false)
  const [layoutTransitionType, setLayoutTransitionType] = useState<'to_interview_stage' | 'to_question' | 'stage_change'>('to_interview_stage')
  const [previousItem, setPreviousItem] = useState<any>(null)

  useEffect(() => {
    // 更新时间
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    // 获取初始数据
    Promise.all([
      fetch("/api/score").then((res) => res.json()),
      fetch("/api/admin/dimensions").then((res) => res.json()),
      fetch("/api/admin/score-items").then((res) => res.json()),
      fetch("/api/admin/questions").then((res) => res.json()),
      fetch("/api/admin/display/stage").then((res) => res.json()),
    ]).then(([scoreData, dimensionsData, scoreItemsData, questionsData, sessionData]) => {
      setCandidates(scoreData.candidates)
      setJudges(scoreData.judges)
      setCurrentCandidate(scoreData.currentCandidate)
      setDimensions(dimensionsData.dimensions)
      setScoreItems(scoreItemsData.scoreItems)
      setQuestions(questionsData.questions)
      setDisplaySession(sessionData.session)
    })

    // 监听实时更新 - 改进的 SSE 连接
    let eventSource: EventSource | null = null
    let reconnectTimer: NodeJS.Timeout | null = null
    let connectionCheckTimer: NodeJS.Timeout | null = null
    let lastHeartbeat = Date.now()

    const connectSSE = () => {
      if (eventSource) {
        eventSource.close()
      }

      console.log("[Display] Connecting to SSE...")
      eventSource = new EventSource("/api/events")

      eventSource.onopen = () => {
        console.log("[Display] SSE connection opened")
      }

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data)
        console.log("[Display] Received event:", data.type, data)

        if (data.type === "heartbeat") {
          // 更新心跳时间
          lastHeartbeat = Date.now()
          console.log("[Display] Heartbeat received")
          return
        }

        if (data.type === "initial") {
          setCandidates(data.data.candidates)
          setJudges(data.data.judges)
          setCurrentCandidate(data.data.currentCandidate)
          if (data.data.displaySession) {
            setDisplaySession(data.data.displaySession)
          }
        } else if (data.type === "score_updated") {
          setCandidates((prev) => prev.map((c) => (c.id === data.data.candidate.id ? data.data.candidate : c)))
          if (data.data.candidate.id === currentCandidate?.id) {
            setCurrentCandidate(data.data.candidate)
          }
        } else if (data.type === "candidate_changed") {
          setCurrentCandidate(data.data)
          setCandidates((prev) => prev.map((c) => (c.id === data.data.id ? data.data : c)))
        } else if (data.type === "stage_changed") {
          console.log("[Display] Stage changed to:", data.data.stage)

          // 处理环节切换动画
          const currentStage = displaySession?.currentStage
          const newStage = data.data.stage

          if (currentStage && currentStage !== newStage) {
            setPreviousStage(currentStage)
            setIsTransitioning(true)

            // 确定过渡文本
            let transitionMessage = ""
            if (currentStage === "opening" && newStage === "questioning") {
              transitionMessage = "进入答题环节"
            } else if (currentStage === "questioning" && newStage === "scoring") {
              transitionMessage = "进入评分环节"
            } else if (currentStage === "scoring" && newStage === "opening") {
              transitionMessage = "开始下一名面试人员"
            } else if (currentStage === "opening" && newStage === "scoring") {
              transitionMessage = "跳转到评分环节"
            } else if (currentStage === "questioning" && newStage === "opening") {
              transitionMessage = "返回开场环节"
            } else if (currentStage === "scoring" && newStage === "questioning") {
              transitionMessage = "返回答题环节"
            } else {
              transitionMessage = "环节切换中"
            }

            setTransitionText(transitionMessage)

            // 2秒后完成过渡
            setTimeout(() => {
              setDisplaySession((prev) => (prev ? { ...prev, currentStage: newStage } : null))
              setForceUpdate((prev) => prev + 1)

              // 再过0.5秒隐藏过渡动画
              setTimeout(() => {
                setIsTransitioning(false)
                setPreviousStage(null)
              }, 500)
            }, 2000)
          } else {
            // 直接切换（初始状态或相同环节）
            setDisplaySession((prev) => (prev ? { ...prev, currentStage: newStage } : null))
            setForceUpdate((prev) => prev + 1)
          }
        } else if (data.type === "question_changed") {
          console.log("[Display] Question changed:", data.data)
          setDisplaySession((prev) => (prev ? { ...prev, currentQuestion: data.data } : null))
          setForceUpdate((prev) => prev + 1) // 强制重新渲染
        } else if (data.type === "interview_item_changed") {
          console.log("[Display] Interview item changed:", data.data)

          // 检查是否需要布局切换过渡
          const newItem = data.data.item
          const currentItem = displaySession?.currentInterviewItem || displaySession?.currentQuestion

          if (currentItem && newItem) {
            const currentType = currentItem.type || 'question'
            const newType = newItem.type

            // 如果类型发生变化，触发过渡动画
            if (currentType !== newType) {
              setPreviousItem(currentItem)
              setLayoutTransitionType(newType === 'interview_stage' ? 'to_interview_stage' : 'to_question')
              setIsLayoutTransitioning(true)

              // 延迟更新显示会话，让过渡动画完成
              setTimeout(() => {
                setDisplaySession((prev) => {
                  if (!prev) return null

                  const updated = { ...prev, currentInterviewItem: newItem }

                  // 如果是题目类型，也更新currentQuestion以保持兼容性
                  if (newItem.type === 'question') {
                    updated.currentQuestion = {
                      id: newItem.id,
                      title: newItem.title,
                      content: newItem.content || '',
                      timeLimit: newItem.timeLimit || 300,
                      startTime: newItem.startTime
                    }
                  }

                  return updated
                })
                setForceUpdate((prev) => prev + 1)
              }, 1200) // 与过渡动画时间匹配
            } else {
              // 同类型切换，直接更新
              setDisplaySession((prev) => {
                if (!prev) return null

                const updated = { ...prev, currentInterviewItem: newItem }

                // 如果是题目类型，也更新currentQuestion以保持兼容性
                if (newItem.type === 'question') {
                  updated.currentQuestion = {
                    id: newItem.id,
                    title: newItem.title,
                    content: newItem.content || '',
                    timeLimit: newItem.timeLimit || 300,
                    startTime: newItem.startTime
                  }
                }

                return updated
              })
              setForceUpdate((prev) => prev + 1)
            }
          } else {
            // 首次设置或无当前项目，直接更新
            setDisplaySession((prev) => {
              if (!prev) return null

              const updated = { ...prev, currentInterviewItem: newItem }

              // 如果是题目类型，也更新currentQuestion以保持兼容性
              if (newItem.type === 'question') {
                updated.currentQuestion = {
                  id: newItem.id,
                  title: newItem.title,
                  content: newItem.content || '',
                  timeLimit: newItem.timeLimit || 300,
                  startTime: newItem.startTime
                }
              }

              return updated
            })
            setForceUpdate((prev) => prev + 1)
          }
        } else if (data.type === "timer_changed") {
          console.log("[Display] Timer state changed:", data.data)
          setDisplaySession((prev) => {
            if (!prev) return null
            return { ...prev, timerState: data.data.timerState }
          })
          setForceUpdate((prev) => prev + 1)
          return
        }
      }

      eventSource.onerror = (error) => {
        console.error("[Display] SSE error:", error)
        eventSource?.close()

        // 自动重连
        if (!reconnectTimer) {
          reconnectTimer = setTimeout(() => {
            console.log("[Display] Attempting to reconnect SSE...")
            reconnectTimer = null
            connectSSE()
          }, 1000) // 缩短重连间隔到1秒
        }
      }
    }

    // 连接状态检查机制
    const checkConnection = () => {
      const now = Date.now()
      const timeSinceLastHeartbeat = now - lastHeartbeat

      // 如果超过20秒没有收到心跳，主动重连
      if (timeSinceLastHeartbeat > 20000) {
        console.log(`[Display] No heartbeat for ${timeSinceLastHeartbeat}ms, reconnecting...`)
        connectSSE()
      }
    }

    // 初始连接
    connectSSE()

    // 每15秒检查一次连接状态
    connectionCheckTimer = setInterval(checkConnection, 15000)

    return () => {
      clearInterval(timer)
      if (reconnectTimer) {
        clearTimeout(reconnectTimer)
      }
      if (connectionCheckTimer) {
        clearInterval(connectionCheckTimer)
      }
      if (eventSource) {
        eventSource.close()
      }
    }
  }, []) // 移除依赖，避免因状态更新导致SSE连接重建

  // 计算答题剩余时间 - 支持手动倒计时控制
  useEffect(() => {
    const currentItem = displaySession?.currentInterviewItem || displaySession?.currentQuestion
    const timerState = displaySession?.timerState

    if (currentItem && displaySession?.currentStage === "questioning") {
      const interval = setInterval(() => {
        if (timerState) {
          // 使用手动控制的倒计时状态
          if (timerState.isRunning && timerState.startTime) {
            const elapsed = Date.now() - timerState.startTime
            const remaining = Math.max(0, timerState.remainingTime - elapsed)
            setTimeRemaining(remaining)
          } else {
            // 暂停或停止状态，显示当前剩余时间
            setTimeRemaining(timerState.remainingTime)
          }
        } else {
          // 回退到自动计算（向后兼容）
          const elapsed = Date.now() - currentItem.startTime
          const timeLimit = currentItem.timeLimit || 0
          const remaining = Math.max(0, timeLimit * 1000 - elapsed)
          setTimeRemaining(remaining)
        }
      }, 100) // 更频繁的更新以获得更平滑的显示

      return () => clearInterval(interval)
    }
  }, [displaySession?.currentInterviewItem, displaySession?.currentQuestion, displaySession?.currentStage, displaySession?.timerState])

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
  }

  // 获取环节图标
  const getStageIcon = (stage: string) => {
    switch (stage) {
      case "opening":
        return <Play className="h-12 w-12" />
      case "questioning":
        return <MessageSquare className="h-12 w-12" />
      case "scoring":
        return <Award className="h-12 w-12" />
      default:
        return <Play className="h-12 w-12" />
    }
  }

  // 获取环节名称
  const getStageName = (stage: string) => {
    switch (stage) {
      case "opening":
        return "开场环节"
      case "questioning":
        return "答题环节"
      case "scoring":
        return "评分环节"
      default:
        return "开场环节"
    }
  }

  // 过渡动画组件
  const renderTransition = () => (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center">
      <div className="text-center text-white max-w-2xl mx-auto px-8">
        {/* 动画背景 */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -left-40 w-80 h-80 bg-white/10 rounded-full animate-pulse"></div>
          <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-white/10 rounded-full animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-white/5 rounded-full animate-ping"></div>
        </div>

        {/* 主要内容 */}
        <div className="relative z-10">
          {/* 环节切换动画 */}
          <div className="flex items-center justify-center gap-8 mb-8">
            {/* 前一个环节 */}
            {previousStage && (
              <div className="flex flex-col items-center opacity-60 transform scale-75 transition-all duration-1000">
                <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mb-4">
                  {getStageIcon(previousStage)}
                </div>
                <span className="text-lg font-medium">{getStageName(previousStage)}</span>
              </div>
            )}

            {/* 箭头动画 */}
            {previousStage && (
              <div className="flex items-center">
                {transitionText.includes("下一名面试人员") ? (
                  <RotateCcw className="h-8 w-8 text-white animate-spin" />
                ) : (
                  <ArrowRight className="h-8 w-8 text-white animate-pulse" />
                )}
              </div>
            )}

            {/* 当前环节 */}
            <div className="flex flex-col items-center transform scale-110 transition-all duration-1000">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center mb-4 animate-bounce">
                {getStageIcon(displaySession?.currentStage || "opening")}
              </div>
              <span className="text-xl font-bold">{getStageName(displaySession?.currentStage || "opening")}</span>
            </div>
          </div>

          {/* 过渡文本 */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-4 animate-pulse">{transitionText}</h1>
            <p className="text-xl text-white/80">请稍候，系统正在切换...</p>
          </div>

          {/* 进度条动画 */}
          <div className="w-64 mx-auto">
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-400 to-purple-500 rounded-full transform origin-left transition-transform duration-2000 ease-in-out"
                style={{ transform: 'scaleX(1)' }}
              ></div>
            </div>
          </div>

          {/* 装饰性元素 */}
          <div className="mt-8 flex justify-center space-x-2">
            <div className="w-3 h-3 bg-white/60 rounded-full animate-bounce"></div>
            <div className="w-3 h-3 bg-white/60 rounded-full animate-bounce delay-200"></div>
            <div className="w-3 h-3 bg-white/60 rounded-full animate-bounce delay-400"></div>
          </div>
        </div>
      </div>
    </div>
  )

  // 开场环节
  const renderOpeningStage = () => (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 text-white flex items-center justify-center">
      <div className="text-center max-w-4xl mx-auto px-8">
        <div className="mb-8">
          <div className="w-32 h-32 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-6 backdrop-blur-sm">
            <svg className="w-16 h-16 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
            列车长面试评分系统
          </h1>
          <p className="text-2xl text-blue-200 mb-8">Train Conductor Interview Scoring System</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
            <div className="text-4xl font-bold text-blue-300 mb-2">{candidates.length}</div>
            <div className="text-lg text-blue-200">参与候选人</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
            <div className="text-4xl font-bold text-green-300 mb-2">{judges.filter((j) => j.isActive).length}</div>
            <div className="text-lg text-green-200">在线评委</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
            <div className="text-4xl font-bold text-purple-300 mb-2">{dimensions.filter((d) => d.isActive).length}</div>
            <div className="text-lg text-purple-200">评分维度</div>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-8 mb-8">
          <h2 className="text-3xl font-bold mb-6">面试流程</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold">1</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">开场介绍</h3>
              <p className="text-blue-200">系统介绍与候选人准备</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold">2</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">问题答辩</h3>
              <p className="text-green-200">候选人回答面试问题</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold">3</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">评委评分</h3>
              <p className="text-purple-200">评委进行综合评分</p>
            </div>
          </div>
        </div>

        <div className="text-lg text-blue-200">
          <div className="mb-2">
            {currentTime.toLocaleDateString("zh-CN", {
              year: "numeric",
              month: "long",
              day: "numeric",
              weekday: "long",
            })}
          </div>
          <div className="text-3xl font-bold">{currentTime.toLocaleTimeString("zh-CN")}</div>
        </div>
      </div>
    </div>
  )

  // 答题环节
  const renderQuestioningStage = () => {
    // 优先使用新的currentInterviewItem，如果没有则回退到currentQuestion
    const currentItem = displaySession?.currentInterviewItem
    const currentQuestion = displaySession?.currentQuestion

    // 如果是面试环节类型，使用极简布局
    if (currentItem && currentItem.type === 'interview_stage') {
      return (
        <LayoutMinimal
          currentItem={currentItem}
          currentCandidate={currentCandidate}
          timeRemaining={timeRemaining}
          formatTime={formatTime}
          judges={judges}
        />
      )
    }

    // 对于题目类型或使用原有currentQuestion，直接使用原有的答题布局
    // 这里不做任何修改，保持原有的答题界面
    return (
    <div className="min-h-screen bg-[#1a1a1a] text-white flex">
      {/* 左侧候选人信息 */}
      <div className="w-80 bg-[#2a2a2a] p-6 flex flex-col">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-4">面试答题环节</h1>
          <div className="text-sm text-gray-400 mb-4">
            {currentTime.toLocaleDateString("zh-CN")} {currentTime.toLocaleTimeString("zh-CN")}
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

        {/* 题目列表 */}
        <div className="flex-1">
          <h3 className="text-lg font-semibold mb-4">题目列表</h3>
          <div className="space-y-2">
            {questions
              .filter((q) => q.isActive)
              .map((question, index) => (
                <div
                  key={question.id}
                  className={`p-3 rounded-lg ${
                    displaySession?.currentQuestion?.id === question.id
                      ? "bg-blue-500 text-white"
                      : "bg-[#3a3a3a] text-gray-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">题目 {index + 1}</span>
                    <Badge variant="outline" className="text-xs">
                      {formatTime(question.timeLimit * 1000)}
                    </Badge>
                  </div>
                  <div className="text-sm mt-1 opacity-80">{question.category}</div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* 主内容区域 */}
      <div className="flex-1 p-8">
        {displaySession?.currentQuestion ? (
          <div className="max-w-4xl mx-auto">
            {/* 题目标题和计时器 */}
            <div className="flex justify-between items-center mb-8">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">{displaySession.currentQuestion.title}</h1>
                <div className="text-gray-400">
                  分类：{questions.find((q) => q.id === displaySession.currentQuestion?.id)?.category}
                </div>
              </div>
              <div className="text-right">
                <div className="text-6xl font-bold text-blue-400 mb-2">{formatTime(timeRemaining)}</div>
                <div className="text-gray-400">剩余时间</div>
                <div className="mt-2">
                  <Progress
                    value={(timeRemaining / (displaySession.currentQuestion.timeLimit * 1000)) * 100}
                    className="w-32 h-2"
                  />
                </div>
              </div>
            </div>

            {/* 题目内容 */}
            <div className="bg-[#2a2a2a] rounded-xl p-8 mb-8">
              <h2 className="text-xl font-semibold text-white mb-4">题目内容</h2>
              <div className="text-lg text-gray-200 leading-relaxed">{displaySession.currentQuestion.content}</div>
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
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Clock className="h-24 w-24 text-gray-400 mx-auto mb-6" />
              <h2 className="text-3xl font-bold text-white mb-4">等待题目开始</h2>
              <p className="text-gray-400 text-lg">管理员将为您选择面试题目</p>
            </div>
          </div>
        )}
      </div>

      {/* 右侧状态信息 */}
      <div className="w-80 bg-[#2a2a2a] p-6">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">答题状态</h3>
          <div className="bg-[#3a3a3a] rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-green-400">答题进行中</span>
            </div>
            {displaySession?.currentQuestion && (
              <div className="text-sm text-gray-400">
                开始时间：{new Date(displaySession.currentQuestion.startTime).toLocaleTimeString("zh-CN")}
              </div>
            )}
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">评委状态</h3>
          <div className="space-y-2">
            {judges
              .filter((j) => j.isActive)
              .map((judge) => (
                <div key={judge.id} className="flex items-center justify-between bg-[#3a3a3a] rounded-lg p-3">
                  <span className="text-gray-300">{judge.name}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-xs text-green-400">在线</span>
                  </div>
                </div>
              ))}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-white mb-4">进度统计</h3>
          <div className="space-y-4">
            <div className="bg-[#3a3a3a] rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-1">当前题目</div>
              <div className="text-lg font-semibold text-white">
                {displaySession?.currentQuestion
                  ? `${questions.findIndex((q) => q.id === displaySession.currentQuestion?.id) + 1} / ${questions.filter((q) => q.isActive).length}`
                  : "0 / 0"}
              </div>
            </div>
            <div className="bg-[#3a3a3a] rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-1">总用时</div>
              <div className="text-lg font-semibold text-white">
                {displaySession?.currentQuestion
                  ? formatTime(Date.now() - displaySession.currentQuestion.startTime)
                  : "00:00"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    )
  }

  // 评分环节（原有的界面）
  const renderScoringStage = () => {
    const sortedCandidates = [...candidates].sort((a, b) => b.finalScore - a.finalScore)
    const activeDimensions = dimensions.filter((d) => d.isActive)

    const getDimensionAverage = (dimensionId: string) => {
      if (!currentCandidate || currentCandidate.scores.length === 0) return 0
      const scores = currentCandidate.scores.map((s) => s.categories[dimensionId] || 0)
      return Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 10) / 10
    }

    const getStatusBadge = (candidate: Candidate) => {
      if (candidate.id === currentCandidate?.id) {
        return <Badge className="bg-blue-500 text-white text-xs">已评分</Badge>
      }
      if (candidate.status === "completed") {
        return <Badge className="bg-green-500 text-white text-xs">面试中</Badge>
      }
      return <Badge className="bg-orange-500 text-white text-xs">待面试</Badge>
    }

    const formatCandidateNumber = (index: number) => {
      return String(index + 1).padStart(3, "0")
    }

    const averageScore =
      candidates.length > 0
        ? Math.round((candidates.reduce((sum, c) => sum + c.finalScore, 0) / candidates.length) * 10) / 10
        : 0

    return (
      <div className="min-h-screen bg-[#1a1a1a] text-white flex">
        {/* 左侧候选人列表 */}
        <div className="w-80 bg-[#2a2a2a] p-4 flex flex-col">
          <div className="mb-6">
            <h1 className="text-xl font-medium text-white mb-4">实时面试评分系统</h1>
            <div className="text-sm text-gray-400 mb-4">
              {currentTime.toLocaleDateString("zh-CN")} {currentTime.toLocaleTimeString("zh-CN")}
              <span className="ml-2 text-green-400">● 系统在线</span>
            </div>

            {/* 搜索框 */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="搜索候选人..."
                className="w-full bg-[#3a3a3a] border border-gray-600 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* 候选人列表标题 */}
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm text-gray-300">候选人列表</span>
            <span className="text-sm text-gray-400">
              {candidates.filter((c) => c.scores.length > 0).length}/{candidates.length}
            </span>
          </div>

          {/* 候选人列表 */}
          <div className="flex-1 space-y-2 overflow-y-auto">
            {candidates.map((candidate, index) => (
              <div
                key={candidate.id}
                className={`p-3 rounded-lg cursor-pointer transition-all ${
                  candidate.id === currentCandidate?.id ? "bg-blue-500 text-white" : "bg-[#3a3a3a] hover:bg-[#4a4a4a]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                      candidate.id === currentCandidate?.id ? "bg-white text-blue-500" : "bg-blue-500 text-white"
                    }`}
                  >
                    {formatCandidateNumber(index)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium truncate">{candidate.name}</span>
                      {getStatusBadge(candidate)}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">{candidate.department}</div>
                    <div className="mt-2">
                      <Progress value={(candidate.scores.length / judges.length) * 100} className="h-1" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 主内容区域 */}
        <div className="flex-1 p-6">
          {currentCandidate ? (
            <div className="space-y-6">
              {/* 当前候选人信息 */}
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-3xl font-bold text-white mb-2">{currentCandidate.name}</h2>
                  <div className="flex items-center gap-4 text-gray-400">
                    <span>👤 编号: {currentCandidate.number}</span>
                    <span>🏢 {currentCandidate.department}</span>
                  </div>
                </div>
                <Badge className="bg-blue-500 text-white px-4 py-2 text-sm">已评分</Badge>
              </div>

              {/* 评分区域 */}
              <div className="grid grid-cols-3 gap-6">
                {/* 各维度评分 */}
                <div className="col-span-2 grid grid-cols-2 gap-4">
                  {activeDimensions.slice(0, 4).map((dimension) => {
                    const avgScore = getDimensionAverage(dimension.id)
                    return (
                      <Card key={dimension.id} className="bg-[#2a2a2a] border-gray-600">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-center mb-3">
                            <span className="text-gray-300 text-sm">{dimension.name}</span>
                            <span className="text-2xl font-bold text-white">{avgScore}</span>
                          </div>
                          <Progress value={(avgScore / dimension.maxScore) * 100} className="h-2" />
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>

                {/* 总分圆环 */}
                <div className="flex items-center justify-center">
                  <div className="relative w-48 h-48">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="40" stroke="#3a3a3a" strokeWidth="8" fill="none" />
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        stroke="#3b82f6"
                        strokeWidth="8"
                        fill="none"
                        strokeDasharray={`${(currentCandidate.totalScore / 100) * 251.2} 251.2`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-4xl font-bold text-white">{currentCandidate.totalScore}</span>
                      <span className="text-gray-400 text-sm">总分</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 底部图表区域 */}
              <div className="grid grid-cols-2 gap-6">
                {/* 雷达图 */}
                <Card className="bg-[#2a2a2a] border-gray-600">
                  <CardContent className="p-6">
                    <h3 className="text-lg font-medium text-white mb-4">能力雷达</h3>
                    <div className="flex items-center justify-center h-48">
                      <svg width="200" height="200" viewBox="0 0 200 200">
                        {/* 雷达图背景 */}
                        <polygon
                          points="100,20 173,80 173,120 100,180 27,120 27,80"
                          fill="none"
                          stroke="#3a3a3a"
                          strokeWidth="1"
                        />
                        <polygon
                          points="100,50 146,90 146,110 100,150 54,110 54,90"
                          fill="none"
                          stroke="#3a3a3a"
                          strokeWidth="1"
                        />
                        {/* 数据多边形 */}
                        <polygon
                          points="100,30 160,85 160,115 100,170 40,115 40,85"
                          fill="rgba(59, 130, 246, 0.3)"
                          stroke="#3b82f6"
                          strokeWidth="2"
                        />
                      </svg>
                    </div>
                  </CardContent>
                </Card>

                {/* 评委评分详情 */}
                <Card className="bg-[#2a2a2a] border-gray-600">
                  <CardContent className="p-6">
                    <h3 className="text-lg font-medium text-white mb-4">评委实时评分</h3>
                    <div className="space-y-3">
                      {judges.slice(0, 3).map((judge, index) => {
                        const judgeScore = currentCandidate.scores.find((s) => s.judgeId === judge.id)
                        const score = judgeScore ? judgeScore.totalScore : 0
                        return (
                          <div key={judge.id} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <User className="h-4 w-4 text-gray-400" />
                              <span className="text-gray-300">{judge.name}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="w-24">
                                <Progress value={(score / 100) * 100} className="h-2" />
                              </div>
                              <span className="text-white font-medium w-8">{score}</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="text-6xl mb-4">⏳</div>
                <h2 className="text-2xl font-bold text-white mb-2">暂无候选人面试</h2>
                <p className="text-gray-400">等待开始面试...</p>
              </div>
            </div>
          )}
        </div>

        {/* 右侧统计区域 */}
        <div className="w-80 bg-[#2a2a2a] p-4">
          {/* 总体统计 */}
          <Card className="bg-[#3a3a3a] border-gray-600 mb-6">
            <CardContent className="p-4">
              <h3 className="text-lg font-medium text-white mb-4">总体统计</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-sm text-gray-400 mb-1">已评分/总人数</div>
                  <div className="text-2xl font-bold text-white">
                    {candidates.filter((c) => c.scores.length > 0).length}/{candidates.length}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-400 mb-1">平均分</div>
                  <div className="text-2xl font-bold text-white">{averageScore}</div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-sm text-gray-400 mb-1">最高分</div>
                  <div className="text-xl font-bold text-green-400">
                    {candidates.length > 0 ? Math.max(...candidates.map((c) => c.finalScore)) : 0}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-400 mb-1">最低分</div>
                  <div className="text-xl font-bold text-red-400">
                    {candidates.length > 0 ? Math.min(...candidates.map((c) => c.finalScore)) : 0}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 排名列表 */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-white">排名列表</h3>
              <Badge className="bg-blue-500 text-white text-xs">实时更新</Badge>
            </div>

            <div className="space-y-2">
              {sortedCandidates.slice(0, 6).map((candidate, index) => (
                <div
                  key={candidate.id}
                  className={`p-3 rounded-lg ${
                    candidate.id === currentCandidate?.id ? "bg-blue-500/20 border border-blue-500" : "bg-[#3a3a3a]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                          index === 0
                            ? "bg-yellow-500 text-black"
                            : index === 1
                              ? "bg-gray-400 text-black"
                              : index === 2
                                ? "bg-orange-500 text-black"
                                : "bg-gray-600 text-white"
                        }`}
                      >
                        {index + 1}
                      </div>
                      <div>
                        <div className="text-white font-medium">{candidate.name}</div>
                        <div className="text-xs text-gray-400">{candidate.department}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-white font-bold">{candidate.finalScore}</div>
                      <Badge className="bg-blue-500 text-white text-xs mt-1">已评分</Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 如果正在进行布局切换过渡，显示布局过渡动画
  if (isLayoutTransitioning) {
    return (
      <>
        {/* 布局切换过渡动画 */}
        <LayoutTransition
          isTransitioning={isLayoutTransitioning}
          transitionType={layoutTransitionType}
          fromType={previousItem?.type}
          toType={displaySession?.currentInterviewItem?.type}
          fromTitle={previousItem?.title}
          toTitle={displaySession?.currentInterviewItem?.title}
          onTransitionComplete={() => {
            setIsLayoutTransitioning(false)
            setPreviousItem(null)
          }}
        />
      </>
    )
  }

  // 如果正在过渡，显示过渡动画
  if (isTransitioning) {
    return (
      <>
        {/* 当前环节内容（作为背景） */}
        <div className="opacity-30">
          {(() => {
            if (!displaySession) return null
            switch (displaySession.currentStage) {
              case "opening":
                return renderOpeningStage()
              case "questioning":
                return renderQuestioningStage()
              case "scoring":
                return renderScoringStage()
              default:
                return renderOpeningStage()
            }
          })()}
        </div>
        {/* 过渡动画覆盖层 */}
        {renderTransition()}
      </>
    )
  }

  // 根据当前环节渲染不同界面
  if (!displaySession) {
    return (
      <div className="min-h-screen bg-[#1a1a1a] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-xl">系统加载中...</p>
        </div>
      </div>
    )
  }

  const mainContent = (() => {
    switch (displaySession.currentStage) {
      case "opening":
        return renderOpeningStage()
      case "questioning":
        return renderQuestioningStage()
      case "scoring":
        return renderScoringStage()
      default:
        return renderOpeningStage()
    }
  })()

  return (
    <>
      {mainContent}
      {/* 倒计时警告覆盖层 */}
      {displaySession.currentStage === "questioning" && (
        <TimerWarningOverlay timeRemaining={timeRemaining} />
      )}
    </>
  )
}
