# AIMagic 后端服务 FTP 上传部署指南

## 📋 概述

本指南详细说明如何通过FTP将AIMagic后端服务部署到腾讯云Windows Server生产服务器 `114.132.50.71`。

## 🎯 部署目标

- **云服务商**: 腾讯云
- **操作系统**: Windows Server
- **服务器**: 114.132.50.71
- **端口**: 3007
- **数据库**: 已配置 (aimagic@114.132.50.71:3306)
- **运行环境**: Node.js + PM2 (Windows版本)

## 📁 文件上传清单

### 🔴 必需文件 (REQUIRED)

#### 核心应用文件
```
server\
├── src\                          # 源代码目录 [必需]
│   ├── app.js                   # 应用入口 [必需]
│   ├── config\                  # 配置文件 [必需]
│   │   └── database.js          # 数据库配置 [必需]
│   ├── middleware\              # 中间件 [必需]
│   │   ├── auth.js             # 认证中间件 [必需]
│   │   ├── adminAuth.js        # 管理员认证 [必需]
│   │   ├── errorHandler.js     # 错误处理 [必需]
│   │   └── rateLimiter.js      # 限流中间件 [必需]
│   ├── routes\                  # 路由文件 [必需]
│   │   ├── auth.js             # 认证路由 [必需]
│   │   ├── users.js            # 用户路由 [必需]
│   │   ├── images.js           # 图像处理路由 [必需]
│   │   ├── admin.js            # 管理路由 [必需]
│   │   ├── adminAuth.js        # 管理员认证路由 [必需]
│   │   ├── points.js           # 积分路由 [必需]
│   │   ├── levelCards.js       # 等级卡路由 [必需]
│   │   ├── config.js           # 配置路由 [必需]
│   │   ├── public-config.js    # 公共配置路由 [必需]
│   │   └── workflow-config.js  # 工作流配置路由 [必需]
│   ├── scripts\                 # 脚本文件 [必需]
│   │   ├── init-deployment-config.js  # 部署初始化 [必需]
│   │   └── health-check.js     # 健康检查 [必需]
│   └── utils\                   # 工具函数 [可选]
│       ├── memoryManager.js    # 内存管理 [可选]
│       ├── performanceMonitor.js # 性能监控 [可选]
│       └── pointsCalculator.js # 积分计算 [可选]
```

#### 配置文件
```
server\
├── package.json                 # 依赖配置 [必需]
├── production-package.json      # 生产环境依赖 [必需]
├── .env.production             # 生产环境变量 [必需]
├── ecosystem.config.js         # PM2配置 [必需]
└── deploy.bat                  # Windows部署脚本 [必需]
```

#### SQL脚本
```
server\
└── sql\                        # SQL脚本 [可选]
    ├── create_config_table.sql # 配置表创建 [可选]
    └── performance_optimization.sql # 性能优化 [可选]
```

### 🟡 可选文件 (OPTIONAL)

```
server\
├── scripts\                    # 额外脚本 [可选]
│   ├── optimize-database.js   # 数据库优化 [可选]
│   └── process-manager.js     # 进程管理 [可选]
└── docs\                      # 文档 [可选]
    └── README.md              # 项目文档 [可选]
```

### 🔴 排除文件 (EXCLUDE)

**绝对不要上传的文件:**
```
❌ node_modules\              # 依赖包目录
❌ .git\                     # Git版本控制
❌ .env                      # 开发环境变量
❌ .env.local               # 本地环境变量
❌ .env.development         # 开发环境变量
❌ logs\*.log               # 日志文件
❌ uploads\images\*         # 上传的图片
❌ test\                    # 测试文件
❌ coverage\                # 测试覆盖率
❌ .vscode\                 # IDE配置
❌ .idea\                   # IDE配置
❌ *.test.js               # 测试文件
❌ *.spec.js               # 测试文件
```

## 🚀 FTP上传步骤

