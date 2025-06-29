'use client'

import { useState, useEffect, useCallback } from 'react'
import { useWebSocket } from './useWebSocket'
import type { Candidate, Judge, InterviewDimension } from '@/types/scoring'

interface UseJudgeWebSocketOptions {
  judgeId?: string
  isAuthenticated: boolean
}

interface UseJudgeWebSocketReturn {
  // 连接状态
  isConnected: boolean
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'reconnecting'
  
  // 数据状态
  candidates: Candidate[]
  judges: Judge[]
  currentCandidate: Candidate | null
  
  // 数据更新函数
  setCandidates: (candidates: Candidate[]) => void
  setJudges: (judges: Judge[]) => void
  setCurrentCandidate: (candidate: Candidate | null) => void
  
  // 事件处理
  onCandidateChanged: (callback: (candidate: Candidate) => void) => () => void
  onScoreUpdated: (callback: (data: any) => void) => () => void
  
  // 手动连接控制
  connect: () => Promise<void>
  disconnect: () => void
}

export function useJudgeWebSocket(options: UseJudgeWebSocketOptions): UseJudgeWebSocketReturn {
  const { judgeId, isAuthenticated } = options
  
  // 数据状态
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [judges, setJudges] = useState<Judge[]>([])
  const [currentCandidate, setCurrentCandidate] = useState<Candidate | null>(null)
  
  // WebSocket连接
  const {
    isConnected,
    connectionStatus,
    connect: wsConnect,
    disconnect: wsDisconnect,
    subscribe,
    onScoringEvent
  } = useWebSocket({
    clientType: 'judge',
    judgeId: judgeId,
    autoConnect: false // 手动控制连接
  })

  // 连接控制
  const connect = useCallback(async () => {
    if (isAuthenticated) {
      await wsConnect()
    }
  }, [isAuthenticated, wsConnect])

  const disconnect = useCallback(() => {
    wsDisconnect()
  }, [wsDisconnect])

  // 自动连接/断开
  useEffect(() => {
    if (isAuthenticated) {
      connect()
    } else {
      disconnect()
    }
  }, [isAuthenticated, connect, disconnect])

  // 监听初始数据事件
  useEffect(() => {
    const unsubscribe = subscribe('initial' as any, (data: any) => {
      console.log('[useJudgeWebSocket] Received initial data:', data)
      if (data.candidates) setCandidates(data.candidates)
      if (data.judges) setJudges(data.judges)
      if (data.currentCandidate) setCurrentCandidate(data.currentCandidate)
    })

    return unsubscribe
  }, [subscribe])

  // 监听候选人变更事件
  useEffect(() => {
    const unsubscribe = subscribe('candidate_changed', (data: Candidate) => {
      console.log('[useJudgeWebSocket] Candidate changed:', data)
      setCurrentCandidate(data)
    })

    return unsubscribe
  }, [subscribe])

  // 监听评分更新事件
  useEffect(() => {
    const unsubscribe = subscribe('score_updated', (data: any) => {
      console.log('[useJudgeWebSocket] Score updated:', data)
      if (data.candidate) {
        setCandidates(prev => prev.map(c => 
          c.id === data.candidate.id ? data.candidate : c
        ))
      }
    })

    return unsubscribe
  }, [subscribe])

  // 候选人变更回调
  const onCandidateChanged = useCallback((callback: (candidate: Candidate) => void) => {
    return subscribe('candidate_changed', callback)
  }, [subscribe])

  // 评分更新回调
  const onScoreUpdated = useCallback((callback: (data: any) => void) => {
    return subscribe('score_updated', callback)
  }, [subscribe])

  // 监听所有评分事件（用于调试）
  useEffect(() => {
    const unsubscribe = onScoringEvent((event) => {
      console.log('[useJudgeWebSocket] Received scoring event:', event.type, event.data)
    })

    return unsubscribe
  }, [onScoringEvent])

  return {
    // 连接状态
    isConnected,
    connectionStatus,
    
    // 数据状态
    candidates,
    judges,
    currentCandidate,
    
    // 数据更新函数
    setCandidates,
    setJudges,
    setCurrentCandidate,
    
    // 事件处理
    onCandidateChanged,
    onScoreUpdated,
    
    // 手动连接控制
    connect,
    disconnect
  }
}
