#!/bin/bash

echo "========================================"
echo "    AIMagic 稳定服务器启动器"
echo "========================================"
echo

echo "🚀 启动高稳定性后台服务..."
echo

echo "📋 功能特性:"
echo "   ✅ 自动重启 - 进程崩溃时自动重启"
echo "   ✅ 健康监控 - 定期检查服务健康状态"
echo "   ✅ 内存管理 - 监控内存使用和泄漏检测"
echo "   ✅ 错误处理 - 全局异常捕获和日志记录"
echo "   ✅ 优雅关闭 - 安全关闭数据库连接和清理资源"
echo

echo "📊 监控端点:"
echo "   健康检查: http://localhost:3007/health"
echo "   API文档: http://localhost:3007/api-docs"
echo

echo "📝 日志文件位置:"
echo "   进程管理: server/logs/process-manager.log"
echo "   错误日志: server/logs/error.log"
echo "   健康日志: server/logs/health.log"
echo

echo "💡 使用说明:"
echo "   - 按 Ctrl+C 停止服务"
echo "   - 服务会自动重启（最多10次）"
echo "   - 查看实时日志请打开新的终端窗口"
echo

echo "⚡ 正在启动服务器..."
echo

cd server
node --expose-gc start-with-manager.js
