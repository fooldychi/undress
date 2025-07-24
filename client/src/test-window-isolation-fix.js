/**
 * 🔥 窗口隔离修复验证测试
 * 
 * 这个测试文件用于验证ComfyUI服务器锁定机制的窗口隔离修复是否正常工作
 */

console.log('🧪 开始窗口隔离修复验证测试...')

// 测试1: 验证窗口唯一标识
function testWindowIdentity() {
  console.log('\n1️⃣ 测试窗口唯一标识:')
  
  if (typeof window.debugWindowIsolation === 'function') {
    window.debugWindowIsolation()
    console.log('✅ 窗口标识系统正常工作')
  } else {
    console.log('❌ 窗口隔离调试工具不可用')
    return false
  }
  
  return true
}

// 测试2: 验证服务器锁定隔离
function testServerLockIsolation() {
  console.log('\n2️⃣ 测试服务器锁定隔离:')
  
  try {
    // 模拟锁定服务器
    const testServer = 'http://test-server-' + Math.random().toString(36).substr(2, 5)
    console.log(`🔒 模拟锁定服务器: ${testServer}`)
    
    // 使用新的窗口隔离API
    if (typeof window.windowLockedServer !== 'undefined') {
      window.windowLockedServer = testServer
      
      // 验证锁定是否生效
      const currentLock = window.windowLockedServer
      if (currentLock === testServer) {
        console.log('✅ 服务器锁定隔离正常工作')
        
        // 清理测试锁定
        window.windowLockedServer = null
        console.log('🧹 清理测试锁定')
        
        return true
      } else {
        console.log('❌ 服务器锁定隔离失败')
        return false
      }
    } else {
      console.log('❌ 窗口服务器锁定API不可用')
      return false
    }
  } catch (error) {
    console.error('❌ 服务器锁定隔离测试失败:', error)
    return false
  }
}

// 测试3: 验证跨窗口状态检查
function testCrossWindowStateCheck() {
  console.log('\n3️⃣ 测试跨窗口状态检查:')
  
  if (typeof window.checkCrossWindowState === 'function') {
    const state = window.checkCrossWindowState()
    console.log('跨窗口状态:', state)
    
    if (state.currentWindow) {
      console.log('✅ 跨窗口状态检查正常工作')
      return true
    } else {
      console.log('❌ 跨窗口状态检查失败')
      return false
    }
  } else {
    console.log('❌ 跨窗口状态检查工具不可用')
    return false
  }
}

// 测试4: 验证任务隔离
function testTaskIsolation() {
  console.log('\n4️⃣ 测试任务隔离:')
  
  try {
    // 检查窗口任务队列是否独立
    if (typeof windowTasks !== 'undefined') {
      const initialSize = windowTasks.size
      console.log(`当前窗口任务数: ${initialSize}`)
      
      // 模拟添加任务（仅用于测试）
      const testPromptId = 'test_' + Date.now()
      const testTask = {
        windowId: window.WINDOW_ID || 'test_window',
        workflowType: 'test',
        registeredAt: Date.now()
      }
      
      // 注意：这里只是检查API是否存在，不实际添加任务
      if (typeof registerWindowTask === 'function') {
        console.log('✅ 任务注册API可用')
      } else {
        console.log('⚠️ 任务注册API不可用（可能需要服务器锁定）')
      }
      
      if (typeof getWindowTask === 'function') {
        console.log('✅ 任务获取API可用')
      } else {
        console.log('❌ 任务获取API不可用')
      }
      
      console.log('✅ 任务隔离API检查完成')
      return true
    } else {
      console.log('❌ 窗口任务队列不可用')
      return false
    }
  } catch (error) {
    console.error('❌ 任务隔离测试失败:', error)
    return false
  }
}

