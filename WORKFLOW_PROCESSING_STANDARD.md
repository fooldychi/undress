# ComfyUI 工作流处理标准化模板

## 🎯 标准化目标

基于一键褪衣的成功实现，制定统一的工作流处理规范，确保所有AI功能（换脸、绘画、增强等）都遵循相同的处理逻辑，保证多窗口多任务环境下的稳定性。

## 📋 标准工作流生命周期

### 1. **任务注册阶段** (Registration Phase)
```javascript
// 标准模板
async function processWorkflow(inputData, onProgress = null, workflowType = 'default') {
  // 🔧 预先生成promptId
  const promptId = generatePromptId()
  console.log(`🆔 [STANDARD] 生成${workflowType}任务ID: ${promptId}`)
  
  // 🔧 创建标准任务对象
  const tempTask = {
    workflowType: workflowType,
    createdAt: new Date().toISOString(),
    onProgress: onProgress,  // ✅ 直接传递进度回调
    onComplete: null,
    onError: null
  }
  
  // 🔧 在提交前预注册任务
  const submittedPromptId = await submitWorkflow(workflowPrompt, promptId, tempTask)
  console.log(`✅ [STANDARD] ${workflowType}工作流提交完成: ${submittedPromptId}`)
}
```

### 2. **任务执行阶段** (Execution Phase)
```javascript
// 标准等待逻辑
const taskResult = await waitForTaskCompletion(submittedPromptId, (status, progress) => {
  if (onProgress) {
    // 🔧 标准进度调整算法
    const adjustedProgress = Math.min(95, Math.max(baseProgress, baseProgress + (progress * progressRange)))
    onProgress(status, adjustedProgress)
  }
}, workflowType)
```

### 3. **结果获取阶段** (Result Phase)
```javascript
// 🔧 标准结果获取（使用任务绑定服务器）
const resultImageUrl = await getTaskBoundImageUrl(submittedPromptId, taskResult, workflowType)
console.log(`🎉 ${workflowType}处理成功! 图片URL:`, resultImageUrl)
```

### 4. **任务清理阶段** (Cleanup Phase)
```javascript
// 🔧 标准积分扣除和清理
const pointsResult = await levelCardPointsManager.consumePoints(cost, workflowName, resultImageUrl)

// 🔧 返回标准结果格式
return {
  success: true,
  resultImage: resultImageUrl,
  originalImage: originalImageUrl,
  promptId: promptId,
  pointsConsumed: pointsResult.consumed,
  pointsRemaining: pointsResult.remaining,
  message: `${workflowName}处理完成`
}
```

## 🔧 关键修复对比分析

### 1. **任务队列管理一致性**

#### ✅ 一键褪衣（标准实现）
```javascript
// processUndressImage() - 正确实现
const tempTask = {
  workflowType: 'undress',
  createdAt: new Date().toISOString(),
  onProgress: onProgress,  // ✅ 正确传递
  onComplete: null,
  onError: null
}
```

#### ❌ 极速换脸（修复前）
```javascript
// processFaceSwapImage() - 问题实现
const tempTask = {
  workflowType: 'faceswap',
  createdAt: new Date().toISOString(),
  onProgress: null,  // ❌ 未传递进度回调
  onComplete: null,
  onError: null
}
```

#### ✅ 极速换脸（修复后）
```javascript
// processFaceSwapImage() - 修复后
const tempTask = {
  workflowType: 'faceswap',
  createdAt: new Date().toISOString(),
  onProgress: onProgress,  // ✅ 正确传递
  onComplete: null,
  onError: null
}
```

### 2. **服务器地址一致性**

#### ✅ 标准实现（两个功能都已修复）
```javascript
// 使用任务绑定的服务器获取图片URL
const resultImageUrl = await getTaskBoundImageUrl(submittedPromptId, taskResult, workflowType)
```

#### ❌ 错误实现（已修复）
```javascript
// 错误：使用当前服务器，可能与任务执行服务器不一致
const resultImageUrl = await getGeneratedImageUrl(taskResult, workflowType)
```

### 3. **进度处理逻辑统一**

#### ✅ 一键褪衣（标准模式）
```javascript
const taskResult = await waitForTaskCompletion(submittedPromptId, (status, progress) => {
  if (onProgress) {
    const adjustedProgress = Math.min(95, Math.max(50, 50 + (progress * 0.45)))
    onProgress(status, adjustedProgress)
  }
}, 'undress')
```

