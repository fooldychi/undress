# Imagic 部署问题排查指南

## 🚨 常见问题及解决方案

### 1. 代理服务器启动失败

#### 问题: 端口被占用
```
❌ 端口 3008 已被占用
```

**解决方案**:
1. **更换端口**:
   ```bash
   # Windows
   set PORT=3009 && npm start
   
   # Linux/Mac
   PORT=3009 npm start
   ```

2. **查找占用端口的进程**:
   ```bash
   # Windows
   netstat -ano | findstr :3008
   
   # Linux/Mac
   lsof -i :3008
   ```

3. **终止占用进程**:
   ```bash
   # Windows (替换PID)
   taskkill /PID <PID> /F
   
   # Linux/Mac
   kill -9 <PID>
   ```

#### 问题: 依赖安装失败
```
❌ 依赖安装失败，请检查网络连接
```

**解决方案**:
1. **检查网络连接**
2. **使用国内镜像**:
   ```bash
   npm config set registry https://registry.npmmirror.com
   npm install --production
   ```
3. **清除缓存**:
   ```bash
   npm cache clean --force
   npm install --production
   ```

### 2. ComfyUI连接问题

#### 问题: 代理错误
```
❌ 代理错误: connect ECONNREFUSED
```

**解决方案**:
1. **检查ComfyUI服务器状态**:
   - 访问: https://dzqgp58z0s-8188.cnb.run
   - 确认服务器在线

2. **更换ComfyUI服务器**:
   ```bash
   # 设置环境变量
   set COMFYUI_URL=https://your-comfyui-server.com
   npm start
   ```

3. **使用前端配置**:
   - 点击"⚙️ 配置"按钮
   - 输入新的服务器地址
   - 测试连接

### 3. 静态文件部署问题

#### 问题: 页面空白或404
**解决方案**:
1. **检查文件路径**: 确保index.html在根目录
2. **配置服务器**: 支持SPA路由回退
3. **检查控制台**: 查看JavaScript错误

#### 问题: 资源加载失败
**解决方案**:
1. **检查相对路径**: 确保assets文件夹存在
2. **清除浏览器缓存**: Ctrl+F5强制刷新
3. **检查MIME类型**: 服务器正确识别文件类型

## 🔧 部署模式选择

### 模式1: 纯静态部署（推荐）
**适用场景**: 有稳定的ComfyUI服务器，支持CORS
**部署方式**: 只上传index.html和assets文件夹
**优点**: 简单、快速、无需Node.js

### 模式2: 代理服务器部署
**适用场景**: ComfyUI服务器不支持CORS
**部署方式**: 运行完整的Node.js服务器
**优点**: 解决CORS问题，提供完整功能

### 模式3: 混合部署
**适用场景**: 部分功能需要代理
**部署方式**: 静态文件+独立代理服务
**优点**: 灵活配置，按需使用

## 📋 部署检查清单

### 静态部署检查
- [ ] index.html文件存在
- [ ] assets文件夹完整
- [ ] 服务器支持SPA路由
- [ ] HTTPS配置正确
- [ ] ComfyUI服务器可访问

### 代理部署检查
- [ ] Node.js版本 >= 14.0.0
- [ ] 依赖安装成功
- [ ] 端口未被占用
- [ ] ComfyUI服务器连接正常
- [ ] 防火墙允许端口访问

## 🌐 生产环境配置

### Nginx配置示例
```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /path/to/imagic;
    index index.html;

    # SPA路由支持
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 静态资源缓存
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # API代理（如果使用）
    location /api/ {
        proxy_pass http://localhost:3008;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Apache配置示例
```apache
<VirtualHost *:80>
    ServerName your-domain.com
    DocumentRoot /path/to/imagic
    
    # SPA路由支持
    <Directory "/path/to/imagic">
        RewriteEngine On
        RewriteBase /
        RewriteRule ^index\.html$ - [L]
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule . /index.html [L]
    </Directory>
</VirtualHost>
```

## 📞 获取帮助

### 日志查看
1. **浏览器控制台**: F12 -> Console
2. **服务器日志**: 查看终端输出
3. **网络请求**: F12 -> Network

### 常用调试命令
```bash
# 检查端口占用
netstat -ano | findstr :3008

# 测试ComfyUI连接
curl https://dzqgp58z0s-8188.cnb.run/system_stats

# 检查服务器状态
curl http://localhost:3008/health
```

### 联系支持
如果问题仍未解决，请提供以下信息：
1. 操作系统版本
2. Node.js版本
3. 错误信息截图
4. 浏览器控制台日志
5. 部署方式和环境
