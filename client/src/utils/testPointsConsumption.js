// 积分扣除测试工具
import levelCardPointsManager from './levelCardPointsManager.js'
import { pointsApi } from '../services/api.js'

/**
 * 测试积分扣除功能
 */
export async function testPointsConsumption() {
  console.log('🧪 开始测试积分扣除功能...')
  
  try {
    // 1. 检查登录状态
    console.log('\n1️⃣ 检查登录状态...')
    if (!levelCardPointsManager.isLoggedIn()) {
      console.error('❌ 用户未登录，无法测试积分扣除')
      return false
    }
    console.log('✅ 用户已登录')
    
    // 2. 获取当前积分状态
    console.log('\n2️⃣ 获取当前积分状态...')
    const initialStatus = await levelCardPointsManager.getPointsStatus()
    console.log('📊 当前积分状态:', initialStatus)
    
    if (initialStatus.current < 20) {
      console.warn('⚠️ 当前积分不足20点，无法测试扣除功能')
      return false
    }
    
    // 3. 测试积分扣除
    console.log('\n3️⃣ 测试积分扣除 (20点)...')
    const testImageUrl = 'data:image/png;base64,test-image-data'
    
    try {
      const consumeResult = await levelCardPointsManager.consumePoints(20, '测试积分扣除', testImageUrl)
      console.log('✅ 积分扣除成功:', consumeResult)
      
      // 4. 验证积分是否真的减少了
      console.log('\n4️⃣ 验证积分是否减少...')
      const afterStatus = await levelCardPointsManager.getPointsStatus()
      console.log('📊 扣除后积分状态:', afterStatus)
      
      const expectedPoints = initialStatus.current - 20
      if (afterStatus.current === expectedPoints) {
        console.log('✅ 积分扣除验证成功')
        return true
      } else {
        console.error(`❌ 积分扣除验证失败: 期望${expectedPoints}点，实际${afterStatus.current}点`)
        return false
      }
      
    } catch (error) {
      console.error('❌ 积分扣除失败:', error)
      return false
    }
    
  } catch (error) {
    console.error('❌ 积分扣除测试失败:', error)
    return false
  }
}

/**
 * 测试积分不足的情况
 */
export async function testInsufficientPoints() {
  console.log('🧪 开始测试积分不足的情况...')
  
  try {
    // 尝试扣除大量积分
    const largeAmount = 99999
    console.log(`💰 尝试扣除 ${largeAmount} 积分...`)
    
    try {
      await levelCardPointsManager.consumePoints(largeAmount, '测试积分不足')
      console.error('❌ 应该抛出积分不足错误，但没有')
      return false
    } catch (error) {
      if (error.message.includes('积分不足') || error.message.includes('不足')) {
        console.log('✅ 正确抛出积分不足错误:', error.message)
        return true
      } else {
        console.error('❌ 抛出了错误，但不是积分不足错误:', error.message)
        return false
      }
    }
    
  } catch (error) {
    console.error('❌ 积分不足测试失败:', error)
    return false
  }
}

/**
 * 测试积分历史记录
 */
export async function testPointsHistory() {
  console.log('🧪 开始测试积分历史记录...')
  
  try {
    console.log('📋 获取积分历史记录...')
    const history = await pointsApi.getPointsHistory(1, 10, true)
    
    if (history.success && history.data) {
      const logs = history.data.logs || history.data.items || []
      console.log(`✅ 获取到 ${logs.length} 条积分记录`)
      
      // 查找最近的消费记录
      const recentConsume = logs.find(log => 
        log.action_type === 'consume' && 
        (log.description.includes('测试') || log.description.includes('换衣') || log.description.includes('换脸'))
      )
      
      if (recentConsume) {
        console.log('✅ 找到最近的消费记录:', {
          description: recentConsume.description,
          points: recentConsume.points_amount,
          time: recentConsume.created_at
        })
        return true
      } else {
        console.warn('⚠️ 未找到最近的消费记录')
        return false
      }
    } else {
      console.error('❌ 获取积分历史失败:', history.message)
      return false
    }
    
  } catch (error) {
    console.error('❌ 积分历史测试失败:', error)
    return false
  }
}

