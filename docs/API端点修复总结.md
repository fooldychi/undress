# API端点修复总结

## 问题描述

用户发现系统使用了错误的ComfyUI API端点格式：
- **错误格式**: `https://drzyuzol28-8188.cnb.run/prompt`
- **正确格式**: `https://drzyuzol28-8188.cnb.run/api/prompt`

所有ComfyUI API端点都应该包含 `/api` 前缀。

## 修复范围

### 1. 主要API端点
- ❌ `/prompt` → ✅ `/api/prompt` (工作流提交)
- ❌ `/upload/image` → ✅ `/api/upload/image` (图片上传)
- ❌ `/history/{promptId}` → ✅ `/api/history/{promptId}` (任务状态查询)
- ❌ `/view` → ✅ `/api/view` (图片获取)

### 2. 健康检查端点
- ❌ `/queue` → ✅ `/api/queue` (队列状态)
- ❌ `/system_stats` → ✅ `/api/system_stats` (系统状态)

## 修复的文件

### 1. client/src/services/comfyui.js
**修复内容**：
- `uploadImageToComfyUI()` 函数中的上传端点
- `submitWorkflow()` 函数中的工作流提交端点
- `checkTaskStatus()` 函数中的任务状态查询端点
- `getGeneratedImage()` 函数中的图片获取端点

**具体修改**：
```javascript
// 修改前
fetch(`${apiBaseUrl}/upload/image`)
fetch(`${apiBaseUrl}/prompt`)
fetch(`${apiBaseUrl}/history/${promptId}`)
const imageUrl = `${apiBaseUrl}/view?${params.toString()}`

// 修改后
fetch(`${apiBaseUrl}/api/upload/image`)
fetch(`${apiBaseUrl}/api/prompt`)
fetch(`${apiBaseUrl}/api/history/${promptId}`)
const imageUrl = `${apiBaseUrl}/api/view?${params.toString()}`
```

### 2. client/src/config/comfyui.config.js
**修复内容**：
- 健康检查端点配置

**具体修改**：
```javascript
// 修改前
ENDPOINTS: [
  '/queue',        // 队列状态端点
  '/system_stats', // 系统状态端点
],

// 修改后
ENDPOINTS: [
  '/api/queue',        // 队列状态端点
  '/api/system_stats', // 系统状态端点
],
```

### 3. client/deploy/imagic_production/proxy-server.js
**修复内容**：
- 代理服务器中的端点转发
- 路径重写规则

**具体修改**：
```javascript
// 修改前
fetch(`${COMFYUI_BASE_URL}/upload/image`)
fetch(`${COMFYUI_BASE_URL}/prompt`)
pathRewrite: { '^/api': '' }

// 修改后
fetch(`${COMFYUI_BASE_URL}/api/upload/image`)
fetch(`${COMFYUI_BASE_URL}/api/prompt`)
pathRewrite: { '^/api': '/api' }
```

## 影响的功能

### ✅ 已修复的功能
1. **图片上传** - 使用正确的 `/api/upload/image` 端点
2. **工作流提交** - 使用正确的 `/api/prompt` 端点
3. **任务状态查询** - 使用正确的 `/api/history/{promptId}` 端点
4. **图片获取** - 使用正确的 `/api/view` 端点
5. **健康检查** - 使用正确的 `/api/queue` 和 `/api/system_stats` 端点
6. **负载均衡** - 所有端点都通过负载均衡器使用正确格式

### 🔄 完整的生图流程
现在整个生图流程都使用正确的API端点：
```
1. 上传图片: POST /api/upload/image
2. 提交工作流: POST /api/prompt  
3. 查询状态: GET /api/history/{promptId}
4. 获取结果: GET /api/view?filename=xxx
```

## 验证方法

### 1. 使用测试页面
打开 `test-api-endpoints.html` 进行验证：
- 测试端点生成是否正确
- 验证健康检查端点格式
- 模拟API调用URL构建

### 2. 浏览器控制台检查
发起生图请求时，在控制台查看日志：
```
🔄 第一步：上传图片到ComfyUI服务器
📡 API地址: https://xxx.cnb.run/api/upload/image

🔄 第二步：提交工作流到ComfyUI
📡 API地址: https://xxx.cnb.run/api/prompt

🔍 查询任务状态: https://xxx.cnb.run/api/history/xxx
🌐 获取图片URL: https://xxx.cnb.run/api/view?filename=xxx
```

### 3. 网络面板检查
在浏览器开发者工具的Network面板中，确认所有请求都使用了正确的端点格式。

## 注意事项

### 1. WebSocket连接
WebSocket连接使用 `/ws` 端点，通常不需要 `/api` 前缀：
```javascript
// WebSocket连接保持不变
wss://server.com/ws?clientId=xxx
```

### 2. 代理服务器配置
如果使用代理服务器，确保路径重写规则正确：
```javascript
// 正确的配置
pathRewrite: { '^/api': '/api' }
// 而不是
pathRewrite: { '^/api': '' }
```

### 3. 环境一致性
确保开发环境、测试环境和生产环境都使用相同的端点格式。

## 后续建议

### 1. 端点配置统一化
考虑将所有API端点配置集中到一个配置文件中，避免硬编码。

### 2. 自动化测试
添加自动化测试来验证API端点格式的正确性。

### 3. 文档更新
更新相关文档，确保新的开发者了解正确的端点格式。

## 总结

通过这次修复，所有ComfyUI API调用都使用了正确的端点格式，包含必要的 `/api` 前缀。这确保了：

1. **兼容性** - 与ComfyUI服务器的API规范保持一致
2. **可靠性** - 避免因端点错误导致的请求失败
3. **一致性** - 整个系统使用统一的端点格式
4. **可维护性** - 便于后续的维护和扩展

修复后的系统现在能够正确地与ComfyUI服务器通信，确保生图功能的正常运行。
