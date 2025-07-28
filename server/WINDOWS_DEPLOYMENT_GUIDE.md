# AIMagic 后端服务 Windows Server 部署指南

## 🎯 部署概述

**目标环境**: 腾讯云 Windows Server  
**服务器IP**: 114.132.50.71  
**部署端口**: 3007  
**数据库**: MySQL 8.0 (aimagic@114.132.50.71:3306)

## 🚀 快速部署流程

### 步骤1: 准备本地文件
```powershell
# 在本地PowerShell中执行
cd your-project\server
mkdir ..\aimagic-windows-deploy

# 复制文件
Copy-Item -Recurse src ..\aimagic-windows-deploy\
Copy-Item production-package.json ..\aimagic-windows-deploy\package.json
Copy-Item .env.production ..\aimagic-windows-deploy\
Copy-Item ecosystem.config.js ..\aimagic-windows-deploy\
Copy-Item deploy.bat ..\aimagic-windows-deploy\
```

### 步骤2: 连接腾讯云服务器
#### 方式A: 腾讯云控制台 (推荐)
1. 访问: https://console.cloud.tencent.com/
2. 云服务器 → 实例 → 找到 114.132.50.71
3. 点击"登录" → "VNC登录"

#### 方式B: Windows远程桌面
```
按 Win+R → 输入 mstsc
计算机: 114.132.50.71
用户名: Administrator
密码: [您的服务器密码]
```

### 步骤3: FTP上传文件
**目标路径**: `C:\inetpub\wwwroot\aimagic\server\`

使用FileZilla或其他FTP客户端上传准备好的文件。

### 步骤4: 服务器端部署
```cmd
# 在服务器上打开命令提示符
cd C:\inetpub\wwwroot\aimagic\server

# 执行部署脚本
deploy.bat
```

## 🔧 Windows环境特殊配置

### Node.js安装
```powershell
# 下载并安装Node.js
# 访问: https://nodejs.org/
# 选择LTS版本下载Windows安装包

# 验证安装
node --version
npm --version
```

### PM2 Windows配置
```cmd
# 安装PM2和Windows支持
npm install -g pm2
npm install -g pm2-windows-startup

# 配置Windows服务
pm2-startup install
```

### Windows防火墙配置
```cmd
# 添加防火墙规则
netsh advfirewall firewall add rule name="AIMagic Server Port 3007" dir=in action=allow protocol=TCP localport=3007

# 验证规则
netsh advfirewall firewall show rule name="AIMagic Server Port 3007"
```

## 📊 服务管理

### PM2命令
```cmd
# 查看服务状态
pm2 status

# 查看日志
pm2 logs aimagic-server

# 重启服务
pm2 restart aimagic-server

# 停止服务
pm2 stop aimagic-server
```

### Windows服务管理
```cmd
# 查看Windows服务
sc query "PM2 aimagic-server"

# 启动/停止服务
sc start "PM2 aimagic-server"
sc stop "PM2 aimagic-server"

# 打开服务管理器
services.msc
```

## 🔍 验证部署

### API测试
```powershell
# 使用PowerShell测试
Invoke-RestMethod -Uri http://localhost:3007/api/health
Invoke-RestMethod -Uri http://114.132.50.71:3007/api/health
```

### 浏览器测试
直接访问:
- http://114.132.50.71:3007/api/health
- http://114.132.50.71:3007/api/config

## 🛠️ 故障排除

### 常见问题

#### 1. 端口被占用
```cmd
# 查看端口占用
netstat -ano | findstr :3007

# 结束进程
taskkill /PID [进程ID] /F
```

#### 2. 服务无法启动
```cmd
# 检查日志
pm2 logs aimagic-server

# 重新安装PM2服务
pm2-startup uninstall
pm2-startup install
```

#### 3. 数据库连接失败
- 检查MySQL服务状态
- 验证防火墙设置
- 确认.env.production配置

#### 4. 权限问题
```cmd
# 以管理员身份运行命令提示符
# 检查文件权限
icacls C:\inetpub\wwwroot\aimagic\server
```

## 📋 部署检查清单

- [ ] Node.js >= 16.0.0 已安装
- [ ] PM2 和 pm2-windows-startup 已安装
- [ ] MySQL服务运行正常
- [ ] Windows防火墙已配置
- [ ] 文件已上传到正确路径
- [ ] deploy.bat 执行成功
- [ ] PM2服务状态正常
- [ ] API接口响应正常
- [ ] 开机自启已配置

## 🔗 相关链接

- [Node.js Windows下载](https://nodejs.org/)
- [PM2 Windows文档](https://pm2.keymetrics.io/docs/usage/startup/)
- [腾讯云控制台](https://console.cloud.tencent.com/)

---

**部署完成标志**: 
- PM2显示服务状态为 `online`
- http://114.132.50.71:3007/api/health 返回正常响应
- Windows服务管理器中可以看到PM2服务
