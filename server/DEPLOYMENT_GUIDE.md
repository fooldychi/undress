# AIMagic 服务器部署指南

## 📋 部署流程概览

### 第一步：本地验证和打包
```cmd
# 在本地 server 目录运行
.\simple-verify.bat    # 验证文件完整性
.\simple-package.bat   # 创建生产环境包
```

### 第二步：上传到服务器
将生成的 `aimagic-server-production` 目录上传到服务器

### 第三步：服务器部署
```cmd
# 在服务器上运行
deploy-simple.bat
```

## 🔧 脚本说明

### 本地脚本

#### `simple-verify.bat`
- 验证所有必需文件是否存在
- 检查源代码目录结构
- 确保配置文件完整

#### `simple-package.bat`
- 创建完整的生产环境包
- 自动生成必需的脚本文件
- 复制所有源代码和配置

### 服务器脚本

#### `deploy-simple.bat`
- 检查 Node.js 和 PM2 环境
- 安装生产依赖
- 启动服务并配置自启动
- 配置防火墙规则
- 运行健康检查

## 📁 生产包结构

```
aimagic-server-production/
├── src/                          # 源代码
│   ├── app.js                   # 主应用文件
│   ├── config/                  # 配置文件
│   ├── controllers/             # 控制器
│   ├── middleware/              # 中间件
│   ├── models/                  # 数据模型
│   ├── routes/                  # 路由
│   ├── services/                # 服务层
│   ├── utils/                   # 工具类
│   └── scripts/                 # 脚本文件
│       ├── health-check.js      # 健康检查
│       └── init-deployment-config.js # 初始化配置
├── logs/                        # 日志目录
├── uploads/                     # 上传文件目录
├── package.json                 # 依赖配置
├── .env.production             # 生产环境配置
├── ecosystem.config.js         # PM2 配置
├── deploy-simple.bat           # 部署脚本
└── DEPLOYMENT_README.md        # 部署说明
```

## ⚠️ 部署前检查清单

### 服务器环境要求
- [ ] Windows Server 2016+ 或 Windows 10+
- [ ] Node.js 16.0.0 或更高版本
- [ ] MySQL 5.7+ 或 8.0+
- [ ] 端口 3007 可用

### 必需文件检查
- [ ] `src/app.js` - 主应用文件
- [ ] `package.json` - 依赖配置
- [ ] `.env.production` - 生产环境配置
- [ ] `ecosystem.config.js` - PM2 配置

### 数据库配置
- [ ] MySQL 数据库已创建
- [ ] 数据库用户权限正确
- [ ] `.env.production` 中数据库配置正确

## 🚀 部署后验证

### 检查服务状态
```cmd
pm2 status
pm2 logs aimagic-server
```

### 访问服务
- 主服务：http://114.132.50.71:3007
- 健康检查：http://114.132.50.71:3007/api/health

### 常用管理命令
```cmd
pm2 status          # 查看服务状态
pm2 logs            # 查看日志
pm2 restart all     # 重启服务
pm2 stop all        # 停止服务
pm2 monit           # 监控面板
```

## 🔧 故障排除

### 常见问题

#### 1. Node.js 版本过低
```cmd
# 下载并安装最新版本
https://nodejs.org/
```

#### 2. PM2 安装失败
```cmd
# 手动安装
npm install -g pm2
```

#### 3. 端口被占用
```cmd
# 检查端口占用
netstat -ano | findstr :3007
# 结束占用进程
taskkill /PID <进程ID> /F
```

#### 4. 数据库连接失败
- 检查 `.env.production` 中的数据库配置
- 确认数据库服务正在运行
- 验证用户名和密码

#### 5. 防火墙问题
```cmd
# 手动添加防火墙规则
netsh advfirewall firewall add rule name="AIMagic Server Port 3007" dir=in action=allow protocol=TCP localport=3007
```

## 📝 更新部署

### 更新代码
1. 在本地更新代码
2. 重新运行 `simple-package.bat`
3. 上传新的生产包
4. 在服务器运行 `deploy-simple.bat`

### 仅重启服务
```cmd
pm2 restart aimagic-server
```

## 🔒 安全建议

1. **定期更新依赖**
   ```cmd
   npm audit
   npm update
   ```

2. **监控日志**
   ```cmd
   pm2 logs --lines 100
   ```

3. **备份数据库**
   - 定期备份 MySQL 数据库
   - 备份上传的文件

4. **防火墙配置**
   - 只开放必要端口
   - 定期检查防火墙规则

## 📞 技术支持

如遇到部署问题，请提供以下信息：
- 错误信息截图
- `pm2 logs` 输出
- 服务器环境信息
- 部署步骤详情
