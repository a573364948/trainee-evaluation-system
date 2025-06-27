"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import {
  Edit,
  Plus,
  Trash2,
  Clock,
  FileText,
  Users,
  ChevronDown,
  Save,
  X,
  GripVertical,
  ArrowUp,
  ArrowDown
} from "lucide-react"
import type { InterviewItem } from "@/types/scoring"

// 预设模板
const TEMPLATES = {
  interview_stages: [
    { title: "面试环节1", subtitle: "自我介绍", timeLimit: 300 },
    { title: "面试环节2", subtitle: "专业问答", timeLimit: 600 },
    { title: "面试环节3", subtitle: "应急处置", timeLimit: 480 },
    { title: "面试环节4", subtitle: "现场问答", timeLimit: null },
  ],
  questions: [
    { title: "专业知识问答", timeLimit: 600 },
    { title: "案例分析", timeLimit: 900 },
    { title: "情景模拟", timeLimit: 480 },
  ]
}

interface InterviewItemManagerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  items: InterviewItem[]
  onSave: (items: InterviewItem[]) => void
}

export default function InterviewItemManager({ 
  open, 
  onOpenChange, 
  items, 
  onSave 
}: InterviewItemManagerProps) {
  const [localItems, setLocalItems] = useState<InterviewItem[]>([])
  const [selectedItem, setSelectedItem] = useState<InterviewItem | null>(null)
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [editingItem, setEditingItem] = useState<Partial<InterviewItem>>({})
  const [isEditing, setIsEditing] = useState(false)
  const [draggedItem, setDraggedItem] = useState<InterviewItem | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  // 初始化本地数据
  useEffect(() => {
    if (open) {
      // 按order字段排序，确保显示顺序正确
      const sortedItems = [...items].sort((a, b) => a.order - b.order)
      console.log("初始化面试项目，排序后的数据:", sortedItems)
      setLocalItems(sortedItems)
      setSelectedItem(null)
      setSelectedItems(new Set())
      setEditingItem({})
      setIsEditing(false)
    }
  }, [open, items])

  // 格式化时间显示
  const formatTime = (seconds: number | null) => {
    if (seconds === null) return "无限制"
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    if (remainingSeconds === 0) return `${minutes}分钟`
    return `${minutes}分${remainingSeconds}秒`
  }

  // 生成新ID
  const generateId = () => Math.random().toString(36).substr(2, 9)

  // 选择项目
  const handleSelectItem = (item: InterviewItem) => {
    setSelectedItem(item)
    setEditingItem({ ...item })
    setIsEditing(true)
  }

  // 新增项目
  const handleAddItem = (template?: any) => {
    const newItem: InterviewItem = {
      id: generateId(),
      type: template?.type || 'question',
      title: template?.title || '',
      subtitle: template?.subtitle || '',
      content: template?.content || '',
      timeLimit: template?.timeLimit || 300,
      order: localItems.length,
      isActive: true
    }
    
    setLocalItems([...localItems, newItem])
    setSelectedItem(newItem)
    setEditingItem({ ...newItem })
    setIsEditing(true)
  }

  // 保存编辑
  const handleSaveEdit = () => {
    if (!editingItem.title?.trim()) return

    const updatedItem: InterviewItem = {
      id: editingItem.id || generateId(),
      type: editingItem.type || 'question',
      title: editingItem.title.trim(),
      subtitle: editingItem.subtitle?.trim() || '',
      content: editingItem.content?.trim() || '',
      timeLimit: editingItem.timeLimit,
      order: editingItem.order || localItems.length,
      isActive: editingItem.isActive !== false
    }

    if (selectedItem) {
      // 更新现有项目
      setLocalItems(localItems.map(item => 
        item.id === selectedItem.id ? updatedItem : item
      ))
    } else {
      // 添加新项目
      setLocalItems([...localItems, updatedItem])
    }

    setSelectedItem(updatedItem)
    setIsEditing(false)
  }

  // 取消编辑
  const handleCancelEdit = () => {
    if (selectedItem) {
      setEditingItem({ ...selectedItem })
    } else {
      setEditingItem({})
      setSelectedItem(null)
    }
    setIsEditing(false)
  }

  // 删除项目
  const handleDeleteItem = (id: string) => {
    setLocalItems(localItems.filter(item => item.id !== id))
    if (selectedItem?.id === id) {
      setSelectedItem(null)
      setEditingItem({})
      setIsEditing(false)
    }
  }

  // 切换项目状态
  const handleToggleActive = (id: string) => {
    setLocalItems(localItems.map(item => 
      item.id === id ? { ...item, isActive: !item.isActive } : item
    ))
  }

  // 批量选择
  const handleSelectAll = () => {
    if (selectedItems.size === localItems.length) {
      setSelectedItems(new Set())
    } else {
      setSelectedItems(new Set(localItems.map(item => item.id)))
    }
  }

  // 批量删除
  const handleBatchDelete = () => {
    setLocalItems(localItems.filter(item => !selectedItems.has(item.id)))
    setSelectedItems(new Set())
    if (selectedItem && selectedItems.has(selectedItem.id)) {
      setSelectedItem(null)
      setEditingItem({})
      setIsEditing(false)
    }
  }

  // 拖拽排序相关函数
  const handleDragStart = (e: React.DragEvent, item: InterviewItem) => {
    setDraggedItem(item)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/html', item.id)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverIndex(index)
  }

  const handleDragLeave = () => {
    setDragOverIndex(null)
  }

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    setDragOverIndex(null)

    if (!draggedItem) return

    const dragIndex = localItems.findIndex(item => item.id === draggedItem.id)
    if (dragIndex === dropIndex) return

    // 重新排序数组
    const newItems = [...localItems]
    const [removed] = newItems.splice(dragIndex, 1)
    newItems.splice(dropIndex, 0, removed)

    // 更新order字段
    const updatedItems = newItems.map((item, index) => ({
      ...item,
      order: index
    }))

    setLocalItems(updatedItems)
    setDraggedItem(null)
  }

  const handleDragEnd = () => {
    setDraggedItem(null)
    setDragOverIndex(null)
  }

  // 上移/下移项目
  const moveItem = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= localItems.length) return

    const newItems = [...localItems]
    const [item] = newItems.splice(index, 1)
    newItems.splice(newIndex, 0, item)

    // 更新order字段
    const updatedItems = newItems.map((item, index) => ({
      ...item,
      order: index
    }))

    setLocalItems(updatedItems)
  }

  // 批量启用/禁用
  const handleBatchToggle = (active: boolean) => {
    setLocalItems(localItems.map(item => 
      selectedItems.has(item.id) ? { ...item, isActive: active } : item
    ))
  }

  // 保存所有更改
  const handleSaveAll = () => {
    // 确保order字段正确排序
    const sortedItems = localItems.map((item, index) => ({
      ...item,
      order: index
    }))

    console.log("保存面试项目，排序后的数据:", sortedItems)
    onSave(sortedItems)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="w-5 h-5" />
            题目/环节管理
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-6 h-[70vh]">
          {/* 左侧：项目列表 */}
          <div className="w-1/2 flex flex-col">
            {/* 操作栏 */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Plus className="w-4 h-4 mr-1" />
                      新增
                      <ChevronDown className="w-4 h-4 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => handleAddItem()}>
                      空白创建
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled className="font-medium">
                      面试环节模板
                    </DropdownMenuItem>
                    {TEMPLATES.interview_stages.map((template, index) => (
                      <DropdownMenuItem 
                        key={index}
                        onClick={() => handleAddItem({ 
                          ...template, 
                          type: 'interview_stage' 
                        })}
                      >
                        {template.title} - {template.subtitle}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuItem disabled className="font-medium">
                      题目模板
                    </DropdownMenuItem>
                    {TEMPLATES.questions.map((template, index) => (
                      <DropdownMenuItem 
                        key={index}
                        onClick={() => handleAddItem({ 
                          ...template, 
                          type: 'question' 
                        })}
                      >
                        {template.title}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {selectedItems.size > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        批量操作 ({selectedItems.size})
                        <ChevronDown className="w-4 h-4 ml-1" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => handleBatchToggle(true)}>
                        批量启用
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleBatchToggle(false)}>
                        批量禁用
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={handleBatchDelete}
                        className="text-red-600"
                      >
                        批量删除
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>

              <div className="flex items-center gap-2">
                <div className="text-xs text-gray-500">
                  拖拽 <GripVertical className="w-3 h-3 inline" /> 或使用箭头调整顺序
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSelectAll}
                >
                  {selectedItems.size === localItems.length ? "取消全选" : "全选"}
                </Button>
              </div>
            </div>

            {/* 项目列表 */}
            <div className="flex-1 overflow-y-auto space-y-2">
              {localItems.map((item, index) => (
                <div
                  key={item.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, item)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`group p-3 border rounded-lg cursor-pointer transition-all ${
                    selectedItem?.id === item.id
                      ? "border-blue-300 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  } ${!item.isActive ? "opacity-60" : ""} ${
                    draggedItem?.id === item.id ? "opacity-50" : ""
                  } ${
                    dragOverIndex === index ? "border-blue-500 bg-blue-100" : ""
                  }`}
                  onClick={() => handleSelectItem(item)}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={selectedItems.has(item.id)}
                      onCheckedChange={(checked) => {
                        const newSelected = new Set(selectedItems)
                        if (checked) {
                          newSelected.add(item.id)
                        } else {
                          newSelected.delete(item.id)
                        }
                        setSelectedItems(newSelected)
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />

                    {/* 拖拽手柄 */}
                    <div
                      className="w-4 h-4 mt-1 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      <GripVertical className="w-4 h-4" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {item.type === 'interview_stage' ? (
                          <Users className="w-4 h-4 text-purple-500" />
                        ) : (
                          <FileText className="w-4 h-4 text-blue-500" />
                        )}
                        <span className="font-medium truncate">
                          {item.title}
                        </span>
                        {!item.isActive && (
                          <Badge variant="secondary" className="text-xs">
                            已禁用
                          </Badge>
                        )}
                      </div>
                      
                      {item.subtitle && (
                        <div className="text-sm text-gray-600 mb-1">
                          {item.subtitle}
                        </div>
                      )}
                      
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTime(item.timeLimit)}
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {item.type === 'interview_stage' ? '面试环节' : '题目'}
                        </Badge>
                      </div>
                    </div>

                    {/* 操作按钮组 */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {/* 上移按钮 */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          moveItem(index, 'up')
                        }}
                        disabled={index === 0}
                        className="h-8 w-8 p-0"
                        title="上移"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </Button>

                      {/* 下移按钮 */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          moveItem(index, 'down')
                        }}
                        disabled={index === localItems.length - 1}
                        className="h-8 w-8 p-0"
                        title="下移"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </Button>

                      {/* 删除按钮 */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteItem(item.id)
                        }}
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                        title="删除"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 右侧：编辑表单 */}
          <div className="w-1/2 border-l pl-6">
            {selectedItem ? (
              <div className="h-full flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium">编辑项目</h3>
                  <div className="flex items-center gap-2">
                    {isEditing ? (
                      <>
                        <Button size="sm" onClick={handleSaveEdit}>
                          <Save className="w-4 h-4 mr-1" />
                          保存
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={handleCancelEdit}
                        >
                          <X className="w-4 h-4 mr-1" />
                          取消
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" onClick={() => setIsEditing(true)}>
                        <Edit className="w-4 h-4 mr-1" />
                        编辑
                      </Button>
                    )}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto space-y-4">
                  {/* 类型选择 */}
                  <div>
                    <Label>类型</Label>
                    <RadioGroup
                      value={editingItem.type || 'question'}
                      onValueChange={(value) => 
                        setEditingItem({ ...editingItem, type: value as 'question' | 'interview_stage' })
                      }
                      disabled={!isEditing}
                      className="flex gap-6 mt-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="question" id="question" />
                        <Label htmlFor="question">题目</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="interview_stage" id="interview_stage" />
                        <Label htmlFor="interview_stage">面试环节</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* 标题 */}
                  <div>
                    <Label htmlFor="title">标题 *</Label>
                    <Input
                      id="title"
                      value={editingItem.title || ''}
                      onChange={(e) => 
                        setEditingItem({ ...editingItem, title: e.target.value })
                      }
                      disabled={!isEditing}
                      placeholder="请输入标题"
                      className="mt-1"
                    />
                  </div>

                  {/* 副标题 */}
                  <div>
                    <Label htmlFor="subtitle">副标题</Label>
                    <Input
                      id="subtitle"
                      value={editingItem.subtitle || ''}
                      onChange={(e) => 
                        setEditingItem({ ...editingItem, subtitle: e.target.value })
                      }
                      disabled={!isEditing}
                      placeholder="请输入副标题"
                      className="mt-1"
                    />
                  </div>

                  {/* 时间设置 */}
                  <div>
                    <Label>时间限制</Label>
                    <div className="flex items-center gap-3 mt-2">
                      <Input
                        type="number"
                        value={editingItem.timeLimit ? Math.floor(editingItem.timeLimit / 60) : ''}
                        onChange={(e) => {
                          const minutes = parseInt(e.target.value) || 0
                          setEditingItem({ 
                            ...editingItem, 
                            timeLimit: minutes > 0 ? minutes * 60 : null 
                          })
                        }}
                        disabled={!isEditing || editingItem.timeLimit === null}
                        placeholder="0"
                        className="w-20"
                      />
                      <span className="text-sm text-gray-500">分钟</span>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="unlimited"
                          checked={editingItem.timeLimit === null}
                          onCheckedChange={(checked) => 
                            setEditingItem({ 
                              ...editingItem, 
                              timeLimit: checked ? null : 300 
                            })
                          }
                          disabled={!isEditing}
                        />
                        <Label htmlFor="unlimited" className="text-sm">
                          无限制
                        </Label>
                      </div>
                    </div>
                  </div>

                  {/* 内容（仅题目类型） */}
                  {editingItem.type === 'question' && (
                    <div>
                      <Label htmlFor="content">题目内容</Label>
                      <Textarea
                        id="content"
                        value={editingItem.content || ''}
                        onChange={(e) => 
                          setEditingItem({ ...editingItem, content: e.target.value })
                        }
                        disabled={!isEditing}
                        placeholder="请输入题目内容"
                        className="mt-1 min-h-[120px]"
                      />
                    </div>
                  )}

                  {/* 启用状态 */}
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="active"
                      checked={editingItem.isActive !== false}
                      onCheckedChange={(checked) => 
                        setEditingItem({ ...editingItem, isActive: !!checked })
                      }
                      disabled={!isEditing}
                    />
                    <Label htmlFor="active">启用此项目</Label>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>选择左侧项目进行编辑</p>
                  <p className="text-sm mt-1">或点击"新增"创建新项目</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 底部操作栏 */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-gray-500">
            共 {localItems.length} 个项目，{localItems.filter(item => item.isActive).length} 个已启用
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button onClick={handleSaveAll}>
              保存全部
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
