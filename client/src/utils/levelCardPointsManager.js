/**
 * 等级卡积分管理系统
 * 基于后端API的积分管理，替代原有的本地积分系统
 */

import { pointsApi, levelCardApi } from '../services/api.js'
import { authApi } from '../services/api.js'

class LevelCardPointsManager {
  constructor() {
    this.pointsInfo = null
    this.lastUpdateTime = 0
    this.updateInterval = 30000 // 30秒更新一次
  }

  // 检查用户是否已登录
  isLoggedIn() {
    return authApi.isLoggedIn()
  }

  // 获取积分状态
  async getPointsStatus() {
    // 首先检查登录状态
    if (!this.isLoggedIn()) {
      return this.getDefaultStatus()
    }

    try {
      // 如果缓存还有效，直接返回缓存数据
      const now = Date.now()
      if (this.pointsInfo && (now - this.lastUpdateTime) < this.updateInterval) {
        return this.formatPointsStatus(this.pointsInfo)
      }

      // 从API获取最新积分信息
      const response = await pointsApi.getUserPoints()

      if (response.success) {
        this.pointsInfo = response.data
        this.lastUpdateTime = now
        return this.formatPointsStatus(this.pointsInfo)
      } else {
        console.error('获取积分信息失败:', response.message)
        // 如果是认证错误，返回未登录状态
        if (response.message && response.message.includes('令牌')) {
          return this.getDefaultStatus()
        }
        return this.getDefaultStatus()
      }
    } catch (error) {
      console.error('获取积分状态失败:', error)
      // 如果是认证错误，返回未登录状态
      if (error.message && (error.message.includes('令牌') || error.message.includes('401'))) {
        return this.getDefaultStatus()
      }
      return this.getDefaultStatus()
    }
  }

  // 格式化积分状态
  formatPointsStatus(pointsInfo) {
    const totalPoints = pointsInfo.total_points || 0
    const generationCost = 20 // 每次生成消耗20积分

    return {
      current: totalPoints,
      total_points: totalPoints,
      purchased_points: pointsInfo.purchased_points || 0,
      cards_count: pointsInfo.cards_count || 0,
      cards_breakdown: pointsInfo.cards_breakdown || [],
      canGenerate: totalPoints >= generationCost,
      generationCost: generationCost,
      isLoggedIn: true,
      // 兼容原有字段
      dailyRemaining: 0, // 等级卡系统没有每日免费概念
      dailyFreePoints: 0,
      totalUsedToday: 0,
      experienceCardPoints: 0
    }
  }

  // 获取默认状态
  getDefaultStatus() {
    const loggedIn = this.isLoggedIn()
    return {
      current: 0,
      total_points: 0,
      purchased_points: 0,
      cards_count: 0,
      cards_breakdown: [],
      canGenerate: false,
      generationCost: 20,
      isLoggedIn: loggedIn,
      dailyRemaining: 0,
      dailyFreePoints: 0,
      totalUsedToday: 0,
      experienceCardPoints: 0
    }
  }

  // 消耗积分
  async consumePoints(amount, description = '生成图片', mediaUrl = null) {
    if (!this.isLoggedIn()) {
      throw new Error('请先登录')
    }

    try {
      console.log(`💰 开始消耗积分: ${amount}点, 描述: ${description}`)
      if (mediaUrl) {
        console.log(`🎬 关联媒体URL: ${mediaUrl}`)
      }

      // 调用后端API消耗积分
      const response = await pointsApi.consumePoints(amount, description, mediaUrl)

      if (response.success) {
        console.log(`✅ 积分消耗成功: 消耗${amount}点, 剩余${response.data.remaining_points}点`)

        // 清除缓存，强制下次获取最新数据
        this.pointsInfo = null
        this.lastUpdateTime = 0

        return {
          success: true,
          message: '积分消耗成功',
          consumed: amount,
          remaining: response.data.remaining_points || 0
        }
      } else {
        throw new Error(response.message || '积分不足')
      }
    } catch (error) {
      console.error('消耗积分失败:', error)
      throw error
    }
  }

  // 刷新积分信息
  async refreshPoints() {
    this.pointsInfo = null
    this.lastUpdateTime = 0
    return await this.getPointsStatus()
  }

  // 强制清除缓存
  clearCache() {
    this.pointsInfo = null
    this.lastUpdateTime = 0
    console.log('🗑️ 积分缓存已清除')
  }

  // 绑定等级卡
  async bindLevelCard(cardNumber, cardPassword) {
    if (!this.isLoggedIn()) {
      throw new Error('请先登录')
    }

    try {
      const response = await levelCardApi.bindCard(cardNumber, cardPassword)

      if (response.success) {
        // 清除缓存，强制刷新积分信息
        this.pointsInfo = null
        this.lastUpdateTime = 0

        return {
          success: true,
          message: response.message,
          data: response.data
        }
      } else {
        throw new Error(response.message || '绑定失败')
      }
    } catch (error) {
      console.error('绑定等级卡失败:', error)
      throw error
    }
  }

  // 获取等级卡类型
  async getCardTypes() {
    try {
      const response = await levelCardApi.getCardTypes()

      if (response.success) {
        return response.data.cardTypes || []
      } else {
        console.error('获取等级卡类型失败:', response.message)
        return []
      }
    } catch (error) {
      console.error('获取等级卡类型失败:', error)
      return []
    }
  }

  // 获取用户的等级卡列表
  async getMyCards() {
    if (!this.isLoggedIn()) {
      return []
    }

    try {
      const response = await levelCardApi.getMyCards()

      if (response.success) {
        return response.data.cards || []
      } else {
        console.error('获取我的等级卡失败:', response.message)
        return []
      }
    } catch (error) {
      console.error('获取我的等级卡失败:', error)
      return []
    }
  }

  // 检查是否可以生成
  async canGenerate() {
    const status = await this.getPointsStatus()
    return status.canGenerate
  }

  // 获取生成成本
  getGenerationCost() {
    return 20 // 固定20积分
  }

  // 兼容原有接口 - 添加体验卡点数（现在通过等级卡系统）
  addExperienceCardPoints() {
    // 这个方法在等级卡系统中不再使用
    // 积分通过绑定等级卡获得
    return {
      success: false,
      message: '请使用等级卡绑定功能',
      added: 0
    }
  }

  // 兼容原有接口 - 获取购买历史
  getPurchaseHistory() {
    // 等级卡系统中，购买历史通过API获取
    return []
  }

  // 兼容原有接口 - 获取统计信息
  getStatistics() {
    return {
      totalPurchased: 0,
      totalUsed: 0,
      totalCards: 0
    }
  }
}

// 创建单例实例
const levelCardPointsManager = new LevelCardPointsManager()

export default levelCardPointsManager
