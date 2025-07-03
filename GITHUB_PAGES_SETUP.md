# 🚀 GitHub Pages 部署完整指南

## 📋 问题解决方案

你的项目现在已经完全配置好了 GitHub Pages 部署！以下是解决方案的详细说明：

### 🎯 核心问题解决

**问题**：GitHub Pages 只能托管静态网站，不能运行 Node.js 代理服务器

**解决方案**：
1. ✅ 配置前端直接连接到 ComfyUI 服务器
2. ✅ 添加 CORS 处理机制
3. ✅ 使用环境变量管理配置
4. ✅ 设置 GitHub Actions 自动部署

## 🔧 已完成的配置

### 1. 环境配置
- ✅ `.env.production` - 生产环境配置
- ✅ `.env.example` - 配置模板
- ✅ `vite.config.js` - 支持 GitHub Pages 的构建配置

### 2. CORS 处理
- ✅ `src/utils/corsHandler.js` - CORS 处理工具
- ✅ `src/config/comfyui.config.js` - 智能配置系统
- ✅ 更新了 `src/services/comfyui.js` 使用 CORS 处理

### 3. 自动部署
- ✅ `.github/workflows/deploy.yml` - GitHub Actions 配置
- ✅ `scripts/deploy.js` - 手动部署脚本
- ✅ `package.json` - 添加部署命令

## 🚀 部署步骤

### 方法一：自动部署（推荐）

1. **推送代码到 GitHub**：
   ```bash
   git add .
   git commit -m "feat: 配置 GitHub Pages 部署"
   git push origin main
   ```

2. **GitHub Actions 会自动**：
   - 安装依赖
   - 构建项目
   - 部署到 `gh-pages` 分支

3. **启用 GitHub Pages**：
   - 进入仓库设置 → Pages
   - Source: Deploy from a branch
   - Branch: `gh-pages`
   - 点击 Save

### 方法二：手动部署

```bash
# 构建项目
npm run build:github

# 手动部署（可选）
npm run deploy
```

## 🌐 访问地址

部署成功后，网站将在以下地址可用：
```
https://fooldychi.github.io/undress/
```

## ⚙️ 配置说明

### 生产环境配置 (`.env.production`)
```env
VITE_COMFYUI_SERVER_URL=https://dzqgp58z0s-8188.cnb.run
VITE_COMFYUI_CLIENT_ID=abc1373d4ad648a3a81d0587fbe5534b
VITE_USE_PROXY=false  # 生产环境不使用代理
```

### 开发环境 vs 生产环境
- **开发环境**：可选择使用本地代理服务器
- **生产环境**：直接连接到 ComfyUI 服务器

## 🔍 工作原理

### 智能配置系统
```javascript
// 自动检测环境并选择合适的 API 地址
const apiUrl = comfyUIConfig.getApiUrl()
// 开发环境 + 代理 → http://localhost:3008/api
// 生产环境 → https://dzqgp58z0s-8188.cnb.run
```

### CORS 处理
```javascript
// 自动处理跨域请求
import { fetchWithRetry } from '../utils/corsHandler.js'
const response = await fetchWithRetry(url, options)
```

## 🐛 故障排除

### 1. 如果遇到 CORS 错误
- 确保 ComfyUI 服务器支持跨域访问
- 检查服务器 URL 是否正确
- 查看浏览器控制台的详细错误信息

### 2. 如果构建失败
```bash
# 检查依赖
npm install

# 本地测试构建
npm run build:github

# 检查构建输出
ls -la dist/
```

### 3. 如果页面无法访问
- 检查 GitHub Pages 设置
- 确认 `gh-pages` 分支存在
- 等待几分钟让 GitHub 处理部署

## 📱 本地开发

### 使用代理服务器（推荐）
```bash
npm run dev:full
```

### 直接连接（测试生产环境）
```bash
# 设置环境变量
export VITE_USE_PROXY=false
npm run dev
```

## 🔄 更新部署

每次推送到 `main` 分支都会自动触发部署。如果需要手动更新：

```bash
git add .
git commit -m "update: 更新内容"
git push origin main
```

## ✅ 验证部署

部署完成后，访问网站并测试：
1. 🏠 主页加载正常
2. 🖼️ 图片上传功能
3. 🔄 ComfyUI API 连接
4. 📱 移动端适配

## 🎉 完成！

你的 Imagic 项目现在已经完全配置好了 GitHub Pages 部署！

- ✅ 静态网站托管
- ✅ 自动部署流程
- ✅ CORS 问题解决
- ✅ 环境配置管理
- ✅ 移动端优化

享受你的 AI 图像处理平台吧！ 🚀
