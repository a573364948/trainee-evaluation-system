"use client"

import { useState, useEffect } from "react"
import type { Candidate } from "@/types/scoring"

export default function TestCandidatePage() {
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [currentCandidate, setCurrentCandidate] = useState<Candidate | null>(null)
  const [logs, setLogs] = useState<string[]>([])

  const log = (message: string) => {
    const time = new Date().toLocaleTimeString()
    const logMessage = `[${time}] ${message}`
    setLogs(prev => [...prev, logMessage])
    console.log(logMessage)
  }

  const loadCandidates = async () => {
    try {
      log('正在加载候选人数据...')
      const response = await fetch('/api/score')
      const data = await response.json()
      setCandidates(data.candidates)
      setCurrentCandidate(data.currentCandidate)
      log(`加载了 ${data.candidates.length} 个候选人，当前候选人：${data.currentCandidate?.name || '无'}`)
    } catch (error) {
      log(`加载候选人失败：${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  const setCurrentCandidateHandler = async (candidateId: string) => {
    try {
      log(`正在设置当前候选人：${candidateId}`)
      const response = await fetch('/api/admin/set-candidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId })
      })

      const result = await response.json()
      log(`设置结果：${JSON.stringify(result)}`)

      if (result.success) {
        // 重新加载数据验证
        await loadCandidates()
      } else {
        log(`设置失败：${result.error}`)
      }
    } catch (error) {
      log(`设置候选人失败：${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  useEffect(() => {
    log('页面加载完成，开始测试...')
    loadCandidates()
  }, [])

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>候选人设置功能测试</h1>
      
      <div>
        {candidates.map(candidate => (
          <div
            key={candidate.id}
            style={{
              border: '1px solid #ddd',
              margin: '10px 0',
              padding: '15px',
              borderRadius: '5px',
              backgroundColor: candidate.id === currentCandidate?.id ? '#e3f2fd' : 'white',
              borderColor: candidate.id === currentCandidate?.id ? '#2196f3' : '#ddd'
            }}
          >
            <h3>{candidate.name} ({candidate.number})</h3>
            <p>部门：{candidate.department}</p>
            <p>状态：{candidate.status}</p>
            <p>总分：{candidate.totalScore}</p>
            <button
              onClick={() => setCurrentCandidateHandler(candidate.id)}
              disabled={candidate.id === currentCandidate?.id}
              style={{
                backgroundColor: candidate.id === currentCandidate?.id ? '#ccc' : '#2196f3',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: candidate.id === currentCandidate?.id ? 'not-allowed' : 'pointer',
                margin: '5px'
              }}
            >
              {candidate.id === currentCandidate?.id ? '当前' : '设为当前'}
            </button>
          </div>
        ))}
      </div>

      <div style={{
        backgroundColor: '#f5f5f5',
        padding: '10px',
        borderRadius: '4px',
        marginTop: '20px',
        maxHeight: '300px',
        overflowY: 'auto',
        fontFamily: 'monospace',
        fontSize: '12px'
      }}>
        <h3>日志输出：</h3>
        <div>
          {logs.map((log, index) => (
            <div key={index}>{log}</div>
          ))}
        </div>
      </div>
    </div>
  )
}
