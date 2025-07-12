@echo off
echo ========================================
echo    AIMagic Project Startup Script
echo ========================================
echo.

echo Reading environment variables...
if exist .env (
    echo Found .env file
) else (
    echo Creating .env from .env.example...
    copy .env.example .env
)

echo.
echo Starting all services...
echo.

echo [1/3] Starting Server (Backend API)...
start "AIMagic Server" cmd /k "cd server && npm start"
echo Server starting on port from SERVER_PORT env var (default: 3007)
timeout /t 3

echo.
echo [2/3] Starting Client (Frontend)...
start "AIMagic Client" cmd /k "cd client && npm run dev"
echo Client starting on port from CLIENT_PORT env var (default: 3001)
timeout /t 3

echo.
echo [3/3] Starting Admin (Backend Management)...
start "AIMagic Admin" cmd /k "cd admin && npm run dev"
echo Admin starting on port from ADMIN_PORT env var (default: 3003)

echo.
echo ========================================
echo All services are starting...
echo.
echo Check the opened terminal windows for:
echo - Server: Backend API service
echo - Client: User frontend interface  
echo - Admin: Management backend interface
echo.
echo Access URLs (check .env for actual ports):
echo - Client: http://localhost:3001
echo - Admin: http://localhost:3003
echo - Server API: http://localhost:3007
echo ========================================

pause
