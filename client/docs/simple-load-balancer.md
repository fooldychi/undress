# 极简负载均衡器使用说明

## 概述

新的极简负载均衡器专注于核心功能：**只在用户发起生图请求时选择队列最少的可用服务器**。

## 主要特点

### 1. 极简设计
- 移除了复杂的锁定机制
- 移除了定时健康检查
- 移除了WebSocket专用锁定
- 只保留核心的服务器选择功能

### 2. 按需执行
- 只在用户发起生图请求时才进行服务器选择
- 每次选择前都获取最新的服务器列表和状态
- 确保使用最新的队列信息进行决策

### 3. 实时数据
- 每次选择服务器前都从数据库/配置中获取最新服务器列表
- 实时检查所有服务器的健康状态和队列信息
- 基于最新数据进行负载均衡决策

## 工作流程

```
用户发起生图请求
    ↓
获取最新服务器列表（从数据库/配置）
    ↓
并行检查所有服务器的健康状态和队列信息
    ↓
过滤健康的服务器
    ↓
按队列长度和优先级排序
    ↓
选择队列最少的服务器
    ↓
返回选中的服务器URL
```

## API 接口

### 主要方法

#### `loadBalancer.getOptimalServer()`
选择最优服务器的主要接口，只在用户发起生图请求时调用。

```javascript
// 在生图请求中使用
const serverUrl = await loadBalancer.getOptimalServer()
console.log('选择的服务器:', serverUrl)
```

#### `loadBalancer.getLatestServerList()`
获取最新的服务器列表（从数据库/配置中获取）。

```javascript
const servers = await loadBalancer.getLatestServerList()
console.log('服务器列表:', servers)
```

#### `loadBalancer.checkServerHealth(serverUrl)`
检查指定服务器的健康状态。

```javascript
const health = await loadBalancer.checkServerHealth('https://server.com')
console.log('健康状态:', health)
```

#### `loadBalancer.getServerQueueInfo(serverUrl)`
获取指定服务器的队列信息。

```javascript
const queue = await loadBalancer.getServerQueueInfo('https://server.com')
console.log('队列信息:', queue)
```

## 配置要求

### 服务器配置
负载均衡器从以下配置中获取服务器列表：

1. **主服务器**: `comfyui.server_url`
2. **备用服务器**: `comfyui.backup_servers`（每行一个URL）

### 配置示例
```javascript
{
  "comfyui.server_url": "https://primary-server.com",
  "comfyui.backup_servers": "https://backup1.com\nhttps://backup2.com\nhttps://backup3.com"
}
```

## 服务器选择策略

### 1. 健康检查
- 通过访问 `/system_stats` 端点检查服务器是否响应
- 只有健康的服务器才会被考虑

### 2. 队列信息获取
- 通过访问 `/queue` 端点获取队列信息
- 解析 `queue_running` 和 `queue_pending` 数组长度
- 计算总队列长度

### 3. 排序规则
1. **队列长度优先**: 队列越短的服务器优先级越高
2. **配置优先级**: 队列长度相同时，按配置的优先级排序
3. **随机选择**: 如果有多个队列长度相同的服务器，随机选择一个

### 4. 备用策略
如果没有健康的服务器：
1. 选择响应时间最快的服务器
2. 使用第一个配置的服务器
3. 使用配置中的默认服务器

## 测试工具

### 开发环境测试
在浏览器控制台中可以使用以下测试方法：

```javascript
// 基本功能测试
await window.testSimpleLoadBalancer()

// 负载均衡效果测试（10次选择）
await window.testLoadBalancing(10)

// 模拟5个用户同时请求
await window.simulateUserRequests(5)

// 服务器故障恢复测试
await window.testServerFailover()
```

### 测试输出示例
```
🧪 开始测试极简负载均衡器...

📋 测试1: 初始化负载均衡器
✅ 初始化成功

📋 测试2: 获取最新服务器列表
✅ 获取到 3 个服务器:
   1. https://primary-server.com (primary, 优先级: 1)
   2. https://backup1.com (backup, 优先级: 2)
   3. https://backup2.com (backup, 优先级: 3)

📋 测试5: 选择最优服务器
   第1次选择: https://backup1.com
   第2次选择: https://primary-server.com
   第3次选择: https://backup1.com

✅ 所有测试完成！
```

## 与旧版本的区别

### 移除的功能
- ❌ 服务器锁定机制
- ❌ WebSocket专用锁定
- ❌ 定时健康检查
- ❌ 复杂的失败计数
- ❌ 自动重连策略
- ❌ 全局状态管理

### 保留的功能
- ✅ 服务器健康检查
- ✅ 队列信息获取
- ✅ 基于队列的服务器选择
- ✅ 备用服务器支持
- ✅ 错误处理和降级

## 性能优势

1. **更快的响应**: 移除了复杂的锁定检查，直接选择最优服务器
2. **更准确的数据**: 每次都获取最新的服务器状态，避免使用过期数据
3. **更简单的维护**: 代码量减少了约70%，更容易理解和维护
4. **更好的负载均衡**: 没有锁定机制的干扰，真正实现基于队列的负载均衡

## 使用建议

1. **确保服务器配置正确**: 在数据库中正确配置主服务器和备用服务器
2. **监控服务器状态**: 定期检查服务器的健康状态和队列情况
3. **合理设置优先级**: 根据服务器性能设置合适的优先级
4. **测试负载均衡效果**: 使用提供的测试工具验证负载均衡是否正常工作

## 故障排除

### 常见问题

1. **总是选择同一个服务器**
   - 检查其他服务器是否健康
   - 检查队列API是否正常返回数据
   - 使用测试工具验证负载均衡效果

2. **服务器选择失败**
   - 检查服务器配置是否正确
   - 检查网络连接是否正常
   - 查看控制台错误日志

3. **队列信息不准确**
   - 检查服务器的 `/queue` 端点是否正常
   - 验证返回的数据格式是否符合预期
   - 使用测试工具单独测试队列信息获取

### 调试方法

1. **查看控制台日志**: 负载均衡器会输出详细的选择过程日志
2. **使用测试工具**: 运行测试工具验证各个功能是否正常
3. **检查网络请求**: 在浏览器开发者工具中查看网络请求是否成功
