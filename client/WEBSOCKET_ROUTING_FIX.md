# WebSocket消息路由错乱问题修复

## 🚨 问题描述

**复现场景**：
- 任务ABC在A服务器运行 ✅ 正常完成
- 任务DEF在B服务器运行 ❌ 卡在52.25%进度

**根本原因**：
1. **WebSocket连接的"先到先得"机制**：第一个连接的WebSocket成为"主连接"，后续连接被忽略
2. **消息路由错乱**：B服务器的任务完成消息被路由到A服务器的WebSocket连接
3. **消息过滤丢弃**：A服务器客户端过滤掉不属于自己的prompt_id，导致B服务器任务永远收不到完成通知

## 🔧 核心修复方案

### 1. **增强clientId唯一性**

**修复前**：
```javascript
function generateUniqueClientId() {
  const baseId = 'abc1373d4ad648a3a81d0587fbe5534b'
  const windowId = generateWindowId()
  return `${baseId}_${windowId}`
}
```

**修复后**：
```javascript
function generateUniqueClientId() {
  const baseId = 'abc1373d4ad648a3a81d0587fbe5534b'
  const timestamp = Date.now()
  const random = Math.random().toString(36).substr(2, 9)
  const windowId = generateWindowId()
  
  // 🔧 增强唯一性：基础ID + 时间戳 + 随机数 + 窗口ID
  return `${baseId}_${timestamp}_${random}_${windowId}`
}
```

### 2. **WebSocket连接支持指定服务器**

**修复前**：
```javascript
async function initializeWebSocket() {
  // 只能连接到负载均衡选择的服务器
  const baseUrl = await loadBalancer.getOptimalServer()
}
```

**修复后**：
```javascript
async function initializeWebSocket(targetServer = null) {
  if (targetServer) {
    // 🔧 新增：强制连接到指定服务器（用于任务执行时的服务器绑定）
    baseUrl = targetServer
    console.log(`🎯 任务-服务器绑定: 确保WebSocket与任务执行服务器一致`)
  }
  // ... 其他逻辑
}
```

### 3. **任务-服务器绑定一致性检查**

**新增核心函数**：
```javascript
async function ensureWebSocketServerConsistency(taskServer) {
  // 检查所有服务器是否一致
  const serversMatch = taskServer === lockedServer && taskServer === wsServer
  
  if (!serversMatch) {
    // 服务器不一致，重新建立连接到正确服务器
    await initializeWebSocket(taskServer)
  }
}
```

### 4. **任务提交时的服务器绑定**

**修复前**：
```javascript
async function uploadImageToComfyUI(base64Image) {
  await ensureWebSocketConnection()  // 可能连接到不同服务器
  const apiBaseUrl = await getApiBaseUrl()
}
```

**修复后**：
```javascript
async function uploadImageToComfyUI(base64Image) {
  const apiBaseUrl = await getApiBaseUrl()
  // 🔧 关键修复：确保WebSocket连接到与上传相同的服务器
  await ensureWebSocketConnection(apiBaseUrl)
}
```

### 5. **WebSocket重连的服务器一致性**

**修复前**：
```javascript
wsConnection.onclose = (event) => {
  setTimeout(() => {
    initializeWebSocket()  // 可能重连到不同服务器
  }, 2000)
}
```

**修复后**：
```javascript
wsConnection.onclose = (event) => {
  const lockedServer = getWindowServerLock()?.server
  if (lockedServer) {
    setTimeout(() => {
      // 🔧 关键修复：重连时指定服务器，确保任务-服务器绑定一致性
      initializeWebSocket(lockedServer)
    }, 2000)
  }
}
```

## 🎯 修复效果

### 解决的问题

1. **✅ 消息路由一致性**：每个任务的WebSocket消息都通过正确的服务器连接接收
2. **✅ 任务完成通知**：B服务器任务不再卡在52.25%，能正常完成并返回结果
3. **✅ 服务器绑定**：任务执行期间WebSocket始终连接到正确的服务器
4. **✅ 窗口隔离**：保持现有的窗口隔离效果，不同窗口任务互不干扰

### 业务逻辑保持

1. **✅ 多用户多窗口**：多窗口/多浏览器可同时发起任务（窗口完全隔离）
2. **✅ 负载均衡**：新任务选择队列最少的服务器执行
3. **✅ 任务级锁定**：任务执行期间锁定服务器确保一致性
4. **✅ 自动解锁**：每个任务有独立prompt_id，任务完成后自动解除锁定

## 🧪 验证方法

### 1. 运行测试脚本
```javascript
// 在浏览器控制台中运行
window.runWebSocketRoutingFixTest()
```

### 2. 手动验证步骤
1. 打开两个浏览器窗口
2. 窗口A提交任务到服务器1
3. 窗口B提交任务到服务器2
4. 验证两个任务都能正常完成并返回结果

### 3. 检查关键指标
- WebSocket连接服务器与任务执行服务器一致
- 任务不再卡在52.25%进度
- 所有任务都能收到完成消息

## 🔍 技术细节

### 消息路由流程（修复后）

```
任务A提交 → 选择服务器1 → WebSocket连接到服务器1 → 任务执行 → 完成消息通过服务器1返回 ✅
任务B提交 → 选择服务器2 → WebSocket重连到服务器2 → 任务执行 → 完成消息通过服务器2返回 ✅
```

### 关键修复点

1. **服务器绑定时机**：在任务提交前确保WebSocket连接到正确服务器
2. **连接一致性检查**：每次API调用前验证WebSocket服务器与API服务器一致
3. **重连策略**：断线重连时强制连接到锁定的服务器
4. **clientId增强**：防止不同窗口/会话的clientId冲突

## 📊 性能影响

- **连接开销**：可能需要更频繁的WebSocket重连，但确保了消息路由正确性
- **内存使用**：增加了服务器一致性检查逻辑，内存开销微小
- **网络流量**：重连时会有短暂的网络开销，但避免了任务卡死的更大损失

## 🚀 部署建议

1. **渐进式部署**：先在测试环境验证修复效果
2. **监控指标**：关注任务完成率和52.25%卡死率的改善
3. **回滚准备**：保留原有代码版本以备回滚
4. **用户通知**：告知用户多服务器任务处理的改进
