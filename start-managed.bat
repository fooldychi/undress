@echo off
chcp 65001 >nul
echo ========================================
echo AIMagic 项目启动器 (端口管理模式)
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
echo 启动端口管理启动器...
echo.

node start-managed.js %*

if %errorlevel% neq 0 (
    echo.
    echo 启动失败，请检查错误信息
    pause
    exit /b 1
)

pause
