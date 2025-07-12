# AIMagic 项目启动指南

## 🚀 快速启动

### 📋 启动前检查

1. **环境要求**:
   - Node.js >= 16.0.0
   - npm 或 yarn
   - MySQL 数据库

2. **端口检查**:
   - 确保端口 3001、3003、3007 未被占用
   - 如有冲突，请参考 `PORT_CONFIGURATION.md`

### 🔄 启动顺序

#### 1️⃣ 启动后端服务 (必须首先启动)

```bash
cd server
npm install  # 首次运行需要安装依赖
npm start
```

**或使用启动脚本**:
```bash
# Windows
cd server
start.bat

# Linux/Mac
cd server
./start.sh
```

**验证**: 访问 http://localhost:3007 应该看到API服务响应

#### 2️⃣ 启动客户端 (用户界面)

```bash
cd client
npm install  # 首次运行需要安装依赖
npm run dev
```

**验证**: 访问 http://localhost:3001 应该看到客户端界面

#### 3️⃣ 启动后台管理系统 (管理员界面)

```bash
cd admin
npm install  # 首次运行需要安装依赖
npm run dev
```

**或使用启动脚本**:
```bash
# Windows
cd admin
start.bat

# Linux/Mac
cd admin
./start.sh
```

**验证**: 访问 http://localhost:3003 应该看到管理后台界面

## 🎯 访问地址

| 服务 | 地址 | 用途 |
|------|------|------|
| **客户端** | http://localhost:3001 | 用户前端界面 |
| **后台管理** | http://localhost:3003 | 管理员界面 |
| **API服务** | http://localhost:3007 | 后端API |

## 🔐 默认登录信息

### 后台管理系统
- **地址**: http://localhost:3003
- **用户名**: `admin`
- **密码**: `admin123456`

## 🛠️ 常见问题解决

### 1. 端口被占用
**错误**: `Error: listen EADDRINUSE: address already in use :::3001`

**解决方案**:
```bash
# 查看端口占用
netstat -ano | findstr :3001  # Windows
lsof -i :3001                 # Linux/Mac

# 终止占用进程
taskkill /PID <进程ID> /F      # Windows
kill -9 <进程ID>               # Linux/Mac
```

### 2. 依赖安装失败
**错误**: `npm install` 失败

**解决方案**:
```bash
# 清除缓存
npm cache clean --force

# 删除 node_modules 重新安装
rm -rf node_modules package-lock.json  # Linux/Mac
rmdir /s node_modules & del package-lock.json  # Windows
npm install
```

### 3. API连接失败
**错误**: 前端无法连接后端API

**解决方案**:
1. 确认后端服务已启动 (http://localhost:3007)
2. 检查防火墙设置
3. 检查代理配置是否正确

### 4. 数据库连接失败
**错误**: 后端启动时数据库连接失败

**解决方案**:
1. 确认MySQL服务已启动
2. 检查数据库配置 (`server/src/config/database.js`)
3. 确认数据库用户权限

### 5. 页面白屏或加载失败
**错误**: 前端页面无法正常显示

**解决方案**:
1. 检查浏览器控制台错误信息
2. 清除浏览器缓存
3. 确认前端服务正常启动

## 🔧 开发模式启动

### 同时启动所有服务 (推荐)

创建一个批处理文件 `start-all.bat` (Windows):
```batch
@echo off
echo 启动 AIMagic 项目所有服务...

start "后端服务" cmd /k "cd server && npm start"
timeout /t 3
start "客户端" cmd /k "cd client && npm run dev"
timeout /t 3
start "后台管理" cmd /k "cd admin && npm run dev"

echo 所有服务启动完成！
echo 客户端: http://localhost:3001
echo 后台管理: http://localhost:3003
echo API服务: http://localhost:3007
pause
```

或创建 `start-all.sh` (Linux/Mac):
```bash
#!/bin/bash
echo "启动 AIMagic 项目所有服务..."

# 启动后端服务
cd server && npm start &
sleep 3

# 启动客户端
cd ../client && npm run dev &
sleep 3

# 启动后台管理
cd ../admin && npm run dev &

echo "所有服务启动完成！"
echo "客户端: http://localhost:3001"
echo "后台管理: http://localhost:3003"
echo "API服务: http://localhost:3007"
```

## 📊 服务状态检查

### 检查所有服务是否正常运行:

```bash
# 检查端口占用情况
netstat -ano | findstr "3001 3003 3007"  # Windows
lsof -i :3001 -i :3003 -i :3007          # Linux/Mac
```

### 健康检查:
- **后端API**: `curl http://localhost:3007/health`
- **客户端**: 浏览器访问 http://localhost:3001
- **后台管理**: 浏览器访问 http://localhost:3003

## 🔄 重启服务

### 重启单个服务:
1. 在对应终端按 `Ctrl+C` 停止服务
2. 重新运行启动命令

### 重启所有服务:
1. 停止所有服务 (`Ctrl+C` 在每个终端)
2. 按照启动顺序重新启动

## 📝 注意事项

1. **启动顺序很重要**: 必须先启动后端服务，再启动前端服务
2. **端口冲突**: 如果端口被占用，参考端口配置文档进行调整
3. **数据库依赖**: 后端服务依赖MySQL数据库，确保数据库服务正常
4. **网络代理**: 前端通过代理访问后端API，确保代理配置正确

## 🎉 启动成功标志

当所有服务正常启动后，您应该能够：

1. ✅ 访问客户端界面 (http://localhost:3001)
2. ✅ 访问后台管理界面 (http://localhost:3003)
3. ✅ 后台管理系统能够正常登录
4. ✅ 前端能够正常调用API接口
5. ✅ 数据能够正常显示和操作

---

**按照此指南启动，确保项目正常运行！** 🚀
