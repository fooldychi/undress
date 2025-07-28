@echo off
echo ========================================
echo    AIMagic Simple Package Script
echo ========================================
echo Start Time: %date% %time%
echo ========================================
echo.

REM Clean old package
echo [INFO] Cleaning old package...
if exist "aimagic-server-production" rmdir /s /q "aimagic-server-production"

REM Create directories
echo [INFO] Creating directories...
mkdir "aimagic-server-production"
mkdir "aimagic-server-production\src"
mkdir "aimagic-server-production\src\scripts"
mkdir "aimagic-server-production\logs"
mkdir "aimagic-server-production\uploads"
mkdir "aimagic-server-production\uploads\images"
mkdir "aimagic-server-production\uploads\temp"

REM Copy source code
echo [INFO] Copying source code...
if exist "src" (
    xcopy /E /I "src" "aimagic-server-production\src"
    echo [SUCCESS] Source code copied
) else (
    echo [ERROR] src directory not found!
    pause
    exit /b 1
)

REM Copy configuration files
echo [INFO] Copying configuration files...

if exist "production-package.json" (
    copy "production-package.json" "aimagic-server-production\package.json"
    echo [SUCCESS] package.json copied
) else (
    echo [ERROR] production-package.json not found!
    pause
    exit /b 1
)

if exist ".env.production" (
    copy ".env.production" "aimagic-server-production\"
    echo [SUCCESS] .env.production copied
) else (
    echo [ERROR] .env.production not found!
    pause
    exit /b 1
)

if exist "ecosystem.config.js" (
    copy "ecosystem.config.js" "aimagic-server-production\"
    echo [SUCCESS] ecosystem.config.js copied
) else (
    echo [ERROR] ecosystem.config.js not found!
    pause
    exit /b 1
)

REM Copy deployment scripts
echo [INFO] Copying deployment scripts...
if exist "deploy-simple.bat" (
    copy "deploy-simple.bat" "aimagic-server-production\"
    echo [SUCCESS] deploy-simple.bat copied
) else (
    echo [ERROR] deploy-simple.bat not found!
    pause
    exit /b 1
)

REM Create health check script
echo [INFO] Creating health check script...
echo const http = require('http'); > "aimagic-server-production\src\scripts\health-check.js"
echo. >> "aimagic-server-production\src\scripts\health-check.js"
echo console.log('Starting health check...'); >> "aimagic-server-production\src\scripts\health-check.js"
echo. >> "aimagic-server-production\src\scripts\health-check.js"
echo const options = { >> "aimagic-server-production\src\scripts\health-check.js"
echo   hostname: 'localhost', >> "aimagic-server-production\src\scripts\health-check.js"
echo   port: 3007, >> "aimagic-server-production\src\scripts\health-check.js"
echo   path: '/api/health', >> "aimagic-server-production\src\scripts\health-check.js"
echo   method: 'GET', >> "aimagic-server-production\src\scripts\health-check.js"
echo   timeout: 5000 >> "aimagic-server-production\src\scripts\health-check.js"
echo }; >> "aimagic-server-production\src\scripts\health-check.js"
echo. >> "aimagic-server-production\src\scripts\health-check.js"
echo const req = http.request(options, (res) =^> { >> "aimagic-server-production\src\scripts\health-check.js"
echo   if (res.statusCode === 200) { >> "aimagic-server-production\src\scripts\health-check.js"
echo     console.log('Health check passed'); >> "aimagic-server-production\src\scripts\health-check.js"
echo     process.exit(0); >> "aimagic-server-production\src\scripts\health-check.js"
echo   } else { >> "aimagic-server-production\src\scripts\health-check.js"
echo     console.log('Health check failed:', res.statusCode); >> "aimagic-server-production\src\scripts\health-check.js"
echo     process.exit(1); >> "aimagic-server-production\src\scripts\health-check.js"
echo   } >> "aimagic-server-production\src\scripts\health-check.js"
echo }); >> "aimagic-server-production\src\scripts\health-check.js"
echo. >> "aimagic-server-production\src\scripts\health-check.js"
echo req.on('error', (err) =^> { >> "aimagic-server-production\src\scripts\health-check.js"
echo   console.error('Health check error:', err.message); >> "aimagic-server-production\src\scripts\health-check.js"
echo   process.exit(1); >> "aimagic-server-production\src\scripts\health-check.js"
echo }); >> "aimagic-server-production\src\scripts\health-check.js"
echo. >> "aimagic-server-production\src\scripts\health-check.js"
echo req.setTimeout(5000); >> "aimagic-server-production\src\scripts\health-check.js"
echo req.end(); >> "aimagic-server-production\src\scripts\health-check.js"

echo [SUCCESS] health-check.js created

REM Create init script
echo [INFO] Creating init script...
echo console.log('Deployment initialization completed'); > "aimagic-server-production\src\scripts\init-deployment-config.js"
echo process.exit(0); >> "aimagic-server-production\src\scripts\init-deployment-config.js"
echo [SUCCESS] init-deployment-config.js created

REM Create deployment readme
echo [INFO] Creating deployment readme...
echo # AIMagic Server Deployment Package > "aimagic-server-production\DEPLOYMENT_README.md"
echo. >> "aimagic-server-production\DEPLOYMENT_README.md"
echo ## Deployment Steps >> "aimagic-server-production\DEPLOYMENT_README.md"
echo 1. Upload this directory to server >> "aimagic-server-production\DEPLOYMENT_README.md"
echo 2. Run: deploy-simple.bat >> "aimagic-server-production\DEPLOYMENT_README.md"
echo. >> "aimagic-server-production\DEPLOYMENT_README.md"
echo ## Package Time >> "aimagic-server-production\DEPLOYMENT_README.md"
echo %date% %time% >> "aimagic-server-production\DEPLOYMENT_README.md"

echo [SUCCESS] Deployment readme created

REM Verify key files
echo [INFO] Verifying key files...
if not exist "aimagic-server-production\src\app.js" (
    echo [ERROR] Missing: src\app.js
    pause
    exit /b 1
)

if not exist "aimagic-server-production\package.json" (
    echo [ERROR] Missing: package.json
    pause
    exit /b 1
)

if not exist "aimagic-server-production\.env.production" (
    echo [ERROR] Missing: .env.production
    pause
    exit /b 1
)

echo.
echo ========================================
echo          Package Complete!
echo ========================================
echo Package: aimagic-server-production
echo Location: %cd%\aimagic-server-production
echo ========================================
echo.
echo [SUCCESS] All files verified!
echo [INFO] Upload the 'aimagic-server-production' directory to server
echo [INFO] Run 'deploy-simple.bat' on server after upload
echo.
echo Press any key to exit...
pause >nul
