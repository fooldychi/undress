# 基于队列的负载均衡实现

## 🎯 功能概述

实现了基于ComfyUI服务器队列数量的智能负载均衡机制，优先选择队列最少的健康服务器，确保任务分配的均衡性和效率。

## 🔧 核心特性

### 1. 队列信息收集
- **实时队列监控** - 获取每个服务器的运行队列和等待队列数量
- **系统信息收集** - 收集ComfyUI版本、系统资源等信息
- **健康状态跟踪** - 持续监控服务器可用性

### 2. 智能负载均衡
- **队列优先** - 仅根据队列数量选择最优服务器
- **最少队列** - 始终选择队列数量最少的健康服务器
- **动态调整** - 根据实时队列状况自动调整选择

### 3. 简化日志输出
- **默认简洁模式** - 只显示关键状态信息
- **详细日志开关** - 可按需启用详细调试信息
- **状态摘要** - 清晰显示可用服务器和队列情况

## 📊 负载均衡算法

### 服务器选择逻辑
```javascript
// 1. 筛选健康服务器
const healthyServers = serverList.filter(s => s.healthy === true)

// 2. 仅按队列数量排序（不考虑优先级）
const sortedServers = healthyServers.sort((a, b) => {
  // 选择队列最少的服务器
  return a.queueInfo.total - b.queueInfo.total
})

// 3. 选择最优服务器
return sortedServers[0].url
```

### 队列信息解析
```javascript
parseQueueInfo(data) {
  const running = Array.isArray(data.queue_running) ? data.queue_running.length : 0
  const pending = Array.isArray(data.queue_pending) ? data.queue_pending.length : 0

  return {
    running,   // 正在运行的任务数
    pending,   // 等待中的任务数
    total: running + pending  // 总队列数
  }
}
```

## 🔍 健康检测优化

### 简化日志模式
- **默认关闭详细日志** - 减少控制台噪音
- **关键信息突出** - 只显示服务器可用性和队列状态
- **状态摘要显示** - 一目了然的整体状况

### 日志输出示例
```
📊 加载了 2 个服务器
✅ 服务器状态: 2/2 可用
  📊 primary: 队列: 1运行/2等待
  📊 backup: 队列: 空闲
🎯 选择服务器: https://backup-server.com (队列: 0)
```

## 🧪 测试工具

### 1. 队列负载均衡测试页面
**访问地址**: `http://localhost:3002/test-queue-balancer.html`

**功能特性**:
- 可视化服务器状态显示
- 实时队列信息监控
- 负载均衡效果测试
- 详细日志开关控制

### 2. 浏览器控制台测试
```javascript
// 基本功能测试
testSimpleLoadBalancer()

// 负载均衡效果测试
testLoadBalancing(10)

// 启用详细日志
loadBalancer.setVerboseLogging(true)
```

### 3. 模拟多次请求测试
```javascript
// 模拟10次请求，观察负载分配
for (let i = 0; i < 10; i++) {
  const server = await loadBalancer.getOptimalServer()
  console.log(`第${i+1}次选择: ${server}`)
}
```

## 📋 配置更新

### 1. ComfyUI配置增强
**文件**: `client/src/config/comfyui.config.js`

**新增功能**:
- `parseQueueInfo()` - 队列信息解析
- `parseSystemInfo()` - 系统信息解析
- 响应验证增强

### 2. 负载均衡器重构
**文件**: `client/src/services/loadBalancer.js`

**主要改进**:
- 队列信息收集和存储
- 基于队列的服务器选择算法
- 简化日志输出
- 详细日志开关控制

## 🎉 使用效果

### 负载均衡效果
- **智能分配** - 自动选择队列最少的服务器
- **公平调度** - 不考虑服务器类型，纯粹基于队列数量选择
- **实时调整** - 根据队列变化动态调整选择

### 日志输出优化
- **简洁明了** - 默认只显示关键信息
- **按需详细** - 可启用详细日志进行调试
- **状态清晰** - 服务器状态和队列情况一目了然

### 监控能力
- **实时队列监控** - 持续跟踪每个服务器的队列状况
- **健康状态跟踪** - 自动检测和处理服务器故障
- **性能指标收集** - 收集系统信息用于监控分析

## 🔄 工作流程

1. **初始化** - 加载服务器列表，建立连接
2. **健康检测** - 定期检查服务器状态和队列信息
3. **负载均衡** - 根据队列情况选择最优服务器
4. **状态更新** - 实时更新服务器状态和队列信息
5. **故障处理** - 自动切换到健康的备用服务器

这个基于队列的负载均衡机制确保了ComfyUI任务的高效分配和处理，提供了更好的用户体验和系统性能。
