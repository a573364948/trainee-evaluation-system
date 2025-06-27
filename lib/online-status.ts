// 在线状态检测服务
class OnlineStatusService {
  private judgeLastSeen: Map<string, number> = new Map()
  private readonly OFFLINE_THRESHOLD = 5 * 60 * 1000 // 5分钟无活动视为离线

  // 更新评委最后活动时间
  updateJudgeActivity(judgeId: string) {
    this.judgeLastSeen.set(judgeId, Date.now())
  }

  // 检查评委是否在线
  isJudgeOnline(judgeId: string): boolean {
    const lastSeen = this.judgeLastSeen.get(judgeId)
    if (!lastSeen) return false
    return Date.now() - lastSeen < this.OFFLINE_THRESHOLD
  }

  // 获取所有在线评委
  getOnlineJudges(): string[] {
    const online: string[] = []
    const now = Date.now()

    this.judgeLastSeen.forEach((lastSeen, judgeId) => {
      if (now - lastSeen < this.OFFLINE_THRESHOLD) {
        online.push(judgeId)
      }
    })

    return online
  }

  // 清理离线评委记录
  cleanup() {
    const now = Date.now()
    const toDelete: string[] = []

    this.judgeLastSeen.forEach((lastSeen, judgeId) => {
      if (now - lastSeen > this.OFFLINE_THRESHOLD * 2) {
        toDelete.push(judgeId)
      }
    })

    toDelete.forEach((judgeId) => this.judgeLastSeen.delete(judgeId))
  }
}

export const onlineStatusService = new OnlineStatusService()

// 定期清理离线记录
setInterval(() => {
  onlineStatusService.cleanup()
}, 60000) // 每分钟清理一次
