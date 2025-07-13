# AIMagic 端口管理工具使用指南

## 🎯 概述

AIMagic 端口管理工具是一个统一的端口管理解决方案，确保项目中的所有服务使用正确的端口，自动处理端口冲突，防止因端口混乱导致的问题。

## 📋 端口配置

### 统一端口分配
- **客户端前端**: 3001
- **后台管理系统**: 3003  
- **后端API服务**: 3007

### 配置文件
- `port-config.json` - 统一端口配置文件
- `scripts/port-manager.js` - 端口管理核心工具
- `scripts/start-with-port-management.js` - 启动管理器

## 🚀 使用方法

### 1. 快速启动 (推荐)

#### Windows:
```batch
start-managed.bat
```

#### Linux/Mac:
```bash
./start-managed.sh
```

#### 或直接使用 Node.js:
```bash
node start-managed.js
```

### 2. 启动所有服务
```bash
# 启动所有服务 (后端 → 客户端 → 后台管理)
node scripts/start-with-port-management.js all
```

### 3. 启动单个服务
```bash
# 启动后端服务
node scripts/start-with-port-management.js single server

# 启动客户端
node scripts/start-with-port-management.js single client

# 启动后台管理
node scripts/start-with-port-management.js single admin
```

## 🔧 端口管理命令

### 检查端口状态
```bash
node scripts/port-manager.js status
```

### 验证端口配置
```bash
node scripts/port-manager.js validate
```

### 处理端口冲突
```bash
node scripts/port-manager.js resolve
```

### 启动特定服务
```bash
node scripts/port-manager.js start server
node scripts/port-manager.js start client
node scripts/port-manager.js start admin
```

## ⚡ 工具优势

### 自动化管理
- ✅ 自动检测端口冲突
- ✅ 自动终止冲突进程
- ✅ 强制使用指定端口
- ✅ 统一启动管理

### 错误处理
- ✅ 详细的错误日志
- ✅ 智能重试机制
- ✅ 友好的错误提示
- ✅ 自动恢复功能

### 配置保护
- ✅ 防止端口配置被意外修改
- ✅ 自动同步配置文件
- ✅ Git钩子保护
- ✅ 配置完整性检查

## 🛠️ 高级功能

### 端口冲突解决
当检测到端口冲突时，工具会：
1. 识别占用端口的进程
2. 尝试优雅关闭进程
3. 如果失败，强制终止进程
4. 启动目标服务

### 服务依赖管理
启动顺序：
1. 后端服务 (3007) - 优先启动
2. 客户端 (3001) - 依赖后端
3. 后台管理 (3003) - 最后启动

### 健康检查
- 定期检查服务状态
- 自动重启失败的服务
- 监控端口占用情况
- 生成状态报告

## 📊 配置文件说明

### port-config.json
```json
{
  "server": {
    "port": 3007,
    "name": "后端API服务",
    "path": "./server",
    "command": "npm start"
  },
  "client": {
    "port": 3001,
    "name": "客户端前端",
    "path": "./client",
    "command": "npm run dev"
  },
  "admin": {
    "port": 3003,
    "name": "后台管理系统",
    "path": "./admin",
    "command": "npm run dev"
  }
}
```

## 🔍 故障排查

### 常见问题

#### 1. 端口被占用
```bash
# 检查端口占用
node scripts/port-manager.js status

# 解决冲突
node scripts/port-manager.js resolve
```

#### 2. 服务启动失败
```bash
# 检查配置
node scripts/protect-port-config.js check

# 重新启动
node start-managed.js
```

#### 3. 配置文件损坏
```bash
# 同步配置
node scripts/sync-port-config.js sync

# 验证配置
node scripts/port-manager.js validate
```

## 📝 最佳实践

### 开发环境
1. 始终使用端口管理工具启动服务
2. 定期检查端口配置完整性
3. 避免手动修改端口配置
4. 使用统一的启动脚本

### 生产环境
1. 确保端口配置与生产环境匹配
2. 设置适当的防火墙规则
3. 监控服务状态和端口占用
4. 建立自动重启机制

## 🔗 相关文档

- [端口保护指南](./PORT_PROTECTION_GUIDE.md)
- [项目启动指南](../../STARTUP_GUIDE.md)
- [部署指南](../../client/docs/DEPLOYMENT_GUIDE.md)

---

**维护者**: AIMagic 开发团队  
**最后更新**: 2024年
