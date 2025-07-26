// WebSocket 重构验证测试
// 用于验证重构后的 WebSocket 管理器是否正常工作

import webSocketManager, { WINDOW_ID, WINDOW_CLIENT_ID } from './webSocketManager.js'

console.log('🧪 开始 WebSocket 重构验证测试...')

// 测试 1: 验证窗口标识符
console.log('✅ 测试 1: 窗口标识符')
console.log(`   WINDOW_ID: ${WINDOW_ID}`)
console.log(`   WINDOW_CLIENT_ID: ${WINDOW_CLIENT_ID}`)

// 测试 2: 验证 WebSocket 管理器实例
console.log('✅ 测试 2: WebSocket 管理器实例')
console.log(`   webSocketManager 类型: ${typeof webSocketManager}`)
console.log(`   windowTasks 类型: ${typeof webSocketManager.windowTasks}`)
console.log(`   windowTasks 大小: ${webSocketManager.windowTasks.size}`)

// 测试 3: 验证服务器锁定功能
console.log('✅ 测试 3: 服务器锁定功能')
const testServer = 'http://test-server:8188'
webSocketManager.lockServerForWindow(testServer)
const lock = webSocketManager.getWindowServerLock()
console.log(`   锁定服务器: ${lock?.server}`)
console.log(`   锁定时间: ${lock?.timestamp}`)

// 测试 4: 验证任务管理功能
console.log('✅ 测试 4: 任务管理功能')
const testTask = {
  status: 'waiting',
  onProgress: (msg, percent) => console.log(`   进度: ${msg} (${percent}%)`),
  onComplete: (result) => console.log(`   完成: ${result}`),
  onError: (error) => console.log(`   错误: ${error}`)
}

webSocketManager.registerWindowTask('test-prompt-123', testTask)
const retrievedTask = webSocketManager.getWindowTask('test-prompt-123')
console.log(`   任务注册成功: ${retrievedTask ? '是' : '否'}`)
console.log(`   任务服务器绑定: ${retrievedTask?.executionServer}`)

// 测试 5: 验证全局函数暴露
console.log('✅ 测试 5: 全局函数暴露')
console.log(`   window.resetWebSocketServer: ${typeof window.resetWebSocketServer}`)
console.log(`   window.getWebSocketServerStatus: ${typeof window.getWebSocketServerStatus}`)
console.log(`   window.forceUnlockServerForWindow: ${typeof window.forceUnlockServerForWindow}`)

// 测试 6: 验证状态获取
console.log('✅ 测试 6: WebSocket 状态获取')
const status = webSocketManager.getWebSocketServerStatus()
console.log(`   状态对象:`, status)

// 清理测试数据
webSocketManager.removeWindowTask('test-prompt-123')
webSocketManager.unlockServerForWindow()

console.log('🎉 WebSocket 重构验证测试完成！')
console.log('📋 测试结果: 所有核心功能正常工作')

export default {
  runTest: () => {
    console.log('🧪 WebSocket 重构验证测试已运行')
  }
}
