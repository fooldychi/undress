/**
 * 体验点管理系统
 * 功能：
 * - 每日60点免费体验点
 * - 每次生成消耗20点
 * - 体验卡充值500点
 */

const STORAGE_KEYS = {
  POINTS: 'user_points',
  LAST_RESET_DATE: 'last_reset_date',
  TOTAL_USED: 'total_points_used',
  PURCHASE_HISTORY: 'purchase_history'
}

const CONFIG = {
  DAILY_FREE_POINTS: 60,      // 每日免费点数
  GENERATION_COST: 20,        // 每次生成消耗点数
  EXPERIENCE_CARD_POINTS: 500, // 体验卡点数
  EXPERIENCE_CARD_PRICE: 9.9   // 体验卡价格（元）
}

class PointsManager {
  constructor() {
    this.initializePoints()
  }

  // 初始化点数系统
  initializePoints() {
    const today = this.getTodayString()
    const lastResetDate = localStorage.getItem(STORAGE_KEYS.LAST_RESET_DATE)
    
    // 如果是新的一天，重置免费点数
    if (lastResetDate !== today) {
      this.resetDailyPoints()
    }
  }

  // 获取今天的日期字符串
  getTodayString() {
    return new Date().toISOString().split('T')[0]
  }

  // 重置每日点数
  resetDailyPoints() {
    const today = this.getTodayString()
    const currentPoints = this.getCurrentPoints()
    const purchasedPoints = currentPoints - this.getDailyRemainingPoints()
    
    // 保留购买的点数，重置免费点数
    const newPoints = CONFIG.DAILY_FREE_POINTS + Math.max(0, purchasedPoints)
    
    localStorage.setItem(STORAGE_KEYS.POINTS, newPoints.toString())
    localStorage.setItem(STORAGE_KEYS.LAST_RESET_DATE, today)
    
    console.log(`🔄 每日点数已重置: ${newPoints} 点`)
  }

  // 获取当前点数
  getCurrentPoints() {
    const points = localStorage.getItem(STORAGE_KEYS.POINTS)
    return points ? parseInt(points, 10) : CONFIG.DAILY_FREE_POINTS
  }

  // 获取今日剩余免费点数
  getDailyRemainingPoints() {
    const today = this.getTodayString()
    const lastResetDate = localStorage.getItem(STORAGE_KEYS.LAST_RESET_DATE)
    
    if (lastResetDate !== today) {
      return CONFIG.DAILY_FREE_POINTS
    }
    
    const currentPoints = this.getCurrentPoints()
    const totalUsedToday = this.getTotalUsedToday()
    const dailyUsed = Math.min(totalUsedToday, CONFIG.DAILY_FREE_POINTS)
    
    return Math.max(0, CONFIG.DAILY_FREE_POINTS - dailyUsed)
  }

  // 获取今日已使用点数
  getTotalUsedToday() {
    const today = this.getTodayString()
    const lastResetDate = localStorage.getItem(STORAGE_KEYS.LAST_RESET_DATE)
    
    if (lastResetDate !== today) {
      return 0
    }
    
    const totalUsed = localStorage.getItem(STORAGE_KEYS.TOTAL_USED)
    return totalUsed ? parseInt(totalUsed, 10) : 0
  }

  // 检查是否有足够点数
  hasEnoughPoints() {
    return this.getCurrentPoints() >= CONFIG.GENERATION_COST
  }

  // 消耗点数
  consumePoints() {
    const currentPoints = this.getCurrentPoints()
    
    if (currentPoints < CONFIG.GENERATION_COST) {
      throw new Error(`点数不足！当前点数: ${currentPoints}，需要: ${CONFIG.GENERATION_COST}`)
    }
    
    const newPoints = currentPoints - CONFIG.GENERATION_COST
    const totalUsed = this.getTotalUsedToday() + CONFIG.GENERATION_COST
    
    localStorage.setItem(STORAGE_KEYS.POINTS, newPoints.toString())
    localStorage.setItem(STORAGE_KEYS.TOTAL_USED, totalUsed.toString())
    
    console.log(`💰 消耗 ${CONFIG.GENERATION_COST} 点，剩余: ${newPoints} 点`)
    
    return {
      consumed: CONFIG.GENERATION_COST,
      remaining: newPoints,
      dailyRemaining: this.getDailyRemainingPoints()
    }
  }

  // 添加体验卡点数
  addExperienceCardPoints() {
    const currentPoints = this.getCurrentPoints()
    const newPoints = currentPoints + CONFIG.EXPERIENCE_CARD_POINTS
    
    localStorage.setItem(STORAGE_KEYS.POINTS, newPoints.toString())
    
    // 记录购买历史
    this.recordPurchase()
    
    console.log(`🎁 体验卡充值成功！获得 ${CONFIG.EXPERIENCE_CARD_POINTS} 点，总计: ${newPoints} 点`)
    
    return {
      added: CONFIG.EXPERIENCE_CARD_POINTS,
      total: newPoints
    }
  }

  // 记录购买历史
  recordPurchase() {
    const history = this.getPurchaseHistory()
    const purchase = {
      id: Date.now().toString(),
      type: 'experience_card',
      points: CONFIG.EXPERIENCE_CARD_POINTS,
      price: CONFIG.EXPERIENCE_CARD_PRICE,
      timestamp: new Date().toISOString(),
      date: this.getTodayString()
    }
    
    history.push(purchase)
    localStorage.setItem(STORAGE_KEYS.PURCHASE_HISTORY, JSON.stringify(history))
  }

  // 获取购买历史
  getPurchaseHistory() {
    const history = localStorage.getItem(STORAGE_KEYS.PURCHASE_HISTORY)
    return history ? JSON.parse(history) : []
  }

  // 获取点数状态信息
  getPointsStatus() {
    const currentPoints = this.getCurrentPoints()
    const dailyRemaining = this.getDailyRemainingPoints()
    const totalUsedToday = this.getTotalUsedToday()
    const canGenerate = this.hasEnoughPoints()
    const purchaseHistory = this.getPurchaseHistory()
    
    return {
      current: currentPoints,
      dailyRemaining,
      totalUsedToday,
      canGenerate,
      generationCost: CONFIG.GENERATION_COST,
      dailyFreePoints: CONFIG.DAILY_FREE_POINTS,
      experienceCardPoints: CONFIG.EXPERIENCE_CARD_POINTS,
      experienceCardPrice: CONFIG.EXPERIENCE_CARD_PRICE,
      purchaseHistory,
      nextResetTime: this.getNextResetTime()
    }
  }

  // 获取下次重置时间
  getNextResetTime() {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0)
    return tomorrow.toISOString()
  }

  // 清除所有数据（调试用）
  clearAllData() {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key)
    })
    console.log('🗑️ 所有点数数据已清除')
  }

  // 获取配置信息
  getConfig() {
    return { ...CONFIG }
  }
}

// 创建全局实例
const pointsManager = new PointsManager()

export default pointsManager
export { CONFIG as POINTS_CONFIG }
