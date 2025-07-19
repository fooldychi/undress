// 多窗口任务隔离测试脚本
// 在浏览器控制台中运行此脚本来测试多窗口功能

console.log('🧪 开始多窗口任务隔离测试...')

// 测试1: 检查窗口唯一标识
function testWindowIdentity() {
  console.log('\n1️⃣ 测试窗口唯一标识:')
  
  if (typeof window.getWindowInfo === 'function') {
    const info = window.getWindowInfo()
    console.log('🪟 当前窗口信息:', info)
    
    // 验证clientId格式
    if (info.clientId && info.clientId.includes('_')) {
      console.log('✅ clientId 格式正确，包含窗口标识符')
    } else {
      console.log('❌ clientId 格式错误，缺少窗口标识符')
    }
    
    // 验证windowId存在
    if (info.windowId) {
      console.log('✅ windowId 存在')
    } else {
      console.log('❌ windowId 不存在')
    }
  } else {
    console.log('❌ getWindowInfo 函数不可用')
  }
}

// 测试2: 检查任务队列隔离
function testTaskQueueIsolation() {
  console.log('\n2️⃣ 测试任务队列隔离:')
  
  if (typeof window.pendingTasks !== 'undefined') {
    console.log(`📊 当前窗口任务数: ${window.pendingTasks.size}`)
    
    if (window.pendingTasks.size > 0) {
      console.log('📋 当前窗口任务列表:')
      for (const [promptId, task] of window.pendingTasks.entries()) {
        console.log(`  - ${promptId}: ${task.workflowType || 'unknown'} (窗口: ${task.windowId || 'unknown'})`)
      }
    } else {
      console.log('ℹ️ 当前窗口没有待处理任务')
    }
  } else {
    console.log('❌ pendingTasks 不可用')
  }
}

// 测试3: 检查服务器锁定状态
function testServerLocking() {
  console.log('\n3️⃣ 测试服务器锁定状态:')
  
  if (typeof window.getWebSocketServerStatus === 'function') {
    const status = window.getWebSocketServerStatus()
    console.log('🔒 服务器锁定状态:', status)
    
    if (status.windowId) {
      console.log('✅ 服务器状态包含窗口标识')
    } else {
      console.log('❌ 服务器状态缺少窗口标识')
    }
  } else {
    console.log('❌ getWebSocketServerStatus 函数不可用')
  }
}

// 测试4: 检查调试函数
function testDebugFunctions() {
  console.log('\n4️⃣ 测试调试函数:')
  
  const debugFunctions = [
    'debugTaskStatus',
    'debugWebSocketLock',
    'checkServerUnlockCondition',
    'validateServerConsistency'
  ]
  
  debugFunctions.forEach(funcName => {
    if (typeof window[funcName] === 'function') {
      console.log(`✅ ${funcName} 可用`)
    } else {
      console.log(`❌ ${funcName} 不可用`)
    }
  })
}

// 测试5: 模拟多窗口场景
function simulateMultiWindowScenario() {
  console.log('\n5️⃣ 模拟多窗口场景:')
  
  // 获取当前窗口信息
  const currentWindow = window.getWindowInfo()
  console.log('🪟 当前窗口:', currentWindow)
  
  // 模拟其他窗口的任务状态广播
  const mockTaskId = `test_${Date.now()}`
  const mockMessage = {
    type: 'task_status',
    windowId: 'mock_window_123',
    clientId: 'mock_client_456',
    promptId: mockTaskId,
    status: 'executing',
    timestamp: Date.now()
  }
  
  console.log('📡 模拟其他窗口的任务状态广播...')
  localStorage.setItem(`comfyui_task_${mockTaskId}`, JSON.stringify(mockMessage))
  
  // 等待一下看是否有日志输出
  setTimeout(() => {
    console.log('🧹 清理模拟数据')
    localStorage.removeItem(`comfyui_task_${mockTaskId}`)
  }, 1000)
}

// 运行所有测试
function runAllTests() {
  console.log('🚀 开始运行多窗口隔离测试套件...')
  
  testWindowIdentity()
  testTaskQueueIsolation()
  testServerLocking()
  testDebugFunctions()
  simulateMultiWindowScenario()
  
  console.log('\n✅ 多窗口隔离测试完成!')
  console.log('💡 提示: 在多个浏览器窗口中运行此测试，观察每个窗口的唯一标识符')
  console.log('💡 提示: 可以使用 window.getWindowInfo() 查看当前窗口信息')
}

// 导出测试函数
if (typeof window !== 'undefined') {
  window.testMultiWindow = runAllTests
  window.testWindowIdentity = testWindowIdentity
  window.testTaskQueueIsolation = testTaskQueueIsolation
  window.testServerLocking = testServerLocking
  window.testDebugFunctions = testDebugFunctions
  window.simulateMultiWindowScenario = simulateMultiWindowScenario
}

// 自动运行测试
runAllTests()
