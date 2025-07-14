# WebSocket可靠性修复

## 🎯 问题描述

用户报告了WebSocket偶尔中断的情况，导致ComfyUI已经处理完结果，但客户端一直显示"处理中"状态。主要问题包括：

1. **JSON解析错误**：`JSON.parse: unexpected character at line 1 column 2`
2. **WebSocket连接中断**：连接意外断开导致消息丢失
3. **任务状态不同步**：服务器完成但客户端未收到通知

## 🔧 修复方案

### 1. 增强消息解析

**问题**：ComfyUI服务器发送的消息格式不一致，导致JSON解析失败

**解决方案**：
- 添加消息格式验证和清理
- 处理BOM字符和特殊字符
- 自动修复常见的JSON格式问题
- 跳过心跳和非JSON消息

```javascript
// 检查是否是心跳或状态消息
if (rawData === 'ping' || rawData === 'pong' || rawData === 'heartbeat') {
  return
}

// 移除可能的BOM或特殊字符
if (rawData.charCodeAt(0) === 0xFEFF) {
  fixedData = rawData.substring(1)
}

// 移除开头的非JSON字符
const jsonStart = fixedData.indexOf('{')
if (jsonStart > 0) {
  fixedData = fixedData.substring(jsonStart)
}
```

### 2. 智能重连机制

**问题**：WebSocket断开后重连策略不够智能

**解决方案**：
- 指数退避重连策略
- 根据待处理任务调整重连优先级
- 最大重连次数限制
- 连接状态健康检查

```javascript
// 指数退避策略
const baseDelay = hasPendingTasks ? 1000 : 5000
const exponentialDelay = Math.min(baseDelay * Math.pow(2, connectionAttempts - 1), 30000)
```

### 3. HTTP轮询备用机制

**问题**：WebSocket完全失效时没有备用方案

**解决方案**：
- 自动切换到HTTP轮询
- 定期检查任务状态
- 与WebSocket并行工作
- 自动停止机制

```javascript
// 启动HTTP轮询备用机制
const pollInterval = setInterval(async () => {
  // 如果WebSocket重新连接成功，停止轮询
  if (isWsConnected) {
    clearInterval(pollInterval)
    return
  }
  
  // 检查任务状态
  for (const promptId of remainingTasks) {
    const result = await checkTaskStatus(promptId)
    if (result && result.status && result.status.completed) {
      // 处理完成的任务
    }
  }
}, 3000)
```

### 4. 任务状态监控

**问题**：任务完成但客户端未收到通知

**解决方案**：
- 任务等待超时前最后检查
- WebSocket断开检测
- 自动状态同步
- 任务状态缓存

```javascript
// 超时前最后尝试检查任务状态
const result = await checkTaskStatus(promptId)
if (result && result.status && result.status.completed) {
  console.log('✅ 超时检查发现任务已完成')
  resolve(result)
  return
}
```

### 5. 健康检查机制

**问题**：无法及时发现连接问题

**解决方案**：
- 定期检查消息接收时间
- 连接状态验证
- 自动故障检测
- 预防性重连

```javascript
function startWebSocketHealthCheck() {
  wsHealthCheckTimer = setInterval(() => {
    const timeSinceLastMessage = Date.now() - lastMessageTime
    
    // 如果超过30秒没有收到消息，认为连接可能有问题
    if (timeSinceLastMessage > 30000) {
      console.warn('⚠️ WebSocket健康检查：连接可能异常')
      // 触发重连或备用机制
    }
  }, 10000)
}
```

## 📋 修复效果

### 解决的问题

1. ✅ **JSON解析错误** - 增强消息格式处理，自动修复常见问题
2. ✅ **连接中断** - 智能重连机制，指数退避策略
3. ✅ **任务丢失** - HTTP轮询备用，确保任务状态同步
4. ✅ **状态不一致** - 多重检查机制，防止状态丢失
5. ✅ **用户体验** - 实时通知，状态可视化

### 新增功能

1. **消息格式兼容性** - 处理各种格式的ComfyUI消息
2. **连接健康监控** - 实时检测连接状态
3. **智能重连策略** - 根据情况调整重连行为
4. **备用通信机制** - HTTP轮询作为WebSocket的备用
5. **详细错误处理** - 更好的错误信息和恢复机制

## 🎯 使用体验

修复后，用户将体验到：

1. **更稳定的连接** - 自动处理连接问题
2. **可靠的结果同步** - 确保处理结果不丢失
3. **实时状态反馈** - 清楚了解处理进度
4. **自动故障恢复** - 无需手动干预
5. **透明的备用机制** - 用户无感知的故障切换

## 🔍 监控和调试

### 控制台日志

- `⚠️ WebSocket健康检查` - 连接状态监控
- `🔄 尝试重新连接` - 重连尝试
- `✅ HTTP轮询发现任务已完成` - 备用机制工作
- `❌ JSON解析失败` - 消息格式问题

### 前端通知

- "WebSocket连接已断开" - 连接状态变化
- "使用HTTP轮询监控任务状态" - 备用机制启动
- "任务完成 (HTTP轮询)" - 备用机制成功

## 📝 技术细节

### 关键变量

- `lastMessageTime` - 最后消息时间
- `connectionAttempts` - 连接尝试次数
- `wsHealthCheckTimer` - 健康检查定时器
- `maxConnectionAttempts` - 最大重连次数

### 核心函数

- `startWebSocketHealthCheck()` - 启动健康检查
- `checkPendingTasksStatus()` - 检查待处理任务
- `fallbackToHttpPolling()` - HTTP轮询备用机制
- 增强的消息解析和错误处理

这次修复确保了WebSocket通信的可靠性，即使在网络不稳定或服务器问题的情况下，也能保证任务结果的正确同步。
