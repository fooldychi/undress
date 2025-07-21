# 原图和结果图服务器一致性修复

## 🚨 问题描述

在图片处理完成后，发现原图和结果图使用了不同的服务器URL：

- **原图**: `https://qxaebdffer-8188.cnb.run/api/view?filename=upload_1753110943708_xuv4mm.jpg&type=input&subfolder=`
- **结果图**: `https://nlfrah65vt-8188.cnb.run/api/view?filename=ComfyUI_00007_.png&type=output&subfolder=`

这种不一致会导致用户体验问题，特别是在图片对比功能中。

## 🔍 问题根因分析

### 1. **原图URL构建时机问题**
- **一键褪衣功能**: 在 `processUndressImage` 函数的第2488行，原图URL使用 `await getApiBaseUrl()` 构建
- **换脸功能**: 直接使用前端传入的 `targetImage.value`，没有统一的服务器URL构建

### 2. **服务器选择不一致**
- **图片上传时**: 使用 `uploadImageToComfyUI` 函数，调用 `getApiBaseUrl()` 获取服务器
- **任务执行时**: 使用任务绑定的服务器执行工作流
- **结果获取时**: 使用 `getTaskBoundImageUrl` 函数，优先使用任务绑定的服务器
- **原图获取时**: 使用 `getApiBaseUrl()`，可能返回不同的服务器

### 3. **时序问题**
1. 图片上传 → 服务器A
2. 任务执行 → 服务器B (任务绑定)
3. 结果图获取 → 服务器B (使用任务绑定)
4. 原图获取 → 服务器A (使用负载均衡)

## 🔧 修复方案

### 1. **修复一键褪衣功能的原图URL构建**

#### 修复位置: `client/src/services/comfyui.js:2479-2512`

**修复前:**
```javascript
// 获取节点49的原图用于对比
let originalImage = null
try {
  const params = new URLSearchParams({
    filename: uploadedImageName,
    type: 'input',
    subfolder: ''
  })
  const apiBaseUrl = await getApiBaseUrl()  // ❌ 可能返回不同服务器
  originalImage = `${apiBaseUrl}/api/view?${params.toString()}`
} catch (error) {
  console.warn('⚠️ 获取原图失败:', error)
}
```

**修复后:**
```javascript
// 🔧 修复：获取节点49的原图用于对比，使用任务绑定的服务器
let originalImage = null
try {
  const params = new URLSearchParams({
    filename: uploadedImageName,
    type: 'input',
    subfolder: ''
  })
  
  // 🔧 使用任务绑定的服务器确保原图和结果图使用同一服务器
  let apiBaseUrl
  if (taskResult && taskResult.executionServer) {
    apiBaseUrl = taskResult.executionServer.replace(/\/$/, '')
    console.log(`🎯 [${WINDOW_ID}] 原图使用任务结果中的服务器: ${apiBaseUrl}`)
  } else {
    const task = getWindowTask(submittedPromptId)
    if (task && task.executionServer) {
      apiBaseUrl = task.executionServer.replace(/\/$/, '')
      console.log(`🎯 [${WINDOW_ID}] 原图使用任务绑定的服务器: ${apiBaseUrl}`)
    } else if (windowLockedServer) {
      apiBaseUrl = windowLockedServer.replace(/\/$/, '')
      console.log(`🔄 [${WINDOW_ID}] 原图使用当前锁定服务器: ${apiBaseUrl}`)
    } else {
      apiBaseUrl = await getApiBaseUrl()
      console.warn(`⚠️ [${WINDOW_ID}] 原图使用默认API服务器: ${apiBaseUrl}`)
    }
  }
  
  originalImage = `${apiBaseUrl}/api/view?${params.toString()}`
  console.log(`📷 [${WINDOW_ID}] 原图URL: ${originalImage}`)
} catch (error) {
  console.warn('⚠️ 获取原图失败:', error)
}
```

### 2. **修复换脸功能的目标图片URL构建**

#### 修复位置: `client/src/services/comfyui.js:2715-2766`

**修复前:**
```javascript
return {
  success: true,
  imageUrl: imageUrl,
  targetImageUrl: targetImage, // ❌ 直接使用前端传入的URL
  promptId: promptId,
  // ...
}
```

