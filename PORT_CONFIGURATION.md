# AIMagic 项目端口配置统一管理

## 🔧 统一端口配置

为了避免端口冲突和配置混乱，项目采用以下统一的端口配置：

### 📊 端口分配表

| 服务 | 端口 | 用途 | 访问地址 |
|------|------|------|----------|
| **客户端** | `3001` | 用户前端界面 | http://localhost:3001 |
| **后台管理系统** | `3003` | 管理员界面 | http://localhost:3003 |
| **后端API服务** | `3007` | 服务器API | http://localhost:3007 |

### 🎯 端口配置原则

1. **客户端 (3001)**: 面向用户的前端应用
2. **后台管理 (3003)**: 面向管理员的后台界面  
3. **后端服务 (3007)**: 提供API服务的后端

## 📁 配置文件位置

### 客户端 (Client)
```
client/vite.config.js - 端口: 3001
client/package.json - 启动脚本
```

### 后台管理系统 (Admin)
```
admin/vite.config.js - 端口: 3003
admin/package.json - 启动脚本
admin/start.bat - Windows启动脚本
admin/start.sh - Linux/Mac启动脚本
```

### 后端服务 (Server)
```
server/src/app.js - 端口: 3007
server/start.bat - Windows启动脚本
server/start.sh - Linux/Mac启动脚本
```

## 🚀 启动顺序

### 1. 启动后端服务
```bash
cd server
npm start
# 或使用启动脚本
start.bat  # Windows
./start.sh # Linux/Mac
```
**访问**: http://localhost:3007

### 2. 启动客户端
```bash
cd client
npm run dev
```
**访问**: http://localhost:3001

### 3. 启动后台管理系统
```bash
cd admin
npm run dev
# 或使用启动脚本
start.bat  # Windows
./start.sh # Linux/Mac
```
**访问**: http://localhost:3003

## ⚙️ 代理配置

### 客户端代理配置 (client/vite.config.js)
```javascript
server: {
  port: 3001,
  proxy: {
    '/api': {
      target: 'http://localhost:3007',
      changeOrigin: true
    }
  }
}
```

### 后台管理系统代理配置 (admin/vite.config.js)
```javascript
server: {
  port: 3003,
  proxy: {
    '/api': {
      target: 'http://localhost:3007',
      changeOrigin: true
    }
  }
}
```

## 🔒 CORS配置

后端服务器需要允许以下端口的跨域访问：
```javascript
// server/src/app.js
const corsOptions = {
  origin: [
    'http://localhost:3001', // 客户端
    'http://localhost:3003'  // 后台管理系统
  ],
  credentials: true
};
```

## 🛠️ 故障排除

### 端口被占用
如果遇到端口被占用的问题：

1. **查看端口占用**:
   ```bash
   # Windows
   netstat -ano | findstr :3001
   netstat -ano | findstr :3003
   netstat -ano | findstr :3007
   
   # Linux/Mac
   lsof -i :3001
   lsof -i :3003
   lsof -i :3007
   ```

2. **终止占用进程**:
   ```bash
   # Windows
   taskkill /PID <进程ID> /F
   
   # Linux/Mac
   kill -9 <进程ID>
   ```

### 访问失败
如果无法访问服务：

1. **检查服务状态**: 确认对应服务已启动
2. **检查防火墙**: 确认端口未被防火墙阻止
3. **检查代理配置**: 确认前端代理指向正确的后端端口
4. **检查CORS配置**: 确认后端允许前端域名访问

## 📝 配置修改指南

### 如需修改端口，请同时更新以下文件：

#### 修改客户端端口 (当前: 3001)
1. `client/vite.config.js` - server.port
2. `server/src/app.js` - CORS配置中的origin

#### 修改后台管理系统端口 (当前: 3003)
1. `admin/vite.config.js` - server.port
2. `admin/start.bat` - 显示的访问地址
3. `admin/start.sh` - 显示的访问地址
4. `server/src/app.js` - CORS配置中的origin

#### 修改后端服务端口 (当前: 3007)
1. `server/src/app.js` - app.listen()
2. `server/start.bat` - 显示的访问地址
3. `server/start.sh` - 显示的访问地址
4. `client/vite.config.js` - proxy.target
5. `admin/vite.config.js` - proxy.target

## ⚠️ 重要提醒

1. **避免硬编码端口**: 所有端口配置应集中管理，避免在代码中硬编码
2. **保持配置同步**: 修改端口时必须同时更新所有相关配置文件
3. **测试完整流程**: 端口修改后需要测试前后端通信是否正常
4. **文档及时更新**: 端口变更后及时更新相关文档

## 🔄 快速重置

如果遇到端口配置混乱，可以按照本文档重新配置所有端口设置，确保系统正常运行。

---

**统一端口管理，避免配置冲突！** 🎯
