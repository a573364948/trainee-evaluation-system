"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
  Upload,
  Plus,
  Edit,
  Trash2,
  Download,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  Search,
  X,
} from "lucide-react"
import type { Candidate } from "@/types/scoring"
import FileUpload from "@/components/file-upload"

interface CandidateManagementProps {
  candidates: Candidate[]
  currentCandidate: Candidate | null
  onRefresh: () => void
  onSetCurrentCandidate: (id: string) => void
  onResetCandidate: (id: string) => void
}

export default function CandidateManagement({
  candidates,
  currentCandidate,
  onRefresh,
  onSetCurrentCandidate,
  onResetCandidate,
}: CandidateManagementProps) {
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null)
  const [deletingCandidate, setDeleteingCandidate] = useState<Candidate | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    number: "",
    department: "",
    currentRound: 1,
    status: "waiting" as const,
  })
  const [importText, setImportText] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadMessage, setUploadMessage] = useState("")
  const [uploadError, setUploadError] = useState("")
  const [searchQuery, setSearchQuery] = useState("")

  // 搜索过滤逻辑
  const filteredCandidates = useMemo(() => {
    if (!searchQuery.trim()) {
      return candidates
    }

    const query = searchQuery.toLowerCase().trim()
    return candidates.filter(
      (candidate) =>
        candidate.name.toLowerCase().includes(query) ||
        candidate.number.toLowerCase().includes(query) ||
        candidate.department.toLowerCase().includes(query),
    )
  }, [candidates, searchQuery])

  const resetForm = () => {
    setFormData({
      name: "",
      number: "",
      department: "",
      currentRound: 1,
      status: "waiting",
    })
  }

  const handleAdd = async () => {
    if (!formData.name || !formData.number) return

    setIsSubmitting(true)
    try {
      const response = await fetch("/api/admin/candidates", {
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
      console.error("添加候选人失败:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = async () => {
    if (!editingCandidate || !formData.name || !formData.number) return

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/admin/candidates/${editingCandidate.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        setShowEditDialog(false)
        setEditingCandidate(null)
        resetForm()
        onRefresh()
      }
    } catch (error) {
      console.error("更新候选人失败:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingCandidate) return

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/admin/candidates/${deletingCandidate.id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setShowDeleteDialog(false)
        setDeleteingCandidate(null)
        onRefresh()
      }
    } catch (error) {
      console.error("删除候选人失败:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleImport = async () => {
    if (!importText.trim()) return

    setIsSubmitting(true)
    try {
      // 解析CSV格式数据（支持三列：姓名,工号,部门）
      const lines = importText.trim().split("\n")
      const candidates = lines.map((line, index) => {
        const columns = line.split(",").map((s) => s.trim())
        const [name, number, department] = columns

        if (!name || !number) {
          throw new Error(`第${index + 1}行数据格式错误：姓名或工号为空`)
        }

        return {
          name,
          number,
          department: department || "未分配",
          currentRound: 1,
          status: "waiting" as const,
        }
      })

      const response = await fetch("/api/admin/candidates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidates }),
      })

      if (response.ok) {
        setShowImportDialog(false)
        setImportText("")
        onRefresh()
      }
    } catch (error) {
      console.error("批量导入失败:", error)
      alert(error instanceof Error ? error.message : "导入失败")
    } finally {
      setIsSubmitting(false)
    }
  }

  const openEditDialog = (candidate: Candidate) => {
    setEditingCandidate(candidate)
    setFormData({
      name: candidate.name,
      number: candidate.number,
      department: candidate.department,
      currentRound: candidate.currentRound,
      status: candidate.status,
    })
    setShowEditDialog(true)
  }

  const openDeleteDialog = (candidate: Candidate) => {
    setDeleteingCandidate(candidate)
    setShowDeleteDialog(true)
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      waiting: "secondary",
      interviewing: "default",
      completed: "outline",
    } as const

    const labels = {
      waiting: "等待中",
      interviewing: "面试中",
      completed: "已完成",
    }

    return <Badge variant={variants[status as keyof typeof variants]}>{labels[status as keyof typeof labels]}</Badge>
  }

  const exportTemplate = () => {
    // 创建包含部门的模板内容
    const template = `姓名,工号,部门
张三,TC001,运营部
李四,TC002,调度部
王五,TC003,安全部
赵六,TC004,运营部
钱七,TC005,调度部`

    const blob = new Blob(["\ufeff" + template], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = "候选人导入模板.csv"
    link.click()
  }

  const handleUploadSuccess = (message: string) => {
    setUploadMessage(message)
    setUploadError("")
    onRefresh()
    // 3秒后清除消息
    setTimeout(() => setUploadMessage(""), 3000)
  }

  const handleUploadError = (error: string) => {
    setUploadError(error)
    setUploadMessage("")
    // 5秒后清除错误
    setTimeout(() => setUploadError(""), 5000)
  }

  const clearSearch = () => {
    setSearchQuery("")
  }

  const resetAllCandidatesStatus = async () => {
    const message = "确定要重置所有候选人的状态吗？这将清除所有面试中状态，只保留真正的当前候选人。"
    if (!confirm(message)) {
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch("/api/admin/reset-all-candidates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      if (response.ok) {
        const result = await response.json()
        alert(result.message)
        onRefresh()
      } else {
        alert("重置失败，请重试")
      }
    } catch (error) {
      console.error("重置所有候选人状态失败:", error)
      alert("重置失败，请重试")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>候选人管理</CardTitle>
          <CardDescription>管理面试候选人信息，支持批量导入和实时搜索</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => setShowAddDialog(true)} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                添加候选人
              </Button>
              <Button variant="outline" onClick={() => setShowImportDialog(true)} className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                批量导入
              </Button>
              <Button variant="outline" onClick={exportTemplate} className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                下载模板
              </Button>
              <Button variant="outline" onClick={resetAllCandidatesStatus} className="flex items-center gap-2 text-orange-600 hover:text-orange-700">
                <AlertCircle className="h-4 w-4" />
                重置所有状态
              </Button>
            </div>

            {/* 搜索框 */}
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="搜索姓名、工号或部门..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-10"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSearch}
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* 搜索结果统计 */}
          {searchQuery && (
            <div className="mb-4 text-sm text-gray-600">
              找到 <span className="font-semibold text-blue-600">{filteredCandidates.length}</span> 个匹配结果
              {filteredCandidates.length !== candidates.length && (
                <span className="ml-2">（共 {candidates.length} 个候选人）</span>
              )}
            </div>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">序号</TableHead>
                <TableHead>工号</TableHead>
                <TableHead>姓名</TableHead>
                <TableHead>部门</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>轮次</TableHead>
                <TableHead>总分</TableHead>
                <TableHead>评分进度</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCandidates.map((candidate, index) => (
                <TableRow key={candidate.id}>
                  <TableCell className="text-center text-gray-500">
                    {candidates.findIndex((c) => c.id === candidate.id) + 1}
                  </TableCell>
                  <TableCell className="font-medium">{candidate.number}</TableCell>
                  <TableCell>{candidate.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {candidate.department}
                    </Badge>
                  </TableCell>
                  <TableCell>{getStatusBadge(candidate.status)}</TableCell>
                  <TableCell>第 {candidate.currentRound} 轮</TableCell>
                  <TableCell>
                    <span className="text-lg font-semibold text-blue-600">{candidate.totalScore}</span>
                  </TableCell>
                  <TableCell>{candidate.scores.length} / 5</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => onSetCurrentCandidate(candidate.id)}
                        disabled={candidate.id === currentCandidate?.id}
                      >
                        {candidate.id === currentCandidate?.id ? "当前" : "设为当前"}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => openEditDialog(candidate)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => onResetCandidate(candidate.id)}>
                        重置
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => openDeleteDialog(candidate)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredCandidates.length === 0 && candidates.length > 0 && (
            <div className="text-center py-8 text-gray-500">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>没有找到匹配的候选人</p>
              <p className="text-sm">尝试修改搜索关键词</p>
            </div>
          )}

          {candidates.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>暂无候选人数据</p>
              <p className="text-sm">点击"添加候选人"或"批量导入"开始添加</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 添加候选人对话框 */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加候选人</DialogTitle>
            <DialogDescription>请填写候选人的基本信息</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">姓名</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="请输入候选人姓名"
              />
            </div>
            <div>
              <Label htmlFor="number">工号</Label>
              <Input
                id="number"
                value={formData.number}
                onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                placeholder="请输入候选人工号，如：TC001"
              />
            </div>
            <div>
              <Label htmlFor="department">部门</Label>
              <Input
                id="department"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                placeholder="请输入所属部门，如：运营部"
              />
            </div>
            <div>
              <Label htmlFor="round">面试轮次</Label>
              <Select
                value={formData.currentRound.toString()}
                onValueChange={(value) => setFormData({ ...formData, currentRound: Number.parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">第 1 轮</SelectItem>
                  <SelectItem value="2">第 2 轮</SelectItem>
                  <SelectItem value="3">第 3 轮</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="status">状态</Label>
              <Select
                value={formData.status}
                onValueChange={(value: any) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="waiting">等待中</SelectItem>
                  <SelectItem value="interviewing">面试中</SelectItem>
                  <SelectItem value="completed">已完成</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              取消
            </Button>
            <Button onClick={handleAdd} disabled={isSubmitting || !formData.name || !formData.number}>
              {isSubmitting ? "添加中..." : "添加"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑候选人对话框 */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑候选人</DialogTitle>
            <DialogDescription>修改候选人的基本信息</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">姓名</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="请输入候选人姓名"
              />
            </div>
            <div>
              <Label htmlFor="edit-number">工号</Label>
              <Input
                id="edit-number"
                value={formData.number}
                onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                placeholder="请输入候选人工号，如：TC001"
              />
            </div>
            <div>
              <Label htmlFor="edit-department">部门</Label>
              <Input
                id="edit-department"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                placeholder="请输入所属部门，如：运营部"
              />
            </div>
            <div>
              <Label htmlFor="edit-round">面试轮次</Label>
              <Select
                value={formData.currentRound.toString()}
                onValueChange={(value) => setFormData({ ...formData, currentRound: Number.parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">第 1 轮</SelectItem>
                  <SelectItem value="2">第 2 轮</SelectItem>
                  <SelectItem value="3">第 3 轮</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-status">状态</Label>
              <Select
                value={formData.status}
                onValueChange={(value: any) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="waiting">等待中</SelectItem>
                  <SelectItem value="interviewing">面试中</SelectItem>
                  <SelectItem value="completed">已完成</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              取消
            </Button>
            <Button onClick={handleEdit} disabled={isSubmitting || !formData.name || !formData.number}>
              {isSubmitting ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              您确定要删除候选人 <strong>{deletingCandidate?.name}</strong> (工号: {deletingCandidate?.number}) 吗？
              <br />
              此操作将删除该候选人的所有评分数据，且无法恢复。
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

      {/* 批量导入对话框 */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>批量导入候选人</DialogTitle>
            <DialogDescription>支持Excel文件上传或手动输入候选人信息（姓名、工号、部门）</DialogDescription>
          </DialogHeader>

          {/* 成功/错误消息 */}
          {uploadMessage && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-green-700">{uploadMessage}</span>
            </div>
          )}

          {uploadError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <span className="text-red-700">{uploadError}</span>
            </div>
          )}

          <div className="space-y-4">
            {/* 文件上传区域 */}
            <div>
              <h3 className="text-base font-semibold mb-2">方式一：上传Excel文件</h3>
              <FileUpload
                onUploadSuccess={handleUploadSuccess}
                onUploadError={handleUploadError}
                disabled={isSubmitting}
              />
            </div>

            {/* 分隔线 */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">或</span>
              </div>
            </div>

            {/* 手动输入区域 */}
            <div>
              <h3 className="text-base font-semibold mb-2">方式二：手动输入</h3>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="import-text">候选人数据</Label>
                  <Textarea
                    id="import-text"
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    placeholder="张三,TC001,运营部&#10;李四,TC002,调度部&#10;王五,TC003,安全部"
                    rows={4}
                    className="font-mono text-sm"
                  />
                </div>
                <div className="bg-blue-50 p-3 rounded-lg">
                  <h4 className="font-medium mb-1 text-sm">输入格式说明：</h4>
                  <ul className="text-xs text-gray-600 space-y-0.5">
                    <li>• 每行一个候选人，格式：姓名,工号,部门</li>
                    <li>• 各字段之间用英文逗号分隔</li>
                    <li>• 工号建议使用统一格式，如：TC001, TC002</li>
                    <li>• 部门可选，如不填写将显示为"未分配"</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Excel模板说明 */}
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-sm">Excel文件格式要求：</h4>
                <Button variant="outline" onClick={exportTemplate} size="sm">
                  <Download className="h-3 w-3 mr-1" />
                  下载模板
                </Button>
              </div>
              <ul className="text-xs text-gray-600 space-y-0.5">
                <li>• 第一列：候选人姓名</li>
                <li>• 第二列：候选人工号</li>
                <li>• 第三列：所属部门</li>
                <li>• 可以包含标题行（系统会自动识别）</li>
                <li>• 支持 .xlsx、.xls、.csv 格式</li>
                <li>• 文件大小不超过10MB</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportDialog(false)}>
              关闭
            </Button>
            {importText.trim() && (
              <Button onClick={handleImport} disabled={isSubmitting}>
                {isSubmitting ? "导入中..." : "手动导入"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
