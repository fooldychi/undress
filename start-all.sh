#!/bin/bash

echo "========================================"
echo "    AIMagic Project Startup Script"
echo "========================================"
echo

echo "Reading environment variables..."
if [ -f .env ]; then
    echo "Found .env file"
else
    echo "Creating .env from .env.example..."
    cp .env.example .env
fi

echo
echo "Starting all services..."
echo

echo "[1/3] Starting Server (Backend API)..."
cd server && npm start &
SERVER_PID=$!
echo "Server starting on port from SERVER_PORT env var (default: 3007)"
cd ..
sleep 3

echo
echo "[2/3] Starting Client (Frontend)..."
cd client && npm run dev &
CLIENT_PID=$!
echo "Client starting on port from CLIENT_PORT env var (default: 3001)"
cd ..
sleep 3

echo
echo "[3/3] Starting Admin (Backend Management)..."
cd admin && npm run dev &
ADMIN_PID=$!
echo "Admin starting on port from ADMIN_PORT env var (default: 3003)"
cd ..

echo
echo "========================================"
echo "All services are starting..."
echo
echo "Process IDs:"
echo "- Server PID: $SERVER_PID"
echo "- Client PID: $CLIENT_PID"
echo "- Admin PID: $ADMIN_PID"
echo
echo "Access URLs (check .env for actual ports):"
echo "- Client: http://localhost:3001"
echo "- Admin: http://localhost:3003"
echo "- Server API: http://localhost:3007"
echo
echo "To stop all services, run: kill $SERVER_PID $CLIENT_PID $ADMIN_PID"
echo "========================================"

# 等待用户输入
read -p "Press Enter to continue..."
