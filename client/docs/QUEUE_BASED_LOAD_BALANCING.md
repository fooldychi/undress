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

## 🚀 实现细节

### 健康检测增强
```javascript
async checkServerHealth(serverUrl) {
  try {
    // 使用官方队列端点检测
    const response = await fetch(`${serverUrl}/api/queue`, {
      method: 'GET',
      headers: comfyUIConfig.HEALTH_CHECK.HEADERS,
      signal: AbortSignal.timeout(comfyUIConfig.HEALTH_CHECK.TIMEOUT)
    })

    if (response.ok) {
      const data = await response.json()
      const queueInfo = this.parseQueueInfo(data)
      
      return {
        healthy: true,
        queueInfo,
        lastCheck: Date.now()
      }
    }
  } catch (error) {
    return {
      healthy: false,
      error: error.message,
      lastCheck: Date.now()
    }
  }
}
```

### 服务器状态管理
```javascript
class LoadBalancer {
  constructor() {
    this.servers = new Map()
    this.healthCheckInterval = 30000 // 30秒检查一次
    this.verboseLogging = false // 默认简洁日志
  }

  // 更新服务器状态
  updateServerStatus(url, status) {
    this.servers.set(url, {
      url,
      ...status,
      lastUpdate: Date.now()
    })
  }

  // 获取最优服务器
  getBestServer() {
    const healthyServers = Array.from(this.servers.values())
      .filter(server => server.healthy)
      .sort((a, b) => a.queueInfo.total - b.queueInfo.total)

    return healthyServers[0]?.url || null
  }
}
```

## 📈 性能优化

### 1. 缓存机制
- **状态缓存** - 缓存服务器健康状态，避免频繁检测
- **队列信息缓存** - 短时间内复用队列信息
- **智能更新** - 仅在必要时更新服务器状态

### 2. 异步处理
- **并发检测** - 同时检测多个服务器状态
- **非阻塞操作** - 健康检测不阻塞主要业务流程
- **超时控制** - 设置合理的超时时间

### 3. 资源管理
- **连接复用** - 复用HTTP连接
- **内存优化** - 及时清理过期数据
- **错误恢复** - 自动重试和故障恢复

## 🔍 监控与日志

### 简洁日志模式（默认）
```
[LoadBalancer] 可用服务器: 2/3, 最优: server1.com (队列: 0)
[LoadBalancer] 服务器切换: server2.com → server1.com (队列更少)
```

### 详细日志模式
```javascript
// 启用详细日志
loadBalancer.setVerboseLogging(true)

// 输出详细信息
[LoadBalancer] 健康检测完成:
  - server1.com: ✅ 健康 (运行: 0, 等待: 0, 总计: 0)
  - server2.com: ✅ 健康 (运行: 1, 等待: 2, 总计: 3)
  - server3.com: ❌ 不健康 (连接超时)
```

### 状态监控
```javascript
// 获取负载均衡状态
const status = loadBalancer.getStatus()
console.log({
  totalServers: status.total,
  healthyServers: status.healthy,
  currentBest: status.bestServer,
  lastCheck: status.lastHealthCheck
})
```

## 🧪 测试验证

### 功能测试
1. **队列负载测试** - 验证选择队列最少的服务器
2. **故障转移测试** - 验证服务器故障时的自动切换
3. **性能测试** - 验证负载均衡的响应时间
4. **并发测试** - 验证多用户同时使用的表现

### 测试用例
```javascript
// 测试队列优先选择
describe('队列负载均衡', () => {
  test('应该选择队列最少的服务器', async () => {
    // 模拟服务器状态
    const servers = [
      { url: 'server1', queueInfo: { total: 5 } },
      { url: 'server2', queueInfo: { total: 2 } },
      { url: 'server3', queueInfo: { total: 8 } }
    ]
    
    const best = loadBalancer.selectBestServer(servers)
    expect(best.url).toBe('server2') // 队列最少
  })
})
```

## 📁 相关文件

### 核心文件
- `client/src/services/loadBalancer.js` - 负载均衡器主文件
- `client/src/config/comfyui.config.js` - ComfyUI配置
- `client/src/services/comfyui.js` - ComfyUI服务集成

### 配置文件
- `client/src/config/imageProcessingConfigs.js` - 图像处理配置
- `server/src/routes/config.js` - 服务器配置API

## 🔧 配置选项

### 负载均衡配置
```javascript
const loadBalancerConfig = {
  healthCheckInterval: 30000,    // 健康检测间隔（毫秒）
  timeout: 10000,               // 请求超时时间
  retryAttempts: 3,             // 重试次数
  verboseLogging: false,        // 详细日志
  queueWeightEnabled: true,     // 启用队列权重
  failoverEnabled: true         // 启用故障转移
}
```

### 服务器配置
```javascript
// 在配置服务中设置
{
  "comfyui.server_url": "https://primary-server.com",
  "comfyui.backup_servers": "https://backup1.com,https://backup2.com"
}
```

## 🚀 未来优化

### 算法改进
1. **预测性负载均衡** - 基于历史数据预测服务器负载
2. **地理位置优化** - 考虑用户地理位置选择最近服务器
3. **任务类型匹配** - 根据任务类型选择最适合的服务器

### 监控增强
1. **实时监控面板** - 可视化服务器状态和负载
2. **性能指标收集** - 收集响应时间、成功率等指标
3. **告警机制** - 服务器异常时自动告警

### 用户体验
1. **透明化信息** - 向用户显示当前服务器状态
2. **手动选择** - 允许用户手动选择服务器
3. **排队提示** - 显示预估等待时间

---

**注意**: 负载均衡是系统稳定性的关键组件，任何修改都应该经过充分测试。
