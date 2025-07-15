# /api/prompt 请求修复总结

## 问题描述

用户反馈 `/api/prompt` 接口请求失败，需要参考成功的 `/api/upload/image` 请求配置来找出问题。

## 问题分析

通过对比两个请求的配置，发现了关键差异：

### ✅ /api/upload/image (成功的请求)
```javascript
fetch(`${apiBaseUrl}/api/upload/image`, {
  method: 'POST',
  body: formData
  // 没有额外的请求头
  // 没有 mode/credentials 设置
})
```

### ❌ /api/prompt (修复前 - 失败的请求)
```javascript
fetch(promptUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Accept': '*/*',
    'comfy-user': config.CLIENT_ID,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'
  },
  body: JSON.stringify(requestBody),
  mode: 'cors',
  credentials: 'omit'
})
```

## 问题根因

1. **过多的自定义请求头**：可能触发CORS预检请求，导致请求失败
2. **不必要的CORS设置**：`mode: 'cors'` 和 `credentials: 'omit'` 可能不兼容
3. **复杂的User-Agent**：可能被服务器拒绝

## 修复方案

### ✅ /api/prompt (修复后)
```javascript
fetch(promptUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(requestBody)
})
```

### 修复原则
1. **最小化请求头**：只保留必要的 `Content-Type`
2. **移除CORS设置**：使用浏览器默认行为
3. **简化配置**：参考成功的 `/api/upload/image` 请求

## 修复的文件

### 1. client/src/services/comfyui.js
**修复位置**：`submitWorkflow()` 函数

**修改前**：
```javascript
const response = await fetch(promptUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Accept': '*/*',
    'comfy-user': config.CLIENT_ID,
    'User-Agent': 'Mozilla/5.0...'
  },
  body: JSON.stringify(requestBody),
  mode: 'cors',
  credentials: 'omit'
})
```

**修改后**：
```javascript
const response = await fetch(promptUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(requestBody)
})
```

### 2. client/deploy/imagic_production/proxy-server.js
**修复位置**：`/api/prompt` 路由处理

**修改前**：
```javascript
const response = await fetch(`${COMFYUI_BASE_URL}/api/prompt`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  body: JSON.stringify(req.body),
  timeout: 30000,
  agent: false
});
```

**修改后**：
```javascript
const response = await fetch(`${COMFYUI_BASE_URL}/api/prompt`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(req.body),
  timeout: 30000
});
```

## 验证方法

### 1. 使用测试页面
打开 `test-prompt-request.html` 进行验证：
- 测试简化后的 `/api/prompt` 请求
- 对比不同请求头组合的效果
- 查看详细的请求/响应日志

### 2. 浏览器开发者工具
1. 打开Network面板
2. 发起生图请求
3. 查看 `/api/prompt` 请求的详细信息：
   - 请求头是否简化
   - 响应状态是否为200
   - 是否返回了 `prompt_id`

### 3. 控制台日志
查看控制台输出：
```
🔄 第二步：提交工作流到ComfyUI
📡 API地址: https://xxx.cnb.run/api/prompt
✅ 工作流提交成功，任务ID: xxx
```

## 技术原理

### CORS预检请求
当请求包含自定义请求头时，浏览器会发送OPTIONS预检请求：
- `Accept: */*` 可能触发预检
- `comfy-user` 自定义头肯定触发预检
- `User-Agent` 复杂值可能触发预检

### 简化策略
- 只使用标准的 `Content-Type: application/json`
- 避免自定义请求头
- 使用浏览器默认的CORS行为

## 预期效果

修复后的 `/api/prompt` 请求应该：
1. **成功发送**：不再因CORS问题失败
2. **返回prompt_id**：正常接收ComfyUI的响应
3. **触发工作流**：ComfyUI开始处理图像生成任务
4. **WebSocket通知**：能够接收到任务进度和完成通知

## 后续监控

### 成功指标
- `/api/prompt` 请求返回200状态码
- 响应包含有效的 `prompt_id`
- WebSocket能接收到任务进度消息
- 最终能获取到生成的图片

### 失败排查
如果仍然失败，检查：
1. 服务器是否支持 `/api/prompt` 端点
2. 请求体格式是否正确
3. 服务器日志中的错误信息
4. 网络连接是否稳定

## 总结

通过参考成功的 `/api/upload/image` 请求配置，我们简化了 `/api/prompt` 的请求设置，移除了可能导致CORS问题的复杂配置。这种"向成功案例学习"的方法确保了请求配置的一致性和兼容性。

修复的核心思想是：**保持简单，只使用必要的配置**。