/**
 * 测试等级卡信息
 */
export async function testLevelCards() {
  console.log('🧪 开始测试等级卡信息...')
  
  try {
    console.log('🎫 获取用户等级卡...')
    const cards = await levelCardPointsManager.getMyCards()
    
    console.log(`✅ 获取到 ${cards.length} 张等级卡`)
    
    if (cards.length > 0) {
      cards.forEach((card, index) => {
        console.log(`   ${index + 1}. ${card.card_number} (${card.type_name}) - 剩余: ${card.remaining_points}点`)
      })
      
      // 检查是否有体验卡
      const experienceCards = cards.filter(card => card.type_name === '体验卡')
      if (experienceCards.length > 0) {
        console.log(`✅ 找到 ${experienceCards.length} 张体验卡`)
        return true
      } else {
        console.log('ℹ️ 未找到体验卡')
        return true
      }
    } else {
      console.warn('⚠️ 用户没有绑定任何等级卡')
      return false
    }
    
  } catch (error) {
    console.error('❌ 等级卡测试失败:', error)
    return false
  }
}

/**
 * 完整的积分系统测试
 */
export async function fullPointsTest() {
  console.log('🚀 开始完整的积分系统测试...\n')
  
  const results = {
    login: false,
    cards: false,
    consumption: false,
    insufficient: false,
    history: false
  }
  
  try {
    // 1. 测试登录状态和等级卡
    results.cards = await testLevelCards()
    
    // 2. 测试积分扣除
    results.consumption = await testPointsConsumption()
    
    // 3. 测试积分不足
    results.insufficient = await testInsufficientPoints()
    
    // 4. 测试积分历史
    results.history = await testPointsHistory()
    
    // 总结结果
    console.log('\n📋 测试结果总结:')
    console.log(`   等级卡信息: ${results.cards ? '✅ 通过' : '❌ 失败'}`)
    console.log(`   积分扣除: ${results.consumption ? '✅ 通过' : '❌ 失败'}`)
    console.log(`   积分不足处理: ${results.insufficient ? '✅ 通过' : '❌ 失败'}`)
    console.log(`   积分历史: ${results.history ? '✅ 通过' : '❌ 失败'}`)
    
    const passedTests = Object.values(results).filter(Boolean).length
    const totalTests = Object.keys(results).length
    
    console.log(`\n🎯 测试通过率: ${passedTests}/${totalTests} (${Math.round(passedTests/totalTests*100)}%)`)
    
    if (passedTests === totalTests) {
      console.log('🎉 所有测试通过！积分系统工作正常')
      return true
    } else {
      console.log('⚠️ 部分测试失败，请检查积分系统配置')
      return false
    }
    
  } catch (error) {
    console.error('❌ 完整测试失败:', error)
    return false
  }
}

// 在开发环境下自动暴露到全局
if (import.meta.env.DEV) {
  window.testPointsConsumption = testPointsConsumption
  window.testInsufficientPoints = testInsufficientPoints
  window.testPointsHistory = testPointsHistory
  window.testLevelCards = testLevelCards
  window.fullPointsTest = fullPointsTest
  
  console.log('🛠️ 积分测试工具已加载到全局:')
  console.log('  - window.testPointsConsumption() - 测试积分扣除')
  console.log('  - window.testInsufficientPoints() - 测试积分不足')
  console.log('  - window.testPointsHistory() - 测试积分历史')
  console.log('  - window.testLevelCards() - 测试等级卡信息')
  console.log('  - window.fullPointsTest() - 完整积分系统测试')
}

export default {
  testPointsConsumption,
  testInsufficientPoints,
  testPointsHistory,
  testLevelCards,
  fullPointsTest
}