### 1. 准备上传文件

在本地创建上传目录结构：
```powershell
# 在PowerShell中创建临时上传目录
mkdir aimagic-server-upload
cd aimagic-server-upload

# 复制必需文件
Copy-Item -Recurse ..\src .\
Copy-Item ..\package.json .\
Copy-Item ..\production-package.json .\package.json  # 覆盖为生产版本
Copy-Item ..\.env.production .\
Copy-Item ..\ecosystem.config.js .\
Copy-Item ..\deploy.bat .\
Copy-Item -Recurse ..\sql .\  # 可选
```

### 2. FTP连接信息

```
服务器地址: 114.132.50.71
FTP端口: 21 (默认)
用户名: [您的FTP用户名]
密码: [您的FTP密码]
上传目录: C:\inetpub\wwwroot\aimagic\server\
```

### 3. 使用FTP客户端上传

#### 方式一: FileZilla (推荐)
1. 打开FileZilla
2. 连接到服务器
3. 导航到 `C:\inetpub\wwwroot\aimagic\server\`
4. 上传准备好的文件

#### 方式二: Windows命令行FTP
```cmd
ftp 114.132.50.71
# 输入用户名和密码
cd C:\inetpub\wwwroot\aimagic\server
mput aimagic-server-upload\*
quit
```

#### 方式三: PowerShell SFTP (需要安装Posh-SSH模块)
```powershell
# 安装Posh-SSH模块
Install-Module -Name Posh-SSH -Force

# 使用SFTP上传
$session = New-SFTPSession -ComputerName 114.132.50.71 -Credential (Get-Credential)
Set-SFTPLocation -SessionId $session.SessionId -Path "C:\inetpub\wwwroot\aimagic\server"
Set-SFTPFile -SessionId $session.SessionId -LocalFile ".\aimagic-server-upload\*" -RemotePath "."
Remove-SFTPSession -SessionId $session.SessionId
```

## 🔧 服务器端配置

### 1. 连接到腾讯云Windows服务器

#### 方式一: 腾讯云控制台远程桌面 (推荐)
1. 登录腾讯云控制台: https://console.cloud.tencent.com/
2. 进入 "云服务器" → "实例"
3. 找到服务器 114.132.50.71
4. 点击 "登录" → "VNC登录" 或 "远程桌面登录"
5. 输入Administrator密码

#### 方式二: Windows远程桌面连接
```cmd
# 在本地Windows电脑上按 Win+R，输入：
mstsc

# 在远程桌面连接中输入：
# 计算机: 114.132.50.71
# 用户名: Administrator
# 密码: [您的服务器密码]
```

#### 方式三: PowerShell远程连接
```powershell
# 在本地PowerShell中运行：
Enter-PSSession -ComputerName 114.132.50.71 -Credential (Get-Credential)
```

### 2. 导航到项目目录
```cmd
# 在服务器上打开命令提示符或PowerShell
cd C:\inetpub\wwwroot\aimagic\server
```

### 3. 创建必要目录
```cmd
# 创建必要目录
if not exist "logs" mkdir logs
if not exist "uploads" mkdir uploads
if not exist "uploads\images" mkdir uploads\images
if not exist "uploads\temp" mkdir uploads\temp
```

### 4. 安装Node.js和PM2 (如未安装)
```powershell
# 下载并安装Node.js (如果未安装)
# 访问 https://nodejs.org/ 下载Windows版本
# 或使用Chocolatey包管理器：
choco install nodejs

# 安装PM2
npm install -g pm2
npm install -g pm2-windows-startup

# 配置PM2 Windows服务
pm2-startup install
```

## 🚀 部署执行

### 自动部署 (推荐)
```cmd
# 执行Windows部署脚本
deploy.bat
```

### 手动部署
```cmd
# 1. 安装依赖
npm install --production

# 2. 初始化数据库配置
node src\scripts\init-deployment-config.js

