@echo off
echo ========================================
echo 部署HTTP协议版本的前端应用
echo ========================================

echo [INFO] 清理构建缓存...
cd client
if exist "dist" rmdir /s /q dist
if exist "node_modules\.vite" rmdir /s /q node_modules\.vite

echo [INFO] 检查环境变量配置...
type .env.production

echo [INFO] 重新构建前端应用...
call npm run build

if %ERRORLEVEL% neq 0 (
    echo [ERROR] 构建失败！
    pause
    exit /b 1
)

echo [INFO] 检查构建产物...
if not exist "dist\index.html" (
    echo [ERROR] 构建产物不存在！
    pause
    exit /b 1
)

echo [INFO] 提交到Git仓库...
cd ..
git add .
git commit -m "fix: 强制使用HTTP协议，解决混合内容问题"

echo [INFO] 推送到GitHub...
git push origin main

if %ERRORLEVEL% neq 0 (
    echo [ERROR] 推送失败！
    pause
    exit /b 1
)

echo [SUCCESS] 部署完成！
echo [INFO] 等待GitHub Pages更新（通常需要1-2分钟）
echo [INFO] 访问地址: http://undress.icomfy.co
echo [INFO] API地址: http://114.132.50.71:3007

pause
