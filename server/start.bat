@echo off
echo ========================================
echo    Imagic 后端服务启动脚本 (Windows)
echo ========================================
echo.

echo 检查依赖...
if not exist "node_modules" (
    echo 正在安装依赖...
    npm install
    if errorlevel 1 (
        echo 依赖安装失败！
        pause
        exit /b 1
    )
    echo 依赖安装完成！
    echo.
)

echo 启动后端服务...
echo 服务地址: http://localhost:3006
echo 按 Ctrl+C 停止服务
echo.
echo ========================================
npm start
