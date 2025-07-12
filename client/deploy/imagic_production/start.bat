@echo off
echo ========================================
echo        Imagic AI Image Processing
echo ========================================
echo.
echo Installing dependencies...
call npm install --production
if errorlevel 1 (
    echo.
    echo ❌ 依赖安装失败，请检查网络连接
    pause
    exit /b 1
)

echo.
echo ✅ 依赖安装完成
echo 🚀 启动Imagic服务器...
echo.
echo 服务器将在以下地址启动:
echo 🌐 http://localhost:3008
echo.
echo 按 Ctrl+C 停止服务器
echo ========================================
echo.

node proxy-server-simple.js

echo.
echo 服务器已停止
pause
