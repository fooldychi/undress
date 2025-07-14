# WebSocket与负载均衡冲突修复

## 🎯 问题分析

用户报告的WebSocket错误代码1006（连接异常关闭）确实与负载均衡策略冲突有关：

### 根本原因

1. **服务器不一致**：WebSocket连接使用的服务器与HTTP API调用的服务器可能不同
2. **动态切换冲突**：负载均衡器会动态切换服务器，但WebSocket是长连接
3. **锁定机制不当**：普通的服务器锁定时间太短（15秒），不适合WebSocket长连接
4. **状态不同步**：WebSocket连接状态与负载均衡器状态不同步

### 错误代码1006的含义

- **1006**：连接异常关闭，通常由以下原因导致：
  - 网络中断
  - 服务器切换
  - 代理服务器问题
  - 负载均衡器重定向

## 🔧 修复方案

### 1. WebSocket专用服务器锁定

**问题**：普通锁定时间太短，不适合WebSocket长连接

**解决方案**：
- 添加WebSocket专用锁定机制
- 锁定时间延长到5分钟
- 独立的锁定状态管理

```javascript
// 新增WebSocket专用锁定变量
this.webSocketLockedServer = null
this.webSocketLockTime = 0
this.webSocketLockDuration = 300000 // 5分钟

// WebSocket专用锁定方法
lockServerForWebSocket(serverUrl) {
  this.webSocketLockedServer = serverUrl
  this.webSocketLockTime = Date.now()
  console.log(`🔒🌐 锁定服务器用于WebSocket: ${serverUrl}`)
}
```

### 2. 服务器一致性保证

**问题**：WebSocket和HTTP可能使用不同服务器

**解决方案**：
- 记录当前WebSocket连接的服务器
- HTTP请求优先使用WebSocket服务器
- 检测服务器切换并重连WebSocket

```javascript
// 记录当前WebSocket服务器
let currentWebSocketServer = null

// 优先使用WebSocket服务器保持一致性
if (!forceReassessment && currentWebSocketServer && isWsConnected) {
  console.log('🔗 使用WebSocket连接的服务器保持一致性')
  return currentWebSocketServer
}
```

### 3. 智能服务器切换

**问题**：服务器切换时WebSocket连接丢失

**解决方案**：
- 检测服务器变更
- 异步重连WebSocket
- 不阻塞当前HTTP请求

```javascript
// 检测服务器切换
if (currentWebSocketServer !== optimalServer && isWsConnected) {
  console.log('⚠️ 检测到服务器切换，需要重连WebSocket')
  // 异步重连，不阻塞当前请求
  setTimeout(() => {
    initializeWebSocket(true)
  }, 100)
}
```

### 4. 负载均衡优先级调整

**问题**：负载均衡器不考虑WebSocket连接状态

**解决方案**：
- WebSocket锁定的服务器优先级最高
- 普通锁定服务器次之
- 最后才是动态选择

```javascript
// 优先检查WebSocket锁定的服务器
if (this.isWebSocketServerLocked()) {
  const webSocketServer = this.getWebSocketLockedServer()
  if (webSocketServer) {
    return webSocketServer
  }
}
```

### 5. 连接状态监控

**问题**：无法及时发现连接问题

**解决方案**：
- 详细的WebSocket关闭原因分析
- 连接状态与服务器状态同步
- 自动释放锁定资源

```javascript
// 分析WebSocket关闭原因
switch (event.code) {
  case 1006:
    closeReason = '连接异常关闭（可能是网络问题或服务器切换）'
    break
  // ... 其他错误代码
}

// 释放WebSocket服务器锁定
loadBalancer.unlockWebSocketServer()
```

## 📋 修复效果

### 解决的问题

1. ✅ **WebSocket 1006错误** - 通过服务器一致性保证减少异常关闭
2. ✅ **服务器切换冲突** - WebSocket专用锁定机制
3. ✅ **连接状态不同步** - 统一的状态管理
4. ✅ **负载均衡干扰** - 优先级调整和智能切换

### 新增功能

1. **WebSocket专用锁定** - 5分钟长时间锁定
2. **服务器一致性检查** - 确保WebSocket和HTTP使用同一服务器
3. **智能重连机制** - 检测到服务器切换时自动重连
4. **详细状态监控** - 连接关闭原因分析

## 🎯 使用体验

修复后，用户将体验到：

1. **更稳定的WebSocket连接** - 减少1006错误
2. **一致的服务器体验** - WebSocket和HTTP使用同一服务器
3. **透明的服务器切换** - 自动处理服务器变更
4. **可靠的任务同步** - 确保处理结果正确接收

## 🔍 技术细节

### 关键变量

- `currentWebSocketServer` - 当前WebSocket连接的服务器
- `webSocketLockedServer` - WebSocket专用锁定的服务器
- `webSocketLockDuration` - WebSocket锁定持续时间（5分钟）

### 核心函数

- `lockServerForWebSocket()` - WebSocket专用服务器锁定
- `unlockWebSocketServer()` - 释放WebSocket服务器锁定
- `isWebSocketServerLocked()` - 检查WebSocket服务器锁定状态
- `getWebSocketLockedServer()` - 获取WebSocket锁定的服务器

### 工作流程

1. **WebSocket连接时**：
   - 选择最优服务器
   - 锁定服务器用于WebSocket（5分钟）
   - 记录当前WebSocket服务器

2. **HTTP请求时**：
   - 优先使用WebSocket连接的服务器
   - 检测服务器变更
   - 必要时异步重连WebSocket

3. **WebSocket关闭时**：
   - 分析关闭原因
   - 释放服务器锁定
   - 清理连接状态

## 📊 监控指标

### 日志标识

- `🔒🌐` - WebSocket服务器锁定操作
- `🔓🌐` - WebSocket服务器锁定释放
- `🔗` - 使用WebSocket服务器保持一致性
- `⚠️ 检测到服务器切换` - 服务器变更检测

### 错误代码分析

现在会详细分析WebSocket关闭的错误代码：
- 1000: 正常关闭
- 1001: 端点离开
- 1006: 连接异常关闭（重点关注）
- 1011: 服务器错误

这次修复从根本上解决了WebSocket与负载均衡的冲突问题，确保了连接的稳定性和任务结果的可靠同步。
