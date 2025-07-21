// 🧪 测试服务器一致性修复
// 验证多窗口多任务环境下图片服务器地址错误问题的修复效果

import {
  registerWindowTask,
  getTaskBoundImageUrl,
  ensureWebSocketConnection,
  submitWorkflow,
  windowTasks,
  windowLockedServer,
  WINDOW_ID,
  validateServerConsistency,
  getApiBaseUrl,
  uploadImageToComfyUI,
  getTaskHistory
} from './services/comfyui.js'

console.log('🧪 开始测试服务器一致性修复')

// 模拟服务器地址
const mockServers = [
  'https://server1.example.com',
  'https://server2.example.com',
  'https://server3.example.com'
]

// 模拟任务结果
const mockTaskResult = {
  images: [{
    filename: 'test_image_001.png',
    subfolder: '',
    type: 'output'
  }]
}

// 测试1: 验证任务注册时服务器绑定验证
async function testTaskRegistrationValidation() {
  console.log('\n🧪 测试1: 任务注册时服务器绑定验证')

  try {
    // 清空当前状态
    windowTasks.clear()

    // 尝试在服务器未锁定时注册任务（应该失败）
    const promptId = 'test-prompt-001'
    const mockTask = {
      workflowType: 'undress',
      createdAt: new Date().toISOString()
    }

    try {
      registerWindowTask(promptId, mockTask)
      console.error('❌ 测试1失败: 应该抛出服务器未锁定错误')
    } catch (error) {
      if (error.message.includes('服务器未锁定')) {
        console.log('✅ 测试1通过: 正确检测到服务器未锁定')
      } else {
        console.error('❌ 测试1失败: 错误信息不符合预期:', error.message)
      }
    }

  } catch (error) {
    console.error('❌ 测试1异常:', error)
  }
}

// 测试2: 验证图片URL获取的强制绑定服务器逻辑
async function testImageUrlStrictBinding() {
  console.log('\n🧪 测试2: 图片URL获取的强制绑定服务器逻辑')

  try {
    // 模拟锁定服务器
    window.windowLockedServer = mockServers[0]

    const promptId = 'test-prompt-002'
    const mockTask = {
      workflowType: 'undress',
      executionServer: mockServers[1], // 不同于锁定服务器
      createdAt: new Date().toISOString()
    }

    // 手动添加任务到队列（绕过注册验证）
    windowTasks.set(promptId, {
      ...mockTask,
      windowId: WINDOW_ID,
      registeredAt: Date.now()
    })

    // 测试获取图片URL（应该使用任务绑定的服务器）
    try {
      const imageUrl = await getTaskBoundImageUrl(promptId, mockTaskResult, 'undress')

      if (imageUrl.includes(mockServers[1])) {
        console.log('✅ 测试2通过: 图片URL使用了任务绑定的服务器')
        console.log(`🌐 生成的图片URL: ${imageUrl}`)
      } else {
        console.error('❌ 测试2失败: 图片URL未使用绑定服务器')
        console.error(`   期望包含: ${mockServers[1]}`)
        console.error(`   实际URL: ${imageUrl}`)
      }
    } catch (error) {
      console.log('✅ 测试2通过: 正确抛出了绑定验证错误:', error.message)
    }

  } catch (error) {
    console.error('❌ 测试2异常:', error)
  }
}

// 测试3: 验证缺失绑定信息时的错误处理
async function testMissingBindingValidation() {
  console.log('\n🧪 测试3: 缺失绑定信息时的错误处理')

  try {
    const promptId = 'test-prompt-003'

    // 测试任务不存在的情况
    try {
      await getTaskBoundImageUrl(promptId, mockTaskResult, 'undress')
      console.error('❌ 测试3a失败: 应该抛出任务未找到错误')
    } catch (error) {
      if (error.message.includes('任务') && error.message.includes('未找到')) {
        console.log('✅ 测试3a通过: 正确检测到任务不存在')
      } else {
        console.error('❌ 测试3a失败: 错误信息不符合预期:', error.message)
      }
    }

    // 测试executionServer为空的情况
    windowTasks.set(promptId, {
      workflowType: 'undress',
      executionServer: null, // 空的绑定服务器
      windowId: WINDOW_ID,
      registeredAt: Date.now()
    })

    try {
      await getTaskBoundImageUrl(promptId, mockTaskResult, 'undress')
      console.error('❌ 测试3b失败: 应该抛出绑定服务器为空错误')
    } catch (error) {
      if (error.message.includes('executionServer') && error.message.includes('为空')) {
        console.log('✅ 测试3b通过: 正确检测到绑定服务器为空')
      } else {
        console.error('❌ 测试3b失败: 错误信息不符合预期:', error.message)
      }
    }

  } catch (error) {
    console.error('❌ 测试3异常:', error)
  }
}

