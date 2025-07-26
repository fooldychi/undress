// 测试 WebSocket 管理器修复
// 验证 _selectBestServer 函数已被正确移除和替换

import webSocketManager from './client/src/services/webSocketManager.js'

async function testWebSocketManager() {
  console.log('🧪 测试 WebSocket 管理器修复...')
  
  try {
    // 测试1: 检查 _selectBestServer 方法是否已被移除
    console.log('1️⃣ 检查 _selectBestServer 方法是否已移除...')
    if (typeof webSocketManager._selectBestServer === 'function') {
      console.error('❌ _selectBestServer 方法仍然存在')
      return false
    } else {
      console.log('✅ _selectBestServer 方法已成功移除')
    }
    
    // 测试2: 检查兼容性方法是否正常工作
    console.log('2️⃣ 检查兼容性方法...')
    if (typeof webSocketManager.initializeWebSocket === 'function') {
      console.log('✅ initializeWebSocket 方法存在')
    } else {
      console.error('❌ initializeWebSocket 方法不存在')
      return false
    }
    
    if (typeof webSocketManager.ensureWebSocketConnection === 'function') {
      console.log('✅ ensureWebSocketConnection 方法存在')
    } else {
      console.error('❌ ensureWebSocketConnection 方法不存在')
      return false
    }
    
    // 测试3: 检查任务管理方法
    console.log('3️⃣ 检查任务管理方法...')
    if (typeof webSocketManager.registerWindowTask === 'function') {
      console.log('✅ registerWindowTask 方法存在')
    } else {
      console.error('❌ registerWindowTask 方法不存在')
      return false
    }
    
    console.log('🎉 所有测试通过！WebSocket 管理器修复成功')
    return true
    
  } catch (error) {
    console.error('❌ 测试过程中出现错误:', error)
    return false
  }
}

// 运行测试
testWebSocketManager().then(success => {
  if (success) {
    console.log('✅ 修复验证成功')
  } else {
    console.log('❌ 修复验证失败')
  }
})
