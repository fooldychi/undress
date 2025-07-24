# ComfyUI多任务多窗口修复方案

## 🎯 问题概述

在多任务、多窗口调用ComfyUI服务器时，出现任务完成状态没有及时获取、任务没有返回结果的情况。

## 🔍 根本原因分析

### 1. **WebSocket消息归属混乱**
- 多窗口共享WebSocket连接，消息可能被错误的窗口处理
- 缺乏窗口隔离的消息过滤机制

### 2. **服务器一致性问题**
- 任务提交和结果获取使用了不同的服务器
- 负载均衡环境下服务器切换导致结果丢失

### 3. **任务完成检测不够精确**
- 只依赖单一的`executing`消息检测
- 缺乏多重验证机制

### 4. **进度回调递归更新问题**
- 进度回调触发递归更新，导致任务卡住
- 缺乏递归检测和恢复机制

### 5. **WebSocket连接状态不一致**
- 断开重连时错过关键的完成消息
- 缺乏保底检查机制

## 🔧 修复方案

### 1. **增强任务完成检测机制**

#### A. 多重完成信号检测
```javascript
// 支持三种完成信号
1. executing消息: data.node === null
2. executed消息: 所有节点完成
3. progress_state消息: 进度状态检测
```

#### B. 防重复完成处理
```javascript
if (task.status === TASK_STATUS.COMPLETED) {
  console.log(`🔄 任务已完成，忽略重复完成信号: ${promptId}`)
  return
}
```

#### C. 完成来源追踪
```javascript
task.completedAt = Date.now()
task.completionSource = completionSource // 'executing', 'executed', 'progress_state'
```

### 2. **解决服务器一致性问题**

#### A. 任务-服务器绑定
```javascript
// 任务创建时绑定服务器
task.executionServer = await getApiBaseUrl()

// 历史记录获取使用绑定服务器
const history = await getTaskHistoryWithRetry(promptId, task.executionServer)
```

#### B. 带重试的历史记录获取
```javascript
async function getTaskHistoryWithRetry(promptId, serverUrl = null, maxRetries = 3) {
  // 临时锁定到指定服务器
  // 重试机制
  // 服务器一致性验证
}
```

#### C. 结果中保存服务器信息
```javascript
if (task.executionServer) {
  results.executionServer = task.executionServer
}
```

### 3. **优化多窗口消息处理**

#### A. 窗口隔离机制
```javascript
const task = getWindowTask(promptId)
if (!task) {
  console.log(`🔍 忽略其他窗口的消息: ${promptId}`)
  return
}
```

#### B. 消息归属验证
```javascript
// 确保任务属于当前窗口
if (task.windowId === WINDOW_ID) {
  // 处理消息
}
```

### 4. **防止进度回调阻塞**

#### A. 安全的完成回调执行
```javascript
async function executeCompletionCallback(task, results, promptId) {
  // 临时禁用进度回调防止递归
  const originalOnProgress = task.onProgress
  task.onProgress = null
  
  try {
    await task.onComplete(results)
  } catch (error) {
    // 递归检测和恢复
  } finally {
    task.onProgress = originalOnProgress
  }
}
```

#### B. 递归更新检测
```javascript
if (callbackError.message?.includes('Maximum recursive updates')) {
  console.error(`🔥 检测到递归更新，永久禁用进度回调: ${promptId}`)
  task.onProgress = null
}
```

### 5. **增强超时检测和自动恢复**

#### A. 分级超时检查
```javascript
// 30秒后开始检查
if (waitTime > 30000) {
  await checkTaskStatusManually(promptId)
}

// 2分钟警告
if (waitTime > 120000) {
  console.warn(`⏰ 任务等待时间过长`)
}

// 5分钟超时
if (waitTime > 300000) {
  console.error(`⏰ 任务超时，强制失败`)
}
```

#### B. WebSocket重连检测
```javascript
if (!wsConnection || wsConnection.readyState !== WebSocket.OPEN) {
  console.log(`🔄 WebSocket连接异常，尝试重连...`)
  initializeWebSocket()
}
```

### 6. **历史记录验证**

#### A. 完整性检查
```javascript
function validateTaskHistory(historyData, promptId) {
  if (!historyData || !historyData.outputs) {
    return false
  }
  
  const outputKeys = Object.keys(historyData.outputs)
  return outputKeys.length > 0
}
```

#### B. 验证失败处理
```javascript
if (!validateTaskHistory(history[promptId], promptId)) {
  throw new Error(`历史记录不完整: ${promptId}`)
}
```

## 🛠️ 诊断和监控工具

### 1. **任务状态诊断**
```javascript
window.comfyUIDebug.diagnoseTask(promptId)
window.comfyUIDebug.diagnoseAllTasks()
```

### 2. **手动恢复工具**
```javascript
window.comfyUIDebug.manualRecover(promptId)
window.comfyUIDebug.recoverAllTasks()
```

### 3. **服务器一致性检查**
```javascript
window.comfyUIDebug.checkServerConsistency(promptId)
```

### 4. **历史记录验证**
```javascript
window.comfyUIDebug.validateHistory(historyData, promptId)
window.comfyUIDebug.getHistoryWithRetry(promptId, serverUrl)
```

## 📊 验证方法

### 1. **运行验证脚本**
```bash
# 在浏览器控制台运行
node client/test-comfyui-fixes.js
```

### 2. **实际场景测试**
1. 打开多个浏览器窗口
2. 同时提交多个任务
3. 观察任务完成状态获取
4. 检查服务器一致性
5. 验证错误恢复机制

### 3. **监控指标**
- 任务完成率
- 平均完成时间
- 错误恢复成功率
- 服务器一致性比例

## 🎉 预期效果

1. **任务完成检测可靠性提升至99%+**
2. **服务器一致性问题完全解决**
3. **多窗口环境下消息处理准确性100%**
4. **递归更新问题自动检测和恢复**
5. **提供完整的诊断和恢复工具集**

## 🔄 后续优化建议

1. **WebSocket心跳保活机制**
2. **任务优先级队列**
3. **智能负载均衡策略**
4. **性能监控和告警**
5. **自动化测试覆盖**