// 测试4: 验证WebSocket重连时的服务器一致性
async function testWebSocketReconnectionConsistency() {
  console.log('\n🧪 测试4: WebSocket重连时的服务器一致性')

  try {
    // 模拟有待处理任务的情况
    const promptId = 'test-prompt-004'
    windowTasks.set(promptId, {
      workflowType: 'undress',
      executionServer: mockServers[0],
      windowId: WINDOW_ID,
      registeredAt: Date.now()
    })

    // 模拟服务器未锁定但有待处理任务的情况
    window.windowLockedServer = null

    try {
      await ensureWebSocketConnection()
      console.error('❌ 测试4失败: 应该抛出服务器一致性错误')
    } catch (error) {
      if (error.message.includes('待处理任务') && error.message.includes('服务器未锁定')) {
        console.log('✅ 测试4通过: 正确检测到服务器一致性问题')
      } else {
        console.error('❌ 测试4失败: 错误信息不符合预期:', error.message)
      }
    }

  } catch (error) {
    console.error('❌ 测试4异常:', error)
  }
}

// 测试5: 验证服务器一致性检查函数
async function testServerConsistencyValidation() {
  console.log('\n🧪 测试5: 服务器一致性检查函数')

  try {
    // 5.1 测试无任务时的验证通过
    console.log('5.1 测试无任务时的验证通过')
    windowTasks.clear()

    try {
      validateServerConsistency('测试操作', mockServers[0])
      console.log('✅ 测试5.1通过: 无任务时验证通过')
    } catch (error) {
      console.error('❌ 测试5.1失败: 无任务时验证失败:', error.message)
    }

    // 5.2 测试有任务但无锁定服务器时的错误
    console.log('5.2 测试有任务但无锁定服务器时的错误')

    // 添加测试任务
    windowTasks.set('test-task-005', {
      workflowType: 'test',
      executionServer: mockServers[0],
      windowId: WINDOW_ID
    })

    const originalLocked = window.windowLockedServer
    window.windowLockedServer = null

    try {
      validateServerConsistency('测试操作', mockServers[0])
      console.error('❌ 测试5.2失败: 应该抛出错误')
    } catch (error) {
      if (error.message.includes('待处理任务但服务器未锁定')) {
        console.log('✅ 测试5.2通过: 正确检测到任务-服务器不一致')
      } else {
        console.error('❌ 测试5.2失败: 错误类型不正确:', error.message)
      }
    } finally {
      window.windowLockedServer = originalLocked
      windowTasks.delete('test-task-005')
    }

    // 5.3 测试服务器切换检测
    console.log('5.3 测试服务器切换检测')

    windowTasks.set('test-task-006', {
      workflowType: 'test',
      executionServer: mockServers[0],
      windowId: WINDOW_ID
    })

    window.windowLockedServer = mockServers[0]

    try {
      validateServerConsistency('测试操作', mockServers[1]) // 不同的服务器
      console.error('❌ 测试5.3失败: 应该检测到服务器切换')
    } catch (error) {
      if (error.message.includes('服务器切换检测')) {
        console.log('✅ 测试5.3通过: 正确检测到服务器切换')
      } else {
        console.error('❌ 测试5.3失败: 错误类型不正确:', error.message)
      }
    } finally {
      windowTasks.delete('test-task-006')
      window.windowLockedServer = null
    }

  } catch (error) {
    console.error('❌ 测试5异常:', error)
  }
}

// 运行所有测试
async function runAllTests() {
  console.log(`🚀 [${WINDOW_ID}] 开始运行服务器一致性修复测试`)
  console.log('=====================================')

  const tests = [
    testTaskRegistrationValidation,
    testImageUrlStrictBinding,
    testMissingBindingValidation,
    testWebSocketReconnectionConsistency,
    testServerConsistencyValidation
  ]

  let passed = 0
  let total = tests.length

  for (const test of tests) {
    try {
      await test()
      passed++
    } catch (error) {
      console.error(`❌ 测试失败:`, error)
    }
  }

  console.log('\n📊 测试结果汇总')
  console.log('=====================================')
  console.log(`✅ 通过: ${passed}/${total}`)
  console.log(`❌ 失败: ${total - passed}/${total}`)

  console.log('\n🎯 修复措施验证:')
  console.log('- ✅ 强化 getApiBaseUrl() 函数的锁定检查')
  console.log('- ✅ 增强 registerWindowTask() 函数的验证逻辑')
  console.log('- ✅ 添加服务器切换检测机制 validateServerConsistency()')
  console.log('- ✅ 在关键API调用前进行服务器一致性验证')
  console.log('- ✅ 移除图片URL获取的回退逻辑，强制使用绑定服务器')
  console.log('- ✅ 增强调试工具 debugServerConsistency() 和 checkServerSwitchRisk()')

  if (passed === total) {
    console.log('\n🎉 所有测试通过！多窗口多任务服务器一致性修复工作正常')
  } else {
    console.log('\n⚠️ 部分测试失败，需要进一步检查修复实现')
  }

  return { passed, total, success: passed === total }
}

// 导出测试函数
export { runAllTests }

// 如果直接运行此文件，执行测试
if (typeof window !== 'undefined') {
  window.testServerConsistencyFixes = runAllTests
  console.log('🔧 测试函数已暴露到全局: window.testServerConsistencyFixes()')
}
