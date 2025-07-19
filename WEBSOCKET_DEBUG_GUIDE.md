# WebSocket 调试指南

## 问题诊断

针对"ComfyUI已处理完毕但客户端仍在等待"的问题，我已经实现了以下优化：

## 🔧 已实现的优化

### 1. 核心函数实现

#### `getTaskHistory(promptId)` - 官方标准API
```javascript
// 通过官方 /history/{prompt_id} 端点获取任务结果
const history = await getTaskHistory(promptId)
```

#### `extractTaskResults(history, promptId)` - 结果提取
```javascript
// 从历史记录中提取输出数据，保持兼容性
const results = await extractTaskResults(history, promptId)
```

#### `getImage(filename, subfolder, folderType)` - 图片获取
```javascript
// 通过官方 /view 端点获取图片数据
const imageBlob = await getImage(filename, subfolder, folderType)
```

### 2. 增强的调试机制

#### 详细的执行日志
- `handleExecutingMessage()` 增加了完整的调试信息
- `handleTaskCompletion()` 记录每个步骤的执行状态
- WebSocket 消息处理增加了完整性检查

#### 调试辅助函数
```javascript
// 在浏览器控制台中调用
import { debugTaskStatus } from './services/comfyui.js'

// 查看所有任务状态
debugTaskStatus()

// 查看特定任务状态
debugTaskStatus('your-prompt-id')
```

### 3. 任务完成检测优化

#### 官方标准检测
```javascript
if (data.node === null) {
  // 官方标准：node为null表示整个工作流执行完成
  console.log(`🎯 检测到任务执行完成: ${promptId}`)
  handleTaskCompletion(promptId)
}
```

#### 增强的任务注册
```javascript
// 任务注册时包含更多调试信息
const task = {
  workflowType: workflowType,
  createdAt: new Date().toISOString(),
  onProgress: (status, progress) => { /* ... */ },
  onComplete: (result) => { /* ... */ },
  onError: (error) => { /* ... */ }
}
```

## 🐛 调试步骤

### 1. 检查 WebSocket 连接
```javascript
// 在浏览器控制台中执行
console.log('WebSocket状态:', window.wsConnection?.readyState)
console.log('连接状态:', window.isWsConnected)
```

### 2. 监控任务状态
```javascript
// 查看待处理任务
import { pendingTasks, debugTaskStatus } from './services/comfyui.js'
debugTaskStatus()
```

### 3. 检查消息流
观察控制台输出，关键消息包括：
- `📨 收到 WebSocket 消息: executing`
- `🎯 检测到任务执行完成: {promptId}`
- `📡 开始获取任务历史记录: {promptId}`
- `✅ 任务结果提取成功: {promptId}`
- `🎉 调用任务完成回调: {promptId}`

### 4. 验证 API 端点
```javascript
// 手动测试历史记录端点
const promptId = 'your-prompt-id'
const response = await fetch(`/history/${promptId}`)
const history = await response.json()
console.log('历史记录:', history)
```

## 🚨 常见问题排查

### 问题1：收不到 executing 消息
**检查项：**
- WebSocket 连接是否正常
- prompt_id 是否正确传递
- 服务器是否正常运行

### 问题2：收到 executing 消息但 node 不为 null
**检查项：**
- 工作流是否真正完成
- 是否有节点执行失败
- 检查 ComfyUI 服务器日志

### 问题3：历史记录获取失败
**检查项：**
- API 端点是否正确 (`/history/{promptId}`)
- 网络连接是否正常
- 服务器是否支持历史记录查询

### 问题4：任务完成回调未触发
**检查项：**
- 任务是否正确注册到 `pendingTasks`
- `onComplete` 回调是否正确设置
- 是否有异常导致回调被跳过

## 📋 测试清单

### 基本功能测试
- [ ] WebSocket 连接建立成功
- [ ] 工作流提交成功
- [ ] 收到 executing 消息
- [ ] 检测到任务完成 (node === null)
- [ ] 历史记录获取成功
- [ ] 结果提取成功
- [ ] 任务完成回调触发

### 错误处理测试
- [ ] 网络异常处理
- [ ] API 错误处理
- [ ] 超时处理
- [ ] 任务清理

## 🔍 实时监控

在浏览器控制台中运行以下代码进行实时监控：

```javascript
// 监控 WebSocket 消息
const originalLog = console.log
console.log = function(...args) {
  if (args[0] && args[0].includes('📨')) {
    originalLog.apply(console, ['🔍 MONITOR:', ...args])
  }
  originalLog.apply(console, args)
}

// 定期检查任务状态
setInterval(() => {
  if (window.pendingTasks && window.pendingTasks.size > 0) {
    console.log('🔍 MONITOR: 待处理任务数:', window.pendingTasks.size)
  }
}, 5000)
```

## 📞 获取支持

如果问题仍然存在，请提供以下信息：

1. 浏览器控制台的完整日志
2. 网络请求的详细信息
3. ComfyUI 服务器的状态
4. 具体的错误消息和堆栈跟踪

通过这些优化和调试工具，应该能够快速定位并解决"客户端等待"的问题。
