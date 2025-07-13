# 端口管理文档

## 📋 文档列表

- [端口管理指南](../../PORT_MANAGER_GUIDE.md) - 端口管理工具使用指南
- [端口保护指南](../../PORT_PROTECTION_GUIDE.md) - 端口配置保护机制

## 🔧 端口配置

### 默认端口分配
- **客户端前端**: 3001
- **后台管理系统**: 3003  
- **后端API服务**: 3007

### 配置文件
- `port-config.json` - 统一端口配置文件

## 🚀 快速启动

### 推荐方式：使用端口管理工具
```bash
# Windows
start-managed.bat

# Linux/Mac
./start-managed.sh

# 或直接使用 Node.js
node start-managed.js
```

### 端口管理命令
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

## 🛡️ 配置保护

### 保护机制
```bash
# 检查端口配置完整性
node scripts/protect-port-config.js check

# 同步所有配置文件
node scripts/sync-port-config.js sync

# 安装Git钩子保护
node scripts/install-git-hooks.js install
```

## ⚡ 优势特性

- ✅ 自动检测端口冲突并处理
- ✅ 强制使用指定端口
- ✅ 统一启动管理，避免配置混乱
- ✅ 自动终止冲突进程
- ✅ 详细的启动日志和错误处理