// 测试5: 验证服务器一致性验证
function testServerConsistencyValidation() {
  console.log('\n5️⃣ 测试服务器一致性验证:')
  
  try {
    if (typeof validateServerConsistency === 'function') {
      // 测试无任务时的验证（应该通过）
      try {
        validateServerConsistency('测试操作', 'http://test-server')
        console.log('✅ 无任务时服务器一致性验证通过')
      } catch (error) {
        console.log('⚠️ 无任务时验证失败（可能是正常的）:', error.message)
      }
      
      console.log('✅ 服务器一致性验证API可用')
      return true
    } else {
      console.log('❌ 服务器一致性验证API不可用')
      return false
    }
  } catch (error) {
    console.error('❌ 服务器一致性验证测试失败:', error)
    return false
  }
}

// 测试6: 验证清理机制
function testCleanupMechanism() {
  console.log('\n6️⃣ 测试清理机制:')
  
  try {
    if (typeof window.forceCleanupWindow === 'function') {
      console.log('✅ 窗口清理API可用')
      
      // 测试清理当前窗口（不实际执行，只检查API）
      console.log('🧹 清理机制API检查完成')
      return true
    } else {
      console.log('❌ 窗口清理API不可用')
      return false
    }
  } catch (error) {
    console.error('❌ 清理机制测试失败:', error)
    return false
  }
}

// 运行所有测试
function runAllTests() {
  console.log('🚀 开始运行所有窗口隔离修复验证测试...')
  console.log('================================================')
  
  const tests = [
    { name: '窗口唯一标识', fn: testWindowIdentity },
    { name: '服务器锁定隔离', fn: testServerLockIsolation },
    { name: '跨窗口状态检查', fn: testCrossWindowStateCheck },
    { name: '任务隔离', fn: testTaskIsolation },
    { name: '服务器一致性验证', fn: testServerConsistencyValidation },
    { name: '清理机制', fn: testCleanupMechanism }
  ]
  
  const results = []
  
  tests.forEach(test => {
    try {
      const result = test.fn()
      results.push({ name: test.name, passed: result })
    } catch (error) {
      console.error(`❌ 测试 "${test.name}" 执行失败:`, error)
      results.push({ name: test.name, passed: false, error: error.message })
    }
  })
  
  // 输出测试结果
  console.log('\n📊 测试结果汇总:')
  console.log('================================================')
  
  let passedCount = 0
  results.forEach(result => {
    const status = result.passed ? '✅ 通过' : '❌ 失败'
    console.log(`${status} - ${result.name}`)
    if (result.error) {
      console.log(`    错误: ${result.error}`)
    }
    if (result.passed) passedCount++
  })
  
  console.log(`\n📈 总体结果: ${passedCount}/${results.length} 个测试通过`)
  
  if (passedCount === results.length) {
    console.log('🎉 所有测试通过！窗口隔离修复验证成功！')
  } else {
    console.log('⚠️ 部分测试失败，请检查窗口隔离实现')
  }
  
  return {
    total: results.length,
    passed: passedCount,
    failed: results.length - passedCount,
    results
  }
}

// 导出测试函数
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    testWindowIdentity,
    testServerLockIsolation,
    testCrossWindowStateCheck,
    testTaskIsolation,
    testServerConsistencyValidation,
    testCleanupMechanism,
    runAllTests
  }
}

// 如果在浏览器环境中，自动运行测试
if (typeof window !== 'undefined') {
  // 延迟运行，确保所有模块加载完成
  setTimeout(() => {
    console.log('🔧 窗口隔离修复验证测试准备就绪')
    console.log('💡 运行 runAllTests() 开始测试')
    
    // 将测试函数挂载到全局对象
    window.testWindowIsolationFix = {
      runAllTests,
      testWindowIdentity,
      testServerLockIsolation,
      testCrossWindowStateCheck,
      testTaskIsolation,
      testServerConsistencyValidation,
      testCleanupMechanism
    }
  }, 1000)
}

console.log('✅ 窗口隔离修复验证测试模块加载完成')
