// 🔍 调试递归更新问题
// 用于诊断 MobilePageContainer 组件的递归更新错误

console.log('🔍 开始调试递归更新问题')

// 检查可能导致递归的全局状态
function checkGlobalState() {
  console.log('📊 全局状态检查:')
  
  // 检查 ComfyUI 相关状态
  if (typeof window !== 'undefined') {
    console.log('- windowTasks:', window.windowTasks?.size || 'undefined')
    console.log('- windowLockedServer:', window.windowLockedServer || 'undefined')
    console.log('- isWsConnected:', window.isWsConnected || 'undefined')
    
    // 检查是否有循环引用
    if (window.windowTasks) {
      console.log('- 任务详情:')
      window.windowTasks.forEach((task, promptId) => {
        console.log(`  ${promptId}:`, {
          status: task.status,
          executionServer: task.executionServer,
          hasOnProgress: !!task.onProgress,
          hasOnComplete: !!task.onComplete
        })
      })
    }
  }
}

// 检查 Vue 组件状态
function checkVueComponentState() {
  console.log('🔍 Vue 组件状态检查:')
  
  // 查找所有 Vue 应用实例
  const vueApps = document.querySelectorAll('[data-v-app]')
  console.log(`- 找到 ${vueApps.length} 个 Vue 应用实例`)
  
  // 检查是否有异常的响应式数据
  if (typeof window !== 'undefined' && window.__VUE__) {
    console.log('- Vue 开发工具可用')
  }
}

// 监听错误事件
function setupErrorListeners() {
  console.log('🎯 设置错误监听器')
  
  // 监听未处理的 Promise 拒绝
  window.addEventListener('unhandledrejection', (event) => {
    console.error('🚨 未处理的 Promise 拒绝:', event.reason)
    console.error('🚨 错误堆栈:', event.reason?.stack)
    
    // 检查是否是递归更新错误
    if (event.reason?.message?.includes('Maximum recursive updates exceeded')) {
      console.error('🔥 检测到递归更新错误!')
      console.error('🔍 当前状态快照:')
      checkGlobalState()
      checkVueComponentState()
    }
  })
  
  // 监听一般错误
  window.addEventListener('error', (event) => {
    console.error('🚨 JavaScript 错误:', event.error)
    console.error('🚨 错误信息:', event.message)
    console.error('🚨 错误位置:', `${event.filename}:${event.lineno}:${event.colno}`)
  })
}

// 检查可能的内存泄漏
function checkMemoryLeaks() {
  console.log('🧠 内存使用检查:')
  
  if (performance.memory) {
    const memory = performance.memory
    console.log('- 已使用内存:', (memory.usedJSHeapSize / 1024 / 1024).toFixed(2), 'MB')
    console.log('- 总内存:', (memory.totalJSHeapSize / 1024 / 1024).toFixed(2), 'MB')
    console.log('- 内存限制:', (memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2), 'MB')
  }
  
  // 检查定时器数量
  let timerCount = 0
  const originalSetTimeout = window.setTimeout
  const originalSetInterval = window.setInterval
  
  window.setTimeout = function(...args) {
    timerCount++
    return originalSetTimeout.apply(this, args)
  }
  
  window.setInterval = function(...args) {
    timerCount++
    return originalSetInterval.apply(this, args)
  }
  
  console.log('- 活跃定时器数量:', timerCount)
}

// 主要诊断函数
function diagnoseRecursiveIssue() {
  console.log('🚀 开始递归问题诊断')
  
  try {
    checkGlobalState()
    checkVueComponentState()
    checkMemoryLeaks()
    setupErrorListeners()
    
    console.log('✅ 诊断设置完成，监听中...')
    
    // 定期检查状态
    setInterval(() => {
      console.log('⏰ 定期状态检查:')
      checkGlobalState()
    }, 30000) // 每30秒检查一次
    
  } catch (error) {
    console.error('❌ 诊断过程中出错:', error)
  }
}

// 修复建议
function getFixSuggestions() {
  console.log('💡 修复建议:')
  console.log('1. 检查 Vue 组件中的 watch 和 computed 是否有循环依赖')
  console.log('2. 检查 onProgress 回调是否触发了状态更新循环')
  console.log('3. 检查 WebSocket 消息处理是否导致状态循环更新')
  console.log('4. 检查任务完成回调是否触发了新的任务注册')
  console.log('5. 检查响应式数据的更新是否触发了无限循环')
}

// 临时修复：限制回调执行频率
function applyTemporaryFix() {
  console.log('🔧 应用临时修复')
  
  // 限制 onProgress 回调的执行频率
  const progressCallbacks = new Map()
  
  window.throttleProgressCallback = function(promptId, callback, delay = 100) {
    if (progressCallbacks.has(promptId)) {
      clearTimeout(progressCallbacks.get(promptId))
    }
    
    const timeoutId = setTimeout(() => {
      callback()
      progressCallbacks.delete(promptId)
    }, delay)
    
    progressCallbacks.set(promptId, timeoutId)
  }
  
  console.log('✅ 临时修复已应用：throttleProgressCallback 函数可用')
}

// 导出调试函数
if (typeof window !== 'undefined') {
  window.diagnoseRecursiveIssue = diagnoseRecursiveIssue
  window.checkGlobalState = checkGlobalState
  window.getFixSuggestions = getFixSuggestions
  window.applyTemporaryFix = applyTemporaryFix
  
  console.log('🔧 调试函数已暴露到全局:')
  console.log('- window.diagnoseRecursiveIssue()')
  console.log('- window.checkGlobalState()')
  console.log('- window.getFixSuggestions()')
  console.log('- window.applyTemporaryFix()')
}

// 自动开始诊断
if (typeof window !== 'undefined') {
  // 延迟启动，避免影响页面加载
  setTimeout(() => {
    diagnoseRecursiveIssue()
    getFixSuggestions()
    applyTemporaryFix()
  }, 1000)
}

export { 
  diagnoseRecursiveIssue, 
  checkGlobalState, 
  getFixSuggestions, 
  applyTemporaryFix 
}
