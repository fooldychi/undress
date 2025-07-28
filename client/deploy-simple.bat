@echo off
echo 🚀 开始部署到 GitHub Pages...

echo 📦 构建项目...
call npm run build:custom
if errorlevel 1 (
    echo ❌ 构建失败
    pause
    exit /b 1
)

echo 🔧 进入构建目录...
cd dist

echo 🔧 初始化 Git 仓库...
git init
git add -A
git commit -m "deploy: custom domain with root path"

echo 📤 推送到 GitHub Pages...
git push -f https://github.com/fooldychi/undress.git main:gh-pages

echo ✅ 部署完成！
echo 🌐 网站将在几分钟后可用：
echo    - 自定义域名: https://undress.icomfy.co/
echo    - GitHub Pages: https://fooldychi.github.io/undress/

pause
