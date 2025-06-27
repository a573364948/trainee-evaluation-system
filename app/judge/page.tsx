"use client"

import { useState, useEffect, useCallback, memo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { CheckCircle, ArrowRight, ArrowLeft, User, Award, Clock, Smartphone, Lock, Eye, EyeOff, RotateCcw, Info } from "lucide-react"
import type { Candidate, Judge, InterviewDimension } from "@/types/scoring"

// 简洁的滑块组件
const ScoreSlider = memo(({ value, onValueChange, max, disabled = false }: {
  value: number
  onValueChange: (value: number) => void
  max: number
  disabled?: boolean
}) => {
  return (
    <div className="w-full">
      <Slider
        value={[value]}
        onValueChange={(values) => onValueChange(values[0])}
        max={max}
        min={0}
        step={1}
        disabled={disabled}
        className="w-full"
      />
      <div className="flex justify-between text-xs text-gray-400 mt-2">
        <span>0</span>
        <span>{Math.round(max / 2)}</span>
        <span>{max}</span>
      </div>
    </div>
  )
})

ScoreSlider.displayName = 'ScoreSlider'

export default function JudgeDesign2() {
  // 认证相关状态
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [judges, setJudges] = useState<Judge[]>([])
  const [dimensions, setDimensions] = useState<InterviewDimension[]>([])
  const [currentCandidate, setCurrentCandidate] = useState<Candidate | null>(null)
  const [selectedJudge, setSelectedJudge] = useState<string>("")
  const [judgePassword, setJudgePassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [showLoginDialog, setShowLoginDialog] = useState(true)

  // 评分相关状态
  const [scores, setScores] = useState<Record<string, number>>({})
  const [currentStep, setCurrentStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [viewMode, setViewMode] = useState<'mobile' | 'desktop'>('desktop')
  const [showCelebration, setShowCelebration] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // 获取初始数据（与原版judge页面保持一致）
  useEffect(() => {
    // 获取初始数据
    Promise.all([
      fetch("/api/score").then((res) => res.json()),
      fetch("/api/admin/dimensions").then((res) => res.json()),
    ]).then(([scoreData, dimensionsData]) => {
      console.log("[JudgeDesign2] Initial data loaded:", {
        candidates: scoreData.candidates?.length,
        judges: scoreData.judges?.length,
        currentCandidate: scoreData.currentCandidate?.name,
        dimensions: dimensionsData.dimensions?.filter((d: InterviewDimension) => d.isActive)?.length
      })
      setCandidates(scoreData.candidates)
      setJudges(scoreData.judges)
      setCurrentCandidate(scoreData.currentCandidate)
      setDimensions(dimensionsData.dimensions.filter((d: InterviewDimension) => d.isActive))

      // 初始化评分
      const initialScores: Record<string, number> = {}
      dimensionsData.dimensions
        .filter((d: InterviewDimension) => d.isActive)
        .forEach((dim: InterviewDimension) => {
          initialScores[dim.id] = 0
        })
      setScores(initialScores)
      setIsLoading(false)
    }).catch((error) => {
      console.error("获取初始数据失败:", error)
      setIsLoading(false)
    })
  }, [])

  // SSE连接（认证后启动）
  useEffect(() => {
    if (!isAuthenticated) return

    let eventSource: EventSource | null = null
    let reconnectTimer: NodeJS.Timeout | null = null

    const connectSSE = () => {
      if (eventSource) {
        eventSource.close()
      }

      console.log("[JudgeDesign2] Connecting to SSE...")
      eventSource = new EventSource("/api/events")

      eventSource.onopen = () => {
        console.log("[JudgeDesign2] SSE connection opened")
      }

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data)
        console.log("[JudgeDesign2] Received event:", data.type)

        if (data.type === "heartbeat") {
          return
        }

        if (data.type === "initial") {
          setCandidates(data.data.candidates)
          setJudges(data.data.judges)
          setCurrentCandidate(data.data.currentCandidate)
        } else if (data.type === "candidate_changed") {
          setCurrentCandidate(data.data)
          setHasSubmitted(false)
          setCurrentStep(0)
          // 重置评分
          const resetScores: Record<string, number> = {}
          dimensions.forEach((dim) => {
            resetScores[dim.id] = 0
          })
          setScores(resetScores)
        } else if (data.type === "score_updated") {
          setCandidates((prev) => prev.map((c) => (c.id === data.data.candidate.id ? data.data.candidate : c)))
          if (data.data.score.judgeId === selectedJudge && data.data.candidate.id === currentCandidate?.id) {
            setHasSubmitted(true)
          }
        }
      }

      eventSource.onerror = (error) => {
        console.error("[JudgeDesign2] SSE error:", error)
        eventSource?.close()

        if (!reconnectTimer) {
          reconnectTimer = setTimeout(() => {
            console.log("[JudgeDesign2] Attempting to reconnect SSE...")
            reconnectTimer = null
            connectSSE()
          }, 3000)
        }
      }
    }

    connectSSE()

    return () => {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer)
      }
      if (eventSource) {
        eventSource.close()
      }
    }
  }, [isAuthenticated, selectedJudge, currentCandidate?.id, dimensions])

  // 检查评分状态
  useEffect(() => {
    if (currentCandidate && selectedJudge) {
      const hasScored = currentCandidate.scores.some((s) => s.judgeId === selectedJudge)
      setHasSubmitted(hasScored)

      if (hasScored) {
        const existingScore = currentCandidate.scores.find((s) => s.judgeId === selectedJudge)
        if (existingScore) {
          setScores(existingScore.categories)
        }
      }
    }
  }, [currentCandidate, selectedJudge])

  // 检测屏幕尺寸
  useEffect(() => {
    const checkScreenSize = () => {
      setViewMode(window.innerWidth < 768 ? 'mobile' : 'desktop')
    }
    checkScreenSize()
    window.addEventListener('resize', checkScreenSize)
    return () => window.removeEventListener('resize', checkScreenSize)
  }, [])

  // 登录验证
  const handleLogin = async () => {
    if (!selectedJudge || !judgePassword) {
      alert("请选择评委并输入密码")
      return
    }

    try {
      const response = await fetch("/api/admin/judges")
      const data = await response.json()

      if (response.ok) {
        const judge = data.judges.find(
          (j: Judge) => j.id === selectedJudge && j.password === judgePassword
        )

        if (judge) {
          if (!judge.isActive) {
            alert("您的账户已被禁用，请联系管理员")
            return
          }

          setIsAuthenticated(true)
          setShowLoginDialog(false)
        } else {
          alert("密码错误，请重试")
        }
      } else {
        alert("验证失败，请重试")
      }
    } catch (error) {
      console.error("登录验证失败:", error)
      alert("验证失败，请重试")
    }
  }

  // 计算当前维度和分数
  const currentDimension = dimensions[currentStep]
  const totalScore = Object.values(scores).reduce((sum, score) => sum + score, 0)
  const weightedScore = dimensions.reduce((sum, dim) => sum + (scores[dim.id] || 0) * (dim.weight / 100), 0)
  const isLastStep = currentStep === dimensions.length - 1
  const isFirstStep = currentStep === 0
  const currentJudge = judges.find((j) => j.id === selectedJudge)

  // 评分处理
  const handleScoreChange = useCallback((score: number) => {
    if (currentDimension && !hasSubmitted) {
      setScores(prev => ({ ...prev, [currentDimension.id]: score }))
    }
  }, [currentDimension, hasSubmitted])

  // 快速评分按钮处理
  const handleQuickScore = useCallback((score: number) => {
    handleScoreChange(score)
    // 高分庆祝动画
    if (score >= (currentDimension?.maxScore || 25) * 0.9) {
      setShowCelebration(true)
      setTimeout(() => setShowCelebration(false), 1000)
    }
  }, [handleScoreChange, currentDimension])

  // 提交评分
  const handleSubmit = async () => {
    if (!currentCandidate || !selectedJudge) return

    setIsSubmitting(true)
    try {
      const response = await fetch("/api/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateId: currentCandidate.id,
          judgeId: selectedJudge,
          categories: scores,
        }),
      })

      if (response.ok) {
        setHasSubmitted(true)
      }
    } catch (error) {
      console.error("提交评分失败:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // 重置评分
  const handleReset = () => {
    if (hasSubmitted) return
    const resetScores: Record<string, number> = {}
    dimensions.forEach((dim) => {
      resetScores[dim.id] = 0
    })
    setScores(resetScores)
    setCurrentStep(0)
  }

  // 导航
  const nextStep = () => {
    if (currentStep < dimensions.length - 1) {
      setCurrentStep(prev => prev + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const getStepStatus = (index: number) => {
    if (index < currentStep) return "completed"
    if (index === currentStep) return "current"
    return "pending"
  }


  // 加载状态
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">正在加载评分系统...</p>
        </div>
      </div>
    )
  }

  // 登录界面
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
        <Dialog open={showLoginDialog} onOpenChange={() => {}}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-blue-600" />
                评委身份验证
              </DialogTitle>
              <DialogDescription>请选择您的身份并输入对应的密码</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="judge-select">选择评委身份</Label>
                <select
                  id="judge-select"
                  value={selectedJudge}
                  onChange={(e) => setSelectedJudge(e.target.value)}
                  className="w-full mt-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">请选择评委</option>
                  {judges.length > 0 ? judges.map((judge) => (
                    <option key={judge.id} value={judge.id}>
                      {judge.name}
                    </option>
                  )) : (
                    <option value="" disabled>加载中...</option>
                  )}
                </select>
              </div>
              <div>
                <Label htmlFor="password">评委密码</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={judgePassword}
                    onChange={(e) => setJudgePassword(e.target.value)}
                    placeholder="请输入您的专属密码"
                    className="pr-10 h-12"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <Button onClick={handleLogin} disabled={!selectedJudge || !judgePassword} className="w-full h-12 text-lg">
                登录评分系统
              </Button>
              <div className="text-xs text-gray-500 space-y-1 bg-blue-50 p-3 rounded-lg">
                <p className="font-medium text-blue-700">💡 测试密码提示：</p>
                <p>所有评委的默认密码都是：<span className="font-mono bg-white px-1 rounded">123456</span></p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  // 移动端布局
  const MobileLayout = () => (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-3">
      <div className="max-w-md mx-auto space-y-4">
        {/* 移动端顶部信息 */}
        <Card className="hover:shadow-lg transition-shadow duration-200 border-0 shadow-md">
          <CardContent className="p-4">
            <div className="text-center space-y-3">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-2xl mx-auto shadow-lg">
                {currentCandidate?.name?.charAt(0) || "?"}
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{currentCandidate?.name || "等待中..."}</h1>
                <p className="text-gray-600 text-sm">{currentCandidate?.number} • {currentCandidate?.department}</p>
              </div>
              <div className="flex justify-center gap-6 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-600">
                    {weightedScore.toFixed(1)}
                  </div>
                  <div className="text-xs text-gray-500">总分</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">{currentStep + 1}/{dimensions.length}</div>
                  <div className="text-xs text-gray-500">进度</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 移动端步骤指示器 */}
        <Card className="hover:shadow-md transition-shadow duration-200 border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="relative">
                <Progress
                  value={((currentStep + 1) / dimensions.length) * 100}
                  className="h-3 transition-all duration-300"
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>第 {currentStep + 1} 项</span>
                <span className="font-medium text-blue-600">
                  {Math.round(((currentStep + 1) / dimensions.length) * 100)}% 完成
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 移动端当前评分维度 */}
        {currentCandidate && currentDimension ? (
          <Card className="hover:shadow-xl transition-all duration-300 border-0 shadow-lg">
            <CardHeader className="pb-3">
              <div className="text-center">
                <CardTitle className="text-xl text-gray-900">
                  {currentDimension.name}
                </CardTitle>
                <p className="text-gray-600 text-sm mt-1">
                  {currentDimension.description}
                </p>
                <Badge variant="secondary" className="mt-2">
                  权重 {currentDimension.weight}%
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 移动端分数显示 */}
              <div className="text-center bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6 relative overflow-hidden">
                {showCelebration && (
                  <div className="absolute inset-0 bg-gradient-to-r from-yellow-200 via-pink-200 to-purple-200 opacity-30 rounded-xl"></div>
                )}
                <div className="text-5xl font-bold mb-2 relative z-10 text-blue-600">
                  {scores[currentDimension.id] || 0}
                </div>
                <div className="text-gray-500 relative z-10">/ {currentDimension.maxScore} 分</div>
                {showCelebration && (
                  <div className="absolute top-2 right-2 text-2xl">🎉</div>
                )}
              </div>

              {/* 移动端快速评分按钮 */}
              <div className="grid grid-cols-2 gap-3">
                {[0.2, 0.4, 0.6, 0.8, 1.0].map((ratio, index) => {
                  const score = Math.round(currentDimension.maxScore * ratio)
                  const labels = ["不及格", "较差", "中等", "良好", "优秀"]
                  const colors = [
                    "bg-red-100 text-red-700 border-red-200",
                    "bg-orange-100 text-orange-700 border-orange-200",
                    "bg-yellow-100 text-yellow-700 border-yellow-200",
                    "bg-blue-100 text-blue-700 border-blue-200",
                    "bg-green-100 text-green-700 border-green-200"
                  ]
                  const isSelected = scores[currentDimension.id] === score

                  return (
                    <Button
                      key={index}
                      variant={isSelected ? "default" : "outline"}
                      disabled={hasSubmitted}
                      className={`h-16 flex flex-col transition-all duration-200 transform hover:scale-105 active:scale-95 ${
                        isSelected
                          ? 'bg-blue-600 text-white border-blue-600 shadow-lg'
                          : `${colors[index]} hover:shadow-md`
                      } ${index === 2 ? 'col-span-2' : ''}`}
                      onClick={() => handleQuickScore(score)}
                    >
                      <div className="font-bold text-lg">{score}</div>
                      <div className="text-xs">{labels[index]}</div>
                      {isSelected && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full"></div>
                      )}
                    </Button>
                  )
                })}
              </div>

              {/* 移动端精确调节滑块 */}
              <div className="space-y-4">
                <div className="text-sm text-gray-600 text-center">精确调节 - 拖动滑块选择分数</div>
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <ScoreSlider
                    value={scores[currentDimension.id] || 0}
                    onValueChange={handleScoreChange}
                    max={currentDimension.maxScore}
                    disabled={hasSubmitted}
                  />
                </div>
              </div>

              {/* 移动端导航按钮 */}
              <div className="grid grid-cols-2 gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={prevStep}
                  disabled={isFirstStep}
                  className="h-12 flex items-center justify-center gap-2 transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 group"
                >
                  <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                  上一项
                </Button>

                {isLastStep ? (
                  <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting || hasSubmitted}
                    className="h-12 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg"
                  >
                    <Award className={`h-4 w-4 ${isSubmitting ? 'animate-spin' : ''}`} />
                    {hasSubmitted ? "已提交" : isSubmitting ? "提交中..." : "完成"}
                  </Button>
                ) : (
                  <Button
                    onClick={nextStep}
                    className="h-12 flex items-center justify-center gap-2 transition-all duration-200 hover:scale-105 active:scale-95 group"
                  >
                    下一项
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Button>
                )}
              </div>

              {/* 评分状态 */}
              {hasSubmitted && (
                <div className="flex items-center justify-center gap-2 p-4 bg-green-50 rounded-lg border border-green-200">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="text-green-700 font-medium">评分已提交</span>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <Clock className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-500 mb-2">暂无候选人面试</h3>
              <p className="text-gray-400">等待管理员安排候选人...</p>
            </CardContent>
          </Card>
        )}

        {/* 移动端评分总览 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-center">评分总览</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-2">
              {dimensions.map((dimension, index) => (
                <div key={dimension.id} className={`flex justify-between items-center p-2 rounded ${
                  index === currentStep ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'
                }`}>
                  <span className="text-sm font-medium">{dimension.name}</span>
                  <span className="text-sm font-bold text-blue-600">
                    {scores[dimension.id] || 0}/{dimension.maxScore}
                  </span>
                </div>
              ))}
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="font-medium">加权总分</span>
                  <span className="text-xl font-bold text-blue-600">{weightedScore.toFixed(1)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )

  // 桌面端布局
  const DesktopLayout = () => (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* 桌面端顶部候选人信息 */}
        <Card className="mb-6 hover:shadow-xl transition-shadow duration-200 border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg">
                  {currentCandidate?.name?.charAt(0) || "?"}
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{currentCandidate?.name || "等待中..."}</h1>
                  <p className="text-gray-600">{currentCandidate?.number} • {currentCandidate?.department}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <User className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-500">评委：{currentJudge?.name}</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-blue-600">
                  {weightedScore.toFixed(1)}
                </div>
                <div className="text-sm text-gray-500">当前总分</div>
                <div className="text-xs text-gray-400 mt-1">
                  原始分：{totalScore}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 桌面端步骤指示器 */}
        <Card className="mb-6 hover:shadow-lg transition-shadow duration-200 border-0 shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              {dimensions.map((dimension, index) => (
                <div key={dimension.id} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                      getStepStatus(index) === "completed"
                        ? "bg-green-500 border-green-500 text-white shadow-lg"
                        : getStepStatus(index) === "current"
                        ? "bg-blue-500 border-blue-500 text-white shadow-lg"
                        : "bg-white border-gray-300 text-gray-400 hover:border-blue-300"
                    }`}>
                      {getStepStatus(index) === "completed" ? (
                        <CheckCircle className="h-5 w-5" />
                      ) : (
                        <span className="text-sm font-medium">{index + 1}</span>
                      )}
                    </div>
                    <div className="mt-2 text-center">
                      <div className={`text-sm font-medium transition-colors duration-200 ${
                        getStepStatus(index) === "current" ? "text-blue-600" : "text-gray-600"
                      }`}>
                        {dimension.name}
                      </div>
                      <div className="text-xs text-gray-400">
                        {scores[dimension.id] || 0}/{dimension.maxScore}
                      </div>
                    </div>
                  </div>
                  {index < dimensions.length - 1 && (
                    <div className={`w-16 h-0.5 mx-4 transition-all duration-300 ${
                      getStepStatus(index) === "completed" ? "bg-green-500" : "bg-gray-300"
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 桌面端当前评分维度 */}
        {currentCandidate && currentDimension ? (
          <Card className="mb-6 hover:shadow-xl transition-all duration-300 border-0 shadow-lg">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-2xl text-gray-900">
                    {currentDimension.name}
                  </CardTitle>
                  <p className="text-gray-600 mt-2">
                    {currentDimension.description}
                  </p>
                </div>
                <Badge variant="secondary" className="text-lg px-3 py-1">
                  权重 {currentDimension.weight}%
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* 分数选择区域 */}
              <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl p-8 relative overflow-hidden">
                {showCelebration && (
                  <div className="absolute inset-0 bg-gradient-to-r from-yellow-200 via-pink-200 to-purple-200 opacity-30 rounded-xl"></div>
                )}
                <div className="text-center mb-6 relative z-10">
                  <div className="text-6xl font-bold mb-2 text-blue-600">
                    {scores[currentDimension.id] || 0}
                  </div>
                  <div className="text-gray-500">/ {currentDimension.maxScore} 分</div>
                  {showCelebration && (
                    <div className="absolute top-0 right-8 text-3xl">🎉</div>
                  )}
                </div>

                <div className="space-y-6">
                  {/* 桌面端精确调节滑块 */}
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="text-sm text-gray-600 mb-4">精确调节 - 拖动滑块或点击轨道选择分数</div>
                      <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
                        <ScoreSlider
                          value={scores[currentDimension.id] || 0}
                          onValueChange={handleScoreChange}
                          max={currentDimension.maxScore}
                          disabled={hasSubmitted}
                        />
                      </div>
                    </div>
                  </div>

                  {/* 快速选择按钮 */}
                  <div className="grid grid-cols-5 gap-3">
                    {[0.2, 0.4, 0.6, 0.8, 1.0].map((ratio, index) => {
                      const score = Math.round(currentDimension.maxScore * ratio)
                      const labels = ["不及格", "较差", "中等", "良好", "优秀"]
                      const colors = ["bg-red-100 text-red-700", "bg-orange-100 text-orange-700", "bg-yellow-100 text-yellow-700", "bg-blue-100 text-blue-700", "bg-green-100 text-green-700"]
                      const isSelected = scores[currentDimension.id] === score

                      return (
                        <Button
                          key={index}
                          variant={isSelected ? "default" : "outline"}
                          disabled={hasSubmitted}
                          className={`h-16 flex flex-col transition-all duration-200 transform hover:scale-105 active:scale-95 relative ${
                            isSelected
                              ? 'bg-blue-600 text-white border-blue-600 shadow-lg'
                              : `${colors[index]} border-0 hover:shadow-md`
                          }`}
                          onClick={() => handleQuickScore(score)}
                        >
                          <div className="font-bold">{score}</div>
                          <div className="text-xs">{labels[index]}</div>
                          {isSelected && (
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full"></div>
                          )}
                        </Button>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* 导航按钮 */}
              <div className="flex justify-between items-center">
                <Button
                  variant="outline"
                  onClick={prevStep}
                  disabled={isFirstStep}
                  className="flex items-center gap-2 transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                  上一项
                </Button>

                <div className="text-sm text-gray-500 flex items-center gap-4">
                  <span>第 {currentStep + 1} 项，共 {dimensions.length} 项</span>
                  {hasSubmitted && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-green-50 rounded-lg border border-green-200">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-green-700 font-medium text-xs">已提交</span>
                    </div>
                  )}
                </div>

                {isLastStep ? (
                  <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting || hasSubmitted}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 transition-all duration-200 hover:scale-105 shadow-lg hover:shadow-xl"
                  >
                    <Award className={`h-4 w-4 ${isSubmitting ? 'animate-spin' : ''}`} />
                    {hasSubmitted ? "已提交" : isSubmitting ? "提交中..." : "完成评分"}
                  </Button>
                ) : (
                  <Button
                    onClick={nextStep}
                    className="flex items-center gap-2 transition-all duration-200 hover:scale-105 group"
                  >
                    下一项
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Button>
                )}
              </div>

              {/* 重置按钮 */}
              {!hasSubmitted && (
                <div className="flex justify-center">
                  <Button onClick={handleReset} variant="outline" className="px-6 py-2">
                    <RotateCcw className="h-4 w-4 mr-2" />
                    重置所有评分
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="mb-6">
            <CardContent className="p-16 text-center">
              <Clock className="h-24 w-24 text-gray-300 mx-auto mb-6" />
              <h3 className="text-2xl font-medium text-gray-500 mb-4">暂无候选人面试</h3>
              <p className="text-gray-400">等待管理员安排候选人...</p>
            </CardContent>
          </Card>
        )}

        {/* 桌面端评分总览 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              评分总览
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {dimensions.map((dimension) => (
                <div key={dimension.id} className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="font-medium text-gray-900">{dimension.name}</div>
                  <div className="text-2xl font-bold text-blue-600 my-1">
                    {scores[dimension.id] || 0}
                  </div>
                  <div className="text-xs text-gray-500">
                    权重 {dimension.weight}% • 满分 {dimension.maxScore}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="text-center">
                <div className="text-lg font-medium text-gray-700 mb-2">总分 (加权计算)</div>
                <div className="text-4xl font-bold text-blue-600">{weightedScore.toFixed(1)}</div>
                <div className="text-sm text-gray-500 mt-1">原始总分: {totalScore} 分</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )

  return (
    <div className="relative">
      {/* 智能视图切换按钮 */}
      <div className="fixed top-4 right-4 z-50">
        <div className="flex flex-col gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode(viewMode === 'mobile' ? 'desktop' : 'mobile')}
            className={`flex items-center gap-2 shadow-lg transition-all duration-200 hover:scale-110 active:scale-95 backdrop-blur-sm ${
              viewMode === 'mobile'
                ? 'bg-green-50/90 text-green-700 border-green-200 hover:bg-green-100/90'
                : 'bg-blue-50/90 text-blue-700 border-blue-200 hover:bg-blue-100/90'
            }`}
          >
            <Smartphone className={`h-4 w-4 transition-transform duration-200 ${
              viewMode === 'mobile' ? 'rotate-0' : 'rotate-90'
            }`} />
            {viewMode === 'mobile' ? '桌面版' : '移动版'}
          </Button>

          {/* 当前模式指示 */}
          <div className="text-xs text-center text-gray-500 bg-white/80 backdrop-blur-sm rounded px-2 py-1">
            {viewMode === 'mobile' ? '📱 移动模式' : '🖥️ 桌面模式'}
          </div>
        </div>
      </div>

      {/* 根据视图模式渲染不同布局 */}
      {viewMode === 'mobile' ? <MobileLayout /> : <DesktopLayout />}
    </div>
  )
}