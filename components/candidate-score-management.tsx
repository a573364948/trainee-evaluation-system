"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Textarea } from "@/components/ui/textarea"
import { Calculator, Edit, Trash2, Upload, Download, RotateCcw, Users, Award } from "lucide-react"
import type { Candidate, ScoreItem, InterviewDimension } from "@/types/scoring"

interface CandidateScoreManagementProps {
  scoreItems: ScoreItem[]
  candidates: Candidate[]
  dimensions: InterviewDimension[]
  onRefresh: () => void
}

export default function CandidateScoreManagement({ scoreItems, candidates, dimensions, onRefresh }: CandidateScoreManagementProps) {
  const [showScoreDialog, setShowScoreDialog] = useState(false)
  const [showBatchImportDialog, setShowBatchImportDialog] = useState(false)
  const [showClearConfirmDialog, setShowClearConfirmDialog] = useState(false)
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null)
  const [selectedItem, setSelectedItem] = useState<ScoreItem | null>(null)
  const [scoreValue, setScoreValue] = useState(0)
  const [batchImportData, setBatchImportData] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const openScoreDialog = (candidate: Candidate, item: ScoreItem) => {
    setSelectedCandidate(candidate)
    setSelectedItem(item)
    const existingScore = candidate.otherScores.find((s) => s.itemId === item.id)
    setScoreValue(existingScore ? existingScore.score : 0)
    setShowScoreDialog(true)
  }

  const getCandidateScore = (candidate: Candidate, itemId: string) => {
    const score = candidate.otherScores.find((s) => s.itemId === itemId)
    return score !== undefined ? score.score : null
  }

  const formatScore = (score: number | null) => {
    if (score === null) return "未录入"
    return score.toString()
  }

  const getInterviewScore = (candidate: Candidate) => {
    // 直接使用候选人的totalScore，这是后端计算好的面试总分
    if (candidate.scores.length === 0) return null
    return candidate.totalScore > 0 ? candidate.totalScore : null
  }

  const handleUpdateScore = async () => {
    if (!selectedCandidate || !selectedItem) return

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/admin/candidates/${selectedCandidate.id}/other-score`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: selectedItem.id, score: scoreValue }),
      })

      if (response.ok) {
        setShowScoreDialog(false)
        setSelectedCandidate(null)
        setSelectedItem(null)
        setScoreValue(0)
        onRefresh()
      }
    } catch (error) {
      console.error("更新成绩失败:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClearAllScores = async () => {
    setIsSubmitting(true)
    try {
      const response = await fetch("/api/admin/candidates/clear-scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      if (response.ok) {
        setShowClearConfirmDialog(false)
        onRefresh()
      }
    } catch (error) {
      console.error("清空成绩失败:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleBatchImport = async () => {
    if (!batchImportData.trim()) return

    setIsSubmitting(true)
    try {
      // 解析CSV格式数据
      const lines = batchImportData.trim().split('\n')
      const headers = lines[0].split(',').map(h => h.trim())
      
      // 验证表头格式
      if (headers[0] !== '候选人编号' && headers[0] !== '姓名') {
        alert('请确保第一列为候选人编号或姓名')
        return
      }

      const importData = []
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim())
        if (values.length >= 2) {
          const candidateIdentifier = values[0]
          const scoreData: any = { candidateIdentifier }
          
          for (let j = 1; j < headers.length && j < values.length; j++) {
            const itemName = headers[j]
            const score = parseFloat(values[j])
            if (!isNaN(score)) {
              scoreData[itemName] = score
            }
          }
          importData.push(scoreData)
        }
      }

      const response = await fetch("/api/admin/candidates/batch-import-scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ importData }),
      })

      if (response.ok) {
        setShowBatchImportDialog(false)
        setBatchImportData("")
        onRefresh()
      }
    } catch (error) {
      console.error("批量导入失败:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const exportTemplate = () => {
    const headers = ['候选人编号', '姓名', ...scoreItems.filter(item => item.isActive && item.name !== '面试成绩').map(item => item.name)]
    const csvContent = headers.join(',') + '\n' + 
      candidates.map(candidate => 
        [candidate.number, candidate.name, ...scoreItems.filter(item => item.isActive && item.name !== '面试成绩').map(() => '')].join(',')
      ).join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = '成绩导入模板.csv'
    link.click()
  }

  // 过滤出非面试成绩项目
  const nonInterviewItems = scoreItems.filter(item => item.isActive && item.name !== '面试成绩')

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            候选人成绩管理
          </CardTitle>
          <CardDescription>管理候选人的各项成绩，包括面试成绩和其他成绩项目</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-4 text-sm">
              <div className="text-gray-600">
                候选人总数: <span className="font-semibold text-blue-600">{candidates.length}人</span>
              </div>
              <div className="text-gray-600">
                成绩项目: <span className="font-semibold text-green-600">{scoreItems.filter(item => item.isActive).length}项</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportTemplate}>
                <Download className="h-4 w-4 mr-2" />
                下载模板
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowBatchImportDialog(true)}>
                <Upload className="h-4 w-4 mr-2" />
                批量导入
              </Button>
              <Button variant="destructive" size="sm" onClick={() => setShowClearConfirmDialog(true)}>
                <RotateCcw className="h-4 w-4 mr-2" />
                清空成绩
              </Button>
            </div>
          </div>

          {scoreItems.length > 0 && candidates.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-32">候选人</TableHead>
                    {nonInterviewItems.map((item) => (
                      <TableHead key={item.id} className="text-center">{item.name}</TableHead>
                    ))}
                    <TableHead className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Award className="h-4 w-4" />
                        面试成绩
                      </div>
                    </TableHead>
                    <TableHead className="text-center font-semibold">最终得分</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {candidates.map((candidate) => (
                    <TableRow key={candidate.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{candidate.name}</div>
                          <div className="text-sm text-gray-500">{candidate.number}</div>
                        </div>
                      </TableCell>
                      {nonInterviewItems.map((item) => (
                        <TableCell key={item.id} className="text-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openScoreDialog(candidate, item)}
                            className={`w-20 ${getCandidateScore(candidate, item.id) === null ? 'text-gray-400' : ''}`}
                          >
                            {formatScore(getCandidateScore(candidate, item.id))}
                          </Button>
                        </TableCell>
                      ))}
                      <TableCell className="text-center">
                        <Badge
                          variant={getInterviewScore(candidate) === null ? "outline" : "secondary"}
                          className={`font-mono ${getInterviewScore(candidate) === null ? 'text-gray-400' : ''}`}
                        >
                          {formatScore(getInterviewScore(candidate))}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`text-lg font-bold ${
                          candidate.finalScore > 0 ||
                          candidate.scores.length > 0 ||
                          candidate.otherScores.length > 0
                            ? 'text-blue-600'
                            : 'text-gray-400'
                        }`}>
                          {candidate.finalScore > 0 ||
                           candidate.scores.length > 0 ||
                           candidate.otherScores.length > 0
                            ? candidate.finalScore
                            : "未录入"}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>暂无数据</p>
              <p className="text-sm">请先配置成绩项目和候选人</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 成绩录入对话框 */}
      <Dialog open={showScoreDialog} onOpenChange={setShowScoreDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>录入成绩</DialogTitle>
            <DialogDescription>
              为 <strong>{selectedCandidate?.name}</strong> 录入 <strong>{selectedItem?.name}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="score">成绩分数</Label>
              <Input
                id="score"
                type="number"
                value={scoreValue}
                onChange={(e) => setScoreValue(Number.parseFloat(e.target.value) || 0)}
                min="0"
                max={selectedItem?.maxScore || 100}
                placeholder={`请输入分数（满分${selectedItem?.maxScore}）`}
              />
            </div>
            <div className="text-sm text-gray-500">
              满分：{selectedItem?.maxScore}分 | 权重：{selectedItem?.weight}%
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowScoreDialog(false)}>
              取消
            </Button>
            <Button onClick={handleUpdateScore} disabled={isSubmitting}>
              {isSubmitting ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 批量导入对话框 */}
      <Dialog open={showBatchImportDialog} onOpenChange={setShowBatchImportDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>批量导入成绩</DialogTitle>
            <DialogDescription>
              支持CSV格式数据导入，第一列为候选人编号或姓名，后续列为各项成绩
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="importData">CSV数据</Label>
              <Textarea
                id="importData"
                value={batchImportData}
                onChange={(e) => setBatchImportData(e.target.value)}
                placeholder="候选人编号,姓名,笔试成绩,日常表现&#10;TC001,张三,85,90&#10;TC002,李四,78,88"
                rows={8}
                className="font-mono text-sm"
              />
            </div>
            <div className="text-sm text-gray-500">
              <p>• 第一行为表头，第一列必须是"候选人编号"或"姓名"</p>
              <p>• 后续列对应各项成绩，列名需与成绩项目名称一致</p>
              <p>• 面试成绩会自动计算，无需导入</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBatchImportDialog(false)}>
              取消
            </Button>
            <Button onClick={handleBatchImport} disabled={isSubmitting || !batchImportData.trim()}>
              {isSubmitting ? "导入中..." : "导入"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 清空确认对话框 */}
      <AlertDialog open={showClearConfirmDialog} onOpenChange={setShowClearConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认清空所有成绩？</AlertDialogTitle>
            <AlertDialogDescription>
              此操作将清空所有候选人的非面试成绩（面试成绩保留），此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearAllScores} disabled={isSubmitting}>
              {isSubmitting ? "清空中..." : "确认清空"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
