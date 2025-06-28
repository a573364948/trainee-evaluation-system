"use client"

import { useEffect, useState } from "react"

interface HealthStatus {
  status: string
  timestamp: string
  database: {
    exists: boolean
    size: number
    lastModified: string | null
    backupCount: number
  }
  enhanced: boolean
}

export default function TestEnhanced() {
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    checkHealth()
  }, [])

  const checkHealth = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/health')
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      
      const data = await response.json()
      setHealthStatus(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误')
    } finally {
      setLoading(false)
    }
  }

  const testBackup = async () => {
    try {
      const response = await fetch('/api/admin/backup', {
        method: 'POST'
      })
      const data = await response.json()
      
      if (data.success) {
        alert(`备份成功: ${data.backupName}`)
        checkHealth() // 刷新状态
      } else {
        alert(`备份失败: ${data.error}`)
      }
    } catch (err) {
      alert(`备份错误: ${err instanceof Error ? err.message : '未知错误'}`)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">增强系统测试</h1>
        <div>加载中...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">增强系统测试</h1>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          错误: {error}
        </div>
        <button 
          onClick={checkHealth}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          重试
        </button>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">增强系统测试</h1>
      
      {/* 系统状态 */}
      <div className="bg-white border rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">系统健康状态</h2>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <div className="text-gray-600">系统状态</div>
            <div className={`font-bold ${healthStatus?.status === 'healthy' ? 'text-green-600' : 'text-red-600'}`}>
              {healthStatus?.status === 'healthy' ? '✅ 健康' : '❌ 异常'}
            </div>
          </div>
          
          <div>
            <div className="text-gray-600">增强功能</div>
            <div className={`font-bold ${healthStatus?.enhanced ? 'text-green-600' : 'text-red-600'}`}>
              {healthStatus?.enhanced ? '✅ 已启用' : '❌ 未启用'}
            </div>
          </div>
          
          <div>
            <div className="text-gray-600">数据库文件</div>
            <div className={`font-bold ${healthStatus?.database.exists ? 'text-green-600' : 'text-yellow-600'}`}>
              {healthStatus?.database.exists ? '✅ 存在' : '📝 将创建'}
            </div>
          </div>
          
          <div>
            <div className="text-gray-600">文件大小</div>
            <div className="font-bold">
              {healthStatus?.database.size ? `${(healthStatus.database.size / 1024).toFixed(2)} KB` : '0 KB'}
            </div>
          </div>
        </div>
        
        <div className="text-sm text-gray-500">
          最后更新: {healthStatus?.timestamp ? new Date(healthStatus.timestamp).toLocaleString('zh-CN') : '未知'}
        </div>
      </div>

      {/* 功能测试 */}
      <div className="bg-white border rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">功能测试</h2>
        
        <div className="space-y-4">
          <div>
            <h3 className="font-medium mb-2">数据持久化测试</h3>
            <p className="text-gray-600 mb-3">
              增强系统会自动将数据保存到文件系统，防止重启丢失。
            </p>
            <button 
              onClick={checkHealth}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mr-2"
            >
              检查数据库状态
            </button>
          </div>
          
          <div>
            <h3 className="font-medium mb-2">备份功能测试</h3>
            <p className="text-gray-600 mb-3">
              系统支持手动创建备份，自动管理备份文件。
            </p>
            <button 
              onClick={testBackup}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            >
              创建备份
            </button>
          </div>
        </div>
      </div>

      {/* 访问链接 */}
      <div className="bg-white border rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">系统访问</h2>
        
        <div className="space-y-2">
          <div>
            <a 
              href="/admin" 
              className="text-blue-600 hover:underline font-medium"
            >
              🔧 管理员控制台
            </a>
            <div className="text-gray-600 text-sm">候选人管理、面试流程控制</div>
          </div>
          
          <div>
            <a 
              href="/judge" 
              className="text-blue-600 hover:underline font-medium"
            >
              📝 评委评分页面
            </a>
            <div className="text-gray-600 text-sm">评委登录和评分界面</div>
          </div>
          
          <div>
            <a 
              href="/display" 
              className="text-blue-600 hover:underline font-medium"
            >
              📺 大屏展示页面
            </a>
            <div className="text-gray-600 text-sm">候选人信息和题目展示</div>
          </div>
          
          <div>
            <a 
              href="/admin/enhanced" 
              className="text-blue-600 hover:underline font-medium"
            >
              🚀 增强功能测试
            </a>
            <div className="text-gray-600 text-sm">SSE连接和系统状态监控</div>
          </div>
        </div>
      </div>
    </div>
  )
}