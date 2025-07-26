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
- `scripts/port-config-manager.js` - 端口配置管理器

## 🚀 使用方法

### 1. 检查端口配置
```bash
# 检查端口配置一致性
node scripts/port-config-manager.js check

# 自动修复端口配置问题
node scripts/port-config-manager.js fix

# 查看端口使用情况
node scripts/port-config-manager.js availability
```

### 2. 端口状态管理
```bash
# 检查端口状态
node scripts/port-manager.js status

# 验证并处理端口冲突
node scripts/port-manager.js validate

# 启动单个服务
node scripts/port-manager.js start server
node scripts/port-manager.js start client
node scripts/port-manager.js start admin
```

### 3. 配置保护机制
```bash
# 检查端口配置完整性和硬编码问题
node scripts/protect-port-config.js check

# 同步所有配置文件
node scripts/sync-port-config.js sync

# 安装Git钩子保护
node scripts/install-git-hooks.js install
```

## 🔧 配置文件详解

### port-config.json
```json
{
  "services": {
    "client": {
      "port": 3001,
      "name": "客户端前端",
      "description": "用户前端界面"
    },
    "admin": {
      "port": 3003,
      "name": "后台管理系统",
      "description": "管理员界面"
    },
    "server": {
      "port": 3007,
      "name": "后端API服务",
      "description": "服务器API"
    }
  }
}
```

## 🛡️ 端口保护机制

### 1. 配置一致性检查
- 检查所有配置文件中的端口设置
- 发现不一致时自动报告
- 提供自动修复建议

### 2. 硬编码检测
- 扫描代码中的硬编码端口
- 标记需要修改的文件
- 提供替换建议

### 3. Git钩子保护
- 提交前自动检查端口配置
- 防止错误的端口配置被提交
- 确保团队协作的一致性

## 🚨 常见问题解决

### 端口被占用
```bash
# Windows
netstat -ano | findstr :3001
taskkill /PID <进程ID> /F

# Linux/Mac
lsof -i :3001
kill -9 <进程ID>
```

### 配置不一致
```bash
# 自动修复配置
node scripts/port-config-manager.js fix

# 手动同步配置
node scripts/sync-port-config.js sync
```

### 服务启动失败
1. 检查端口是否被占用
2. 验证配置文件完整性
3. 查看服务日志
4. 使用端口管理工具诊断

## 📊 端口使用监控

### 健康检查
```bash
# 检查所有服务状态
curl http://localhost:3007/health  # 后端API
curl http://localhost:3001         # 客户端
curl http://localhost:3003         # 后台管理
```

### 服务状态
- **运行中**: 服务正常响应
- **停止**: 端口未被监听
- **错误**: 服务响应异常
- **冲突**: 端口被其他进程占用

## 🔄 维护指南

### 定期检查
- 每周运行配置一致性检查
- 监控端口使用情况
- 更新文档和配置

### 版本升级
- 备份当前配置
- 测试新版本兼容性
- 逐步迁移服务

### 团队协作
- 统一使用端口管理工具
- 遵循端口配置规范
- 及时同步配置变更

## 📝 最佳实践

1. **始终使用配置文件**: 避免硬编码端口号
2. **定期检查一致性**: 使用自动化工具验证
3. **保护配置文件**: 使用Git钩子防止错误提交
4. **文档同步更新**: 配置变更时及时更新文档
5. **团队沟通**: 端口变更前通知团队成员

---

**注意**: 端口配置是项目稳定运行的基础，请严格按照本指南操作。
