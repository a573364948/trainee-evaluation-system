"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { CheckCircle, Clock, User, Info, RotateCcw, ChevronRight, Lock, Eye, EyeOff } from "lucide-react"
import type { Candidate, Judge, InterviewDimension } from "@/types/scoring"

export default function JudgePage() {
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [judges, setJudges] = useState<Judge[]>([])
  const [dimensions, setDimensions] = useState<InterviewDimension[]>([])
  const [currentCandidate, setCurrentCandidate] = useState<Candidate | null>(null)
  const [selectedJudge, setSelectedJudge] = useState<string>("")
  const [judgePassword, setJudgePassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [scores, setScores] = useState<Record<string, number>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [showLoginDialog, setShowLoginDialog] = useState(true)

  // 评委密码将从API获取

  useEffect(() => {
    // 获取初始数据
    Promise.all([
      fetch("/api/score").then((res) => res.json()),
      fetch("/api/admin/dimensions").then((res) => res.json()),
    ]).then(([scoreData, dimensionsData]) => {
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
    })

    // 监听实时更新 - 改进的 SSE 连接
    let eventSource: EventSource | null = null
    let reconnectTimer: NodeJS.Timeout | null = null

    const connectSSE = () => {
      if (eventSource) {
        eventSource.close()
      }

      console.log("[Judge] Connecting to SSE...")
      eventSource = new EventSource("/api/events")

      eventSource.onopen = () => {
        console.log("[Judge] SSE connection opened")
      }

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data)
        console.log("[Judge] Received event:", data.type)

        if (data.type === "heartbeat") {
          // 忽略心跳包
          return
        }

        if (data.type === "initial") {
          setCandidates(data.data.candidates)
          setJudges(data.data.judges)
          setCurrentCandidate(data.data.currentCandidate)
        } else if (data.type === "candidate_changed") {
          setCurrentCandidate(data.data)
          setHasSubmitted(false)
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
        console.error("[Judge] SSE error:", error)
        eventSource?.close()

        // 自动重连
        if (!reconnectTimer) {
          reconnectTimer = setTimeout(() => {
            console.log("[Judge] Attempting to reconnect SSE...")
            reconnectTimer = null
            connectSSE()
          }, 3000)
        }
      }
    }

    // 初始连接
    connectSSE()

    return () => {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer)
      }
      if (eventSource) {
        eventSource.close()
      }
    }
  }, [selectedJudge, currentCandidate?.id, dimensions])

  useEffect(() => {
    // 检查当前评委是否已经为当前候选人打分
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

  const handleLogin = async () => {
    if (!selectedJudge || !judgePassword) {
      alert("请选择评委并输入密码")
      return
    }

    try {
      // 从API获取评委信息进行验证
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

  const handleScoreChange = (dimensionId: string, value: number[]) => {
    setScores((prev) => ({
      ...prev,
      [dimensionId]: value[0],
    }))
  }

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

  const handleReset = () => {
    const resetScores: Record<string, number> = {}
    dimensions.forEach((dim) => {
      resetScores[dim.id] = 0
    })
    setScores(resetScores)
  }

  const totalScore = Object.values(scores).reduce((sum, score) => sum + score, 0)
  const weightedScore = dimensions.reduce((sum, dim) => {
    return sum + (scores[dim.id] || 0) * (dim.weight / 100)
  }, 0)

  const currentJudge = judges.find((j) => j.id === selectedJudge)
  const completedCount = currentCandidate?.scores.length || 0
  const totalJudges = judges.length

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Dialog open={showLoginDialog} onOpenChange={() => {}}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
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
                  className="w-full mt-1 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">请选择评委</option>
                  {judges.map((judge) => (
                    <option key={judge.id} value={judge.id}>
                      {judge.name}
                    </option>
                  ))}
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
                    className="pr-10"
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
              <Button onClick={handleLogin} disabled={!selectedJudge || !judgePassword} className="w-full">
                登录评分系统
              </Button>
              <div className="text-xs text-gray-500 space-y-1">
                <p>💡 测试密码提示：</p>
                <p>所有评委的默认密码都是：123456</p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* 顶部信息栏 */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="text-2xl font-bold text-blue-600">{currentCandidate?.number || "1001"}</div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">候选人评分表</h1>
                <p className="text-sm text-gray-500">评委：{currentJudge?.name}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-blue-600 mb-1">评分状态：未提交</div>
              <div className="text-sm text-gray-500">{new Date().toLocaleDateString("zh-CN")}</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* 左侧信息面板 */}
          <div className="lg:col-span-1 space-y-6">
            {/* 候选人信息 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">候选人编号</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600 mb-2">{currentCandidate?.number || "1001"}</div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">姓名:</span>
                    <span>{currentCandidate?.name || "张明"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">部门:</span>
                    <span>{currentCandidate?.department || "运营部"}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 评分信息 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">评委信息</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">{currentJudge?.name}</span>
                </div>
                <div className="text-sm text-gray-500">评审专家委员会</div>
              </CardContent>
            </Card>

            {/* 评分进度 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">评分进度</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">第 1 位</div>
                  <div className="text-sm text-gray-500">共 {totalJudges} 位</div>
                  <div className="text-sm text-gray-500 mt-1">{Math.round((completedCount / totalJudges) * 100)}%</div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">已评:</span>
                    <span className="ml-1 font-medium">{completedCount}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">未评:</span>
                    <span className="ml-1 font-medium">{totalJudges - completedCount}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 评分指南 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  评分指南
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span>90-100: 优秀，表现卓越</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span>80-89: 良好，表现突出</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span>70-79: 中等，表现合格</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                  <span>60-69: 较差，基本达标</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span>0-59: 不及格，需改进</span>
                </div>
              </CardContent>
            </Card>

            {/* 评分维度进度 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">评分维度进度</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {dimensions.map((dimension) => (
                  <div key={dimension.id}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">{dimension.name}</span>
                      <span className="font-medium">{scores[dimension.id] || 0}分</span>
                    </div>
                    <Progress value={((scores[dimension.id] || 0) / dimension.maxScore) * 100} className="h-2" />
                    <div className="text-xs text-gray-500 mt-1">
                      {Math.round(((scores[dimension.id] || 0) / dimension.maxScore) * 100)}%
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* 主要评分区域 */}
          <div className="lg:col-span-3">
            <Card>
              <CardContent className="p-8">
                {currentCandidate ? (
                  <div className="space-y-8">
                    {/* 评分维度 */}
                    <div className="space-y-6">
                      {dimensions.map((dimension) => (
                        <div key={dimension.id} className="border-b border-gray-100 pb-6 last:border-b-0">
                          <div className="flex justify-between items-center mb-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="text-lg font-medium text-gray-900">{dimension.name}</h3>
                                <Badge variant="outline" className="text-blue-600">
                                  权重 {dimension.weight}%
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-500">{dimension.description}</p>
                            </div>
                            <div className="text-right ml-6">
                              <div className="text-4xl font-bold text-blue-600">{scores[dimension.id] || 0}</div>
                              <div className="text-sm text-gray-500">分</div>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <Slider
                              value={[scores[dimension.id] || 0]}
                              onValueChange={(value) => handleScoreChange(dimension.id, value)}
                              max={dimension.maxScore}
                              min={0}
                              step={1}
                              className="w-full"
                              disabled={hasSubmitted}
                            />
                            <div className="flex justify-between text-xs text-gray-400">
                              <span>0分</span>
                              <span>{Math.round(dimension.maxScore / 2)}分</span>
                              <span>{dimension.maxScore}分</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* 总分显示 */}
                    <div className="bg-gray-50 rounded-lg p-6">
                      <div className="text-center">
                        <div className="text-lg font-medium text-gray-700 mb-2">总分 (加权计算)</div>
                        <div className="text-6xl font-bold text-blue-600 mb-4">{weightedScore.toFixed(1)}</div>
                        <div className="text-sm text-gray-500">原始总分: {totalScore} 分</div>
                      </div>
                    </div>

                    {/* 操作按钮 */}
                    <div className="flex justify-center gap-4 pt-6">
                      {hasSubmitted ? (
                        <div className="flex items-center justify-center gap-2 p-4 bg-green-50 rounded-lg">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <span className="text-green-700 font-medium">评分已提交</span>
                        </div>
                      ) : (
                        <>
                          <Button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="px-8 py-3 text-lg"
                            size="lg"
                          >
                            {isSubmitting ? "提交中..." : "✓ 提交评分"}
                          </Button>
                          <Button onClick={handleReset} variant="outline" className="px-6 py-3" size="lg">
                            <RotateCcw className="h-4 w-4 mr-2" />
                            重置
                          </Button>
                          <Button variant="outline" className="px-6 py-3" size="lg">
                            下一位
                            <ChevronRight className="h-4 w-4 ml-2" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <Clock className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-medium text-gray-500 mb-2">暂无候选人面试</h3>
                    <p className="text-gray-400">等待管理员安排候选人...</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}