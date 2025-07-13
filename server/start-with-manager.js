#!/usr/bin/env node

// 使用进程管理器启动服务器
const ProcessManager = require('./scripts/process-manager');
const path = require('path');
const fs = require('fs');

console.log('🚀 AIMagic 服务器启动器');
console.log('=' * 40);

// 检查环境
const checkEnvironment = () => {
  console.log('🔍 检查运行环境...');
  
  // 检查Node.js版本
  const nodeVersion = process.version;
  console.log(`📦 Node.js版本: ${nodeVersion}`);
  
  // 检查环境变量
  const envFile = path.join(__dirname, '.env');
  if (!fs.existsSync(envFile)) {
    console.warn('⚠️ 未找到.env文件，将使用默认配置');
  } else {
    console.log('✅ 找到.env配置文件');
  }
  
  // 检查logs目录
  const logsDir = path.join(__dirname, 'logs');
  if (!fs.existsSync(logsDir)) {
    console.log('📁 创建logs目录...');
    fs.mkdirSync(logsDir, { recursive: true });
  }
  
  console.log('✅ 环境检查完成');
  console.log('');
};

// 显示启动信息
const showStartupInfo = () => {
  const port = process.env.SERVER_PORT || 3007;
  
  console.log('📋 启动配置:');
  console.log(`   服务端口: ${port}`);
  console.log(`   环境模式: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   进程ID: ${process.pid}`);
  console.log(`   工作目录: ${process.cwd()}`);
  console.log('');
  
  console.log('🔧 功能特性:');
  console.log('   ✅ 自动重启 - 进程崩溃时自动重启');
  console.log('   ✅ 健康监控 - 定期检查服务健康状态');
  console.log('   ✅ 内存管理 - 监控内存使用和泄漏检测');
  console.log('   ✅ 错误处理 - 全局异常捕获和日志记录');
  console.log('   ✅ 优雅关闭 - 安全关闭数据库连接和清理资源');
  console.log('');
  
  console.log('📊 监控端点:');
  console.log(`   健康检查: http://localhost:${port}/health`);
  console.log(`   API文档: http://localhost:${port}/api-docs`);
  console.log('');
  
  console.log('📝 日志文件:');
  console.log('   进程管理: logs/process-manager.log');
  console.log('   错误日志: logs/error.log');
  console.log('   健康日志: logs/health.log');
  console.log('   告警日志: logs/alerts.log');
  console.log('');
};

// 显示使用说明
const showUsageInfo = () => {
  console.log('💡 使用说明:');
  console.log('   启动服务: node start-with-manager.js');
  console.log('   停止服务: Ctrl+C 或发送 SIGTERM 信号');
  console.log('   查看状态: kill -USR1 <进程ID>');
  console.log('   健康检查: curl http://localhost:3007/health');
  console.log('');
  
  console.log('🔧 环境变量:');
  console.log('   SERVER_PORT - 服务器端口 (默认: 3007)');
  console.log('   NODE_ENV - 运行环境 (development/production)');
  console.log('   DB_HOST - 数据库主机');
  console.log('   DB_PORT - 数据库端口');
  console.log('   DB_USER - 数据库用户名');
  console.log('   DB_PASSWORD - 数据库密码');
  console.log('   DB_NAME - 数据库名称');
  console.log('');
};

// 主函数
const main = async () => {
  try {
    // 检查环境
    checkEnvironment();
    
    // 显示启动信息
    showStartupInfo();
    
    // 显示使用说明
    showUsageInfo();
    
    console.log('🚀 启动进程管理器...');
    console.log('按 Ctrl+C 停止服务');
    console.log('=' * 40);
    console.log('');
    
    // 创建并启动进程管理器
    const manager = new ProcessManager();
    manager.start();
    
    // 处理状态查询信号
    process.on('SIGUSR1', () => {
      console.log('\n📊 进程管理器状态:');
      const status = manager.getStatus();
      console.log(JSON.stringify(status, null, 2));
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ 启动失败:', error);
    process.exit(1);
  }
};

// 运行主函数
main();
