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
import { CheckCircle, ArrowRight, ArrowLeft, User, Award, Clock, Smartphone, Lock, Eye, EyeOff, RotateCcw, Info, Wifi, WifiOff, LogOut } from "lucide-react"
import type { Candidate, Judge, InterviewDimension, ScoringEvent } from "@/types/scoring"
import { useWebSocket } from "@/hooks/useWebSocket"

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

// 优化的评分滑块组件 - 用于网格布局
const OptimizedScoreSlider = memo(({
  dimension,
  value,
  onValueChange,
  disabled = false,
  isActive = false
}: {
  dimension: InterviewDimension
  value: number
  onValueChange: (value: number) => void
  disabled?: boolean
  isActive?: boolean
}) => {
  return (
    <div className={`bg-white rounded-lg border-2 p-4 hover:shadow-md transition-all duration-200 ${
      isActive ? 'border-blue-500 shadow-lg' : 'border-gray-200'
    }`}>
      <div className="flex justify-between items-center mb-3">
        <div>
          <h3 className={`font-semibold ${isActive ? 'text-blue-900' : 'text-gray-900'}`}>
            {dimension.name}
          </h3>
          <p className="text-xs text-gray-500 mt-1">{dimension.description}</p>
        </div>
        <div className="text-right">
          <div className={`text-2xl font-bold ${isActive ? 'text-blue-600' : 'text-gray-700'}`}>
            {value}
          </div>
          <div className="text-xs text-gray-500">/ {dimension.maxScore}</div>
        </div>
      </div>

      <Slider
        value={[value]}
        onValueChange={(values) => onValueChange(values[0])}
        max={dimension.maxScore}
        min={0}
        step={1}
        disabled={disabled}
        className="w-full mb-2"
      />

      <div className="flex justify-between text-xs text-gray-400">
        <span>0</span>
        <span>{Math.round(dimension.maxScore / 2)}</span>
        <span>{dimension.maxScore}</span>
      </div>

      {/* 快速选择按钮 - 4个档位 */}
      <div className="grid grid-cols-4 gap-1 mt-3">
        {[0.25, 0.5, 0.75, 1.0].map((ratio, index) => {
          const score = Math.round(dimension.maxScore * ratio)
          const labels = ["差", "中", "良", "优"]
          const colors = ["bg-red-100 text-red-700", "bg-yellow-100 text-yellow-700", "bg-blue-100 text-blue-700", "bg-green-100 text-green-700"]
          const isSelected = value === score

          return (
            <Button
              key={index}
              variant={isSelected ? "default" : "outline"}
              size="sm"
              className={`h-8 text-xs transition-all duration-200 ${
                isSelected
                  ? 'bg-blue-600 text-white border-blue-600'
                  : `${colors[index]} border-0 hover:shadow-sm`
              }`}
              onClick={() => onValueChange(score)}
              disabled={disabled}
            >
              {labels[index]}
            </Button>
          )
        })}
      </div>

      {value > 0 && (
        <div className="mt-2 flex justify-center">
          <CheckCircle className="h-4 w-4 text-green-500" />
        </div>
      )}
    </div>
  )
})

