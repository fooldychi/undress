# AI Magic 生产环境部署

## 📦 包含内容

- `index.html` - 主页面文件
- `assets/` - 静态资源文件（CSS、JS、图片等）
- `proxy-server-simple.js` - 静态文件服务器
- `package.json` - Node.js依赖配置
- `start.bat` - Windows启动脚本
- `nginx.conf` - Nginx配置示例
- `DEPLOYMENT.md` - 详细部署说明

## 🚀 快速部署

### 方式1: 静态网站托管（推荐）
1. 将 `index.html` 和 `assets/` 文件夹上传到静态托管平台
2. 支持的平台：Vercel、Netlify、GitHub Pages、阿里云OSS等

### 方式2: 使用静态文件服务器
1. 确保已安装 Node.js (>=14.0.0)
2. 双击运行 `start.bat` 或执行以下命令：
   ```bash
   npm install --production
   npm start
   ```
3. 访问 http://localhost:3008

**注意**: 应用将直接连接到ComfyUI服务器，无需代理。确保ComfyUI服务器已启用CORS支持。

### 方式3: Nginx部署
1. 将文件上传到服务器
2. 参考 `nginx.conf` 配置Nginx
3. 重启Nginx服务

## ⚙️ 配置说明

### ComfyUI服务器配置
- 用户可在前端界面点击"⚙️ 配置"按钮设置ComfyUI服务器地址
- 默认服务器：https://dzqgp58z0s-8188.cnb.run
- 支持自定义服务器地址

### 代理服务器（可选）
- 端口：3008
- 用途：解决CORS跨域问题
- 启动：`npm start` 或 `node proxy-server.js`

## 🔧 功能特性

- ✅ AI换衣功能
- ✅ 拖拽对比界面
- ✅ 响应式设计
- ✅ Toast提示
- ✅ 配置管理
- ✅ 移动端适配

## 📞 技术支持

如遇问题，请检查：
1. 浏览器控制台错误信息
2. ComfyUI服务器连接状态
3. 网络连接是否正常

详细部署说明请查看 `DEPLOYMENT.md` 文件。
