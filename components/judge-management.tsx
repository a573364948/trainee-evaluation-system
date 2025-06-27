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
import { Plus, Edit, Trash2, Users, UserX, Circle, Target, Settings } from "lucide-react"
import type { Judge, Candidate } from "@/types/scoring"

interface JudgeManagementProps {
  judges: Judge[]
  candidates: Candidate[]
  currentCandidate: Candidate | null
  onRefresh: () => void
}

export default function JudgeManagement({ judges, candidates, currentCandidate, onRefresh }: JudgeManagementProps) {
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [editingJudge, setEditingJudge] = useState<Judge | null>(null)
  const [deletingJudge, setDeletingJudge] = useState<Judge | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    password: "",
    isActive: true,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const resetForm = () => {
    setFormData({
      name: "",
      password: "",
      isActive: true,
    })
  }

  const handleAdd = async () => {
    if (!formData.name.trim()) return

    setIsSubmitting(true)
    try {
      const response = await fetch("/api/admin/judges", {
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
      console.error("添加评委失败:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = async () => {
    if (!editingJudge || !formData.name.trim()) return

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/admin/judges/${editingJudge.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        setShowEditDialog(false)
        setEditingJudge(null)
        resetForm()
        onRefresh()
      }
    } catch (error) {
      console.error("更新评委失败:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingJudge) return

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/admin/judges/${deletingJudge.id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setShowDeleteDialog(false)
        setDeletingJudge(null)
        onRefresh()
      }
    } catch (error) {
      console.error("删除评委失败:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleToggleStatus = async (judge: Judge) => {
    try {
      const response = await fetch(`/api/admin/judges/${judge.id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !judge.isActive }),
      })

      if (response.ok) {
        onRefresh()
      }
    } catch (error) {
      console.error("更新评委状态失败:", error)
    }
  }

  const openEditDialog = (judge: Judge) => {
    setEditingJudge(judge)
    setFormData({
      name: judge.name,
      password: judge.password || "",
      isActive: judge.isActive,
    })
    setShowEditDialog(true)
  }

  const openDeleteDialog = (judge: Judge) => {
    setDeletingJudge(judge)
    setShowDeleteDialog(true)
  }

  const getJudgeScoreCount = (judgeId: string) => {
    if (!currentCandidate) return 0
    return currentCandidate.scores.filter((score) => score.judgeId === judgeId).length
  }

  const getJudgeTotalScores = (judgeId: string) => {
    return candidates.reduce((total, candidate) => {
      return total + candidate.scores.filter((score) => score.judgeId === judgeId).length
    }, 0)
  }

  const getStatusBadge = (judge: Judge) => {
    if (!judge.isActive) {
      return (
        <Badge variant="secondary" className="flex items-center gap-1">
          <Circle className="h-3 w-3 fill-gray-400 text-gray-400" />
          已禁用
        </Badge>
      )
    }

    return (
      <Badge variant="default" className="flex items-center gap-1">
        <Circle className="h-3 w-3 fill-green-500 text-green-500" />
        在线
      </Badge>
    )
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      {/* 左侧评委管理 */}
      <div className="xl:col-span-2 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              评委管理
            </CardTitle>
            <CardDescription>管理评委信息、状态和权限设置</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-4">
                <div className="text-sm text-gray-600">
                  总评委数: <span className="font-semibold">{judges.length}</span>
                </div>
                <div className="text-sm text-gray-600">
                  在线评委:{" "}
                  <span className="font-semibold text-green-600">{judges.filter((j) => j.isActive).length}</span>
                </div>
              </div>
              <Button onClick={() => setShowAddDialog(true)} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                添加评委
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>评委姓名</TableHead>
                  <TableHead>登录密码</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>当前评分</TableHead>
                  <TableHead>总评分数</TableHead>
                  <TableHead>启用状态</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {judges.map((judge) => (
                  <TableRow key={judge.id}>
                    <TableCell className="font-medium">{judge.name}</TableCell>
                    <TableCell>
                      <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                        {judge.password || "未设置"}
                      </span>
                    </TableCell>
                    <TableCell>{getStatusBadge(judge)}</TableCell>
                    <TableCell>
                      <span className="text-lg font-semibold text-blue-600">{getJudgeScoreCount(judge.id)}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-600">{getJudgeTotalScores(judge.id)} 次</span>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={judge.isActive}
                        onCheckedChange={() => handleToggleStatus(judge)}
                        disabled={isSubmitting}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => openEditDialog(judge)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => openDeleteDialog(judge)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {judges.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <UserX className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>暂无评委数据</p>
                <p className="text-sm">点击"添加评委"开始添加</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 右侧配置面板 */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              评分配置
            </CardTitle>
            <CardDescription>面试维度和成绩项目配置已移至"评分设置"模块</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-gray-500 mb-4">评分维度和成绩项目的配置功能已整合到评分设置中</p>
              <p className="text-sm text-gray-400">请前往左侧导航的"评分设置"进行配置</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 添加评委对话框 */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加评委</DialogTitle>
            <DialogDescription>请填写评委的基本信息</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">评委姓名</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="请输入评委姓名"
              />
            </div>
            <div>
              <Label htmlFor="password">登录密码</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="请输入登录密码"
              />
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
            <Button onClick={handleAdd} disabled={isSubmitting || !formData.name.trim() || !formData.password.trim()}>
              {isSubmitting ? "添加中..." : "添加"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑评委对话框 */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑评委</DialogTitle>
            <DialogDescription>修改评委的基本信息</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">评委姓名</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="请输入评委姓名"
              />
            </div>
            <div>
              <Label htmlFor="edit-password">登录密码</Label>
              <Input
                id="edit-password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="请输入登录密码（留空则不修改）"
              />
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
            <AlertDialogTitle>确认删除评委</AlertDialogTitle>
            <AlertDialogDescription>
              您确定要删除评委 <strong>{deletingJudge?.name}</strong> 吗？
              <br />
              <br />
              <span className="text-red-600 font-medium">警告：</span>
              此操作将删除该评委的所有评分记录，并重新计算相关候选人的总分。此操作无法恢复。
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
