"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import {
  Edit,
  Trash2,
  Upload,
  Archive,
  Users,
  Target,
  Calculator,
  RefreshCw,
  Play,
  Pause,
  Square,
  RotateCcw,
  Clock,
  CheckCircle,
  AlertCircle,
  Circle
} from "lucide-react"
import type {
  Batch,
  EnhancedBatch,
  BatchStatus,
  Judge,
  InterviewDimension,
  ScoreItem
} from "@/types/scoring"

interface BatchManagementProps {
  batches: Batch[]
  enhancedBatches?: EnhancedBatch[]
  activeBatch?: EnhancedBatch | null
  judges: Judge[]
  dimensions: InterviewDimension[]
  scoreItems: ScoreItem[]
  onRefresh: () => void
  enhanced?: boolean
}

export default function BatchManagement({
  batches,
  enhancedBatches = [],
  activeBatch,
  judges,
  dimensions,
  scoreItems,
  onRefresh,
  enhanced = true
}: BatchManagementProps) {
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showLoadDialog, setShowLoadDialog] = useState(false)
  const [showClearDialog, setShowClearDialog] = useState(false)
  const [showActionDialog, setShowActionDialog] = useState(false)
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null)
  const [deletingBatch, setDeletingBatch] = useState<Batch | null>(null)
  const [loadingBatch, setLoadingBatch] = useState<Batch | null>(null)
  const [actioningBatch, setActioningBatch] = useState<EnhancedBatch | null>(null)
  const [pendingAction, setPendingAction] = useState<string>('')
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 批次状态辅助函数
  const getStatusColor = (status: BatchStatus): string => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800'
      case 'active': return 'bg-green-100 text-green-800'
      case 'paused': return 'bg-yellow-100 text-yellow-800'
      case 'completed': return 'bg-blue-100 text-blue-800'
      case 'archived': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: BatchStatus) => {
    switch (status) {
      case 'draft': return <Circle className="h-3 w-3" />
      case 'active': return <Play className="h-3 w-3" />
      case 'paused': return <Pause className="h-3 w-3" />
      case 'completed': return <CheckCircle className="h-3 w-3" />
      case 'archived': return <Archive className="h-3 w-3" />
      default: return <Circle className="h-3 w-3" />
    }
  }

  const getStatusText = (status: BatchStatus): string => {
    switch (status) {
      case 'draft': return '草稿'
      case 'active': return '进行中'
      case 'paused': return '已暂停'
      case 'completed': return '已完成'
      case 'archived': return '已归档'
      default: return '未知'
    }
  }

  const getAvailableActions = (batch: EnhancedBatch): Array<{action: string, label: string, icon: any, variant?: string}> => {
    const actions = []

    switch (batch.status) {
      case 'draft':
        actions.push({ action: 'start', label: '开始批次', icon: Play, variant: 'default' })
        break
      case 'active':
        actions.push({ action: 'pause', label: '暂停批次', icon: Pause, variant: 'outline' })
        actions.push({ action: 'complete', label: '完成批次', icon: CheckCircle, variant: 'destructive' })
        break
      case 'paused':
        actions.push({ action: 'resume', label: '恢复批次', icon: RotateCcw, variant: 'default' })
        actions.push({ action: 'complete', label: '完成批次', icon: CheckCircle, variant: 'destructive' })
        break
    }

    return actions
  }

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
    })
  }

  const handleSave = async () => {
    if (!formData.name.trim()) return

    setIsSubmitting(true)
    try {
      const response = await fetch("/api/admin/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          enhanced: enhanced
        }),
      })

      if (response.ok) {
        setShowSaveDialog(false)
        resetForm()
        onRefresh()
      }
    } catch (error) {
      console.error("保存批次失败:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = async () => {
    if (!editingBatch || !formData.name.trim()) return

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/admin/batches/${editingBatch.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        setShowEditDialog(false)
        setEditingBatch(null)
        resetForm()
        onRefresh()
      }
    } catch (error) {
      console.error("更新批次失败:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingBatch) return

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/admin/batches/${deletingBatch.id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setShowDeleteDialog(false)
        setDeletingBatch(null)
        onRefresh()
      }
    } catch (error) {
      console.error("删除批次失败:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleLoad = async () => {
    if (!loadingBatch) return

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/admin/batches/${loadingBatch.id}/load`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enhanced: false })
      })

      if (response.ok) {
        setShowLoadDialog(false)
        setLoadingBatch(null)
        onRefresh()
      }
    } catch (error) {
      console.error("加载批次失败:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // 增强批次操作处理
  const handleBatchAction = async () => {
    if (!actioningBatch || !pendingAction) return

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/admin/batches/${actioningBatch.id}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: pendingAction })
      })

      const result = await response.json()

      if (result.success) {
        setShowActionDialog(false)
        setActioningBatch(null)
        setPendingAction('')
        onRefresh()

        // 显示成功消息
        console.log(`批次操作成功: ${result.message}`)
      } else {
        console.error("批次操作失败:", result.error)
      }
    } catch (error) {
      console.error("批次操作失败:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEnhancedLoad = async (batch: EnhancedBatch) => {
    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/admin/batches/${batch.id}/load`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enhanced: true })
      })

      if (response.ok) {
        onRefresh()
        console.log(`增强批次加载成功: ${batch.name}`)
      }
    } catch (error) {
      console.error("加载增强批次失败:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClearData = async () => {
    setIsSubmitting(true)
    try {
      const response = await fetch("/api/admin/clear-data", {
        method: "POST",
      })

      if (response.ok) {
        setShowClearDialog(false)
        onRefresh()
      }
    } catch (error) {
      console.error("清空数据失败:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const openEditDialog = (batch: Batch) => {
    setEditingBatch(batch)
    setFormData({
      name: batch.name,
      description: batch.description,
    })
    setShowEditDialog(true)
  }

  const openDeleteDialog = (batch: Batch) => {
    setDeletingBatch(batch)
    setShowDeleteDialog(true)
  }

  const openLoadDialog = (batch: Batch) => {
    setLoadingBatch(batch)
    setShowLoadDialog(true)
  }

  const openActionDialog = (batch: EnhancedBatch, action: string) => {
    setActioningBatch(batch)
    setPendingAction(action)
    setShowActionDialog(true)
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString("zh-CN")
  }

  const getCurrentConfig = () => {
    return {
      judges: judges.length,
      dimensions: dimensions.filter((d) => d.isActive).length,
      scoreItems: scoreItems.filter((s) => s.isActive).length,
    }
  }

  const currentConfig = getCurrentConfig()

  return (
    <div className="space-y-6">
      {/* 当前配置概览 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5" />
            当前配置概览
          </CardTitle>
          <CardDescription>当前系统的配置状态，可保存为新批次</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-blue-600">{currentConfig.judges}</div>
              <div className="text-sm text-gray-600">评委数量</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <Target className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-green-600">{currentConfig.dimensions}</div>
              <div className="text-sm text-gray-600">面试维度</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <Calculator className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-purple-600">{currentConfig.scoreItems}</div>
              <div className="text-sm text-gray-600">成绩项目</div>
            </div>
            <div className="flex items-center justify-center">
              <Button onClick={() => setShowSaveDialog(true)} className="h-16 flex flex-col gap-1">
                <Archive className="h-5 w-5" />
                <span>保存为批次</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 批次列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5" />
            批次管理
          </CardTitle>
          <CardDescription>管理已保存的配置批次，可快速切换不同的面试配置</CardDescription>
        </CardHeader>
        <CardContent>
          {/* 活跃批次状态显示 */}
          {enhanced && activeBatch && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(activeBatch.status)}
                    <span className="font-medium text-green-800">当前活跃批次</span>
                  </div>
                  <div>
                    <span className="font-semibold text-green-900">{activeBatch.name}</span>
                    <span className="ml-2 text-sm text-green-700">
                      {activeBatch.runtime.metadata.totalCandidates} 位候选人
                    </span>
                  </div>
                </div>
                <Badge className={getStatusColor(activeBatch.status)}>
                  {getStatusText(activeBatch.status)}
                </Badge>
              </div>
            </div>
          )}

          <div className="flex justify-between items-center mb-6">
            <div className="text-sm text-gray-600">
              {enhanced ? (
                <>
                  共 <span className="font-semibold">{enhancedBatches.length}</span> 个增强批次
                  {activeBatch && (
                    <span className="ml-2 text-green-600">
                      • 1 个活跃批次
                    </span>
                  )}
                </>
              ) : (
                <>共 <span className="font-semibold">{batches.length}</span> 个传统批次</>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setShowClearDialog(true)}
                variant="outline"
                className="flex items-center gap-2 text-red-600 border-red-200 hover:bg-red-50"
              >
                <RefreshCw className="h-4 w-4" />
                清空数据
              </Button>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>批次名称</TableHead>
                {enhanced && <TableHead>状态</TableHead>}
                <TableHead>配置详情</TableHead>
                {enhanced && <TableHead>进度信息</TableHead>}
                <TableHead>创建时间</TableHead>
                <TableHead>更新时间</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {enhanced ? (
                // 增强批次渲染
                enhancedBatches.map((batch) => (
                  <TableRow key={batch.id} className={batch.status === 'active' ? 'bg-green-50' : ''}>
                    <TableCell>
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {batch.name}
                          {batch.status === 'active' && (
                            <Badge variant="outline" className="text-green-600 border-green-300">
                              活跃
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">{batch.description}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(batch.status)}>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(batch.status)}
                          {getStatusText(batch.status)}
                        </div>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Badge variant="outline" className="text-blue-600">
                          {batch.config.judges.length} 评委
                        </Badge>
                        <Badge variant="outline" className="text-green-600">
                          {batch.config.dimensions.length} 维度
                        </Badge>
                        <Badge variant="outline" className="text-purple-600">
                          {batch.config.scoreItems.length} 项目
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="text-gray-900">
                          {batch.runtime.metadata.totalCandidates} 位候选人
                        </div>
                        <div className="text-gray-500">
                          已完成: {batch.runtime.metadata.completedCandidates}
                        </div>
                        {batch.runtime.metadata.averageScore > 0 && (
                          <div className="text-gray-500">
                            平均分: {batch.runtime.metadata.averageScore}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-gray-600">{formatDate(batch.createdAt)}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-gray-600">{formatDate(batch.lastActiveAt)}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {/* 批次操作按钮 */}
                        {getAvailableActions(batch).map((action) => (
                          <Button
                            key={action.action}
                            size="sm"
                            variant={action.variant as any}
                            onClick={() => openActionDialog(batch, action.action)}
                            className="flex items-center gap-1"
                            disabled={isSubmitting}
                          >
                            <action.icon className="h-3 w-3" />
                            {action.label}
                          </Button>
                        ))}

                        {/* 加载按钮 */}
                        {batch.status !== 'active' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEnhancedLoad(batch)}
                            className="flex items-center gap-1"
                            disabled={isSubmitting}
                          >
                            <Upload className="h-3 w-3" />
                            加载
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                // 传统批次渲染
                batches.map((batch) => (
                  <TableRow key={batch.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{batch.name}</div>
                        <div className="text-sm text-gray-500">{batch.description}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Badge variant="outline" className="text-blue-600">
                          {batch.config.judges.length} 评委
                        </Badge>
                        <Badge variant="outline" className="text-green-600">
                          {batch.config.dimensions.filter((d) => d.isActive).length} 维度
                        </Badge>
                        <Badge variant="outline" className="text-purple-600">
                          {batch.config.scoreItems.filter((s) => s.isActive).length} 项目
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-gray-600">{formatDate(batch.createdAt)}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-gray-600">{formatDate(batch.updatedAt)}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => openLoadDialog(batch)} className="flex items-center gap-1">
                          <Upload className="h-3 w-3" />
                          加载
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => openEditDialog(batch)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => openDeleteDialog(batch)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {(enhanced ? enhancedBatches.length === 0 : batches.length === 0) && (
            <div className="text-center py-8 text-gray-500">
              <Archive className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>暂无保存的批次</p>
              <p className="text-sm">
                {enhanced ? '创建第一个增强批次开始管理面试流程' : '保存当前配置为第一个批次'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 保存批次对话框 */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>保存当前配置为批次</DialogTitle>
            <DialogDescription>将当前的评委、维度和成绩项目配置保存为一个批次，不包含候选人信息</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">批次名称</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="如：列车长面试标准配置"
              />
            </div>
            <div>
              <Label htmlFor="description">批次描述</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="详细描述这个批次的用途和特点"
                rows={3}
              />
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">将保存以下配置：</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• {currentConfig.judges} 个评委信息</li>
                <li>• {currentConfig.dimensions} 个面试维度</li>
                <li>• {currentConfig.scoreItems} 个成绩项目</li>
                <li>• 系统参数设置</li>
              </ul>
              <p className="text-xs text-gray-500 mt-2">注：不包含候选人信息和评分记录</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              取消
            </Button>
            <Button onClick={handleSave} disabled={isSubmitting || !formData.name.trim()}>
              {isSubmitting ? "保存中..." : "保存批次"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑批次对话框 */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑批次信息</DialogTitle>
            <DialogDescription>修改批次的名称和描述信息</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">批次名称</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="如：列车长面试标准配置"
              />
            </div>
            <div>
              <Label htmlFor="edit-description">批次描述</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="详细描述这个批次的用途和特点"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              取消
            </Button>
            <Button onClick={handleEdit} disabled={isSubmitting || !formData.name.trim()}>
              {isSubmitting ? "保存中..." : "保存修改"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 加载批次确认对话框 */}
      <AlertDialog open={showLoadDialog} onOpenChange={setShowLoadDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认加载批次配置</AlertDialogTitle>
            <AlertDialogDescription>
              您确定要加载批次 <strong>{loadingBatch?.name}</strong> 吗？
              <br />
              <br />
              <span className="text-yellow-600 font-medium">注意：</span>
              此操作将：
              <ul className="mt-2 text-sm list-disc list-inside space-y-1">
                <li>替换当前的评委配置</li>
                <li>替换当前的面试维度设置</li>
                <li>替换当前的成绩项目配置</li>
                <li>清空所有评分记录</li>
                <li>保留候选人基本信息</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleLoad} disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700">
              {isSubmitting ? "加载中..." : "确认加载"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 删除批次确认对话框 */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除批次</AlertDialogTitle>
            <AlertDialogDescription>
              您确定要删除批次 <strong>{deletingBatch?.name}</strong> 吗？
              <br />
              <br />
              <span className="text-red-600 font-medium">警告：</span>
              此操作将永久删除该批次的所有配置信息，无法恢复。
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

      {/* 批次操作确认对话框 */}
      <AlertDialog open={showActionDialog} onOpenChange={setShowActionDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              确认批次操作
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actioningBatch && (
                <div className="space-y-3">
                  <div>
                    您确定要对批次 <span className="font-medium">"{actioningBatch.name}"</span> 执行以下操作吗？
                  </div>

                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      {pendingAction === 'start' && <Play className="h-4 w-4 text-green-600" />}
                      {pendingAction === 'pause' && <Pause className="h-4 w-4 text-yellow-600" />}
                      {pendingAction === 'resume' && <RotateCcw className="h-4 w-4 text-blue-600" />}
                      {pendingAction === 'complete' && <CheckCircle className="h-4 w-4 text-blue-600" />}
                      <span className="font-medium">
                        {pendingAction === 'start' && '开始批次'}
                        {pendingAction === 'pause' && '暂停批次'}
                        {pendingAction === 'resume' && '恢复批次'}
                        {pendingAction === 'complete' && '完成批次'}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      {pendingAction === 'start' && '批次将变为活跃状态，开始面试流程'}
                      {pendingAction === 'pause' && '批次将暂停，可稍后恢复'}
                      {pendingAction === 'resume' && '批次将恢复为活跃状态'}
                      {pendingAction === 'complete' && '批次将标记为完成，无法再次激活'}
                    </div>
                  </div>

                  <div className="text-sm text-gray-500">
                    当前状态: <Badge className={getStatusColor(actioningBatch.status)}>
                      {getStatusText(actioningBatch.status)}
                    </Badge>
                  </div>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBatchAction}
              disabled={isSubmitting}
              className={
                pendingAction === 'complete'
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-blue-600 hover:bg-blue-700"
              }
            >
              {isSubmitting ? "执行中..." : "确认操作"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 清空数据确认对话框 */}
      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认清空所有数据</AlertDialogTitle>
            <AlertDialogDescription>
              您确定要清空所有数据吗？
              <br />
              <br />
              <span className="text-red-600 font-medium">危险操作：</span>
              此操作将清空：
              <ul className="mt-2 text-sm list-disc list-inside space-y-1">
                <li>所有候选人信息</li>
                <li>所有评委配置</li>
                <li>所有面试维度</li>
                <li>所有成绩项目</li>
                <li>所有评分记录</li>
              </ul>
              <p className="mt-2 text-sm text-gray-600">注：已保存的批次不会被删除</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearData}
              disabled={isSubmitting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isSubmitting ? "清空中..." : "确认清空"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
