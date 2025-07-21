// 测试递归更新修复的脚本
console.log('🧪 测试递归更新修复')

// 模拟测试环境
const mockWindowTasks = new Map()
const mockProgressCallbackDebounce = new Map()

// 模拟任务状态
const TASK_STATUS = {
  WAITING: 'waiting',
  EXECUTING: 'executing',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  ERROR: 'error'
}

// 模拟安全进度回调函数
function safeProgressCallback(promptId, task, message, percent) {
  console.log(`📊 安全进度回调: ${promptId} - ${message} (${percent}%)`)
  
  if (!task.onProgress) {
    console.log(`⚠️ 任务 ${promptId} 没有进度回调函数`)
    return
  }
  
  // 防抖：同一任务的进度回调间隔至少100ms
  const lastCallTime = mockProgressCallbackDebounce.get(promptId) || 0
  const now = Date.now()
  
  if (now - lastCallTime < 100) {
    console.log(`🚫 进度回调防抖: ${promptId} (${percent}%)`)
    return
  }
  
  mockProgressCallbackDebounce.set(promptId, now)
  
  try {
    // 使用queueMicrotask避免递归更新
    queueMicrotask(() => {
      try {
        task.onProgress(message, percent)
        console.log(`✅ 进度回调成功: ${promptId}`)
      } catch (callbackError) {
        console.error(`❌ 进度回调执行失败: ${promptId}`, callbackError)
        
        // 如果是递归更新错误，停止后续回调
        if (callbackError.message?.includes('Maximum recursive updates')) {
          console.error(`🔥 检测到递归更新，禁用进度回调: ${promptId}`)
          task.onProgress = null
        }
      }
    })
  } catch (error) {
    console.error(`❌ 安全进度回调失败: ${promptId}`, error)
  }
}

// 测试1: 正常进度回调
console.log('\n📋 测试1: 正常进度回调')
const normalTask = {
  status: TASK_STATUS.EXECUTING,
  onProgress: (message, percent) => {
    console.log(`📈 正常回调: ${message} (${percent}%)`)
  }
}

mockWindowTasks.set('test-normal', normalTask)
safeProgressCallback('test-normal', normalTask, '正常处理中', 50)

// 测试2: 防抖机制
console.log('\n📋 测试2: 防抖机制')
const debounceTask = {
  status: TASK_STATUS.EXECUTING,
  onProgress: (message, percent) => {
    console.log(`📈 防抖回调: ${message} (${percent}%)`)
  }
}

mockWindowTasks.set('test-debounce', debounceTask)
// 快速连续调用，应该被防抖
safeProgressCallback('test-debounce', debounceTask, '快速调用1', 30)
safeProgressCallback('test-debounce', debounceTask, '快速调用2', 31)
safeProgressCallback('test-debounce', debounceTask, '快速调用3', 32)

// 测试3: 模拟递归更新错误
console.log('\n📋 测试3: 模拟递归更新错误')
const recursiveTask = {
  status: TASK_STATUS.EXECUTING,
  onProgress: (message, percent) => {
    throw new Error('Maximum recursive updates exceeded in component <MobilePageContainer>')
  }
}

mockWindowTasks.set('test-recursive', recursiveTask)
safeProgressCallback('test-recursive', recursiveTask, '触发递归错误', 75)

// 验证任务的onProgress是否被禁用
setTimeout(() => {
  console.log('\n📋 验证递归错误后的状态:')
  console.log(`- 递归任务的onProgress: ${recursiveTask.onProgress ? '仍存在' : '已禁用'}`)
}, 200)

// 测试4: progress_state消息处理
console.log('\n📋 测试4: progress_state消息处理')
function mockHandleProgressStateMessage(data) {
  const { prompt_id, nodes } = data
  const task = mockWindowTasks.get(prompt_id)
  
  if (!task) {
    console.log(`⚠️ progress_state: 未找到任务 ${prompt_id}`)
    return
  }

  console.log(`📊 处理progress_state: ${prompt_id}`)
  
  // 分析节点状态，计算整体进度
  let completedNodes = 0
  let totalNodes = 0
  
  for (const nodeId in nodes) {
    totalNodes++
    const nodeState = nodes[nodeId]
    
    // 检查节点是否完成
    if (nodeState.completed || nodeState.status === 'completed') {
      completedNodes++
    }
  }
  
  // 计算进度百分比
  const progressPercent = totalNodes > 0 ? Math.round((completedNodes / totalNodes) * 100) : 0
  
  console.log(`📊 节点进度: ${completedNodes}/${totalNodes} (${progressPercent}%)`)
  
  // 更新任务进度
  if (progressPercent > 85) {
    safeProgressCallback(prompt_id, task, `处理中... (${completedNodes}/${totalNodes} 节点)`, progressPercent)
  }
  
  // 如果所有节点都完成，触发任务完成
  if (completedNodes === totalNodes && totalNodes > 0) {
    console.log(`✅ progress_state检测到任务完成: ${prompt_id}`)
  }
}

const progressStateTask = {
  status: TASK_STATUS.EXECUTING,
  onProgress: (message, percent) => {
    console.log(`📈 progress_state回调: ${message} (${percent}%)`)
  }
}

mockWindowTasks.set('test-progress-state', progressStateTask)

// 模拟progress_state消息
const mockProgressStateData = {
  prompt_id: 'test-progress-state',
  nodes: {
    '501': { status: 'completed', completed: true },
    '502': { status: 'completed', completed: true },
    '503': { status: 'running', completed: false },
    '504': { status: 'waiting', completed: false }
  }
}

mockHandleProgressStateMessage(mockProgressStateData)

console.log('\n✅ 递归更新修复测试完成')