# 3. 启动服务
pm2 start ecosystem.config.js --env production

# 4. 保存PM2配置
pm2 save

# 5. 设置开机自启 (Windows)
pm2 startup
pm2 save
```

### Windows防火墙配置
```cmd
# 添加防火墙规则允许3007端口
netsh advfirewall firewall add rule name="AIMagic Server Port 3007" dir=in action=allow protocol=TCP localport=3007

# 查看防火墙规则
netsh advfirewall firewall show rule name="AIMagic Server Port 3007"
```

## 📊 服务管理命令

```cmd
# 查看服务状态
pm2 status

# 查看日志
pm2 logs aimagic-server

# 重启服务
pm2 restart aimagic-server

# 停止服务
pm2 stop aimagic-server

# 删除服务
pm2 delete aimagic-server

# 监控服务
pm2 monit

# 健康检查
node src\scripts\health-check.js

# Windows服务管理
sc query "PM2 aimagic-server"
sc start "PM2 aimagic-server"
sc stop "PM2 aimagic-server"
```
sc start "PM2 aimagic-server"
sc stop "PM2 aimagic-server"
```

## 🔍 验证部署

### 1. 检查服务状态
```cmd
pm2 status
# 使用PowerShell测试API
Invoke-RestMethod -Uri http://localhost:3007/api/health
```

### 2. 检查数据库连接
```cmd
node src\scripts\health-check.js
```

### 3. 测试API接口
```powershell
# 测试基本接口
Invoke-RestMethod -Uri http://114.132.50.71:3007/api/health

# 测试配置接口
Invoke-RestMethod -Uri http://114.132.50.71:3007/api/config
```

### 4. 浏览器测试
```
直接在浏览器中访问：
http://114.132.50.71:3007/api/health
http://114.132.50.71:3007/api/config
```

## 🛡️ 安全注意事项

1. **环境变量安全**: 确保 `.env.production` 文件访问权限受限
2. **数据库密码**: 生产环境密码已配置，请勿修改
3. **Windows防火墙**: 确保端口3007已开放
4. **Windows更新**: 保持系统更新
5. **SSL证书**: 建议配置HTTPS (可选)
6. **用户权限**: 建议使用非管理员账户运行服务

## 🔧 故障排除

### 常见问题

1. **端口被占用**
   ```cmd
   # 查看端口占用
   netstat -ano | findstr :3007
   # 结束占用进程
   taskkill /PID [PID] /F
   ```

2. **Windows服务权限问题**
   ```cmd
   # 以管理员身份运行命令提示符
   # 检查服务状态
   sc query "PM2 aimagic-server"
   # 重启服务
   sc stop "PM2 aimagic-server"
   sc start "PM2 aimagic-server"
   ```

3. **数据库连接失败**
   - 检查 `.env.production` 配置
   - 确认MySQL服务运行正常
   - 检查Windows防火墙设置

4. **PM2服务无法启动**
   ```cmd
   pm2 logs aimagic-server
   pm2 flush
   # 重新安装PM2 Windows服务
   pm2-startup uninstall
   pm2-startup install
   ```

5. **Node.js模块问题**
   ```cmd
   # 清除npm缓存
   npm cache clean --force
   # 删除node_modules重新安装
   rmdir /s node_modules
   npm install --production
   ```

## 📞 技术支持

如遇到部署问题，请检查：
1. 服务器日志: `pm2 logs aimagic-server`
2. Windows事件日志: 打开"事件查看器" → "Windows日志" → "应用程序"
3. 健康检查: `node src\scripts\health-check.js`
4. 腾讯云控制台监控数据

### Windows系统特有检查
```cmd
# 检查Windows服务
services.msc

# 检查系统资源
taskmgr

# 检查网络连接
netstat -an | findstr :3007

# 检查防火墙状态
netsh advfirewall show allprofiles
```

---

**部署完成后访问地址**: http://114.132.50.71:3007
