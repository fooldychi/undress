# ComfyUI统一配置管理指南

## 📋 概述

基于前后端分离的架构原则，ComfyUI的健康检测端点管理已统一在前端进行定义和管理，采用官方推荐的端点格式。

## 🏗️ 配置文件结构

### 主配置文件: `client/src/config/comfyui.config.js`

```javascript
const config = {
  // 基础配置
  BASE_URL: '...',
  CLIENT_ID: '...',

  // 健康检测配置
  HEALTH_CHECK: {
    // 官方端点 - ComfyUI官方推荐（按优先级排序）
    ENDPOINTS: [
      '/api/queue',        // 队列状态端点 - 最重要的健康指标
      '/api/system_stats', // 系统状态端点 - 服务器信息
    ],

    // 标准请求头配置
    HEADERS: {
      'Accept': 'application/json, */*',
      'Accept-Language': 'zh-CN,zh;q=0.9',
      'Cache-Control': 'no-cache',
      'comfy-user': 'health-monitor',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    },

    // 超时配置
    TIMEOUT: 10000, // 10秒

    // 响应验证配置
    VALIDATION: {
      QUEUE_INDICATORS: ['queue_running', 'queue_pending', 'exec_info'],
      STATS_INDICATORS: ['system', 'devices', 'python_version'],
    }
  }
}
```

## 🚀 使用方法

### 1. 获取健康检测端点列表

```javascript
import comfyUIConfig from '../config/comfyui.config.js'

// 获取按优先级排序的端点列表
const endpoints = comfyUIConfig.getHealthCheckEndpoints()
// 返回: ['/api/queue', '/api/system_stats']
```

### 2. 执行健康检测

```javascript
// 使用统一的请求头
const response = await fetch(`${serverUrl}${endpoint}`, {
  method: 'GET',
  headers: comfyUIConfig.HEALTH_CHECK.HEADERS,
  signal: AbortSignal.timeout(comfyUIConfig.HEALTH_CHECK.TIMEOUT)
})
```

### 3. 验证响应

```javascript
// 验证响应是否为有效的ComfyUI响应
const data = await response.json()
const isValid = comfyUIConfig.validateResponse(endpoint, data)
```

## 📊 端点优先级说明

### 官方端点（按优先级排序）
1. **`/api/queue`** - ComfyUI官方队列端点
   - 最重要的健康指标
   - 返回队列运行状态和待处理任务

2. **`/api/system_stats`** - ComfyUI官方系统状态端点
   - 服务器系统信息
   - 设备状态和Python版本信息

## ✅ 响应验证规则

### 队列端点验证
检查响应中是否包含以下字段之一：
- `queue_running` - 正在运行的队列
- `queue_pending` - 待处理的队列
- `exec_info` - 执行信息

### 系统状态端点验证
检查响应中是否包含以下字段之一：
- `system` - 系统信息
- `devices` - 设备信息
- `python_version` - Python版本

## ⚖️ 负载均衡机制

### 服务器管理
负载均衡器从配置服务动态获取服务器列表：

```javascript
// 主服务器（优先级最高）
comfyui.server_url: "https://primary-server.com"

// 备用服务器（支持多个，换行或逗号分隔）
comfyui.backup_servers: "https://backup1.com,https://backup2.com"
```

### 健康检测流程
1. **定期检测** - 每30秒自动检查所有服务器健康状态
2. **官方端点** - 使用 `/api/queue` 和 `/api/system_stats` 进行检测
3. **响应验证** - 验证响应内容是否符合ComfyUI格式
4. **故障转移** - 自动切换到健康的备用服务器

### 服务器选择策略
1. 优先返回健康的主服务器
2. 主服务器不可用时，选择健康的备用服务器
3. 所有服务器都不健康时，使用第一个服务器（可能恢复）
4. 没有配置服务器时，使用默认配置

## 🧪 测试方法

### 浏览器控制台测试
```javascript
// 导入测试工具
import { testUnifiedHealthCheck } from './src/utils/test-unified-config.js'

// 执行测试
testUnifiedHealthCheck('https://your-comfyui-server.com')
```

### 配置统一性验证
```bash
# 运行验证脚本检查是否还有硬编码端点
node scripts/verify-unified-config.js
```

## 🎯 优势

1. **统一管理** - 所有端点配置集中在一个文件中
2. **官方标准** - 采用ComfyUI官方推荐的端点格式
3. **优先级明确** - 按重要性排序，优先使用官方端点
4. **兼容性好** - 支持新旧版本ComfyUI
5. **易于维护** - 配置变更只需修改一个文件
6. **响应验证** - 确保连接的是真正的ComfyUI服务器

## 📁 相关文件

### 配置文件
- ✅ `client/src/config/comfyui.config.js` - 主配置文件

### 服务文件
- ✅ `client/src/services/loadBalancer.js` - 负载均衡器
- ✅ `client/src/services/comfyui.js` - ComfyUI服务

### 验证工具
- ✅ `scripts/verify-unified-config.js` - 配置验证脚本

## ⚠️ 注意事项

1. **前端专用** - 此配置仅用于前端，后端不再定义ComfyUI端点
2. **按序测试** - 健康检测按端点优先级顺序进行，找到第一个可用端点即停止
3. **响应验证** - 不仅检查HTTP状态码，还验证响应内容是否符合ComfyUI格式
4. **超时控制** - 统一的超时时间配置，避免长时间等待
5. **无备用端点** - 已移除备用端点配置，只使用官方推荐的端点

## 🔧 维护指南

### 添加新端点
1. 在 `HEALTH_CHECK.ENDPOINTS` 数组中添加新端点
2. 在 `VALIDATION` 对象中添加对应的验证规则
3. 更新文档说明

### 修改验证规则
1. 更新 `VALIDATION` 配置
2. 测试验证逻辑
3. 更新相关文档

### 性能优化
1. 调整超时时间配置
2. 优化端点检测顺序
3. 监控健康检测性能

---

**注意**: ComfyUI配置是AI功能正常运行的基础，请严格按照本指南进行配置和维护。
