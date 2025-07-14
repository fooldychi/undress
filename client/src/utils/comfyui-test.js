// ComfyUI WebSocket 连接测试工具
import { initializeWebSocket, wsConnection, isWsConnected } from '../services/comfyui.js'

/**
 * 测试WebSocket连接和消息处理
 */
export async function testWebSocketConnection() {
  console.log('🧪 开始测试WebSocket连接...')
  
  try {
    // 初始化WebSocket连接
    const connected = await initializeWebSocket()
    
    if (connected) {
      console.log('✅ WebSocket连接成功')
      console.log('📡 连接状态:', wsConnection.readyState)
      console.log('🔗 连接URL:', wsConnection.url)
      
      // 监听消息
      const messageListener = (event) => {
        try {
          const message = JSON.parse(event.data)
          console.log('📨 收到WebSocket消息:', message.type, message.data)
        } catch (error) {
          console.log('📨 收到原始消息:', event.data)
        }
      }
      
      wsConnection.addEventListener('message', messageListener)
      
      // 5秒后移除监听器
      setTimeout(() => {
        wsConnection.removeEventListener('message', messageListener)
        console.log('🔇 停止监听WebSocket消息')
      }, 5000)
      
      return true
    } else {
      console.error('❌ WebSocket连接失败')
      return false
    }
  } catch (error) {
    console.error('❌ WebSocket测试失败:', error)
    return false
  }
}

/**
 * 测试任务提交和监听
 */
export async function testTaskSubmission() {
  console.log('🧪 开始测试任务提交...')
  
  if (!isWsConnected) {
    console.error('❌ WebSocket未连接，无法测试任务提交')
    return false
  }
  
  // 这里可以添加实际的任务提交测试
  console.log('📝 注意：实际任务提交需要有效的工作流配置')
  return true
}

/**
 * 检查WebSocket健康状态
 */
export function checkWebSocketHealth() {
  console.log('🏥 检查WebSocket健康状态...')
  
  if (!wsConnection) {
    console.log('❌ WebSocket连接不存在')
    return false
  }
  
  const states = {
    0: 'CONNECTING',
    1: 'OPEN', 
    2: 'CLOSING',
    3: 'CLOSED'
  }
  
  const state = wsConnection.readyState
  console.log(`📊 WebSocket状态: ${states[state]} (${state})`)
  console.log(`🔗 连接URL: ${wsConnection.url}`)
  console.log(`📡 连接标志: ${isWsConnected}`)
  
  return state === 1 // OPEN
}

/**
 * 在浏览器控制台暴露测试函数
 */
export function exposeTestFunctions() {
  if (typeof window !== 'undefined') {
    window.testWebSocketConnection = testWebSocketConnection
    window.testTaskSubmission = testTaskSubmission
    window.checkWebSocketHealth = checkWebSocketHealth
    
    console.log('🔧 ComfyUI测试函数已暴露到全局:')
    console.log('   - testWebSocketConnection(): 测试WebSocket连接')
    console.log('   - testTaskSubmission(): 测试任务提交')
    console.log('   - checkWebSocketHealth(): 检查WebSocket健康状态')
  }
}
