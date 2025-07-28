# AIMagic 后端服务部署检查清单 (Windows Server)

## 📋 部署前检查

### 🔧 腾讯云Windows服务器环境
- [ ] Node.js >= 16.0.0 已安装 (从 https://nodejs.org/ 下载)
- [ ] PM2 已安装 (`npm install -g pm2`)
- [ ] PM2 Windows服务支持 (`npm install -g pm2-windows-startup`)
- [ ] MySQL 8.0+ 运行正常
- [ ] Windows防火墙已开放端口 3007
- [ ] 服务器磁盘空间充足 (>2GB)
- [ ] 远程桌面连接正常

### 🗄️ 数据库准备
- [ ] 数据库 `aimagic` 已创建
- [ ] 数据库用户 `aimagic` 已创建并授权
- [ ] 数据库连接测试通过
- [ ] 必要的表结构已创建

### 📁 文件准备
- [ ] 所有必需文件已准备完毕
- [ ] `.env.production` 配置正确
- [ ] `deploy.bat` Windows批处理脚本准备就绪
- [ ] 排除了开发文件 (node_modules, .git等)

## 🚀 部署步骤

### 1. 文件上传
- [ ] 通过FTP上传所有必需文件到 `C:\inetpub\wwwroot\aimagic\server\`
- [ ] 验证文件完整性
- [ ] 确认Windows路径格式正确

### 2. 环境配置
- [ ] 复制 `.env.production` 为生产环境配置
- [ ] 创建必要目录 (`logs\`, `uploads\`)
- [ ] 配置Windows防火墙规则

### 3. 依赖安装
- [ ] 运行 `npm install --production`
- [ ] 验证依赖安装成功

### 4. 数据库初始化
- [ ] 运行 `node src\scripts\init-deployment-config.js`
- [ ] 验证系统配置表创建成功

### 5. 服务启动
- [ ] 运行 `pm2 start ecosystem.config.js --env production`
- [ ] 验证服务启动成功
- [ ] 设置Windows开机自启 `pm2-startup install && pm2 save`

## ✅ 部署后验证

### 🌐 服务状态检查
- [ ] `pm2 status` 显示服务运行正常
- [ ] `curl http://localhost:3007/api/health` 返回正常
- [ ] 服务日志无错误 `pm2 logs aimagic-server`

### 🔗 API接口测试
- [ ] 健康检查接口: `GET /api/health`
- [ ] 配置接口: `GET /api/config`
- [ ] 用户注册接口: `POST /api/auth/register`
- [ ] 用户登录接口: `POST /api/auth/login`

### 🗄️ 数据库连接测试
- [ ] 运行 `node src/scripts/health-check.js`
- [ ] 数据库连接正常
- [ ] 系统配置读取正常

### 🔒 安全检查
- [ ] `.env.production` 文件权限为 600
- [ ] JWT密钥已修改为生产环境密钥
- [ ] 数据库密码安全
- [ ] CORS配置正确

## 🛠️ 常用管理命令

### PM2 进程管理
```bash
# 查看服务状态
pm2 status

# 查看实时日志
pm2 logs aimagic-server

# 重启服务
pm2 restart aimagic-server

# 停止服务
pm2 stop aimagic-server

# 删除服务
pm2 delete aimagic-server

# 监控面板
pm2 monit
```

### 健康检查
```bash
# 运行健康检查脚本
node src/scripts/health-check.js

# 检查服务响应
curl http://114.132.50.71:3007/api/health

# 检查数据库连接
mysql -h 114.132.50.71 -u aimagic -p aimagic
```

### 日志查看
```bash
# PM2 日志
pm2 logs aimagic-server --lines 50

# 系统日志
tail -f /var/log/syslog

# 应用日志
tail -f logs/combined.log
```

## 🚨 故障排除

### 常见问题及解决方案

#### 1. 端口被占用
```bash
# 查看端口占用
lsof -i :3007
netstat -tulpn | grep 3007

# 杀死占用进程
kill -9 [PID]
```

#### 2. 数据库连接失败
- 检查数据库服务状态: `systemctl status mysql`
- 验证连接信息: `.env.production` 配置
- 测试连接: `mysql -h 114.132.50.71 -u aimagic -p`

#### 3. 权限问题
```bash
# 设置正确的文件权限
chown -R www-data:www-data /var/www/aimagic/server
chmod 755 /var/www/aimagic/server
chmod 600 /var/www/aimagic/server/.env.production
```

#### 4. 内存不足
```bash
# 检查内存使用
free -h
top

# 重启服务释放内存
pm2 restart aimagic-server
```

#### 5. 磁盘空间不足
```bash
# 检查磁盘使用
df -h

# 清理日志文件
pm2 flush
find logs/ -name "*.log" -mtime +7 -delete
```

## 📞 技术支持

### 联系方式
- 技术支持: [技术支持邮箱]
- 文档地址: [文档链接]
- 问题反馈: [问题反馈地址]

### 监控和报警
- 服务监控: PM2 Monit
- 日志监控: 应用日志 + 系统日志
- 性能监控: 健康检查脚本

---

**部署完成标志**: 所有检查项都已完成 ✅
