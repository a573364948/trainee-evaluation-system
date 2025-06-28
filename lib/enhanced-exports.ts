// 临时导出文件，避免循环依赖
export { database } from './database'
export type { DatabaseData } from './database'

// 重新导出现有的 scoring store 作为增强版本的基础
export { scoringStore as enhancedScoringStore } from './scoring-store'