#!/bin/bash

echo "========================================"
echo "    Imagic 后端服务启动脚本 (Linux/Mac)"
echo "========================================"
echo

# 检查依赖
if [ ! -d "node_modules" ]; then
    echo "正在安装依赖..."
    npm install
    if [ $? -ne 0 ]; then
        echo "依赖安装失败！"
        exit 1
    fi
    echo "依赖安装完成！"
    echo
fi

echo "启动后端服务..."
echo "服务地址: http://localhost:3006"
echo "按 Ctrl+C 停止服务"
echo
echo "========================================"
npm start
