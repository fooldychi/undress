@echo off
echo ========================================
echo    AIMagic Production Deploy Script
echo ========================================
echo Deploy Time: %date% %time%
echo Server: 114.132.50.71
echo ========================================
echo.

REM Check required files
echo [INFO] Checking required files...
if not exist "package.json" (
    echo [ERROR] package.json not found!
    pause
    exit /b 1
)
if not exist ".env.production" (
    echo [ERROR] .env.production not found!
    pause
    exit /b 1
)
if not exist "ecosystem.config.js" (
    echo [ERROR] ecosystem.config.js not found!
    pause
    exit /b 1
)
echo [SUCCESS] All required files found

REM Check Node.js
echo [INFO] Checking Node.js...
node --version
if errorlevel 1 (
    echo [ERROR] Node.js not found! Please install Node.js 16+ first
    pause
    exit /b 1
)
echo [SUCCESS] Node.js found

REM Check/Install PM2
echo [INFO] Checking PM2...
pm2 --version >nul 2>&1
if errorlevel 1 (
    echo [INFO] Installing PM2...
    npm install -g pm2
    if errorlevel 1 (
        echo [ERROR] PM2 installation failed!
        pause
        exit /b 1
    )
    echo [SUCCESS] PM2 installed
) else (
    echo [SUCCESS] PM2 found
)

REM Create directories
echo [INFO] Creating directories...
if not exist "logs" mkdir logs
if not exist "uploads" mkdir uploads
if not exist "uploads\images" mkdir uploads\images
if not exist "uploads\temp" mkdir uploads\temp
echo [SUCCESS] Directories created

REM Install dependencies
echo [INFO] Installing dependencies...
npm install --production --no-optional
if errorlevel 1 (
    echo [ERROR] Dependencies installation failed!
    pause
    exit /b 1
)
echo [SUCCESS] Dependencies installed

REM Run initialization if exists
echo [INFO] Running initialization...
if exist "src\scripts\init-deployment-config.js" (
    node src\scripts\init-deployment-config.js
    echo [INFO] Initialization completed
) else (
    echo [INFO] No initialization script found, skipping
)

REM Stop existing services
echo [INFO] Stopping existing services...
pm2 stop aimagic-server 2>nul
pm2 delete aimagic-server 2>nul
echo [SUCCESS] Existing services stopped

REM Start service
echo [INFO] Starting service...
pm2 start ecosystem.config.js --env production
if errorlevel 1 (
    echo [ERROR] Service start failed!
    echo [INFO] Checking logs...
    pm2 logs aimagic-server --lines 10
    pause
    exit /b 1
)
echo [SUCCESS] Service started

REM Save PM2 configuration
echo [INFO] Saving PM2 configuration...
pm2 save
pm2 startup
echo [SUCCESS] PM2 configuration saved

REM Wait and check status
echo [INFO] Waiting for service to stabilize...
timeout /t 5 /nobreak >nul

echo [INFO] Checking service status...
pm2 status

REM Add firewall rule
echo [INFO] Adding firewall rule...
netsh advfirewall firewall add rule name="AIMagic Server Port 3007" dir=in action=allow protocol=TCP localport=3007 2>nul
echo [SUCCESS] Firewall rule added

REM Run health check if exists
echo [INFO] Running health check...
if exist "src\scripts\health-check.js" (
    timeout /t 3 /nobreak >nul
    node src\scripts\health-check.js
    if errorlevel 1 (
        echo [WARNING] Health check failed, but service may still be starting
    ) else (
        echo [SUCCESS] Health check passed
    )
) else (
    echo [INFO] No health check script found
)

echo.
echo ========================================
echo          Deployment Complete!
echo ========================================
echo Service URL: http://114.132.50.71:3007
echo Health Check: http://114.132.50.71:3007/api/health
echo.
echo Useful Commands:
echo   pm2 status          - Check service status
echo   pm2 logs            - View logs
echo   pm2 restart all     - Restart service
echo   pm2 stop all        - Stop service
echo   pm2 monit           - Monitor dashboard
echo ========================================
echo.

echo Press any key to exit...
pause >nul