#### ✅ 极速换脸（已对齐）
```javascript
const taskResult = await waitForTaskCompletion(submittedPromptId, (status, progress) => {
  if (onProgress) {
    const adjustedProgress = Math.min(95, Math.max(85, 85 + (progress * 0.1)))
    onProgress(status, adjustedProgress)
  }
}, 'faceswap')
```

## 🛠️ 标准化函数模板

### 通用工作流处理函数
```javascript
/**
 * 标准化工作流处理模板
 * @param {Object} config - 工作流配置
 * @param {string} config.workflowType - 工作流类型
 * @param {Object} config.inputData - 输入数据
 * @param {Function} config.onProgress - 进度回调
 * @param {Object} config.workflow - 工作流定义
 * @param {number} config.pointsCost - 积分消耗
 * @param {string} config.workflowName - 工作流显示名称
 * @returns {Promise<Object>} 标准化结果对象
 */
async function processStandardWorkflow(config) {
  const {
    workflowType,
    inputData,
    onProgress,
    workflow,
    pointsCost,
    workflowName
  } = config
  
  try {
    console.log(`🚀 开始${workflowName}处理`)
    
    // 1. 预检查和验证
    if (onProgress) onProgress('正在检查服务器状态...', 5)
    await validateServerStatus()
    await validatePointsStatus(pointsCost)
    await validateInputData(inputData, workflowType)
    
    // 2. 上传和准备
    if (onProgress) onProgress('正在上传图片...', 20)
    const uploadedFiles = await uploadWorkflowInputs(inputData, workflowType)
    
    if (onProgress) onProgress('正在配置工作流...', 40)
    const configuredWorkflow = await configureWorkflow(workflow, uploadedFiles, workflowType)
    
    // 3. 标准任务提交
    if (onProgress) onProgress('正在提交任务...', 50)
    const promptId = generatePromptId()
    const tempTask = createStandardTask(workflowType, onProgress)
    const submittedPromptId = await submitWorkflow(configuredWorkflow, promptId, tempTask)
    
    // 4. 标准任务等待
    if (onProgress) onProgress('正在处理...', 60)
    const taskResult = await waitForTaskCompletion(submittedPromptId, 
      createProgressHandler(onProgress, 60, 95), workflowType)
    
    // 5. 标准结果获取
    if (onProgress) onProgress('正在获取结果...', 96)
    const resultImageUrl = await getTaskBoundImageUrl(submittedPromptId, taskResult, workflowType)
    
    // 6. 标准积分处理
    if (onProgress) onProgress('正在更新积分...', 98)
    const pointsResult = await levelCardPointsManager.consumePoints(pointsCost, workflowName, resultImageUrl)
    
    if (onProgress) onProgress(`${workflowName}完成！`, 100)
    
    // 7. 标准结果返回
    return createStandardResult(true, {
      resultImage: resultImageUrl,
      originalImage: inputData.originalImage,
      promptId: promptId,
      pointsConsumed: pointsResult.consumed,
      pointsRemaining: pointsResult.remaining,
      message: `${workflowName}处理完成`
    })
    
  } catch (error) {
    console.error(`❌ ${workflowName}处理失败:`, error)
    return createStandardResult(false, {
      error: error.message,
      message: `${workflowName}处理失败`
    })
  }
}
```

## 🔍 多窗口任务隔离验证

### 验证清单
- ✅ 任务注册时序一致
- ✅ 窗口任务队列隔离
- ✅ WebSocket消息路由正确
- ✅ 服务器地址绑定一致
- ✅ 进度回调传递正确
- ✅ 错误处理统一

### 调试工具
```javascript
// 专用调试函数
window.debugWorkflowStandard = function(workflowType = null) {
  console.log(`🔍 [${WINDOW_ID}] 工作流标准化调试`)
  
  const tasks = Array.from(windowTasks.entries())
  const filteredTasks = workflowType ? 
    tasks.filter(([_, task]) => task.workflowType === workflowType) : tasks
  
  console.log(`📋 ${workflowType || '所有'}任务数量: ${filteredTasks.length}`)
  
  filteredTasks.forEach(([promptId, task]) => {
    console.log(`📝 任务 ${promptId}:`, {
      类型: task.workflowType,
      状态: task.status,
      窗口: task.windowId,
      服务器: task.executionServer,
      进度回调: !!task.onProgress,
      创建时间: task.createdAt
    })
  })
}
```

这个标准化模板确保了所有工作流都遵循相同的处理逻辑，解决了多窗口多任务环境下的一致性问题。
