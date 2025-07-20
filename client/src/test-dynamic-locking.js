// 🧪 测试动态服务器锁定机制
// 验证任务驱动的动态锁定是否正常工作

import { 
  lockServerForWindow,
  unlockServerForWindow,
  forceUnlockServerForWindow,
  registerWindowTask,
  removeWindowTask,
  checkServerUnlockCondition,
  scheduleServerUnlockCheck,
  clearServerUnlockTimer,
  windowTasks,
  windowLockedServer,
  WINDOW_ID
} from './services/comfyui.js'

console.log('🧪 开始测试动态服务器锁定机制')

// 模拟服务器地址
const testServer = 'https://test-server.example.com'

// 测试1: 验证基本锁定和解锁机制
async function testBasicLocking() {
  console.log('\n🧪 测试1: 基本锁定和解锁机制')
  
  try {
    // 清空当前状态
    windowTasks.clear()
    if (windowLockedServer) {
      unlockServerForWindow()
    }
    
    console.log('1.1 测试锁定服务器')
    lockServerForWindow(testServer)
    
    if (windowLockedServer === testServer) {
      console.log('✅ 服务器锁定成功')
    } else {
      console.error('❌ 服务器锁定失败')
      return false
    }
    
    console.log('1.2 测试无任务时的解锁')
    const unlocked = checkServerUnlockCondition()
    
    if (unlocked && !windowLockedServer) {
      console.log('✅ 无任务时自动解锁成功')
    } else {
      console.error('❌ 无任务时自动解锁失败')
      return false
    }
    
    return true
  } catch (error) {
    console.error('❌ 测试1异常:', error)
    return false
  }
}

// 测试2: 验证任务驱动的锁定维持
async function testTaskDrivenLocking() {
  console.log('\n🧪 测试2: 任务驱动的锁定维持')
  
  try {
    // 重新锁定服务器
    lockServerForWindow(testServer)
    
    console.log('2.1 注册测试任务')
    const mockTask = {
      workflowType: 'test',
      status: 'running',
      createdAt: new Date().toISOString()
    }
    
    registerWindowTask('test-task-001', mockTask)
    
    if (windowTasks.size === 1) {
      console.log('✅ 任务注册成功')
    } else {
      console.error('❌ 任务注册失败')
      return false
    }
    
    console.log('2.2 测试有任务时的解锁检查')
    const unlocked = checkServerUnlockCondition()
    
    if (!unlocked && windowLockedServer === testServer) {
      console.log('✅ 有任务时保持锁定成功')
    } else {
      console.error('❌ 有任务时保持锁定失败')
      return false
    }
    
    console.log('2.3 移除任务并测试自动解锁')
    removeWindowTask('test-task-001')
    
    if (windowTasks.size === 0 && !windowLockedServer) {
      console.log('✅ 任务完成后自动解锁成功')
    } else {
      console.error('❌ 任务完成后自动解锁失败')
      console.error(`   任务数: ${windowTasks.size}, 锁定服务器: ${windowLockedServer}`)
      return false
    }
    
    return true
  } catch (error) {
    console.error('❌ 测试2异常:', error)
    return false
  }
}

// 测试3: 验证多任务场景
async function testMultiTaskScenario() {
  console.log('\n🧪 测试3: 多任务场景')
  
  try {
    // 重新锁定服务器
    lockServerForWindow(testServer)
    
    console.log('3.1 注册多个任务')
    const tasks = [
      { id: 'task-001', type: 'undress' },
      { id: 'task-002', type: 'faceswap' },
      { id: 'task-003', type: 'undress' }
    ]
    
    tasks.forEach(({ id, type }) => {
      registerWindowTask(id, {
        workflowType: type,
        status: 'running',
        createdAt: new Date().toISOString()
      })
    })
    
    if (windowTasks.size === 3) {
      console.log('✅ 多任务注册成功')
    } else {
      console.error('❌ 多任务注册失败')
      return false
    }
    
    console.log('3.2 测试部分任务完成时的锁定状态')
    removeWindowTask('task-001')
    
    const unlocked1 = checkServerUnlockCondition()
    if (!unlocked1 && windowLockedServer === testServer && windowTasks.size === 2) {
      console.log('✅ 部分任务完成时保持锁定成功')
    } else {
      console.error('❌ 部分任务完成时保持锁定失败')
      return false
    }
    
    console.log('3.3 测试所有任务完成时的自动解锁')
    removeWindowTask('task-002')
    removeWindowTask('task-003')
    
    if (windowTasks.size === 0 && !windowLockedServer) {
      console.log('✅ 所有任务完成后自动解锁成功')
    } else {
      console.error('❌ 所有任务完成后自动解锁失败')
      return false
    }
    
    return true
  } catch (error) {
    console.error('❌ 测试3异常:', error)
    return false
  }
}

