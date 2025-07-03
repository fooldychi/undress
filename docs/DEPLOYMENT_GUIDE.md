# 🚀 部署指南

本文档介绍如何将 Imagic 项目部署到 GitHub Pages 和其他平台。

## 📋 部署方案概述

由于 GitHub Pages 只支持静态网站，我们提供了以下解决方案：

### 🎯 方案一：GitHub Pages + 直连 ComfyUI（推荐）

**优点**：
- 完全免费
- 自动部署
- 无需维护后端服务器

**缺点**：
- 需要 ComfyUI 服务器支持 CORS
- 依赖外部 ComfyUI 服务

### 🎯 方案二：Vercel/Netlify + 代理服务器

**优点**：
- 支持后端代理
- 更好的 CORS 处理

**缺点**：
- 可能有使用限制

## 🔧 GitHub Pages 部署步骤

### 1. 准备工作

确保你的 ComfyUI 服务器支持 CORS 访问，或者使用支持 CORS 的 ComfyUI 服务。

### 2. 配置环境变量

复制 `.env.example` 到 `.env.production`：

```bash
cp .env.example .env.production
```

编辑 `.env.production`：

```env
VITE_COMFYUI_SERVER_URL=https://your-comfyui-server.com
VITE_COMFYUI_CLIENT_ID=your-client-id
VITE_USE_PROXY=false
```

### 3. 自动部署（推荐）

项目已配置 GitHub Actions，推送到 main 分支会自动部署：

```bash
git add .
git commit -m "feat: 准备部署"
git push origin main
```

### 4. 手动部署

如果需要手动部署：

```bash
# 构建项目
npm run build:github

# 部署到 GitHub Pages
npm run deploy
```

### 5. 启用 GitHub Pages

1. 进入 GitHub 仓库设置
2. 找到 "Pages" 选项
3. 选择 "Deploy from a branch"
4. 选择 `gh-pages` 分支
5. 点击 "Save"

## 🌐 访问网站

部署成功后，网站将在以下地址可用：

```
https://fooldychi.github.io/undress/
```

## 🔧 配置说明

### 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `VITE_COMFYUI_SERVER_URL` | ComfyUI 服务器地址 | `https://dzqgp58z0s-8188.cnb.run` |
| `VITE_COMFYUI_CLIENT_ID` | ComfyUI 客户端ID | `abc1373d4ad648a3a81d0587fbe5534b` |
| `VITE_USE_PROXY` | 是否使用代理 | `false` |

### 开发环境 vs 生产环境

- **开发环境**：可以使用本地代理服务器避免 CORS 问题
- **生产环境**：直接连接到 ComfyUI 服务器

## 🐛 常见问题

### 1. CORS 错误

如果遇到 CORS 错误，请确保：
- ComfyUI 服务器支持跨域访问
- 或者使用支持 CORS 的代理服务

### 2. 资源加载失败

检查 `vite.config.js` 中的 `base` 配置是否正确：

```js
base: mode === 'production' ? '/imgic/' : './'
```

### 3. API 调用失败

检查环境变量配置是否正确，特别是 `VITE_COMFYUI_SERVER_URL`。

## 🔄 更新部署

每次推送到 main 分支都会自动触发部署。如果需要手动更新：

```bash
npm run build:github
npm run deploy
```

## 📱 其他部署平台

### Vercel

1. 连接 GitHub 仓库
2. 设置环境变量
3. 部署命令：`npm run build`
4. 输出目录：`dist`

### Netlify

1. 连接 GitHub 仓库
2. 构建命令：`npm run build`
3. 发布目录：`dist`
4. 设置环境变量

## 🔒 安全注意事项

- 不要在前端代码中暴露敏感信息
- 使用环境变量管理配置
- 定期更新依赖包
