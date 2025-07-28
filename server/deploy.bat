@echo off
REM AIMagic Backend Service Windows Deployment Script
REM Server: 114.132.50.71 (Tencent Cloud Windows Server)
REM Author: AIMagic Team
REM Version: 2.0.0

echo ========================================
echo    AIMagic Backend Service Deploy v2.0
echo ========================================
echo Deploy Time: %date% %time%
echo Server: 114.132.50.71 (Windows Server)
echo ========================================
echo.

REM Check Node.js version
echo [INFO] Checking Node.js version...
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not installed, please install Node.js ^>= 16.0.0
    echo Download: https://nodejs.org/
    pause
    exit /b 1
)
echo [SUCCESS] Node.js version check passed

REM 检查PM2
echo [INFO] 检查PM2...
pm2 --version >nul 2>&1
if errorlevel 1 (
    echo [WARNING] PM2 未安装，正在安装...
    npm install -g pm2
    if errorlevel 1 (
        echo [ERROR] PM2 安装失败
        pause
        exit /b 1
    )
    echo [SUCCESS] PM2 安装完成
) else (
    for /f "tokens=*" %%i in ('pm2 --version') do set PM2_VERSION=%%i
    echo [SUCCESS] PM2 已安装: !PM2_VERSION!
)

REM 创建必要目录
echo [INFO] 创建必要目录...
if not exist "logs" mkdir logs
if not exist "uploads" mkdir uploads
if not exist "uploads\images" mkdir uploads\images
if not exist "uploads\temp" mkdir uploads\temp
echo [SUCCESS] 目录创建完成

REM 安装依赖
echo [INFO] 安装生产依赖...
if exist "package-lock.json" (
    npm ci --production
) else (
    npm install --production
)
if errorlevel 1 (
    echo [ERROR] 依赖安装失败
    pause
    exit /b 1
)
echo [SUCCESS] 依赖安装完成

REM 数据库初始化
echo [INFO] 初始化数据库配置...
if exist "src\scripts\init-deployment-config.js" (
    node src\scripts\init-deployment-config.js
    if errorlevel 1 (
        echo [WARNING] 数据库配置初始化失败，请检查数据库连接
    ) else (
        echo [SUCCESS] 数据库配置初始化完成
    )
) else (
    echo [WARNING] 数据库初始化脚本不存在，跳过此步骤
)

REM 停止现有服务
echo [INFO] 停止现有服务...
pm2 list | findstr "aimagic-server" >nul 2>&1
if not errorlevel 1 (
    pm2 stop aimagic-server
    pm2 delete aimagic-server
    echo [SUCCESS] 现有服务已停止
) else (
    echo [INFO] 没有运行中的服务
)

REM 启动服务
echo [INFO] 启动生产服务...
pm2 start ecosystem.config.js --env production
if errorlevel 1 (
    echo [ERROR] 服务启动失败
    pause
    exit /b 1
)
pm2 save
echo [SUCCESS] 服务启动完成

REM 等待服务启动
echo [INFO] 等待服务启动...
timeout /t 3 /nobreak >nul

REM 检查服务状态
echo [INFO] 检查服务状态...
pm2 list | findstr "aimagic-server.*online" >nul 2>&1
if not errorlevel 1 (
    echo [SUCCESS] 服务运行正常
    pm2 show aimagic-server
) else (
    echo [ERROR] 服务启动失败
    pm2 logs aimagic-server --lines 20
    pause
    exit /b 1
)

REM 设置开机自启
echo [INFO] 设置开机自启...
pm2 startup
pm2 save
echo [SUCCESS] 开机自启设置完成

REM 配置Windows防火墙
echo [INFO] 配置Windows防火墙...
netsh advfirewall firewall show rule name="AIMagic Server Port 3007" >nul 2>&1
if errorlevel 1 (
    netsh advfirewall firewall add rule name="AIMagic Server Port 3007" dir=in action=allow protocol=TCP localport=3007
    echo [SUCCESS] 防火墙规则已添加
) else (
    echo [INFO] 防火墙规则已存在
)

echo.
echo ========================================
echo [SUCCESS] 🎉 部署完成！
echo ========================================
echo 🌐 服务地址: http://114.132.50.71:3007
echo 📊 监控命令: pm2 monit
echo 📋 查看日志: pm2 logs aimagic-server
echo 🔄 重启服务: pm2 restart aimagic-server
echo ⏹️  停止服务: pm2 stop aimagic-server
echo ========================================
echo.

REM 运行健康检查
if exist "src\scripts\health-check.js" (
    echo [INFO] 运行健康检查...
    node src\scripts\health-check.js
)

echo 按任意键退出...
pause >nul