// 测试4: 验证强制解锁功能
async function testForceUnlock() {
  console.log('\n🧪 测试4: 强制解锁功能')
  
  try {
    // 设置有任务的锁定状态
    lockServerForWindow(testServer)
    registerWindowTask('stuck-task', {
      workflowType: 'test',
      status: 'stuck',
      createdAt: new Date().toISOString()
    })
    
    console.log('4.1 测试强制解锁')
    const forceUnlocked = forceUnlockServerForWindow()
    
    if (forceUnlocked && !windowLockedServer) {
      console.log('✅ 强制解锁成功')
    } else {
      console.error('❌ 强制解锁失败')
      return false
    }
    
    // 清理残留任务
    windowTasks.clear()
    
    return true
  } catch (error) {
    console.error('❌ 测试4异常:', error)
    return false
  }
}

// 测试5: 验证锁定续期机制
async function testLockRenewal() {
  console.log('\n🧪 测试5: 锁定续期机制')
  
  try {
    // 锁定服务器
    lockServerForWindow(testServer)
    
    console.log('5.1 注册第一个任务')
    registerWindowTask('task-001', {
      workflowType: 'test',
      status: 'running'
    })
    
    console.log('5.2 注册第二个任务（测试续期）')
    registerWindowTask('task-002', {
      workflowType: 'test',
      status: 'running'
    })
    
    if (windowTasks.size === 2 && windowLockedServer === testServer) {
      console.log('✅ 锁定续期机制正常工作')
    } else {
      console.error('❌ 锁定续期机制失败')
      return false
    }
    
    // 清理
    windowTasks.clear()
    unlockServerForWindow()
    
    return true
  } catch (error) {
    console.error('❌ 测试5异常:', error)
    return false
  }
}

// 运行所有测试
async function runAllTests() {
  console.log(`🚀 [${WINDOW_ID}] 开始运行动态锁定机制测试`)
  
  const tests = [
    { name: '基本锁定和解锁', fn: testBasicLocking },
    { name: '任务驱动的锁定维持', fn: testTaskDrivenLocking },
    { name: '多任务场景', fn: testMultiTaskScenario },
    { name: '强制解锁功能', fn: testForceUnlock },
    { name: '锁定续期机制', fn: testLockRenewal }
  ]
  
  let passedTests = 0
  
  for (const test of tests) {
    try {
      const result = await test.fn()
      if (result) {
        passedTests++
        console.log(`✅ ${test.name} - 通过`)
      } else {
        console.log(`❌ ${test.name} - 失败`)
      }
    } catch (error) {
      console.error(`💥 ${test.name} - 异常:`, error)
    }
  }
  
  console.log(`\n🎯 测试总结: ${passedTests}/${tests.length} 个测试通过`)
  
  if (passedTests === tests.length) {
    console.log('🎉 所有测试通过！动态锁定机制工作正常')
  } else {
    console.log('⚠️ 部分测试失败，需要检查动态锁定机制')
  }
  
  // 清理测试状态
  windowTasks.clear()
  if (windowLockedServer) {
    unlockServerForWindow()
  }
  clearServerUnlockTimer()
  
  return passedTests === tests.length
}

// 导出测试函数
export { runAllTests }

// 如果直接运行此文件，执行测试
if (typeof window !== 'undefined') {
  window.testDynamicLocking = runAllTests
  console.log('🔧 测试函数已暴露到全局: window.testDynamicLocking()')
}
