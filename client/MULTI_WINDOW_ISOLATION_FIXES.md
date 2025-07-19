# 多窗口任务隔离修复方案

## 🎯 问题描述

在多窗口同时处理任务时出现消息丢失的情况，主要原因：

1. **相同的 clientId**：所有窗口使用相同的固定 clientId 连接 WebSocket
2. **全局任务队列冲突**：多个窗口共享同一个 `pendingTasks` Map
3. **服务器锁定冲突**：多个窗口可能同时锁定同一服务器
4. **消息路由混乱**：ComfyUI 服务器无法区分不同窗口的请求

## 🔧 解决方案

### 1. 窗口唯一标识符生成

```javascript
// 为每个窗口生成唯一的 clientId
function generateUniqueClientId() {
  const baseId = 'abc1373d4ad648a3a81d0587fbe5534b'
  const windowId = generateWindowId()
  return `${baseId}_${windowId}`
}

const WINDOW_CLIENT_ID = generateUniqueClientId()
const WINDOW_ID = generateWindowId()
```

### 2. 窗口隔离的任务队列

```javascript
// 窗口级别的任务队列，避免多窗口冲突
let windowTasks = new Map() // promptId -> task

// 窗口级别的任务管理函数
function registerWindowTask(promptId, task) {
  task.windowId = WINDOW_ID
  task.clientId = WINDOW_CLIENT_ID
  windowTasks.set(promptId, task)
}

function getWindowTask(promptId) {
  const task = windowTasks.get(promptId)
  return (task && task.windowId === WINDOW_ID) ? task : null
}
```

### 3. 窗口级别的服务器锁定

```javascript
// 每个窗口独立的服务器锁定机制
let windowLockedServer = null
let windowLockTimestamp = null

function lockServerForWindow(serverUrl) {
  windowLockedServer = serverUrl
  windowLockTimestamp = Date.now()
  // 同步更新全局变量以保持兼容性
  currentWebSocketServer = windowLockedServer
  serverLockTimestamp = windowLockTimestamp
}
```

### 4. 消息处理隔离

```javascript
// 只处理属于当前窗口的任务
function handleExecutingMessage(data) {
  const task = getWindowTask(data.prompt_id)
  if (!task) {
    console.log(`🔍 [${WINDOW_ID}] 忽略其他窗口的消息: ${data.prompt_id}`)
    return
  }
  // 处理消息...
}
```

### 5. WebSocket 连接隔离

```javascript
// 使用窗口唯一的 clientId 连接
const wsUrl = `${baseUrl}/ws?clientId=${WINDOW_CLIENT_ID}`
```

## 📋 主要修改内容

### 核心文件修改

**`client/src/services/comfyui.js`**

1. **添加窗口标识符生成**
   - `generateWindowId()` - 生成窗口唯一标识
   - `generateUniqueClientId()` - 生成窗口唯一的 clientId
   - `WINDOW_CLIENT_ID` 和 `WINDOW_ID` 全局常量

2. **窗口隔离的任务管理**
   - `windowTasks` - 窗口级别的任务队列
   - `registerWindowTask()` - 注册窗口任务
   - `getWindowTask()` - 获取窗口任务
   - `removeWindowTask()` - 移除窗口任务

3. **窗口级别的服务器锁定**
   - `windowLockedServer` - 窗口锁定的服务器
   - `lockServerForWindow()` - 锁定服务器
   - `unlockServerForWindow()` - 解锁服务器

4. **消息处理函数修改**
   - 所有 WebSocket 消息处理函数都添加了窗口隔离检查
   - 只处理属于当前窗口的任务消息

5. **调试和监控增强**
   - 添加窗口标识到所有日志输出
   - 新增 `window.getWindowInfo()` 调试函数
   - 窗口间通信机制（用于调试）

## 🧪 测试验证

### 1. 运行测试脚本

```javascript
// 在浏览器控制台中运行
// 加载测试脚本
const script = document.createElement('script')
script.src = '/test-multi-window.js'
document.head.appendChild(script)

// 或直接运行测试
window.testMultiWindow()
```

### 2. 多窗口测试步骤

1. **打开多个窗口**：在同一浏览器中打开 3-4 个窗口
2. **检查窗口标识**：每个窗口运行 `window.getWindowInfo()`
3. **同时提交任务**：在多个窗口中同时提交处理任务
4. **验证任务隔离**：确认每个窗口只处理自己的任务
5. **检查消息不丢失**：所有任务都能正确完成

### 3. 调试命令

```javascript
// 查看当前窗口信息
window.getWindowInfo()

// 查看任务状态
window.debugTaskStatus()

// 查看服务器锁定状态
window.debugWebSocketLock()

// 查看所有待处理任务
window.pendingTasks
```

## ✅ 修复效果

### 解决的问题

1. **消息丢失**：每个窗口使用唯一 clientId，避免消息冲突
2. **任务混乱**：窗口级别的任务队列，确保任务隔离
3. **服务器冲突**：每个窗口独立的服务器锁定机制
4. **状态同步**：只处理属于当前窗口的任务状态更新

### 保持的兼容性

1. **向后兼容**：保留原有的全局变量和函数接口
2. **单窗口正常**：单窗口使用场景完全正常工作
3. **调试功能**：所有原有的调试功能继续可用
4. **配置系统**：不影响现有的配置文件和环境变量

## 🔍 监控和调试

### 日志输出格式

```
🪟 [window_1234567890_abc123] 窗口标识: window_1234567890_abc123
🔑 [window_1234567890_abc123] 窗口客户端ID: abc1373d4ad648a3a81d0587fbe5534b_1234567890_abc123
🔒 [window_1234567890_abc123] 锁定服务器: https://server.example.com
📝 [window_1234567890_abc123] 任务已注册: prompt_xyz
```

### 窗口间通信

系统会自动广播任务状态变更到 localStorage，其他窗口可以监听：

```javascript
// 自动监听其他窗口的任务状态
window.addEventListener('storage', (e) => {
  if (e.key && e.key.startsWith('comfyui_task_')) {
    const message = JSON.parse(e.newValue)
    console.log(`📡 收到其他窗口任务状态: ${message.promptId}`)
  }
})
```

## 🚀 部署说明

1. **无需额外配置**：修改后的代码自动生成窗口唯一标识
2. **自动生效**：页面刷新后立即生效
3. **零停机时间**：不影响现有的运行中任务
4. **渐进式部署**：可以逐步在不同环境中部署测试

这个解决方案彻底解决了多窗口同时处理任务时的消息丢失问题，确保每个窗口都有独立的任务队列和 WebSocket 连接。