OptimizedScoreSlider.displayName = 'OptimizedScoreSlider'

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
  const [currentJudgeInfo, setCurrentJudgeInfo] = useState<any>(null)

  // WebSocket连接（认证后启动）
  const { isConnected, sendEvent, onScoringEvent } = useWebSocket({
    clientType: 'judge',
    judgeId: selectedJudge,
    autoConnect: isAuthenticated
  })

  // 评分相关状态
  const [scores, setScores] = useState<Record<string, number>>({})
  const [currentStep, setCurrentStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [viewMode, setViewMode] = useState<'mobile' | 'desktop'>('desktop')
  const [showCelebration, setShowCelebration] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // 获取初始数据（与原版judge页面保持一致）
  // 检查本地存储的登录状态
  useEffect(() => {
    const savedJudge = localStorage.getItem("currentJudge")
    if (savedJudge) {
      try {
        const judgeInfo = JSON.parse(savedJudge)
        setCurrentJudgeInfo(judgeInfo)
        setSelectedJudge(judgeInfo.id)
        setIsAuthenticated(true)
        setShowLoginDialog(false)
        console.log("[Judge] Restored login state for:", judgeInfo.name)
      } catch (error) {
        console.error("[Judge] Failed to restore login state:", error)
        localStorage.removeItem("currentJudge")
      }
    }
  }, [])

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
      // 只显示启用的评委
      setJudges(scoreData.judges.filter((j: Judge) => j.isActive))
      setCurrentCandidate(scoreData.currentCandidate)
      setDimensions(dimensionsData.dimensions.filter((d: InterviewDimension) => d.isActive))

      // 初始化评分（仅在首次加载时）
      if (!isAuthenticated) {
        const initialScores: Record<string, number> = {}
        dimensionsData.dimensions
          .filter((d: InterviewDimension) => d.isActive)
          .forEach((dim: InterviewDimension) => {
            initialScores[dim.id] = 0
          })
        setScores(initialScores)
        console.log("[Judge] Initialized empty scores for first load")
      }
      setIsLoading(false)
    }).catch((error) => {
      console.error("获取初始数据失败:", error)
      setIsLoading(false)
    })
  }, [])

  // WebSocket事件处理（认证后启动）
  useEffect(() => {
    if (isConnected && isAuthenticated) {
      onScoringEvent((event: ScoringEvent) => {
        console.log("[JudgeDesign2] Received WebSocket event:", event.type)

        switch (event.type) {
          case "candidate_changed":
            setCurrentCandidate(event.data)
            setHasSubmitted(false)
            setCurrentStep(0)
            // 重置评分
            const resetScores: Record<string, number> = {}
            dimensions.forEach((dim) => {
              resetScores[dim.id] = 0
            })
            setScores(resetScores)
            break

          case "score_updated":
            setCandidates((prev) => prev.map((c) => (c.id === event.data.candidate.id ? event.data.candidate : c)))
            if (event.data.score?.judgeId === selectedJudge && event.data.candidate.id === currentCandidate?.id) {
              setHasSubmitted(true)
            }
            break

          case "judge_changed":
            setJudges(prev => prev.map(j => j.id === event.data.id ? event.data : j))
            break

          case "dimension_changed":
            const activeDimensions = event.data.dimensions.filter((d: InterviewDimension) => d.isActive)
            setDimensions(activeDimensions)
            // 重新初始化评分
            const newScores: Record<string, number> = {}
            activeDimensions.forEach((dim: InterviewDimension) => {
              newScores[dim.id] = scores[dim.id] || 0
            })
            setScores(newScores)
            break

          case "scoring_reset":
            // 管理员重置评分
            setScores({})
            setHasSubmitted(false)
            setCurrentStep(0)
            break

          default:
            console.log("[JudgeDesign2] Unhandled WebSocket event type:", event.type)
        }
      })
    }
  }, [isConnected, isAuthenticated, onScoringEvent, selectedJudge, currentCandidate?.id, dimensions, scores])

  // 检查评分状态
  useEffect(() => {
    if (currentCandidate && selectedJudge) {
      console.log("[Judge] Checking scoring status for:", {
        candidate: currentCandidate.name,
        judgeId: selectedJudge,
        existingScores: currentCandidate.scores.length
      })

      const hasScored = currentCandidate.scores.some((s) => s.judgeId === selectedJudge)
      setHasSubmitted(hasScored)

      if (hasScored) {
        const existingScore = currentCandidate.scores.find((s) => s.judgeId === selectedJudge)
        if (existingScore) {
          console.log("[Judge] Found existing scores for judge:", existingScore.categories)
          setScores(existingScore.categories)
        }
      } else {
        console.log("[Judge] No existing scores found, resetting to empty")
        // 如果没有评过分，确保清空评分状态
        setScores({})
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
      const response = await fetch("/api/judge/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          judgeId: selectedJudge,
          password: judgePassword
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          // 保存登录状态到本地存储
          localStorage.setItem("currentJudge", JSON.stringify(data.judge))
          setCurrentJudgeInfo(data.judge)
          setIsAuthenticated(true)
          setShowLoginDialog(false)
          console.log("[JudgeDesign2] Authentication successful for judge:", data.judge.name)

          // 清理之前的评分状态，准备重新检查
          setScores({})
          setHasSubmitted(false)
          setCurrentStep(0)
          setIsSubmitting(false)
          console.log("[JudgeDesign2] Cleared scoring states for new judge")

          // 通知后台评委已上线（仅更新在线状态，不影响启用状态）
          try {
            console.log("[Judge] Updating online status for judge:", selectedJudge)
            await fetch(`/api/admin/judges/${selectedJudge}/status`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ isOnline: true })
            })
          } catch (error) {
            console.error("Failed to update online status:", error)
          }
        } else {
          alert(data.error || "认证失败")
        }
      } else {
        const errorText = await response.text()
        alert(errorText || "认证失败，请重试")
      }
    } catch (error) {
      console.error("登录验证失败:", error)
      alert("验证失败，请重试")
    }
  }

  // 重新登录
  const handleReLogin = () => {
    console.log("[Judge] Re-login initiated, clearing all states")

    // 清理登录状态
    localStorage.removeItem("currentJudge")
    setCurrentJudgeInfo(null)
    setIsAuthenticated(false)
    setShowLoginDialog(true)
    setSelectedJudge("")
    setJudgePassword("")

    // 清理评分状态
    setScores({})
    setHasSubmitted(false)
    setCurrentStep(0)
    setIsSubmitting(false)
    setShowCelebration(false)

    console.log("[Judge] All states cleared for re-login")
  }

  // 计算当前维度和分数
  const currentDimension = dimensions[currentStep]
  const totalScore = Object.values(scores).reduce((sum, score) => sum + score, 0)
  const isLastStep = currentStep === dimensions.length - 1
  const isFirstStep = currentStep === 0
  const currentJudge = judges.find((j) => j.id === selectedJudge)

  // 评分处理 - 支持指定维度ID
  const handleScoreChange = useCallback((score: number, dimensionId?: string) => {
    const targetDimensionId = dimensionId || currentDimension?.id
    if (targetDimensionId) {
      setScores(prev => ({ ...prev, [targetDimensionId]: score }))
      // 如果已经提交过，修改分数后重置提交状态
      if (hasSubmitted) {
        setHasSubmitted(false)
      }
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
      // 转换评分数据格式
      const scoreData = dimensions.map(dim => ({
        dimensionId: dim.id,
        score: scores[dim.id] || 0
      }))

      const response = await fetch("/api/judge/submit-scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateId: currentCandidate.id,
          judgeId: selectedJudge,
          scores: scoreData
        }),
      })

      if (response.ok) {
        const result = await response.json()
        setHasSubmitted(true)

        // 通过WebSocket广播评分更新事件
        sendEvent('score_updated', {
          candidate: result.candidate,
          judge: result.judge,
          scores: result.scores
        })

        console.log("[JudgeDesign2] Scores submitted successfully")
      } else {
        const errorText = await response.text()
        console.error("提交评分失败:", errorText)
        alert("提交评分失败，请重试")
      }
    } catch (error) {
      console.error("提交评分失败:", error)
      alert("提交评分失败，请重试")
    } finally {
      setIsSubmitting(false)
    }
  }

  // 重置评分
  const handleReset = () => {
    const resetScores: Record<string, number> = {}
    dimensions.forEach((dim) => {
      resetScores[dim.id] = 0
    })
    setScores(resetScores)
    setCurrentStep(0)
    setHasSubmitted(false)
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
            <div className="relative">
              {/* 右上角重新登录按钮 */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReLogin}
                className="absolute top-0 right-0 flex items-center gap-1 text-xs text-gray-500"
              >
                <LogOut className="h-3 w-3" />
                重新登录
              </Button>

              <div className="text-center space-y-3">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-2xl mx-auto shadow-lg">
                  {currentCandidate?.name?.charAt(0) || "?"}
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">{currentCandidate?.name || "等待中..."}</h1>
                  <p className="text-gray-600 text-sm">{currentCandidate?.number} • {currentCandidate?.department}</p>
                </div>
              </div>

              <div className="flex justify-center gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-600">
                    {totalScore}
                  </div>
                  <div className="text-xs text-gray-500">总分</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">{currentStep + 1}/{dimensions.length}</div>
                  <div className="text-xs text-gray-500">进度</div>
                </div>
                <div>
                  <div className="flex items-center justify-center">
                    {isConnected ? (
                      <Wifi className="h-5 w-5 text-green-500" />
                    ) : (
                      <WifiOff className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                  <div className="text-xs text-gray-500">
                    {isConnected ? "已连接" : "断开"}
                  </div>
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
                  满分 {currentDimension.maxScore}分
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
                    disabled={isSubmitting}
                    className="h-12 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg"
                  >
                    <Award className={`h-4 w-4 ${isSubmitting ? 'animate-spin' : ''}`} />
                    {hasSubmitted ? "重新提交" : isSubmitting ? "提交中..." : "完成"}
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
                <div className="flex items-center justify-center gap-2 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <CheckCircle className="h-5 w-5 text-blue-600" />
                  <span className="text-blue-700 font-medium">评分已提交，可修改后重新提交</span>
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
                  <span className="font-medium">总分</span>
                  <span className="text-xl font-bold text-blue-600">{totalScore}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )

  // 桌面端布局 - 使用优化样板
  const DesktopLayout = () => (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 候选人信息卡片 - 突出显示 */}
        <Card className="shadow-xl border-0 bg-gradient-to-r from-blue-500 to-purple-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              {/* 候选人主要信息 */}
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white font-bold text-2xl shadow-lg border-2 border-white/30">
                  {currentCandidate?.name?.charAt(0) || "?"}
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white mb-2">
                    {currentCandidate?.name || "等待候选人..."}
                  </h1>
                  <div className="flex items-center gap-4 text-blue-100">
                    <span className="text-lg">工号：{currentCandidate?.number || "---"}</span>
                    <span className="text-lg">部门：{currentCandidate?.department || "---"}</span>
                  </div>
                </div>
              </div>

              {/* 评分状态 */}
              <div className="text-right">
                <div className="text-4xl font-bold text-white mb-1">{totalScore}</div>
                <div className="text-blue-100 text-lg">当前总分</div>
                <div className="mt-2">
                  <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                    进度：{currentStep + 1}/{dimensions.length}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 系统状态栏 - 简化设计 */}
        <Card className="shadow-md border-0">
          <CardContent className="p-3">
            <div className="flex justify-between items-center text-sm">
              {/* 评委信息 */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">评委：{currentJudge?.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  {isConnected ? (
                    <Wifi className="h-4 w-4 text-green-500" />
                  ) : (
                    <WifiOff className="h-4 w-4 text-red-500" />
                  )}
                  <span className="text-gray-500">
                    {isConnected ? "系统已连接" : "连接断开"}
                  </span>
                </div>
              </div>

              {/* 操作按钮 */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleReLogin}
                className="flex items-center gap-1"
              >
                <LogOut className="h-3 w-3" />
                重新登录
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 主要评分区域 - 网格布局 */}
        {currentCandidate ? (
          <Card className="shadow-lg border-0">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  面试评分
                </span>
                <div className="flex items-center gap-2">
                  <Badge variant={hasSubmitted ? "default" : "secondary"}>
                    {hasSubmitted ? "已提交" : "进行中"}
                  </Badge>
                  {hasSubmitted && (
                    <span className="text-sm text-green-600">可继续修改</span>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {/* 评分网格 */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
                {dimensions.map((dimension, index) => (
                  <div
                    key={dimension.id}
                    onClick={() => setCurrentStep(index)}
                    className="cursor-pointer"
                  >
                    <OptimizedScoreSlider
                      dimension={dimension}
                      value={scores[dimension.id] || 0}
                      onValueChange={(value) => {
                        handleScoreChange(value, dimension.id)
                        // 自动切换到当前维度
                        setCurrentStep(index)
                      }}
                      disabled={false}
                      isActive={index === currentStep}
                    />
                  </div>
                ))}
              </div>

              {/* 操作按钮区域 */}
              <div className="flex justify-center gap-4 pt-4 border-t border-gray-200">
                <Button
                  variant="outline"
                  onClick={handleReset}
                  disabled={Object.keys(scores).filter(key => scores[key] > 0).length === 0}
                  className="flex items-center gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  重置评分
                </Button>

                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-8"
                  size="lg"
                >
                  <Award className={`h-4 w-4 ${isSubmitting ? 'animate-spin' : ''}`} />
                  {hasSubmitted ? "重新提交" : isSubmitting ? "提交中..." : "提交评分"}
                </Button>
              </div>

              {/* 提交状态提示 */}
              {hasSubmitted && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-center">
                  <p className="text-green-700 font-medium">✅ 评分已成功提交</p>
                  <p className="text-green-600 text-sm mt-1">您可以继续修改评分，修改后需要重新提交</p>
                </div>
              )}

              {/* 导航提示 */}
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-center">
                <p className="text-blue-700 font-medium">💡 操作提示</p>
                <p className="text-blue-600 text-sm mt-1">
                  点击任意维度卡片进行评分，蓝色边框表示当前选中的维度
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-lg border-0">
            <CardContent className="p-16 text-center">
              <Clock className="h-24 w-24 text-gray-300 mx-auto mb-6" />
              <h3 className="text-2xl font-medium text-gray-500 mb-4">暂无候选人面试</h3>
              <p className="text-gray-400">等待管理员安排候选人...</p>
            </CardContent>
          </Card>
        )}


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