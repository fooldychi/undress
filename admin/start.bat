@echo off
chcp 65001 >nul
echo ========================================
echo iComfy 后台管理系统启动脚本
echo ========================================
echo.

echo 检查 Node.js 环境...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo 错误: 未找到 Node.js，请先安装 Node.js
    pause
    exit /b 1
) else (
    echo Node.js 环境正常
)

echo.
echo 检查项目依赖...
if not exist "node_modules" (
    echo 正在安装依赖...
    npm install
    if %errorlevel% neq 0 (
        echo 错误: 依赖安装失败
        pause
        exit /b 1
    )
) else (
    echo 依赖已存在，跳过安装
)

echo.
echo 启动开发服务器...
echo 访问地址: http://localhost:3002
echo 按 Ctrl+C 停止服务器
echo.

echo 正在启动 Vite 开发服务器...
node_modules\.bin\vite.cmd --port 3002 --host

pause
