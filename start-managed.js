#!/usr/bin/env node

/**
 * AIMagic 项目快速启动脚本
 * 使用端口管理工具的简化版本
 */

const { spawn } = require('child_process');
const path = require('path');

// 直接启动端口管理启动器
const startScript = path.join(__dirname, 'scripts', 'start-with-port-management.js');

console.log('🚀 启动 AIMagic 项目 (端口管理模式)');
console.log('');

const child = spawn('node', [startScript, ...process.argv.slice(2)], {
  stdio: 'inherit',
  cwd: __dirname
});

child.on('error', (error) => {
  console.error('❌ 启动失败:', error.message);
  process.exit(1);
});

child.on('exit', (code) => {
  process.exit(code);
});
