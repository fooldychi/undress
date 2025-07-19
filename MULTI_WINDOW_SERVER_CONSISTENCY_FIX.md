# 多窗口环境下ComfyUI服务器一致性修复方案

## 问题描述

在多窗口环境下，ComfyUI图片URL生成时会出现服务器地址不一致的问题：
- 任务在 `https://l9s75ay3rp-8188.cnb.run` 上执行
- 但图片URL却指向 `https://q7f8fgfybb-8188.cnb.run`
- 导致图片无法正常显示

## 根本原因

1. **负载均衡器动态分配**：每次调用 `getApiBaseUrl()` 可能返回不同的服务器
2. **任务执行与图片获取分离**：任务执行时锁定一个服务器，但获取图片时可能选择另一个服务器
3. **多窗口竞争**：不同窗口可能锁定不同的服务器，造成混乱

## 修复方案

### 1. 任务级服务器绑定

**修改 `registerWindowTask()` 函数**：
```javascript
function registerWindowTask(promptId, task) {
  // 🔧 记录任务执行的服务器地址
  task.executionServer = windowLockedServer
  task.windowId = WINDOW_ID
  task.clientId = WINDOW_CLIENT_ID
  task.registeredAt = Date.now()

  windowTasks.set(promptId, task)
  console.log(`📝 [${WINDOW_ID}] 任务已注册: ${promptId}, 绑定服务器: ${task.executionServer}`)
}
```

### 2. 修复图片URL生成逻辑

**修改 `getGeneratedImageUrl()` 函数**：
```javascript
async function getGeneratedImageUrl(taskResult, workflowType = 'undress') {
  try {
    // 🔧 强制使用任务执行时锁定的服务器
    let apiBaseUrl
    if (windowLockedServer) {
      apiBaseUrl = windowLockedServer.replace(/\/$/, '')
      console.log(`🔒 [${WINDOW_ID}] 使用锁定服务器获取图片: ${apiBaseUrl}`)
    } else {
      apiBaseUrl = await getApiBaseUrl()
      console.warn(`⚠️ [${WINDOW_ID}] 未找到锁定服务器，使用当前配置: ${apiBaseUrl}`)
    }
    // ... 其余逻辑
  }
}
```

### 3. 新增任务绑定的图片获取函数

**新增 `getTaskBoundImageUrl()` 函数**：
```javascript
async function getTaskBoundImageUrl(promptId, taskResult, workflowType = 'undress') {
  try {
    const task = getWindowTask(promptId)
    if (task && task.executionServer) {
      const apiBaseUrl = task.executionServer.replace(/\/$/, '')
      console.log(`🎯 [${WINDOW_ID}] 使用任务绑定服务器获取图片: ${apiBaseUrl}`)
      
      // 使用绑定的服务器构建图片URL
      return await buildImageUrlWithServer(apiBaseUrl, taskResult, workflowType)
    }
    
    // 回退到当前逻辑
    return await getGeneratedImageUrl(taskResult, workflowType)
  }
}
```

### 4. 更新实际调用

**修改 `processUndressImage()` 和 `processFaceSwapImage()`**：
```javascript
// 原来的调用
const resultImageUrl = await getGeneratedImageUrl(taskResult, 'undress')

// 修复后的调用
const resultImageUrl = await getTaskBoundImageUrl(submittedPromptId, taskResult, 'undress')
```

### 5. 增强调试功能

**新增 `window.debugMultiWindowServers()` 函数**：
```javascript
window.debugMultiWindowServers = function() {
  console.log(`🪟 当前窗口: ${WINDOW_ID}`)
  console.log(`🔒 锁定服务器: ${windowLockedServer}`)
  console.log(`📋 待处理任务:`, Array.from(windowTasks.keys()))
  
  // 显示所有任务的服务器绑定
  windowTasks.forEach((task, promptId) => {
    console.log(`  任务 ${promptId}: ${task.executionServer || '未绑定'}`)
  })
}
```

## 修复效果

### 修复前
```
任务执行: https://l9s75ay3rp-8188.cnb.run
图片URL:  https://q7f8fgfybb-8188.cnb.run/api/view?filename=ComfyUI_00043_.png
结果:     ❌ 图片无法访问
```

### 修复后
```
任务执行: https://l9s75ay3rp-8188.cnb.run
图片URL:  https://l9s75ay3rp-8188.cnb.run/api/view?filename=ComfyUI_00043_.png
结果:     ✅ 图片正常显示
```

## 使用方法

### 1. 调试多窗口状态
```javascript
// 在浏览器控制台运行
window.debugMultiWindowServers()
```

### 2. 检查任务绑定
```javascript
// 检查特定任务的服务器绑定
import { getTaskBoundServer } from './services/comfyui.js'
const server = getTaskBoundServer('your-prompt-id')
console.log('任务绑定服务器:', server)
```

### 3. 手动获取绑定图片URL
```javascript
// 使用任务绑定的服务器获取图片URL
import { getTaskBoundImageUrl } from './services/comfyui.js'
const imageUrl = await getTaskBoundImageUrl(promptId, taskResult, 'undress')
```

## 测试验证

运行测试文件验证修复效果：
```javascript
import { runAllTests } from './test-multi-window-server-fix.js'
await runAllTests()
```

## 兼容性说明

- ✅ 向后兼容：原有的 `getGeneratedImageUrl()` 函数仍然可用
- ✅ 渐进式修复：新功能不影响现有代码
- ✅ 调试友好：提供丰富的调试信息和工具

## 关键优势

1. **彻底解决服务器不一致问题**：任务与图片URL使用同一服务器
2. **多窗口隔离**：每个窗口的任务独立管理，互不干扰
3. **调试能力强**：提供详细的调试信息和工具
4. **性能优化**：避免不必要的服务器切换和重试
5. **代码可维护性**：清晰的函数职责分离和命名

这个修复方案从根本上解决了多窗口环境下ComfyUI图片URL服务器不一致的问题，确保用户在任何窗口环境下都能正常查看生成的图片。
