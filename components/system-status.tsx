"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { database } from "@/lib/database"
import { 
  Database, 
  Wifi, 
  WifiOff, 
  Download, 
  Upload, 
  RotateCcw,
  CheckCircle,
  AlertCircle,
  Clock,
  Users,
  HardDrive
} from "lucide-react"

interface SystemStatus {
  isInitialized: boolean
  activeConnections: number
  lastSaved: string | null
  database: {
    exists: boolean
    size: number
    lastModified: string | null
    backupCount: number
  }
}

interface BackupInfo {
  name: string
  date: string
  size: number
}

export function SystemStatusPanel() {
  const [status, setStatus] = useState<SystemStatus | null>(null)
  const [backups, setBackups] = useState<BackupInfo[]>([])
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  // 获取系统状态
  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/admin/backup')
      const data = await response.json()
      
      if (data.success) {
        setStatus(data.systemStatus)
        setBackups(data.backups)
      }
    } catch (error) {
      console.error('Failed to fetch system status:', error)
    }
  }

  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 30000) // 每30秒更新一次
    return () => clearInterval(interval)
  }, [])

  // 创建备份
  const createBackup = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/backup', {
        method: 'POST'
      })
      const data = await response.json()
      
      if (data.success) {
        toast({
          title: "备份成功",
          description: `备份文件已创建: ${data.backupName}`,
        })
        fetchStatus() // 刷新状态
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      toast({
        title: "备份失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // 恢复备份
  const restoreBackup = async (backupFileName: string) => {
    if (!confirm(`确定要恢复备份 "${backupFileName}" 吗？当前数据将被覆盖。`)) {
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/admin/backup/restore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ backupFileName })
      })
      const data = await response.json()
      
      if (data.success) {
        toast({
          title: "恢复成功",
          description: `数据已从备份 "${backupFileName}" 恢复`,
        })
        fetchStatus()
        // 刷新页面以加载新数据
        setTimeout(() => window.location.reload(), 1000)
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      toast({
        title: "恢复失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // 导出数据
  const exportData = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/export', {
        method: 'POST'
      })
      const data = await response.json()
      
      if (data.success) {
        // 下载文件
        const downloadResponse = await fetch(`/api/admin/export?file=${data.fileName}`)
        if (downloadResponse.ok) {
          const blob = await downloadResponse.blob()
          const url = window.URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = data.fileName
          document.body.appendChild(a)
          a.click()
          window.URL.revokeObjectURL(url)
          document.body.removeChild(a)
          
          toast({
            title: "导出成功",
            description: `数据已导出为 ${data.fileName}`,
          })
        }
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      toast({
        title: "导出失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '未知'
    return new Date(dateString).toLocaleString('zh-CN')
  }

  if (!status) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            系统状态
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">加载中...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* 系统状态概览 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            系统状态概览
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              {status.isInitialized ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-500" />
              )}
              <div>
                <div className="font-medium">系统状态</div>
                <div className="text-sm text-muted-foreground">
                  {status.isInitialized ? '已初始化' : '未初始化'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              <div>
                <div className="font-medium">活跃连接</div>
                <div className="text-sm text-muted-foreground">
                  {status.activeConnections} 个连接
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <HardDrive className="h-5 w-5 text-purple-500" />
              <div>
                <div className="font-medium">数据库大小</div>
                <div className="text-sm text-muted-foreground">
                  {formatFileSize(status.database.size)}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-500" />
              <div>
                <div className="font-medium">最后保存</div>
                <div className="text-sm text-muted-foreground">
                  {formatDate(status.lastSaved)}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 数据管理操作 */}
      <Card>
        <CardHeader>
          <CardTitle>数据管理</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button 
              onClick={createBackup} 
              disabled={loading}
              className="flex items-center gap-2"
            >
              <Database className="h-4 w-4" />
              创建备份
            </Button>
            
            <Button 
              variant="outline" 
              onClick={exportData} 
              disabled={loading}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              导出数据
            </Button>
            
            <Button 
              variant="outline" 
              onClick={fetchStatus}
              className="flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              刷新状态
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 备份列表 */}
      <Card>
        <CardHeader>
          <CardTitle>备份管理</CardTitle>
        </CardHeader>
        <CardContent>
          {backups.length === 0 ? (
            <div className="text-center text-muted-foreground py-4">
              暂无备份文件
            </div>
          ) : (
            <div className="space-y-2">
              {backups.map((backup) => (
                <div 
                  key={backup.name} 
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <div className="font-medium">{backup.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {formatDate(backup.date)} • {formatFileSize(backup.size)}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => restoreBackup(backup.name)}
                    disabled={loading}
                    className="flex items-center gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    恢复
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 数据库状态 */}
      <Card>
        <CardHeader>
          <CardTitle>数据库状态</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span>数据库文件</span>
              <Badge variant={status.database.exists ? "default" : "destructive"}>
                {status.database.exists ? "存在" : "不存在"}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <span>文件大小</span>
              <span className="text-sm">{formatFileSize(status.database.size)}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span>最后修改</span>
              <span className="text-sm">{formatDate(status.database.lastModified)}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span>备份数量</span>
              <span className="text-sm">{status.database.backupCount} 个</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}