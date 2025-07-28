# AIMagic 后端服务生产环境文件总结 (Windows Server)

## 📁 已创建的生产环境配置文件 (腾讯云Windows Server)

### 🔧 核心配置文件

| 文件名 | 路径 | 重要性 | 描述 |
|--------|------|--------|------|
| `.env.production` | `server/.env.production` | **必需** | 生产环境变量配置 |
| `ecosystem.config.js` | `server/ecosystem.config.js` | **必需** | PM2进程管理配置 |
| `production-package.json` | `server/production-package.json` | **必需** | 生产环境依赖配置 |
| `deploy.bat` | `server/deploy.bat` | **必需** | Windows自动化部署脚本 |

### 📋 部署指南文件

| 文件名 | 路径 | 重要性 | 描述 |
|--------|------|--------|------|
| `FTP_UPLOAD_GUIDE.md` | `server/FTP_UPLOAD_GUIDE.md` | **必需** | 详细的FTP上传部署指南 |
| `DEPLOYMENT_CHECKLIST.md` | `server/DEPLOYMENT_CHECKLIST.md` | **推荐** | 部署检查清单 |
| `.ftpignore` | `server/.ftpignore` | **推荐** | FTP上传忽略文件列表 |

### 🛠️ 工具脚本

| 文件名 | 路径 | 重要性 | 描述 |
|--------|------|--------|------|
| `health-check.js` | `server/src/scripts/health-check.js` | **推荐** | 服务健康检查脚本 |
| `init-deployment-config.js` | `server/src/scripts/init-deployment-config.js` | **必需** | 部署配置初始化脚本 |

## 🚀 快速部署指令

### 1. 准备上传文件包
```powershell
# 在本地项目根目录执行 (PowerShell)
cd server
mkdir ..\aimagic-server-production

# 复制必需文件
Copy-Item -Recurse src ..\aimagic-server-production\
Copy-Item package.json ..\aimagic-server-production\
Copy-Item production-package.json ..\aimagic-server-production\package.json  # 覆盖为生产版本
Copy-Item .env.production ..\aimagic-server-production\
Copy-Item ecosystem.config.js ..\aimagic-server-production\
Copy-Item deploy.bat ..\aimagic-server-production\
Copy-Item -Recurse sql ..\aimagic-server-production\  # 可选

# 创建必要目录
mkdir ..\aimagic-server-production\logs
mkdir ..\aimagic-server-production\uploads\images
mkdir ..\aimagic-server-production\uploads\temp
```

### 2. FTP上传
```
# 使用FTP客户端上传 aimagic-server-production\ 目录内容到:
# 服务器: 114.132.50.71 (腾讯云Windows Server)
# 目标路径: C:\inetpub\wwwroot\aimagic\server\
```

### 3. 服务器端部署
```cmd
# 远程桌面连接到服务器
# 计算机: 114.132.50.71
# 用户名: Administrator

# 在服务器上打开命令提示符
cd C:\inetpub\wwwroot\aimagic\server

# 执行Windows部署脚本
deploy.bat
```

## 📊 文件重要性说明

### 🔴 必需文件 (CRITICAL)
这些文件是服务运行的基础，缺少任何一个都会导致部署失败：

- **src/** - 完整的源代码目录
- **package.json** - 依赖管理（使用production-package.json覆盖）
- **.env.production** - 生产环境配置
- **ecosystem.config.js** - PM2配置
- **deploy.sh** - 部署脚本

### 🟡 推荐文件 (RECOMMENDED)
这些文件提供额外的功能和便利性：

- **health-check.js** - 服务健康监控
- **sql/** - 数据库脚本（如需要）
- **DEPLOYMENT_CHECKLIST.md** - 部署检查清单

### 🟢 可选文件 (OPTIONAL)
这些文件提供文档和参考：

- **FTP_UPLOAD_GUIDE.md** - 详细部署指南
- **.ftpignore** - 上传忽略列表
- **docs/** - 项目文档

## 🔧 配置要点

### 数据库配置
```env
DB_HOST=114.132.50.71
DB_PORT=3306
DB_NAME=aimagic
DB_USER=aimagic
DB_PASSWORD=dFLJYsd82irJwHX5
```

### 服务配置
```env
NODE_ENV=production
PORT=3007
JWT_SECRET=aimagic.icomfy.co^~^
```

### CORS配置
```env
CORS_ORIGIN=https://your-frontend-domain.com,http://114.132.50.71:3001,http://114.132.50.71:3003
```

## 🛡️ 安全检查

### 文件权限
```bash
chmod 755 /var/www/aimagic/server
chmod 600 /var/www/aimagic/server/.env.production
chmod +x /var/www/aimagic/server/deploy.sh
chmod 755 /var/www/aimagic/server/logs
chmod 755 /var/www/aimagic/server/uploads
```

### 环境变量安全
- ✅ 生产环境JWT密钥已配置
- ✅ 数据库密码已配置
- ✅ CORS域名限制已设置

## 📈 部署后验证

### 服务状态检查
```bash
# 检查PM2状态
pm2 status

# 检查服务响应
curl http://114.132.50.71:3007/api/health

# 运行健康检查
node src/scripts/health-check.js
```

### API测试
```bash
# 基础健康检查
curl http://114.132.50.71:3007/api/health

# 配置接口测试
curl http://114.132.50.71:3007/api/config

# 公共配置测试
curl http://114.132.50.71:3007/api/public-config
```

## 🔄 更新部署

### 代码更新流程
1. 在本地修改代码
2. 重新打包上传文件
3. 通过FTP上传到服务器
4. 在服务器执行: `pm2 restart aimagic-server`

### 配置更新流程
1. 修改 `.env.production`
2. 上传到服务器
3. 执行: `pm2 restart aimagic-server`

---

**部署成功标志**:
- PM2显示服务状态为 `online`
- 健康检查脚本返回成功
- API接口响应正常
- 服务地址 http://114.132.50.71:3007 可访问
