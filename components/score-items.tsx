"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Edit, Trash2, Calculator, AlertCircle } from "lucide-react"
import type { ScoreItem, Candidate } from "@/types/scoring"

interface ScoreItemsProps {
  scoreItems: ScoreItem[]
  candidates: Candidate[]
  onRefresh: () => void
}

export default function ScoreItems({ scoreItems, candidates, onRefresh }: ScoreItemsProps) {
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showScoreDialog, setShowScoreDialog] = useState(false)
  const [editingItem, setEditingItem] = useState<ScoreItem | null>(null)
  const [deletingItem, setDeletingItem] = useState<ScoreItem | null>(null)
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null)
  const [selectedItem, setSelectedItem] = useState<ScoreItem | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    maxScore: 100,
    weight: 30,
    order: 1,
    isActive: true,
  })
  const [scoreValue, setScoreValue] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      maxScore: 100,
      weight: 30,
      order: scoreItems.length + 1,
      isActive: true,
    })
  }

  const handleAdd = async () => {
    if (!formData.name.trim()) return

    setIsSubmitting(true)
    try {
      const response = await fetch("/api/admin/score-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        setShowAddDialog(false)
        resetForm()
        onRefresh()
      }
    } catch (error) {
      console.error("添加成绩项目失败:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = async () => {
    if (!editingItem || !formData.name.trim()) return

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/admin/score-items/${editingItem.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        setShowEditDialog(false)
        setEditingItem(null)
        resetForm()
        onRefresh()
      }
    } catch (error) {
      console.error("更新成绩项目失败:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingItem) return

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/admin/score-items/${deletingItem.id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setShowDeleteDialog(false)
        setDeletingItem(null)
        onRefresh()
      }
    } catch (error) {
      console.error("删除成绩项目失败:", error)
    } finally {
      setIsSubmitting(false)
    }
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

  const openEditDialog = (item: ScoreItem) => {
    setEditingItem(item)
    setFormData({
      name: item.name,
      description: item.description,
      maxScore: item.maxScore,
      weight: item.weight,
      order: item.order,
      isActive: item.isActive,
    })
    setShowEditDialog(true)
  }

  const openDeleteDialog = (item: ScoreItem) => {
    setDeletingItem(item)
    setShowDeleteDialog(true)
  }

  const openScoreDialog = (candidate: Candidate, item: ScoreItem) => {
    setSelectedCandidate(candidate)
    setSelectedItem(item)
    const existingScore = candidate.otherScores.find((s) => s.itemId === item.id)
    setScoreValue(existingScore ? existingScore.score : 0)
    setShowScoreDialog(true)
  }

  const totalWeight = scoreItems.filter((item) => item.isActive).reduce((sum, item) => sum + item.weight, 0)

  const getCandidateScore = (candidate: Candidate, itemId: string) => {
    const score = candidate.otherScores.find((s) => s.itemId === itemId)
    return score ? score.score : 0
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            成绩项目管理
          </CardTitle>
          <CardDescription>配置综合评分项目和权重分配</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center mb-4">
            <div className="text-sm text-gray-600">
              总权重:{" "}
              <span className={`font-semibold ${totalWeight === 100 ? "text-green-600" : "text-red-600"}`}>
                {totalWeight}%
              </span>
            </div>
            <Button onClick={() => setShowAddDialog(true)} size="sm" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              添加项目
            </Button>
          </div>

          {totalWeight !== 100 && scoreItems.filter((item) => item.isActive).length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <span className="text-yellow-700 text-sm">权重总和应为100%，当前为{totalWeight}%</span>
            </div>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>项目名称</TableHead>
                <TableHead>满分</TableHead>
                <TableHead>权重</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scoreItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{item.name}</div>
                      <div className="text-sm text-gray-500">{item.description}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-semibold">{item.maxScore}分</span>
                  </TableCell>
                  <TableCell>
                    <span className="font-semibold">{item.weight}%</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={item.isActive ? "default" : "secondary"}>{item.isActive ? "启用" : "禁用"}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEditDialog(item)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => openDeleteDialog(item)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {scoreItems.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>暂无成绩项目</p>
              <p className="text-sm">点击"添加项目"开始配置</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 候选人成绩录入 */}
      {scoreItems.length > 0 && candidates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>候选人成绩录入</CardTitle>
            <CardDescription>为候选人录入各项成绩（面试成绩自动计算）</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>候选人</TableHead>
                    {scoreItems
                      .filter((item) => item.isActive && item.name !== "面试成绩")
                      .map((item) => (
                        <TableHead key={item.id}>{item.name}</TableHead>
                      ))}
                    <TableHead>最终得分</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {candidates.slice(0, 10).map((candidate) => (
                    <TableRow key={candidate.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{candidate.name}</div>
                          <div className="text-sm text-gray-500">{candidate.number}</div>
                        </div>
                      </TableCell>
                      {scoreItems
                        .filter((item) => item.isActive && item.name !== "面试成绩")
                        .map((item) => (
                          <TableCell key={item.id}>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openScoreDialog(candidate, item)}
                              className="w-16"
                            >
                              {getCandidateScore(candidate, item.id) || "-"}
                            </Button>
                          </TableCell>
                        ))}
                      <TableCell>
                        <span className="text-lg font-bold text-blue-600">{candidate.finalScore}</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 添加项目对话框 */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加成绩项目</DialogTitle>
            <DialogDescription>配置新的成绩评分项目</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">项目名称</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="如：笔试成绩"
              />
            </div>
            <div>
              <Label htmlFor="description">项目描述</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="详细描述该项目的评分标准"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="maxScore">满分</Label>
                <Input
                  id="maxScore"
                  type="number"
                  value={formData.maxScore}
                  onChange={(e) => setFormData({ ...formData, maxScore: Number.parseInt(e.target.value) || 0 })}
                  min="1"
                  max="1000"
                />
              </div>
              <div>
                <Label htmlFor="weight">权重 (%)</Label>
                <Input
                  id="weight"
                  type="number"
                  value={formData.weight}
                  onChange={(e) => setFormData({ ...formData, weight: Number.parseInt(e.target.value) || 0 })}
                  min="1"
                  max="100"
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="active"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label htmlFor="active">启用状态</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              取消
            </Button>
            <Button onClick={handleAdd} disabled={isSubmitting || !formData.name.trim()}>
              {isSubmitting ? "添加中..." : "添加"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑项目对话框 */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑成绩项目</DialogTitle>
            <DialogDescription>修改成绩评分项目配置</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">项目名称</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="如：笔试成绩"
              />
            </div>
            <div>
              <Label htmlFor="edit-description">项目描述</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="详细描述该项目的评分标准"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-maxScore">满分</Label>
                <Input
                  id="edit-maxScore"
                  type="number"
                  value={formData.maxScore}
                  onChange={(e) => setFormData({ ...formData, maxScore: Number.parseInt(e.target.value) || 0 })}
                  min="1"
                  max="1000"
                />
              </div>
              <div>
                <Label htmlFor="edit-weight">权重 (%)</Label>
                <Input
                  id="edit-weight"
                  type="number"
                  value={formData.weight}
                  onChange={(e) => setFormData({ ...formData, weight: Number.parseInt(e.target.value) || 0 })}
                  min="1"
                  max="100"
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="edit-active"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label htmlFor="edit-active">启用状态</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              取消
            </Button>
            <Button onClick={handleEdit} disabled={isSubmitting || !formData.name.trim()}>
              {isSubmitting ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除项目</AlertDialogTitle>
            <AlertDialogDescription>
              您确定要删除成绩项目 <strong>{deletingItem?.name}</strong> 吗？
              <br />
              <br />
              <span className="text-red-600 font-medium">警告：</span>
              此操作将删除所有候选人的相关成绩数据，无法恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isSubmitting} className="bg-red-600 hover:bg-red-700">
              {isSubmitting ? "删除中..." : "确认删除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
    </div>
  )
}
