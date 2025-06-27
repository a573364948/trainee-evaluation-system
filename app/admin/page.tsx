"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import {
  Users,
  Monitor,
  Settings,
  BarChart3,
  UserCheck,
  Clock,
  TrendingUp,
  Eye,
  LogOut,
  Home,
  Shield,
  Activity,
  Archive,
  Loader2,
  CheckCircle,
  Play,
  Edit,
  MessageSquare,
  Award,
  Square,
  FileText,
  Plus,
} from "lucide-react"
import type { Candidate, Judge, InterviewDimension, ScoreItem, Batch, Question, InterviewItem } from "@/types/scoring"
import CandidateManagement from "@/components/candidate-management"
import JudgeManagement from "@/components/judge-management"
import InterviewDimensions from "@/components/interview-dimensions"
import ScoreItems from "@/components/score-items"
import BatchManagement from "@/components/batch-management"
import InterviewItemManager from "@/components/interview-item-manager"

export default function AdminPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [judges, setJudges] = useState<Judge[]>([])
  const [dimensions, setDimensions] = useState<InterviewDimension[]>([])
  const [scoreItems, setScoreItems] = useState<ScoreItem[]>([])
  const [batches, setBatches] = useState<Batch[]>([])
  const [currentCandidate, setCurrentCandidate] = useState<Candidate | null>(null)
  const [activeTab, setActiveTab] = useState("dashboard")
  const [questions, setQuestions] = useState<Question[]>([])
  const [displaySession, setDisplaySession] = useState<any>(null)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [stageLoading, setStageLoading] = useState<string | null>(null)
  const [stageSuccess, setStageSuccess] = useState<string | null>(null)
  const [questionLoading, setQuestionLoading] = useState<string | null>(null)
  const [questionSuccess, setQuestionSuccess] = useState<string | null>(null)
  const [interviewItems, setInterviewItems] = useState<InterviewItem[]>([])
  const [showItemManager, setShowItemManager] = useState(false)

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
      fetch("/api/admin/batches").then((res) => res.json()),
      fetch("/api/admin/questions").then((res) => res.json()),
      fetch("/api/admin/interview-items").then((res) => res.json()).catch(() => ({ items: [] })),
      fetch("/api/admin/display/stage").then((res) => res.json()).catch(() => ({ session: null })),
    ]).then(([scoreData, dimensionsData, scoreItemsData, batchesData, questionsData, interviewItemsData, sessionData]) => {
      setCandidates(scoreData.candidates)
      setJudges(scoreData.judges)
      setCurrentCandidate(scoreData.currentCandidate)
      setDimensions(dimensionsData.dimensions)
      setScoreItems(scoreItemsData.scoreItems)
      setBatches(batchesData.batches)
      setQuestions(questionsData.questions)
      setInterviewItems(interviewItemsData.items)
      setDisplaySession(sessionData.session)
    })

    // 监听实时更新 - 改进的 SSE 连接
    let eventSource: EventSource | null = null
    let reconnectTimer: NodeJS.Timeout | null = null

    const connectSSE = () => {
      if (eventSource) {
        eventSource.close()
      }

      console.log("[Admin] Connecting to SSE...")
      eventSource = new EventSource("/api/events")

      eventSource.onopen = () => {
        console.log("[Admin] SSE connection opened")
      }

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data)
        console.log("[Admin] Received event:", data.type, data)

        if (data.type === "heartbeat") {
          // 忽略心跳包
          return
        }

        if (data.type === "initial") {
          setCandidates(data.data.candidates)
          setJudges(data.data.judges)
          setCurrentCandidate(data.data.currentCandidate)
          if (data.data.displaySession) {
            setDisplaySession(data.data.displaySession)
          }
          if (data.data.interviewItems) {
            setInterviewItems(data.data.interviewItems)
          }
        } else if (data.type === "score_updated") {
          setCandidates((prev) => prev.map((c) => (c.id === data.data.candidate.id ? data.data.candidate : c)))
        } else if (data.type === "candidate_changed") {
          console.log("[Admin] SSE candidate_changed event:", data.data.name, data.data.id)
          setCurrentCandidate(data.data)
          setCandidates((prev) => prev.map((c) => (c.id === data.data.id ? data.data : c)))
        } else if (data.type === "stage_changed") {
          console.log("[Admin] Stage changed to:", data.data.stage)
          setDisplaySession((prev: any) => (prev ? { ...prev, currentStage: data.data.stage } : null))
        } else if (data.type === "question_changed") {
          console.log("[Admin] Question changed:", data.data)
          setDisplaySession((prev: any) => (prev ? { ...prev, currentQuestion: data.data } : null))
        } else if (data.type === "interview_items_changed") {
          console.log("[Admin] Interview items changed:", data.data)
          const sortedItems = data.data.items.sort((a: any, b: any) => a.order - b.order)
          console.log("[Admin] Setting sorted interview items:", sortedItems)
          setInterviewItems(sortedItems)
        }
      }

      eventSource.onerror = (error) => {
        console.error("[Admin] SSE error:", error)
        eventSource?.close()

        // 自动重连
        if (!reconnectTimer) {
          reconnectTimer = setTimeout(() => {
            console.log("[Admin] Attempting to reconnect SSE...")
            reconnectTimer = null
            connectSSE()
          }, 3000)
        }
      }
    }

    // 初始连接
    connectSSE()

    return () => {
      clearInterval(timer)
      if (reconnectTimer) {
        clearTimeout(reconnectTimer)
      }
      if (eventSource) {
        eventSource.close()
      }
    }
  }, [])

  const setCurrentCandidateHandler = async (candidateId: string) => {
    try {
      console.log("[Admin] Setting current candidate to:", candidateId)

      const response = await fetch("/api/admin/set-candidate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId }),
      })

      if (response.ok) {
        const result = await response.json()
        console.log("[Admin] Set candidate response:", result)

        // 手动更新当前候选人状态，确保UI立即响应
        const candidate = candidates.find(c => c.id === candidateId)
        if (candidate) {
          console.log("[Admin] Updating UI with candidate:", candidate.name)
          setCurrentCandidate({ ...candidate, status: "interviewing" as const })
          // 更新候选人列表中的状态：新候选人设为面试中，其他候选人重置为等待中
          setCandidates(prev => prev.map(c =>
            c.id === candidateId
              ? { ...c, status: "interviewing" as const }
              : { ...c, status: c.status === "interviewing" ? "waiting" as const : c.status }
          ))
        }
      }
    } catch (error) {
      console.error("设置当前候选人失败:", error)
    }
  }

  const resetCandidateHandler = async (candidateId: string) => {
    try {
      const response = await fetch("/api/admin/reset-candidate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId }),
      })

      if (response.ok) {
        // 手动更新候选人状态，确保UI立即响应
        setCandidates(prev => prev.map(c =>
          c.id === candidateId
            ? { ...c, scores: [], totalScore: 0, status: "waiting" as const }
            : c
        ))
      }
    } catch (error) {
      console.error("重置候选人失败:", error)
    }
  }

  const refreshData = () => {
    Promise.all([
      fetch("/api/score").then((res) => res.json()),
      fetch("/api/admin/dimensions").then((res) => res.json()),
      fetch("/api/admin/score-items").then((res) => res.json()),
      fetch("/api/admin/batches").then((res) => res.json()),
    ]).then(([scoreData, dimensionsData, scoreItemsData, batchesData]) => {
      setCandidates(scoreData.candidates)
      setJudges(scoreData.judges)
      setCurrentCandidate(scoreData.currentCandidate)
      setDimensions(dimensionsData.dimensions)
      setScoreItems(scoreItemsData.scoreItems)
      setBatches(batchesData.batches)
    })
  }

  const menuItems = [
    { id: "dashboard", label: "系统概览", icon: Home },
    { id: "preview", label: "大屏预览", icon: Monitor },
    { id: "candidates", label: "候选人管理", icon: Users },
    { id: "judges", label: "评委管理", icon: UserCheck },
    { id: "settings", label: "评分设置", icon: Settings },
    { id: "batches", label: "批次管理", icon: Archive },
    { id: "monitoring", label: "系统监控", icon: Activity },
  ]

  const completedCandidates = candidates.filter((c) => c.status === "completed").length
  const averageScore =
    candidates.length > 0
      ? Math.round((candidates.reduce((sum, c) => sum + c.finalScore, 0) / candidates.length) * 10) / 10
      : 0
  const activeJudges = judges.filter((j) => j.isActive).length

  const handleStageChange = async (stage: "opening" | "questioning" | "scoring") => {
    try {
      // 设置加载状态
      setStageLoading(stage)
      setStageSuccess(null)

      console.log("Switching to stage:", stage)
      const response = await fetch("/api/admin/display/stage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage }),
      })

      if (response.ok) {
        console.log("Stage switched successfully to:", stage)

        // 设置成功状态
        setStageLoading(null)
        setStageSuccess(stage)

        // 2秒后清除成功状态
        setTimeout(() => {
          setStageSuccess(null)
        }, 2000)
      } else {
        console.error("Failed to switch stage:", await response.text())
        setStageLoading(null)
      }
    } catch (error) {
      console.error("切换环节失败:", error)
      setStageLoading(null)
    }
  }

  const handleQuestionChange = async (questionId: string) => {
    try {
      // 设置加载状态
      setQuestionLoading(questionId)
      setQuestionSuccess(null)

      console.log("Switching to question:", questionId)
      const response = await fetch("/api/admin/display/question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId }),
      })

      if (response.ok) {
        console.log("Question switched successfully to:", questionId)

        // 设置成功状态
        setQuestionLoading(null)
        setQuestionSuccess(questionId)

        // 2秒后清除成功状态
        setTimeout(() => {
          setQuestionSuccess(null)
        }, 2000)
      } else {
        console.error("Failed to switch question:", await response.text())
        setQuestionLoading(null)
      }
    } catch (error) {
      console.error("切换题目失败:", error)
      setQuestionLoading(null)
    }
  }

  // 保存面试项目
  const handleSaveInterviewItems = async (items: InterviewItem[]) => {
    try {
      console.log("[Admin] 保存面试项目:", items)

      const response = await fetch("/api/admin/interview-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      })

      if (response.ok) {
        // 立即更新本地状态，确保按order排序
        const sortedItems = items.sort((a, b) => a.order - b.order)
        console.log("[Admin] 立即更新本地状态:", sortedItems)
        setInterviewItems(sortedItems)

        // 同时刷新面试项目数据以确保同步
        try {
          const refreshResponse = await fetch("/api/admin/interview-items")
          if (refreshResponse.ok) {
            const refreshData = await refreshResponse.json()
            const refreshedSortedItems = refreshData.items.sort((a: InterviewItem, b: InterviewItem) => a.order - b.order)
            console.log("[Admin] 刷新后的数据:", refreshedSortedItems)
            setInterviewItems(refreshedSortedItems)
          }
        } catch (refreshError) {
          console.error("刷新面试项目数据失败:", refreshError)
        }

        console.log("面试项目保存成功")
      } else {
        console.error("保存面试项目失败")
      }
    } catch (error) {
      console.error("保存面试项目时出错:", error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* 左侧导航栏 */}
      <div className="w-64 bg-white shadow-sm border-r border-gray-200 flex flex-col">
        {/* 顶部标题 */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <BarChart3 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">评分系统管理平台</h1>
            </div>
          </div>
        </div>

        {/* 导航菜单 */}
        <nav className="flex-1 p-4">
          <div className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                    activeTab === item.id
                      ? "bg-blue-50 text-blue-700 border border-blue-200"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="font-medium">{item.label}</span>
                </button>
              )
            })}
          </div>
        </nav>

        {/* 底部用户信息 */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                <Shield className="h-4 w-4 text-gray-600" />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900">管理员</div>
                <div className="text-xs text-gray-500">系统管理员</div>
              </div>
            </div>
            <Button variant="ghost" size="sm">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* 主内容区域 */}
      <div className="flex-1 flex flex-col">
        {/* 顶部标题栏 */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {menuItems.find((item) => item.id === activeTab)?.label}
              </h2>
              <p className="text-gray-600 mt-1">
                {activeTab === "dashboard" && "系统运行状态和数据概览"}
                {activeTab === "preview" && "实时大屏显示预览"}
                {activeTab === "candidates" && "管理候选人信息和评分状态"}
                {activeTab === "judges" && "管理评委信息和权限设置"}
                {activeTab === "settings" && "配置评分维度和系统参数"}
                {activeTab === "batches" && "管理配置批次，快速切换不同面试设置"}
                {activeTab === "monitoring" && "监控系统运行状态和性能"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="text-green-600 border-green-200">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                系统正常
              </Badge>
              <div className="text-sm text-gray-500" suppressHydrationWarning>{new Date().toLocaleString("zh-CN")}</div>
            </div>
          </div>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 p-6 overflow-auto">
          {activeTab === "dashboard" && (
            <div className="space-y-6">
              {/* 统计卡片 */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">候选人总数</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{candidates.length}</div>
                    <p className="text-xs text-muted-foreground">已完成 {completedCandidates} 人</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">在线评委</CardTitle>
                    <UserCheck className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{activeJudges}</div>
                    <p className="text-xs text-muted-foreground">总共 {judges.length} 位评委</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">平均分数</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{averageScore}</div>
                    <p className="text-xs text-muted-foreground">综合评分平均值</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">当前面试</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{currentCandidate?.name || "无"}</div>
                    <p className="text-xs text-muted-foreground">{currentCandidate?.number || "暂无候选人"}</p>
                  </CardContent>
                </Card>
              </div>

              {/* 当前面试状态 */}
              {currentCandidate && (
                <Card>
                  <CardHeader>
                    <CardTitle>当前面试状态</CardTitle>
                    <CardDescription>实时监控当前候选人的评分进度</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <div className="text-sm text-gray-500">候选人信息</div>
                        <div className="text-lg font-semibold">{currentCandidate.name}</div>
                        <div className="text-sm text-gray-600">
                          {currentCandidate.number} | {currentCandidate.department}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="text-sm text-gray-500">评分进度</div>
                        <div className="text-lg font-semibold">
                          {currentCandidate.scores.length} / {judges.length}
                        </div>
                        <div className="text-sm text-gray-600">
                          {Math.round((currentCandidate.scores.length / judges.length) * 100)}% 完成
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="text-sm text-gray-500">当前总分</div>
                        <div className="text-lg font-semibold text-blue-600">{currentCandidate.totalScore}</div>
                        <div className="text-sm text-gray-600">面试评分</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 快速操作 */}
              <Card>
                <CardHeader>
                  <CardTitle>快速操作</CardTitle>
                  <CardDescription>常用的管理操作和系统功能</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Button
                      onClick={() => setActiveTab("preview")}
                      className="h-20 flex flex-col gap-2"
                      variant="outline"
                    >
                      <Eye className="h-6 w-6" />
                      <span>查看大屏</span>
                    </Button>
                    <Button
                      onClick={() => setActiveTab("candidates")}
                      className="h-20 flex flex-col gap-2"
                      variant="outline"
                    >
                      <Users className="h-6 w-6" />
                      <span>管理候选人</span>
                    </Button>
                    <Button
                      onClick={() => setActiveTab("judges")}
                      className="h-20 flex flex-col gap-2"
                      variant="outline"
                    >
                      <UserCheck className="h-6 w-6" />
                      <span>管理评委</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "preview" && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Monitor className="h-5 w-5" />
                    大屏预览与控制
                  </CardTitle>
                  <CardDescription>控制大屏显示的不同环节，实时切换面试流程</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* 环节切换控制 */}
                    <div className="bg-gray-50 rounded-lg p-6">
                      <h3 className="text-lg font-semibold mb-4">环节控制</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* 开场环节 */}
                        <Button
                          onClick={() => handleStageChange("opening")}
                          variant="outline"
                          disabled={stageLoading === "opening"}
                          className={`h-28 flex flex-col gap-2 transition-all duration-300 transform hover:scale-105 ${
                            displaySession?.currentStage === "opening"
                              ? "bg-blue-100 border-blue-300 shadow-lg ring-2 ring-blue-200"
                              : "bg-blue-50 border-blue-200 hover:bg-blue-100"
                          } ${
                            stageSuccess === "opening"
                              ? "bg-blue-200 border-blue-400 shadow-xl"
                              : ""
                          }`}
                        >
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold transition-all duration-300 ${
                            stageLoading === "opening"
                              ? "bg-blue-400 animate-pulse"
                              : stageSuccess === "opening"
                              ? "bg-green-500 animate-bounce"
                              : displaySession?.currentStage === "opening"
                              ? "bg-blue-600 shadow-lg"
                              : "bg-blue-500"
                          }`}>
                            {stageLoading === "opening" ? (
                              <Loader2 className="h-5 w-5 animate-spin" />
                            ) : stageSuccess === "opening" ? (
                              <CheckCircle className="h-5 w-5" />
                            ) : (
                              <Play className="h-5 w-5" />
                            )}
                          </div>
                          <span className="font-medium">开场环节</span>
                          <span className="text-xs text-gray-500">系统介绍与准备</span>
                          {displaySession?.currentStage === "opening" && (
                            <div className="absolute top-2 right-2">
                              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            </div>
                          )}
                        </Button>

                        {/* 答题环节 */}
                        <Button
                          onClick={() => handleStageChange("questioning")}
                          variant="outline"
                          disabled={stageLoading === "questioning"}
                          className={`h-28 flex flex-col gap-2 transition-all duration-300 transform hover:scale-105 relative ${
                            displaySession?.currentStage === "questioning"
                              ? "bg-green-100 border-green-300 shadow-lg ring-2 ring-green-200"
                              : "bg-green-50 border-green-200 hover:bg-green-100"
                          } ${
                            stageSuccess === "questioning"
                              ? "bg-green-200 border-green-400 shadow-xl"
                              : ""
                          }`}
                        >
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold transition-all duration-300 ${
                            stageLoading === "questioning"
                              ? "bg-green-400 animate-pulse"
                              : stageSuccess === "questioning"
                              ? "bg-green-500 animate-bounce"
                              : displaySession?.currentStage === "questioning"
                              ? "bg-green-600 shadow-lg"
                              : "bg-green-500"
                          }`}>
                            {stageLoading === "questioning" ? (
                              <Loader2 className="h-5 w-5 animate-spin" />
                            ) : stageSuccess === "questioning" ? (
                              <CheckCircle className="h-5 w-5" />
                            ) : (
                              <MessageSquare className="h-5 w-5" />
                            )}
                          </div>
                          <span className="font-medium">答题环节</span>
                          <span className="text-xs text-gray-500">候选人回答问题</span>
                          {displaySession?.currentStage === "questioning" && (
                            <div className="absolute top-2 right-2">
                              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            </div>
                          )}
                        </Button>

                        {/* 评分环节 */}
                        <Button
                          onClick={() => handleStageChange("scoring")}
                          variant="outline"
                          disabled={stageLoading === "scoring"}
                          className={`h-28 flex flex-col gap-2 transition-all duration-300 transform hover:scale-105 relative ${
                            displaySession?.currentStage === "scoring"
                              ? "bg-purple-100 border-purple-300 shadow-lg ring-2 ring-purple-200"
                              : "bg-purple-50 border-purple-200 hover:bg-purple-100"
                          } ${
                            stageSuccess === "scoring"
                              ? "bg-purple-200 border-purple-400 shadow-xl"
                              : ""
                          }`}
                        >
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold transition-all duration-300 ${
                            stageLoading === "scoring"
                              ? "bg-purple-400 animate-pulse"
                              : stageSuccess === "scoring"
                              ? "bg-green-500 animate-bounce"
                              : displaySession?.currentStage === "scoring"
                              ? "bg-purple-600 shadow-lg"
                              : "bg-purple-500"
                          }`}>
                            {stageLoading === "scoring" ? (
                              <Loader2 className="h-5 w-5 animate-spin" />
                            ) : stageSuccess === "scoring" ? (
                              <CheckCircle className="h-5 w-5" />
                            ) : (
                              <Award className="h-5 w-5" />
                            )}
                          </div>
                          <span className="font-medium">评分环节</span>
                          <span className="text-xs text-gray-500">评委进行评分</span>
                          {displaySession?.currentStage === "scoring" && (
                            <div className="absolute top-2 right-2">
                              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            </div>
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* 面试控制（仅在面试环节可用） */}
                    <div className="bg-gray-50 rounded-lg p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-semibold">面试控制</h3>
                          {displaySession?.currentStage !== "questioning" && (
                            <Badge variant="outline" className="text-xs text-gray-500">
                              仅在面试环节可用
                            </Badge>
                          )}
                        </div>
                        <Button
                          onClick={() => setShowItemManager(true)}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg shadow-lg"
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          编辑面试项目
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4">
                        {(() => {
                          const filteredAndSorted = interviewItems
                            .filter((item) => item.isActive)
                            .sort((a, b) => a.order - b.order)
                          console.log("[Admin] 渲染面试控制项目:", filteredAndSorted)
                          return filteredAndSorted
                        })().map((item, index) => (
                            <Button
                              key={item.id}
                              onClick={() => handleQuestionChange(item.id)}
                              variant="outline"
                              disabled={questionLoading === item.id || displaySession?.currentStage !== "questioning"}
                              className={`min-h-[120px] h-auto flex flex-col gap-2 text-left justify-start p-4 transition-all duration-300 transform hover:scale-105 relative ${
                                displaySession?.currentStage !== "questioning"
                                  ? "bg-gray-100 border-gray-200 opacity-50 cursor-not-allowed"
                                  : displaySession?.currentQuestion?.id === item.id
                                  ? "bg-blue-100 border-blue-300 shadow-lg ring-2 ring-blue-200"
                                  : "bg-white border-gray-200 hover:bg-gray-50"
                              } ${
                                questionSuccess === item.id && displaySession?.currentStage === "questioning"
                                  ? "bg-green-100 border-green-300 shadow-xl"
                                  : ""
                              }`}
                            >
                              <div className="flex items-center gap-2 mb-2 w-full">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 flex-shrink-0 ${
                                  displaySession?.currentStage !== "questioning"
                                    ? "bg-gray-200 text-gray-400"
                                    : questionLoading === item.id
                                    ? "bg-blue-400 text-white animate-pulse"
                                    : questionSuccess === item.id
                                    ? "bg-green-500 text-white animate-bounce"
                                    : displaySession?.currentQuestion?.id === item.id
                                    ? "bg-blue-600 text-white shadow-lg"
                                    : item.type === 'interview_stage'
                                    ? "bg-purple-300 text-purple-700"
                                    : "bg-gray-300 text-gray-600"
                                }`}>
                                  {questionLoading === item.id ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : questionSuccess === item.id ? (
                                    <CheckCircle className="h-3 w-3" />
                                  ) : item.type === 'interview_stage' ? (
                                    <Users className="h-3 w-3" />
                                  ) : (
                                    index + 1
                                  )}
                                </div>
                                <span className="font-medium text-sm truncate flex-1">
                                  {item.type === 'interview_stage' ? item.title : `题目 ${index + 1}`}
                                </span>
                                <Badge
                                  variant="outline"
                                  className={`text-xs ml-auto flex-shrink-0 ${
                                    item.type === 'interview_stage'
                                      ? 'border-purple-200 text-purple-600 bg-purple-50'
                                      : 'border-blue-200 text-blue-600 bg-blue-50'
                                  }`}
                                >
                                  {item.timeLimit ? `${Math.floor(item.timeLimit / 60)}分钟` : "无限制"}
                                </Badge>
                              </div>
                              <div className="flex-1 space-y-1">
                                <div className="text-sm text-gray-600 leading-tight" style={{
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden'
                                }}>
                                  {item.type === 'interview_stage' ? item.subtitle || item.title : item.title}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge
                                    variant="secondary"
                                    className={`text-xs ${
                                      item.type === 'interview_stage'
                                        ? 'bg-purple-100 text-purple-700'
                                        : 'bg-blue-100 text-blue-700'
                                    }`}
                                  >
                                    {item.type === 'interview_stage' ? '面试环节' : '题目'}
                                  </Badge>
                                </div>
                              </div>

                              {displaySession?.currentQuestion?.id === item.id && (
                                <div className="absolute top-2 right-2">
                                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                </div>
                              )}
                            </Button>
                          ))}
                      </div>

                      {/* 空状态提示 */}
                      {interviewItems.filter(item => item.isActive).length === 0 && (
                        <div className="text-center py-12">
                          <div className="text-gray-400 mb-4">
                            <MessageSquare className="w-12 h-12 mx-auto mb-2" />
                            <p>暂无面试项目</p>
                            <p className="text-sm">请添加面试环节或题目</p>
                          </div>
                          <Button
                            onClick={() => setShowItemManager(true)}
                            variant="outline"
                            className="text-blue-600 border-blue-200 hover:bg-blue-50"
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            添加面试项目
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* 大屏预览 */}
                    <div className="bg-gray-100 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-medium text-gray-900">大屏显示预览</h3>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-green-600 border-green-200">
                            <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                            实时同步
                          </Badge>
                          <Button
                            onClick={() => window.open("/display", "_blank")}
                            size="sm"
                            variant="outline"
                            className="flex items-center gap-2"
                          >
                            <Eye className="h-4 w-4" />
                            新窗口打开
                          </Button>
                        </div>
                      </div>

                      {/* 当前状态显示 */}
                      <div className="bg-white rounded-lg p-4 mb-4 border">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div className="text-center">
                            <div className="text-sm text-gray-500 mb-1">当前环节</div>
                            <div className="font-medium">
                              {displaySession?.currentStage === "opening" && "开场环节"}
                              {displaySession?.currentStage === "questioning" && "答题环节"}
                              {displaySession?.currentStage === "scoring" && "评分环节"}
                              {!displaySession?.currentStage && "未开始"}
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-sm text-gray-500 mb-1">当前候选人</div>
                            <div className="font-medium">{currentCandidate?.name || "无"}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-sm text-gray-500 mb-1">在线评委</div>
                            <div className="font-medium">{activeJudges} / {judges.length}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-sm text-gray-500 mb-1">当前时间</div>
                            <div className="font-medium">{currentTime.toLocaleTimeString("zh-CN")}</div>
                          </div>
                        </div>
                      </div>

                      {/* 嵌入式大屏预览 */}
                      <div className="bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
                        <iframe
                          src="/display"
                          className="w-full h-full border-0"
                          style={{ transform: 'scale(0.75)', transformOrigin: 'top left', width: '133%', height: '133%' }}
                          title="大屏显示预览"
                        />
                      </div>

                      <div className="mt-4 text-center">
                        <p className="text-sm text-gray-500">
                          实时预览大屏显示内容，支持环节切换和题目控制
                        </p>
                      </div>
                    </div>

                    {/* 成功提示 */}
                    {(stageSuccess || questionSuccess) && (
                      <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-right duration-300">
                        <div className="bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3">
                          <CheckCircle className="h-5 w-5" />
                          <span className="font-medium">
                            {stageSuccess && `已切换到${
                              stageSuccess === "opening" ? "开场环节" :
                              stageSuccess === "questioning" ? "答题环节" :
                              "评分环节"
                            }`}
                            {questionSuccess && "题目切换成功"}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>显示设置</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>自动刷新</span>
                      <Badge variant="outline" className="text-green-600">
                        已启用
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>刷新间隔</span>
                      <span className="text-sm text-gray-600">5秒</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>显示模式</span>
                      <span className="text-sm text-gray-600">全屏</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>访问链接</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="text-sm text-gray-500 mb-1">大屏显示地址</div>
                      <code className="text-sm bg-gray-100 p-2 rounded block break-all">
                        {typeof window !== "undefined" ? `${window.location.origin}/display` : "/display"}
                      </code>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500 mb-1">评委打分地址</div>
                      <code className="text-sm bg-gray-100 p-2 rounded block break-all">
                        {typeof window !== "undefined" ? `${window.location.origin}/judge` : "/judge"}
                      </code>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {activeTab === "candidates" && (
            <CandidateManagement
              candidates={candidates}
              currentCandidate={currentCandidate}
              onRefresh={() => {
                fetch("/api/score")
                  .then((res) => res.json())
                  .then((data) => {
                    setCandidates(data.candidates)
                    setCurrentCandidate(data.currentCandidate)
                  })
              }}
              onSetCurrentCandidate={setCurrentCandidateHandler}
              onResetCandidate={resetCandidateHandler}
            />
          )}

          {activeTab === "judges" && (
            <JudgeManagement
              judges={judges}
              candidates={candidates}
              currentCandidate={currentCandidate}
              dimensions={dimensions}
              scoreItems={scoreItems}
              onRefresh={refreshData}
            />
          )}

          {activeTab === "settings" && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    评分设置
                  </CardTitle>
                  <CardDescription>配置面试维度、成绩项目和系统参数</CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="dimensions" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="dimensions">面试维度</TabsTrigger>
                      <TabsTrigger value="items">成绩项目</TabsTrigger>
                      <TabsTrigger value="system">系统参数</TabsTrigger>
                    </TabsList>
                    <TabsContent value="dimensions" className="mt-6">
                      <InterviewDimensions dimensions={dimensions} onRefresh={refreshData} />
                    </TabsContent>
                    <TabsContent value="items" className="mt-6">
                      <ScoreItems scoreItems={scoreItems} candidates={candidates} onRefresh={refreshData} />
                    </TabsContent>
                    <TabsContent value="system" className="mt-6">
                      <div className="space-y-6">
                        <Card>
                          <CardHeader>
                            <CardTitle>系统参数配置</CardTitle>
                            <CardDescription>配置系统运行的基本参数</CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="space-y-4">
                                <h4 className="font-medium">评分设置</h4>
                                <div className="space-y-3">
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm">评分精度</span>
                                    <span className="text-sm text-gray-600">整数</span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm">最大评分</span>
                                    <span className="text-sm text-gray-600">100分</span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm">评分方式</span>
                                    <span className="text-sm text-gray-600">加权平均</span>
                                  </div>
                                </div>
                              </div>
                              <div className="space-y-4">
                                <h4 className="font-medium">显示设置</h4>
                                <div className="space-y-3">
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm">实时更新</span>
                                    <Badge className="bg-green-100 text-green-800">已启用</Badge>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm">更新频率</span>
                                    <span className="text-sm text-gray-600">5秒</span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm">数据保存</span>
                                    <Badge className="bg-blue-100 text-blue-800">内存存储</Badge>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader>
                            <CardTitle>访问控制</CardTitle>
                            <CardDescription>管理系统访问权限和安全设置</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div>
                                <h4 className="font-medium mb-3">访问地址</h4>
                                <div className="space-y-3">
                                  <div>
                                    <Label className="text-sm text-gray-500">管理后台</Label>
                                    <code className="text-sm bg-gray-100 p-2 rounded block mt-1">
                                      {typeof window !== "undefined" ? `${window.location.origin}/admin` : "/admin"}
                                    </code>
                                  </div>
                                  <div>
                                    <Label className="text-sm text-gray-500">评委打分</Label>
                                    <code className="text-sm bg-gray-100 p-2 rounded block mt-1">
                                      {typeof window !== "undefined" ? `${window.location.origin}/judge` : "/judge"}
                                    </code>
                                  </div>
                                  <div>
                                    <Label className="text-sm text-gray-500">大屏显示</Label>
                                    <code className="text-sm bg-gray-100 p-2 rounded block mt-1">
                                      {typeof window !== "undefined" ? `${window.location.origin}/display` : "/display"}
                                    </code>
                                  </div>
                                </div>
                              </div>
                              <div>
                                <h4 className="font-medium mb-3">安全设置</h4>
                                <div className="space-y-3">
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm">评委密码验证</span>
                                    <Badge className="bg-green-100 text-green-800">已启用</Badge>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm">会话超时</span>
                                    <span className="text-sm text-gray-600">30分钟</span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm">数据加密</span>
                                    <Badge className="bg-blue-100 text-blue-800">传输加密</Badge>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "monitoring" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">系统状态</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">服务状态</span>
                        <Badge className="bg-green-100 text-green-800">正常</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">数据库</span>
                        <Badge className="bg-green-100 text-green-800">连接正常</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">实时同步</span>
                        <Badge className="bg-green-100 text-green-800">运行中</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">性能监控</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">CPU使用率</span>
                        <span className="text-sm font-medium">15%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">内存使用</span>
                        <span className="text-sm font-medium">2.1GB</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">响应时间</span>
                        <span className="text-sm font-medium">120ms</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">用户活动</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">在线评委</span>
                        <span className="text-sm font-medium">{activeJudges}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">活跃连接</span>
                        <span className="text-sm font-medium">{activeJudges + 1}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">今日评分</span>
                        <span className="text-sm font-medium">
                          {candidates.filter((c) => c.scores.length > 0).length}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>系统日志</CardTitle>
                  <CardDescription>最近的系统活动记录</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <div className="flex-1">
                        <div className="text-sm font-medium">系统启动成功</div>
                        <div className="text-xs text-gray-500">{new Date().toLocaleString()}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <div className="flex-1">
                        <div className="text-sm font-medium">评委登录系统</div>
                        <div className="text-xs text-gray-500">2分钟前</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                      <div className="flex-1">
                        <div className="text-sm font-medium">候选人评分更新</div>
                        <div className="text-xs text-gray-500">5分钟前</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          {activeTab === "batches" && (
            <BatchManagement
              batches={batches}
              judges={judges}
              dimensions={dimensions}
              scoreItems={scoreItems}
              onRefresh={refreshData}
            />
          )}
        </div>
      </div>

      {/* 题目/环节管理弹窗 */}
      <InterviewItemManager
        open={showItemManager}
        onOpenChange={setShowItemManager}
        items={interviewItems}
        onSave={handleSaveInterviewItems}
      />
    </div>
  )
}
