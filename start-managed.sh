#!/bin/bash

echo "========================================"
echo "AIMagic 项目启动器 (端口管理模式)"
echo "========================================"
echo

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 错误: 未找到 Node.js，请先安装 Node.js"
    exit 1
fi

echo "✅ Node.js 环境正常 ($(node --version))"
echo

echo "🚀 启动端口管理启动器..."
echo

# 启动项目
node start-managed.js "$@"

exit_code=$?
if [ $exit_code -ne 0 ]; then
    echo
    echo "❌ 启动失败，请检查错误信息"
    exit $exit_code
fi