**修复后:**
```javascript
// 🔧 修复：构建目标图片URL，使用任务绑定的服务器确保一致性
let targetImageUrl = null
try {
  const params = new URLSearchParams({
    filename: targetUploadedFilename,
    type: 'input',
    subfolder: ''
  })
  
  // 🔧 使用任务绑定的服务器确保目标图片和结果图使用同一服务器
  let apiBaseUrl
  if (taskResult && taskResult.executionServer) {
    apiBaseUrl = taskResult.executionServer.replace(/\/$/, '')
    console.log(`🎯 [${WINDOW_ID}] 目标图片使用任务结果中的服务器: ${apiBaseUrl}`)
  } else {
    const task = getWindowTask(submittedPromptId)
    if (task && task.executionServer) {
      apiBaseUrl = task.executionServer.replace(/\/$/, '')
      console.log(`🎯 [${WINDOW_ID}] 目标图片使用任务绑定的服务器: ${apiBaseUrl}`)
    } else if (windowLockedServer) {
      apiBaseUrl = windowLockedServer.replace(/\/$/, '')
      console.log(`🔄 [${WINDOW_ID}] 目标图片使用当前锁定服务器: ${apiBaseUrl}`)
    } else {
      apiBaseUrl = await getApiBaseUrl()
      console.warn(`⚠️ [${WINDOW_ID}] 目标图片使用默认API服务器: ${apiBaseUrl}`)
    }
  }
  
  targetImageUrl = `${apiBaseUrl}/api/view?${params.toString()}`
  console.log(`📷 [${WINDOW_ID}] 目标图片URL: ${targetImageUrl}`)
} catch (error) {
  console.warn('⚠️ 获取目标图片URL失败:', error)
  // 回退到原始目标图片
  targetImageUrl = targetImage
}

return {
  success: true,
  imageUrl: imageUrl,
  targetImageUrl: targetImageUrl, // ✅ 使用服务器一致的目标图片URL
  promptId: promptId,
  // ...
}
```

## 🎯 修复效果

### 服务器选择优先级（统一应用于原图和结果图）:

1. **任务结果中的服务器信息** (最高优先级)
   - `taskResult.executionServer`
   - 确保与结果图使用完全相同的服务器

2. **当前任务中的服务器信息**
   - `task.executionServer`
   - 适用于任务尚未清理的情况

3. **当前锁定的服务器**
   - `windowLockedServer`
   - 适用于服务器仍处于锁定状态的情况

4. **当前API服务器** (最低优先级)
   - `getApiBaseUrl()`
   - 最后的回退选项

### 解决的问题:

- ✅ **服务器URL一致性**: 原图和结果图现在使用相同的服务器URL
- ✅ **图片对比功能**: 确保对比功能中的两张图片都能正常加载
- ✅ **用户体验**: 避免因服务器不一致导致的图片加载失败
- ✅ **多窗口环境**: 在多窗口环境下保持服务器一致性

## 🧪 验证方法

### 1. 测试一键褪衣功能
1. 上传图片进行褪衣处理
2. 等待处理完成
3. 检查控制台日志，确认原图和结果图使用相同服务器
4. 验证图片对比功能正常工作

### 2. 测试换脸功能
1. 上传人脸照片和目标图片进行换脸处理
2. 等待处理完成
3. 检查控制台日志，确认目标图片和结果图使用相同服务器
4. 验证图片对比功能正常工作

### 3. 控制台验证
```javascript
// 检查服务器一致性
window.debugServerConsistency()

// 检查任务状态
window.debugWebSocketLock()
```

## 📋 修复总结

| 功能 | 修复前状态 | 修复后状态 |
|------|-----------|-----------|
| 一键褪衣原图URL | ❌ 使用负载均衡服务器 | ✅ 使用任务绑定服务器 |
| 换脸目标图片URL | ❌ 使用前端传入URL | ✅ 使用任务绑定服务器 |
| 服务器一致性 | ❌ 原图和结果图可能不同服务器 | ✅ 强制使用相同服务器 |
| 图片对比功能 | ❌ 可能因服务器不一致失败 | ✅ 确保两张图片都能加载 |

---

**修复完成时间**: 2025-07-21  
**修复类型**: 原图和结果图服务器一致性  
**核心改进**: 统一的服务器选择逻辑和多级回退机制  
**影响范围**: 一键褪衣和换脸功能的图片URL构建
