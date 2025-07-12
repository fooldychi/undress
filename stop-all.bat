@echo off
echo ========================================
echo    AIMagic Project Stop Script
echo ========================================
echo.

echo Stopping all AIMagic services...

echo Killing processes on ports 3001, 3003, 3007...

for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001') do (
    echo Stopping process on port 3001 (Client)...
    taskkill /PID %%a /F >nul 2>&1
)

for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3003') do (
    echo Stopping process on port 3003 (Admin)...
    taskkill /PID %%a /F >nul 2>&1
)

for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3007') do (
    echo Stopping process on port 3007 (Server)...
    taskkill /PID %%a /F >nul 2>&1
)

echo.
echo All AIMagic services have been stopped.
echo ========================================

pause
