#!/bin/bash

echo "========================================"
echo "iComfy 后台管理系统启动脚本"
echo "========================================"
echo

echo "检查 Node.js 环境..."
if ! command -v node &> /dev/null; then
    echo "错误: 未找到 Node.js，请先安装 Node.js"
    exit 1
fi

node --version
echo

echo "检查项目依赖..."
if [ ! -d "node_modules" ]; then
    echo "正在安装依赖..."
    npm install
    if [ $? -ne 0 ]; then
        echo "错误: 依赖安装失败"
        exit 1
    fi
else
    echo "依赖已存在，跳过安装"
fi

echo
echo "启动开发服务器..."
echo "访问地址: http://localhost:3002"
echo "按 Ctrl+C 停止服务器"
echo

npm run dev
