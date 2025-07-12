# Imagic 部署指南

## 📦 构建生产版本

### 1. 安装依赖
```bash
npm install
```

### 2. 构建项目
```bash
npm run build
```

构建完成后，会在项目根目录生成 `dist` 文件夹，包含所有静态资源。

### 3. 预览构建结果
```bash
npm run preview
```

## 🚀 部署选项

### 选项1: 静态网站托管
将 `dist` 文件夹的内容上传到以下任一平台：
- **Vercel**: 推荐，支持自动部署
- **Netlify**: 简单易用，免费额度充足
- **GitHub Pages**: 免费，适合开源项目
- **阿里云OSS**: 国内访问速度快
- **腾讯云COS**: 国内服务商

### 选项2: 服务器部署
1. 将 `dist` 文件夹上传到服务器
2. 配置Nginx或Apache
3. 确保支持SPA路由

#### Nginx配置示例
```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /path/to/dist;
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
}
```

## ⚙️ 环境配置

### 生产环境变量
在 `.env.production` 文件中配置：
- `VITE_COMFYUI_SERVER_URL`: ComfyUI服务器地址
- `VITE_COMFYUI_CLIENT_ID`: 客户端ID
- `VITE_USE_PROXY`: 是否使用代理服务器

### 代理服务器（可选）
如果需要避免CORS问题，可以部署代理服务器：
```bash
node proxy-server.js
```

## 🔧 配置说明

### 1. ComfyUI服务器配置
- 用户可以在前端界面通过"⚙️ 配置"按钮修改服务器地址
- 配置会保存在浏览器localStorage中
- 支持代理模式和直连模式

### 2. 路由配置
- 使用Vue Router的History模式
- 需要服务器支持SPA路由回退

### 3. 资源优化
- 代码分包：vendor、utils分离
- 移除console.log和debugger
- 静态资源压缩

## 📋 部署检查清单

- [ ] 构建成功，无错误和警告
- [ ] 预览功能正常
- [ ] ComfyUI服务器连接正常
- [ ] 配置功能可用
- [ ] 换衣功能正常
- [ ] 移动端适配正常
- [ ] 路由跳转正常

## 🚨 注意事项

1. **CORS问题**: 如果直连ComfyUI服务器遇到CORS问题，建议使用代理服务器
2. **HTTPS**: 生产环境建议使用HTTPS
3. **域名配置**: 确保域名正确解析
4. **性能监控**: 建议添加性能监控工具
5. **错误追踪**: 建议添加错误追踪服务

## 📞 技术支持

如果部署过程中遇到问题，请检查：
1. 浏览器控制台错误信息
2. 网络请求是否正常
3. ComfyUI服务器是否可访问
4. 配置是否正确
