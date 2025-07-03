# 代理服务器配置同步修复

## 问题描述

之前存在一个严重的bug：当用户在前端配置页面更新ComfyUI服务器URL时，代理服务器中的URL没有同步更新，导致代理仍然访问旧的服务器地址，造成401 Unauthorized错误。

## 修复内容

### 1. 代理服务器改进 (proxy-server.js)

- **动态配置支持**: 将硬编码的`COMFYUI_BASE_URL`改为动态配置`currentConfig`
- **配置API端点**: 新增`GET /api/config`和`POST /api/config`端点
- **动态代理中间件**: 使用函数式代理中间件，实时读取当前配置
- **更新默认URL**: 将默认URL更新为`https://hwf0p724ub-8188.cnb.run`

### 2. 前端服务改进 (src/services/comfyui.js)

- **代理配置更新函数**: 新增`updateProxyServerConfig()`函数
- **异步配置保存**: 修改`updateComfyUIConfig()`为异步函数
- **配置同步机制**: 保存前端配置时自动更新代理服务器配置
- **错误处理**: 提供详细的错误信息和用户提示

### 3. 配置界面改进 (src/components/ConfigModal.vue)

- **异步保存**: 修改保存函数为异步处理
- **用户反馈**: 显示代理服务器更新状态
- **错误提示**: 当代理服务器更新失败时提供明确提示
- **更新默认值**: 所有默认配置使用新的服务器地址

### 4. 配置文件更新

- 更新所有配置文件中的默认URL
- 统一使用`https://hwf0p724ub-8188.cnb.run`
- 确保代理服务器端口为3008

## 使用方法

### 1. 启动代理服务器
```bash
node proxy-server.js
```

### 2. 前端配置更新
1. 打开前端应用的配置页面
2. 修改ComfyUI服务器地址
3. 点击保存 - 系统会自动同步更新代理服务器配置

### 3. 验证配置
```bash
# 测试代理服务器配置功能
node test-proxy-config.js

# 检查代理服务器健康状态
curl http://localhost:3008/health

# 查看当前配置
curl http://localhost:3008/api/config
```

## API端点

### GET /api/config
获取代理服务器当前配置
```json
{
  "COMFYUI_BASE_URL": "https://hwf0p724ub-8188.cnb.run",
  "CLIENT_ID": "abc1373d4ad648a3a81d0587fbe5534b"
}
```

### POST /api/config
更新代理服务器配置
```json
{
  "COMFYUI_SERVER_URL": "https://new-server.com",
  "CLIENT_ID": "new_client_id"
}
```

## 错误处理

- 如果代理服务器未运行，前端会显示警告但不阻止配置保存
- 配置更新失败时会提供详细的错误信息
- 用户可以选择重启代理服务器或检查网络连接

## 测试

运行测试脚本验证功能：
```bash
node test-proxy-config.js
```

测试内容包括：
1. 代理服务器健康检查
2. 获取当前配置
3. 更新配置
4. 验证配置是否生效

## 注意事项

1. 确保代理服务器在端口3008上运行
2. 前端配置更新时需要代理服务器在线
3. 如果代理服务器重启，配置会恢复到默认值
4. 建议在生产环境中使用环境变量管理配置
