# 🔧 跨浏览器WebSocket冲突修复文档

## 📋 问题描述

### 原始Bug场景
用户A在浏览器A中分别通过ABCF4个窗口发起4个任务，用户B在浏览器B中分别通过EDGH4个窗口发起4个任务。ABCDE任务均在服务器A运行，FGH任务均在服务器B运行。结果服务器B的任务GH，在浏览器B中均卡在52.25%。

### 根本原因
ComfyUI服务器对每个`clientId`只维护一个活跃WebSocket连接。当不同浏览器的相同窗口标识（如窗口E）连接到同一服务器时，会使用相同的`clientId`，导致：
1. **浏览器B窗口E** 连接到服务器B，使用 `clientId_E`
2. **浏览器A窗口E** 也连接到服务器B，使用相同的 `clientId_E`
3. **服务器B** 断开浏览器A的连接，只保留浏览器B的连接
4. **任务G、H** 在服务器B执行，但WebSocket消息只发送给浏览器B
5. **浏览器A的窗口** 无法收到完成消息，卡在52.25%

## 🔧 修复方案

### 1. 添加浏览器会话标识函数
```javascript
// 🔧 获取浏览器会话唯一标识
function getBrowserSessionId() {
  // 尝试从sessionStorage获取，如果不存在则生成新的
  let sessionId = sessionStorage.getItem('comfyui_browser_session_id')
  
  if (!sessionId) {
    // 生成基于时间戳和随机数的唯一标识
    sessionId = Date.now().toString(36) + Math.random().toString(36).substr(2, 9)
    sessionStorage.setItem('comfyui_browser_session_id', sessionId)
    console.log(`🆔 [${WINDOW_ID}] 生成新的浏览器会话ID: ${sessionId}`)
  } else {
    console.log(`🆔 [${WINDOW_ID}] 使用现有浏览器会话ID: ${sessionId}`)
  }
  
  return sessionId
}
```

### 2. 修改clientId生成逻辑
```javascript
// 🔧 为当前窗口生成唯一的clientId - 修复跨浏览器冲突
function generateUniqueClientId() {
  const baseId = 'abc1373d4ad648a3a81d0587fbe5534b' // 基础clientId
  const browserSessionId = getBrowserSessionId() // 🔧 添加浏览器会话标识
  const windowId = generateWindowId()

  // 🔧 修复跨浏览器冲突：基础ID + 浏览器会话ID + 窗口ID
  const clientId = `${baseId}_${browserSessionId}_${windowId}`
  
  console.log(`🔑 [${WINDOW_ID}] 生成clientId: ${clientId}`)
  console.log(`🔧 [${WINDOW_ID}] 跨浏览器隔离: 不同浏览器的相同窗口将使用不同clientId`)
  
  return clientId
}
```

### 3. 增强调试和日志
- 添加浏览器会话ID的日志输出
- 在WebSocket连接时显示跨浏览器隔离信息
- 提供专门的调试函数验证修复效果

## ✅ 修复效果

### ClientId格式变化
**修复前:**
```
abc1373d4ad648a3a81d0587fbe5534b_1234567890_abc123def_windowE
```

**修复后:**
```
浏览器A: abc1373d4ad648a3a81d0587fbe5534b_session123_1234567890_abc123def
浏览器B: abc1373d4ad648a3a81d0587fbe5534b_session456_1234567890_abc123def
```

### 解决的问题
1. ✅ **不同浏览器的相同窗口使用不同clientId**
2. ✅ **每个浏览器会话都有独立的WebSocket连接**
3. ✅ **避免跨浏览器的连接冲突**
4. ✅ **任务消息能正确路由到对应的浏览器窗口**

## 🧪 验证方法

### 1. 使用测试页面
打开 `client/test-cross-browser-fix.html` 在不同浏览器中验证：
- Chrome、Firefox、Edge等不同浏览器
- 观察每个浏览器生成的clientId差异
- 验证浏览器会话ID隔离机制

### 2. 控制台验证
在浏览器控制台执行：
```javascript
// 查看当前clientId
console.log('当前clientId:', WINDOW_CLIENT_ID)

// 查看浏览器会话ID
console.log('浏览器会话ID:', sessionStorage.getItem('comfyui_browser_session_id'))

// 验证修复效果
window.debugCrossBrowserFix()
```

### 3. 实际场景测试
1. 在浏览器A中打开多个窗口，发起任务到服务器A和B
2. 在浏览器B中打开多个窗口，发起任务到相同的服务器
3. 验证所有任务都能正常完成，不会出现卡在52.25%的情况

## 📊 技术细节

### sessionStorage的使用
- **持久性**: 在浏览器会话期间保持不变
- **隔离性**: 不同浏览器有独立的sessionStorage
- **安全性**: 不会跨域泄露，确保隔离效果

### 兼容性保证
- 保持原有的窗口隔离机制不变
- 向后兼容现有的任务管理逻辑
- 不影响单浏览器多窗口的正常使用

### 性能影响
- 最小化性能开销，只在clientId生成时调用
- sessionStorage读写操作极快
- 不增加网络请求或复杂计算

## 🔍 调试工具

新增的调试函数：
```javascript
// 验证跨浏览器修复效果
window.debugCrossBrowserFix()

// 显示当前窗口信息
window.getWindowInfo()

// 检查服务器一致性
window.debugServerConsistency()
```

## 📝 部署说明

修复已集成到 `client/src/services/comfyui.js` 文件中，无需额外配置。修复会在页面加载时自动生效，确保每个浏览器会话都有唯一的标识。

## 🎯 预期结果

修复后，原始bug场景将不再出现：
- 浏览器A和B的窗口E将使用不同的clientId
- 服务器B将为两个浏览器维护独立的WebSocket连接
- 任务G、H的完成消息将正确路由到对应的浏览器
- 所有任务都能正常完成，不会卡在52.25%
