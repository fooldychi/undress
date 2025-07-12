# ComfyUI 负载均衡策略实现

## 概述

实现了一个基于任务队列的智能负载均衡策略，能够根据 ComfyUI 服务器的实时队列状况选择最优服务器，避免多个服务器同时被调用，提高资源利用率。

## 核心特性

### 1. 智能服务器选择
- **队列优先**: 优先选择任务队列最少的服务器
- **健康检查**: 只选择健康状态良好的服务器
- **优先级排序**: 相同队列数量时按配置优先级选择
- **服务器锁定**: 选中服务器后锁定30秒，避免频繁切换

### 2. 实时监控
- **队列监控**: 实时获取服务器任务队列信息
- **健康检查**: 定期检查服务器连接状态
- **响应时间**: 监控服务器响应性能
- **故障检测**: 自动检测和处理服务器故障

### 3. 故障转移
- **自动切换**: 服务器故障时自动切换到备用服务器
- **故障记录**: 记录服务器故障历史
- **智能恢复**: 故障服务器恢复后自动重新纳入负载均衡

## 实现架构

### 1. 负载均衡器 (`client/src/services/loadBalancer.js`)

```javascript
class ComfyUILoadBalancer {
  // 核心方法
  async getOptimalServer()        // 获取最优服务器
  async selectServerByMinQueue()  // 基于最小队列选择
  async updateServerLoads()       // 更新服务器负载
  async checkServerHealth()       // 健康检查
  async getServerQueueInfo()      // 获取队列信息
  async recordFailure()           // 记录故障
}
```

### 2. 集成到 ComfyUI 服务 (`client/src/services/comfyui.js`)

```javascript
// 原来的硬编码方式
function getApiBaseUrl() {
  return config.COMFYUI_SERVER_URL
}

// 新的负载均衡方式
async function getApiBaseUrl() {
  return await loadBalancer.getOptimalServer()
}
```

### 3. 状态监控组件 (`client/src/components/LoadBalancerStatus.vue`)

提供可视化的服务器状态监控界面：
- 服务器健康状态
- 队列数量显示
- 锁定状态指示
- 手动测试功能

## 配置要求

### 1. 数据库配置

系统需要在数据库中配置以下参数：

```sql
-- 主服务器
INSERT INTO system_config (config_key, config_value, config_type, config_group, description) 
VALUES ('comfyui.server_url', 'https://main-server.com', 'string', 'comfyui', 'ComfyUI主服务器地址');

-- 备用服务器（每行一个）
INSERT INTO system_config (config_key, config_value, config_type, config_group, description) 
VALUES ('comfyui.backup_servers', 'https://backup1.com\nhttps://backup2.com', 'string', 'comfyui', 'ComfyUI备用服务器地址列表');

-- 自动切换开关
INSERT INTO system_config (config_key, config_value, config_type, config_group, description) 
VALUES ('comfyui.auto_switch', 'true', 'boolean', 'comfyui', '是否自动切换到备用服务器');
```

### 2. ComfyUI 服务器要求

每个 ComfyUI 服务器需要支持以下 API 端点：

- `/system_stats` - 系统状态检查
- `/queue` - 队列信息获取（推荐）
- `/history/{prompt_id}` - 任务历史查询

## 负载均衡算法

### 1. 服务器选择流程

```
1. 检查是否有锁定的服务器
   ├─ 有锁定且未过期 → 使用锁定服务器
   └─ 无锁定或已过期 → 继续选择

2. 更新所有服务器负载信息
   ├─ 并行检查健康状态
   ├─ 并行获取队列信息
   └─ 更新服务器负载缓存

3. 筛选健康的服务器
   ├─ 过滤不健康的服务器
   └─ 按队列数量和优先级排序

4. 选择最优服务器
   ├─ 队列数量最少的服务器
   ├─ 相同队列时选择优先级高的
   └─ 锁定选中的服务器30秒
```

### 2. 队列信息获取

```javascript
// 主要方法：使用 ComfyUI 队列 API
GET /queue
Response: {
  queue_running: [...],    // 正在运行的任务
  queue_pending: [...]     // 等待中的任务
}

// 备用方法：使用系统状态 API
GET /system_stats
Response: { ... }          // 假设队列为0
```

### 3. 故障处理机制

```
1. 检测到服务器故障
   ├─ 记录故障时间和原因
   ├─ 标记服务器为不健康
   └─ 解除服务器锁定

2. 自动故障转移
   ├─ 从健康服务器中重新选择
   ├─ 按负载均衡算法选择最优服务器
   └─ 锁定新选择的服务器

3. 故障恢复检测
   ├─ 定期检查故障服务器状态
   ├─ 服务器恢复后重新纳入负载均衡
   └─ 清除故障标记
```

## 性能优化

### 1. 缓存策略
- **负载信息缓存**: 15秒更新间隔，避免频繁查询
- **健康检查缓存**: 10秒超时，快速故障检测
- **队列信息缓存**: 5秒超时，实时队列状态

### 2. 并发控制
- **并行健康检查**: 同时检查所有服务器状态
- **并行队列查询**: 同时获取所有服务器队列信息
- **服务器锁定**: 30秒锁定期，避免频繁切换

### 3. 降级机制
- **API 不可用**: 队列 API 不可用时使用系统状态 API
- **所有服务器故障**: 回退到配置的主服务器
- **负载均衡器故障**: 回退到单服务器模式

## 监控和调试

### 1. 浏览器控制台工具

```javascript
// 测试负载均衡器
await window.testLoadBalancer()

// 测试故障转移
await window.testServerFailover()

// 查看服务器状态
window.loadBalancer.getServerStats()

// 手动选择服务器
await window.loadBalancer.getOptimalServer()
```

### 2. 状态监控界面

在首页点击"📊 服务器状态"按钮可以查看：
- 服务器健康状态
- 实时队列数量
- 服务器锁定状态
- 手动测试功能

### 3. 日志输出

系统会在控制台输出详细的负载均衡日志：
- 服务器选择过程
- 健康检查结果
- 队列信息获取
- 故障转移记录

## 使用建议

### 1. 生产环境配置
- 配置至少2个 ComfyUI 服务器
- 确保所有服务器支持队列 API
- 定期监控服务器状态
- 设置合理的超时时间

### 2. 开发环境测试
- 使用测试工具验证负载均衡功能
- 模拟服务器故障测试故障转移
- 监控服务器选择日志
- 调整负载均衡参数

### 3. 故障排除
- 检查服务器网络连接
- 验证 ComfyUI API 可用性
- 查看浏览器控制台日志
- 使用状态监控界面诊断

## 扩展性

该负载均衡策略具有良好的扩展性：

1. **支持任意数量服务器**: 可配置多个备用服务器
2. **可插拔的选择算法**: 可以轻松替换服务器选择策略
3. **灵活的监控指标**: 可以添加更多监控维度
4. **自定义故障检测**: 可以定制故障检测逻辑

通过这个负载均衡策略，系统能够智能地分配任务到最合适的 ComfyUI 服务器，提高整体性能和可用性。
