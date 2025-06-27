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
import { Plus, Edit, Trash2, Target, AlertCircle } from "lucide-react"
import type { InterviewDimension } from "@/types/scoring"

interface InterviewDimensionsProps {
  dimensions: InterviewDimension[]
  onRefresh: () => void
}

export default function InterviewDimensions({ dimensions, onRefresh }: InterviewDimensionsProps) {
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [editingDimension, setEditingDimension] = useState<InterviewDimension | null>(null)
  const [deletingDimension, setDeletingDimension] = useState<InterviewDimension | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    maxScore: 20,
    weight: 20,
    order: 1,
    isActive: true,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      maxScore: 20,
      weight: 20,
      order: dimensions.length + 1,
      isActive: true,
    })
  }

  const handleAdd = async () => {
    if (!formData.name.trim()) return

    setIsSubmitting(true)
    try {
      const response = await fetch("/api/admin/dimensions", {
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
      console.error("添加维度失败:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = async () => {
    if (!editingDimension || !formData.name.trim()) return

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/admin/dimensions/${editingDimension.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        setShowEditDialog(false)
        setEditingDimension(null)
        resetForm()
        onRefresh()
      }
    } catch (error) {
      console.error("更新维度失败:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingDimension) return

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/admin/dimensions/${deletingDimension.id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setShowDeleteDialog(false)
        setDeletingDimension(null)
        onRefresh()
      }
    } catch (error) {
      console.error("删除维度失败:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const openEditDialog = (dimension: InterviewDimension) => {
    setEditingDimension(dimension)
    setFormData({
      name: dimension.name,
      description: dimension.description,
      maxScore: dimension.maxScore,
      weight: dimension.weight,
      order: dimension.order,
      isActive: dimension.isActive,
    })
    setShowEditDialog(true)
  }

  const openDeleteDialog = (dimension: InterviewDimension) => {
    setDeletingDimension(dimension)
    setShowDeleteDialog(true)
  }

  const totalWeight = dimensions.filter((d) => d.isActive).reduce((sum, d) => sum + d.weight, 0)
  const totalMaxScore = dimensions.filter((d) => d.isActive).reduce((sum, d) => sum + d.maxScore, 0)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            面试维度管理
          </CardTitle>
          <CardDescription>配置面试评分维度和权重分配</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-4 text-sm">
              <div className="text-gray-600">
                总权重:{" "}
                <span className={`font-semibold ${totalWeight === 100 ? "text-green-600" : "text-red-600"}`}>
                  {totalWeight}%
                </span>
              </div>
              <div className="text-gray-600">
                总分: <span className="font-semibold text-blue-600">{totalMaxScore}分</span>
              </div>
            </div>
            <Button onClick={() => setShowAddDialog(true)} size="sm" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              添加维度
            </Button>
          </div>

          {totalWeight !== 100 && dimensions.filter((d) => d.isActive).length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <span className="text-yellow-700 text-sm">权重总和应为100%，当前为{totalWeight}%</span>
            </div>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>维度名称</TableHead>
                <TableHead>满分</TableHead>
                <TableHead>权重</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dimensions.map((dimension) => (
                <TableRow key={dimension.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{dimension.name}</div>
                      <div className="text-sm text-gray-500">{dimension.description}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-semibold">{dimension.maxScore}分</span>
                  </TableCell>
                  <TableCell>
                    <span className="font-semibold">{dimension.weight}%</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={dimension.isActive ? "default" : "secondary"}>
                      {dimension.isActive ? "启用" : "禁用"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEditDialog(dimension)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => openDeleteDialog(dimension)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {dimensions.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>暂无面试维度</p>
              <p className="text-sm">点击"添加维度"开始配置</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 添加维度对话框 */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加面试维度</DialogTitle>
            <DialogDescription>配置新的面试评分维度</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">维度名称</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="如：专业能力"
              />
            </div>
            <div>
              <Label htmlFor="description">维度描述</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="详细描述该维度的评分标准"
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
                  max="100"
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

      {/* 编辑维度对话框 */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑面试维度</DialogTitle>
            <DialogDescription>修改面试评分维度配置</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">维度名称</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="如：专业能力"
              />
            </div>
            <div>
              <Label htmlFor="edit-description">维度描述</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="详细描述该维度的评分标准"
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
                  max="100"
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
            <AlertDialogTitle>确认删除维度</AlertDialogTitle>
            <AlertDialogDescription>
              您确定要删除维度 <strong>{deletingDimension?.name}</strong> 吗？
              <br />
              <br />
              <span className="text-red-600 font-medium">警告：</span>
              此操作将删除所有相关的评分数据，无法恢复。
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
    </div>
  )
}
