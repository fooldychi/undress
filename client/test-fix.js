// 测试修复后的 WebSocket 管理器和结果处理
import webSocketManager from './src/services/webSocketManager.js'

console.log('🧪 开始测试修复后的功能...')

// 模拟任务结果数据
const mockTaskResult = {
  outputs: {
    '732': {
      images: [
        {
          filename: 'test_image.png',
          subfolder: '',
          type: 'output'
        }
      ]
    },
    '49': {
      images: [
        {
          filename: 'input_image.png',
          subfolder: '',
          type: 'input'
        }
      ]
    }
  },
  executionServer: 'https://test-server.com',
  promptId: 'test-prompt-123'
}

// 测试结果提取
console.log('📊 测试结果提取...')
const manager = webSocketManager
const extractedResult = manager._extractResults({ 'test-prompt-123': mockTaskResult }, 'test-prompt-123')

console.log('✅ 提取结果:', extractedResult)
console.log('📋 节点数量:', Object.keys(extractedResult.outputs).length)
console.log('🔍 节点732存在:', !!extractedResult.outputs['732'])
console.log('🔍 执行服务器:', extractedResult.executionServer)

// 测试任务注册和获取
console.log('\n📝 测试任务管理...')
const testTask = {
  server: 'https://test-server.com',
  startTime: Date.now(),
  onComplete: (result) => console.log('✅ 任务完成:', result),
  onError: (error) => console.error('❌ 任务失败:', error)
}

manager.registerWindowTask('test-prompt-123', testTask)
const retrievedTask = manager.getWindowTask('test-prompt-123')
console.log('✅ 任务注册成功:', !!retrievedTask)
console.log('🔍 任务服务器:', retrievedTask?.server)

console.log('\n🎉 测试完成!')
