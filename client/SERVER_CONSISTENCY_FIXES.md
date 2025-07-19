# WebSocket服务器一致性修复总结

## 🚨 发现的关键问题

通过全面检查 `client/src/services/comfyui.js` 文件，发现了多个可能导致服务器切换的关键问题：

### 1. **多个 `getApiBaseUrl()` 调用点缺乏一致性保证**
- `uploadImageToComfyUI()` - 图片上传
- `getGeneratedImage()` - 图片获取  
- `getTaskHistory()` - 历史记录查询
- `getImage()` - 图片下载
- `checkComfyUIServerStatus()` - 服务器状态检查
- `processUndressImage()` 中的原图URL构建

### 2. **WebSocket锁定条件过于严格**
原始条件：`currentWebSocketServer && wsConnection && wsConnection.readyState === WebSocket.OPEN`
问题：WebSocket临时断开时立即失去锁定，导致服务器切换

### 3. **缺乏服务器一致性验证**
各个API调用之间没有验证是否使用相同服务器

### 4. **任务执行过程中的服务器切换风险**
在任务执行期间，如果WebSocket断开重连，可能选择不同服务器

## 🔧 实施的修复方案

### 修复1: 强化 `getApiBaseUrl()` 的锁定逻辑

**新的锁定条件：**
```javascript
const hasLockedServer = !!currentWebSocketServer
const wsIsHealthy = wsConnection && wsConnection.readyState === WebSocket.OPEN
const hasPendingTasks = pendingTasks.size > 0
const shouldUseLocked = hasLockedServer && (wsIsHealthy || hasPendingTasks)
```

**关键改进：**
- 有待处理任务时，即使WebSocket断开也保持锁定
- 增加详细的锁定原因日志
- 错误情况下优先使用锁定服务器

### 修复2: 在 `submitWorkflow()` 中强制服务器锁定验证

```javascript
// 验证服务器锁定状态
if (!currentWebSocketServer) {
  throw new Error('WebSocket服务器未锁定，无法确保任务一致性')
}

// 双重验证：确保API使用的是锁定的服务器
if (apiBaseUrl !== currentWebSocketServer.replace(/\/$/, '')) {
  throw new Error('服务器不一致，可能导致任务状态同步问题')
}
```

### 修复3: 增强 `ensureWebSocketConnection()` 的一致性检查

```javascript
// 如果有待处理任务但连接断开，必须重连到相同服务器
if (pendingTasks.size > 0 && currentWebSocketServer) {
  console.log(`🔄 有 ${pendingTasks.size} 个待处理任务，重连到锁定服务器`)
}

// 验证连接后的服务器锁定状态
if (!currentWebSocketServer) {
  throw new Error('WebSocket连接后未能锁定服务器')
}
```

### 修复4: 为关键API调用添加服务器一致性验证

**在以下函数中添加验证：**
- `uploadImageToComfyUI()` - 图片上传前验证
- `getTaskHistory()` - 历史查询前验证  
- `getGeneratedImage()` - 图片获取前验证

**验证逻辑：**
```javascript
if (currentWebSocketServer && apiBaseUrl !== currentWebSocketServer.replace(/\/$/, '')) {
  throw new Error(`服务器不一致：任务在 ${currentWebSocketServer} 上执行，但查询 ${apiBaseUrl}`)
}
```

### 修复5: 新增全局服务器一致性验证函数

```javascript
async function validateServerConsistency(operation = 'API调用') {
  const apiBaseUrl = await getApiBaseUrl()
  const normalizedLocked = currentWebSocketServer.replace(/\/$/, '')
  const normalizedApi = apiBaseUrl.replace(/\/$/, '')
  
  if (normalizedLocked !== normalizedApi) {
    return { 
      consistent: false, 
      reason: `服务器不一致：锁定=${normalizedLocked}, API=${normalizedApi}`,
      lockedServer: normalizedLocked,
      apiServer: normalizedApi
    }
  }
  
  return { consistent: true, server: normalizedApi }
}
```

## 🎯 修复效果

### ✅ 解决的问题

1. **服务器锁定稳定性**
   - WebSocket断开不再导致服务器切换
   - 有待处理任务时强制保持锁定

2. **任务生命周期一致性**
   - 从图片上传到结果获取全程使用同一服务器
   - 工作流提交、历史查询、图片下载都在同一服务器

3. **错误恢复机制**
   - 网络问题时保持锁定，重连到同一服务器
   - 提供详细的不一致性错误信息

4. **调试和监控能力**
   - 新增服务器一致性验证函数
   - 详细的锁定状态日志
   - 全面的测试脚本

### 🔄 新的工作流程

1. **任务开始**：WebSocket连接建立并锁定服务器
2. **图片上传**：验证服务器一致性后上传到锁定服务器
3. **工作流提交**：强制验证服务器锁定状态
4. **任务执行**：即使WebSocket断开也保持服务器锁定
5. **历史查询**：验证服务器一致性后查询锁定服务器
6. **结果获取**：从锁定服务器获取生成的图片
7. **任务完成**：所有任务完成后自动解锁

## 🧪 验证方法

### 1. 运行一致性测试
```javascript
// 在浏览器控制台运行
fetch('/test-server-consistency.js').then(r=>r.text()).then(eval)
```

### 2. 手动验证步骤
```javascript
// 1. 检查锁定状态
window.debugWebSocketLock()

// 2. 验证服务器一致性
await window.validateServerConsistency()

// 3. 测试多次API调用
for(let i=0; i<5; i++) {
  console.log(await window.getApiBaseUrl())
}

// 4. 检查解锁条件
window.checkServerUnlockCondition()
```

### 3. 预期日志输出
```
🔒 使用WebSocket锁定的服务器: https://78v9gnx8bp-8188.cnb.run
📊 锁定原因: WebSocket健康=true, 待处理任务=1
✅ [uploadImage] 服务器一致性验证通过
✅ [submitWorkflow] 确认使用锁定服务器
✅ [getTaskHistory] 服务器一致性验证通过
✅ [getGeneratedImage] 服务器一致性验证通过
🔓 所有任务已完成，解锁服务器
```

## 🛡️ 保护机制

1. **多层验证**：在每个关键API调用前验证服务器一致性
2. **强制锁定**：有待处理任务时拒绝解锁服务器
3. **错误阻断**：发现服务器不一致时立即抛出错误
4. **智能重连**：断开后重连到锁定的服务器
5. **详细日志**：提供完整的锁定状态追踪

这些修复确保了整个任务生命周期中的服务器一致性，彻底解决了 prompt_id 在不同服务器间不一致的问题。
