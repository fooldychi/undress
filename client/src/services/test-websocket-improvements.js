// 测试WebSocket改进的简单脚本
// 用于验证错误处理和连接稳定性改进

import webSocketManager from './webSocketManager.js'
import { processUndressImage } from './comfyui.js'

// 模拟测试函数
async function testWebSocketImprovements() {
  console.log('🧪 开始测试WebSocket改进...')
  
  try {
    // 测试1: 连接到无效服务器
    console.log('\n📋 测试1: 连接到无效服务器')
    try {
      await webSocketManager.connectToServer('http://invalid-server:8188')
    } catch (error) {
      console.log('✅ 错误处理正常:', error.message)
      console.log('✅ 错误类型:', typeof error.message)
    }
    
    // 测试2: 确保连接失败不阻塞
    console.log('\n📋 测试2: 确保连接失败不阻塞')
    const connected = await webSocketManager.ensureWebSocketConnection('http://invalid-server:8188')
    console.log('✅ 连接失败返回false而不是抛出错误:', connected === false)
    
    // 测试3: 获取状态信息
    console.log('\n📋 测试3: 获取状态信息')
    const status = webSocketManager.getStatus()
    console.log('✅ 状态信息:', status)
    
    // 测试4: 模拟处理图片时的错误处理
    console.log('\n📋 测试4: 模拟处理图片时的错误处理')
    try {
      // 使用无效的base64数据
      const result = await processUndressImage('invalid-base64-data')
      console.log('❌ 应该抛出错误但没有')
    } catch (error) {
      console.log('✅ 图片处理错误处理正常:', error.message)
    }
    
    console.log('\n🎉 所有测试完成!')
    
  } catch (error) {
    console.error('❌ 测试过程中出现错误:', error)
  }
}

// 导出测试函数
export { testWebSocketImprovements }

// 如果直接运行此文件，执行测试
if (typeof window !== 'undefined') {
  window.testWebSocketImprovements = testWebSocketImprovements
  console.log('🔧 测试函数已添加到window.testWebSocketImprovements')
}
