# 🚀 手动部署指南 - undress 仓库

由于网络连接问题，这里提供手动部署到 `https://github.com/fooldychi/undress.git` 的完整指南。

## ✅ 已完成的配置

项目已经完全配置好了 GitHub Pages 部署，包括：

### 🔧 配置更新
- ✅ 远程仓库地址已更新到 `https://github.com/fooldychi/undress.git`
- ✅ Vite 配置中的基础路径已更新为 `/undress/`
- ✅ 所有文档中的访问地址已更新
- ✅ 部署脚本已配置正确的仓库地址

### 📦 构建完成
- ✅ 项目已成功构建（`npm run build:github`）
- ✅ 所有文件已添加到 Git（`git add .`）
- ✅ 更改已提交（`git commit`）

## 🔄 手动部署步骤

### 1. 推送代码到 GitHub

在命令行中执行：

```bash
# 确认远程仓库地址
git remote -v

# 推送到 undress 仓库
git push origin main
```

如果推送成功，你会看到类似输出：
```
Enumerating objects: X, done.
Counting objects: 100% (X/X), done.
...
To https://github.com/fooldychi/undress.git
   abc1234..def5678  main -> main
```

### 2. 启用 GitHub Pages

1. **访问仓库设置**：
   - 打开 https://github.com/fooldychi/undress
   - 点击 "Settings" 标签

2. **配置 Pages**：
   - 在左侧菜单找到 "Pages"
   - Source: 选择 "Deploy from a branch"
   - Branch: 选择 `gh-pages`（GitHub Actions 会自动创建）
   - 点击 "Save"

### 3. 等待自动部署

GitHub Actions 会自动：
- 安装依赖
- 构建项目
- 部署到 `gh-pages` 分支

## 🌐 访问网站

部署完成后，网站将在以下地址可用：
```
https://fooldychi.github.io/undress/
```

## 🔍 验证部署

### 检查 GitHub Actions
1. 进入 https://github.com/fooldychi/undress/actions
2. 查看最新的 "Deploy to GitHub Pages" 工作流
3. 确认状态为绿色 ✅

### 检查 Pages 状态
1. 进入 https://github.com/fooldychi/undress/settings/pages
2. 查看部署状态
3. 点击访问链接测试网站

## 🐛 故障排除

### 如果推送失败
```bash
# 检查网络连接
ping github.com

# 尝试使用 SSH（如果配置了 SSH 密钥）
git remote set-url origin git@github.com:fooldychi/undress.git
git push origin main
```

### 如果 GitHub Actions 失败
1. 检查 `.github/workflows/deploy.yml` 文件
2. 查看 Actions 日志中的错误信息
3. 确认仓库有正确的权限设置

### 如果网站无法访问
1. 等待 5-10 分钟（GitHub Pages 需要时间处理）
2. 检查 `gh-pages` 分支是否存在
3. 确认 Pages 设置中的分支选择正确

## 📋 项目特性

部署后的网站将包含：

- ✅ **一键褪衣功能** - 使用真实 ComfyUI 工作流
- ✅ **极速换脸功能** - 支持多图上传
- ✅ **文生图功能** - AI 图像生成
- ✅ **移动端优化** - 响应式设计
- ✅ **暗色主题** - 现代化 UI
- ✅ **CORS 处理** - 自动跨域请求处理

## 🔧 环境配置

生产环境配置（`.env.production`）：
```env
VITE_COMFYUI_SERVER_URL=https://dzqgp58z0s-8188.cnb.run
VITE_COMFYUI_CLIENT_ID=abc1373d4ad648a3a81d0587fbe5534b
VITE_USE_PROXY=false
```

## 🎉 完成！

一旦推送成功并启用 GitHub Pages，你的 AI 图像处理平台就会在 `https://fooldychi.github.io/undress/` 上线！

### 后续更新
每次推送到 `main` 分支都会自动触发重新部署，无需手动操作。
