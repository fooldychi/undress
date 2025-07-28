@echo off
echo ========================================
echo    AIMagic Simple Verification Script
echo ========================================
echo Verification Time: %date% %time%
echo ========================================
echo.

set ERROR_COUNT=0

echo [INFO] Starting file verification...
echo.

REM Check core files
echo === Core Files ===
if exist "src\app.js" (
    echo [OK] src\app.js
) else (
    echo [ERROR] src\app.js - Missing
    set /a ERROR_COUNT+=1
)

if exist "production-package.json" (
    echo [OK] production-package.json
) else if exist "package.json" (
    echo [OK] package.json
) else (
    echo [ERROR] package.json - Missing
    set /a ERROR_COUNT+=1
)

if exist ".env.production" (
    echo [OK] .env.production
) else (
    echo [ERROR] .env.production - Missing
    set /a ERROR_COUNT+=1
)

if exist "ecosystem.config.js" (
    echo [OK] ecosystem.config.js
) else (
    echo [ERROR] ecosystem.config.js - Missing
    set /a ERROR_COUNT+=1
)

echo.
echo === Source Directories ===
if exist "src" (
    echo [OK] src directory
) else (
    echo [ERROR] src directory - Missing
    set /a ERROR_COUNT+=1
)

if exist "src\config" (
    echo [OK] src\config
) else (
    echo [WARN] src\config - Missing
)

if exist "src\routes" (
    echo [OK] src\routes
) else (
    echo [WARN] src\routes - Missing
)

if exist "src\controllers" (
    echo [OK] src\controllers
) else (
    echo [WARN] src\controllers - Missing
)

if exist "src\models" (
    echo [OK] src\models
) else (
    echo [WARN] src\models - Missing
)

echo.
echo === Deployment Scripts ===
if exist "deploy-simple.bat" (
    echo [OK] deploy-simple.bat
) else (
    echo [ERROR] deploy-simple.bat - Missing
    set /a ERROR_COUNT+=1
)

echo.
echo ========================================
echo          Verification Results
echo ========================================

if %ERROR_COUNT% GTR 0 (
    echo [ERROR] Found %ERROR_COUNT% critical errors!
    echo [INFO] Please fix these errors before packaging
    echo.
    echo Critical files missing. Cannot proceed with packaging.
    pause
    exit /b 1
) else (
    echo [SUCCESS] All critical files found!
    echo [INFO] Ready for packaging
    echo.
    echo You can now run: simple-package.bat
    echo After packaging, upload to server and run: deploy-simple.bat
)

echo.
echo Press any key to continue...
pause >nul
