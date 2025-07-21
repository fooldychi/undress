# 任务完成后图片URL获取修复

## 🚨 问题描述

在任务处理完成后，页面出现以下错误：

```
❌ [1753109321692_0st3wyd6e] 获取任务绑定图片URL失败: Error: 任务 b2co8f0gg1gfsg23axfpe 未找到，无法获取绑定服务器信息
    at getTaskBoundImageUrl (comfyui.js:599:13)
    at processUndressImage (comfyui.js:2439:34)
```

### 问题根因分析

1. **时序问题**: 任务完成 → 任务被清理 → 尝试获取图片URL → 找不到任务信息
2. **任务清理过早**: `removeWindowTask(promptId)` 在第1841行被调用，从 `windowTasks` 中删除任务信息
3. **依赖缺失**: `getTaskBoundImageUrl` 函数在第2439行被调用时，任务信息已被清理，无法获取绑定的服务器信息

## 🔧 修复方案

### 1. **在任务完成时保存服务器信息到结果中**

#### 修复位置: `client/src/services/comfyui.js:1830-1848`

**修复前:**
```javascript
// 🔧 官方标准：提取结果数据
const results = await extractTaskResults(history, promptId)

// 🔧 立即清理任务并调用完成回调
removeWindowTask(promptId)
```

**修复后:**
```javascript
// 🔧 官方标准：提取结果数据
const results = await extractTaskResults(history, promptId)

// 🔧 在清理任务前，将服务器信息保存到结果中
if (task.executionServer) {
  results.executionServer = task.executionServer
  console.log(`💾 [${WINDOW_ID}] 保存任务执行服务器信息到结果: ${task.executionServer}`)
}

// 🔧 立即清理任务并调用完成回调
removeWindowTask(promptId)
```

### 2. **优化 getTaskBoundImageUrl 函数的服务器获取逻辑**

#### 修复位置: `client/src/services/comfyui.js:592-643`

**修复前问题:**
- 强制要求任务存在，任务清理后立即失败
- 没有从任务结果中获取服务器信息的机制

**修复后改进:**
```javascript
async function getTaskBoundImageUrl(promptId, taskResult, workflowType = 'undress') {
  try {
    let executionServer = null
    
    // 🔧 优先从任务结果中获取服务器信息（任务完成后保存的）
    if (taskResult && taskResult.executionServer) {
      executionServer = taskResult.executionServer
      console.log(`💾 [${WINDOW_ID}] 从任务结果中获取执行服务器: ${executionServer}`)
    } else {
      // 🔧 其次从当前任务中获取服务器信息
      const task = getWindowTask(promptId)
      if (task && task.executionServer) {
        executionServer = task.executionServer
        console.log(`📋 [${WINDOW_ID}] 从当前任务中获取执行服务器: ${executionServer}`)
      }
    }
    
    // 🔧 如果都没有，尝试使用当前锁定的服务器作为回退
    if (!executionServer) {
      console.warn(`⚠️ [${WINDOW_ID}] 任务 ${promptId} 无执行服务器信息，尝试使用当前锁定服务器`)
      
      if (windowLockedServer) {
        executionServer = windowLockedServer
        console.log(`🔄 [${WINDOW_ID}] 使用当前锁定服务器: ${executionServer}`)
      } else {
        // 最后的回退：使用当前API服务器
        console.warn(`⚠️ [${WINDOW_ID}] 没有锁定服务器，使用当前API服务器`)
        executionServer = await getApiBaseUrl()
        console.log(`🌐 [${WINDOW_ID}] 使用当前API服务器: ${executionServer}`)
      }
    }

    if (!executionServer) {
      throw new Error(`任务 ${promptId} 无法确定执行服务器`)
    }

    const apiBaseUrl = executionServer.replace(/\/$/, '')
    console.log(`🎯 [${WINDOW_ID}] 使用执行服务器获取图片: ${apiBaseUrl}`)

    // 🔧 验证服务器一致性（只在有锁定服务器时验证）
    if (windowLockedServer) {
      validateServerConsistency('getTaskBoundImageUrl', apiBaseUrl)
    }

    // 使用确定的服务器构建图片URL
    return await buildImageUrlWithServer(apiBaseUrl, taskResult, workflowType)
  } catch (error) {
    console.error(`❌ [${WINDOW_ID}] 获取任务绑定图片URL失败:`, error)
    throw error
  }
}
```

## 🎯 修复效果

### 服务器获取优先级（从高到低）:

1. **任务结果中的服务器信息** (最高优先级)
   - 任务完成时保存的 `taskResult.executionServer`
   - 确保即使任务被清理也能获取到正确的服务器

2. **当前任务中的服务器信息**
   - 从 `windowTasks` 中获取的 `task.executionServer`
   - 适用于任务尚未清理的情况

3. **当前锁定的服务器**
   - 使用 `windowLockedServer`
   - 适用于服务器仍处于锁定状态的情况

4. **当前API服务器** (最低优先级)
   - 通过 `getApiBaseUrl()` 获取
   - 最后的回退选项

### 解决的问题:

- ✅ **任务完成后找不到服务器信息**: 通过在结果中保存服务器信息解决
- ✅ **时序问题**: 优先从任务结果获取，避免依赖已清理的任务信息
- ✅ **服务器一致性**: 确保图片URL使用正确的执行服务器
- ✅ **错误处理**: 提供多级回退机制，避免完全失败

## 🧪 验证方法

### 1. 使用验证页面
打开 `client/test-task-completion-fix.html` 进行交互式验证

### 2. 控制台调试
```javascript
// 检查当前服务器状态
window.debugServerConsistency()

// 检查WebSocket锁定状态
window.debugWebSocketLock()

// 检查是否有服务器切换风险
window.checkServerSwitchRisk()
```

### 3. 实际测试
1. 提交一个图片处理任务
2. 等待任务完成
3. 观察控制台日志，确认：
   - 任务完成时保存了服务器信息
   - 图片URL获取时使用了正确的服务器
   - 没有出现"任务未找到"错误

## 📋 修复总结

| 修复项目 | 修复前状态 | 修复后状态 |
|---------|-----------|-----------|
| 服务器信息保存 | ❌ 任务清理时丢失 | ✅ 保存到任务结果中 |
| 服务器获取逻辑 | ❌ 单一来源，易失败 | ✅ 多级回退机制 |
| 错误处理 | ❌ 任务清理后立即失败 | ✅ 优雅降级处理 |
| 服务器一致性 | ❌ 可能使用错误服务器 | ✅ 优先使用执行服务器 |

---

**修复完成时间**: 2025-07-21  
**修复类型**: 任务完成后图片URL获取时序问题  
**核心改进**: 服务器信息持久化和多级回退机制  
**影响范围**: 所有ComfyUI工作流的图片URL获取
