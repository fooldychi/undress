@echo off
echo 🚀 开始部署到 GitHub Pages...

REM 检查是否在正确的目录
if not exist "package.json" (
    echo ❌ 请在 client 目录下运行此脚本
    pause
    exit /b 1
)

REM 检查 dist 目录是否存在
if not exist "dist" (
    echo 📦 构建项目...
    npm run build:github
    if errorlevel 1 (
        echo ❌ 构建失败
        pause
        exit /b 1
    )
)

REM 进入 dist 目录
cd dist

REM 初始化 git 仓库（如果不存在）
if not exist ".git" (
    echo 🔧 初始化 Git 仓库...
    git init
    git checkout -b main
)

REM 添加所有文件
echo 📁 添加文件...
git add -A

REM 提交更改
echo 💾 提交更改...
git commit -m "deploy: GitHub Pages %date% %time%"

REM 推送到 GitHub Pages
echo 📤 推送到 GitHub Pages...
git push -f git@github.com:fooldychi/undress.git main:gh-pages

if errorlevel 1 (
    echo ❌ 推送失败，请检查 SSH 密钥配置
    cd ..
    pause
    exit /b 1
)

REM 返回上级目录
cd ..

echo ✅ 部署成功！
echo 🌐 网站将在几分钟后可用：
echo    - GitHub Pages: https://fooldychi.github.io/undress/
echo    - 自定义域名: https://undress.icomfy.co/
pause
