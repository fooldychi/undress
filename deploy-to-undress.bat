@echo off
echo 🚀 部署到 undress 仓库...

echo 📦 添加所有文件...
git add .

echo 💾 提交更改...
git commit -m "feat: 配置部署到 undress 仓库"

echo 📤 推送到 undress 仓库...
git push origin main

echo ✅ 部署完成！
echo 🌐 网站将在几分钟后可用：https://fooldychi.github.io/undress/
echo.
echo 📋 接下来需要在 GitHub 仓库设置中启用 GitHub Pages：
echo 1. 进入 https://github.com/fooldychi/undress/settings/pages
echo 2. Source: Deploy from a branch
echo 3. Branch: gh-pages
echo 4. 点击 Save
echo.
pause
