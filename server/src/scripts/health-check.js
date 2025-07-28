#!/usr/bin/env node

/**
 * AIMagic 后端服务健康检查脚本
 * 用于检查服务运行状态和数据库连接
 */

const http = require('http');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.production' });

// 配置
const CONFIG = {
  server: {
    host: 'localhost',
    port: process.env.PORT || 3007,
    timeout: 5000
  },
  database: {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  }
};

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// 检查HTTP服务
async function checkHttpService() {
  return new Promise((resolve) => {
    const options = {
      hostname: CONFIG.server.host,
      port: CONFIG.server.port,
      path: '/api/health',
      method: 'GET',
      timeout: CONFIG.server.timeout
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve({ success: true, data: data });
        } else {
          resolve({ success: false, error: `HTTP ${res.statusCode}` });
        }
      });
    });

    req.on('error', (error) => {
      resolve({ success: false, error: error.message });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ success: false, error: 'Request timeout' });
    });

    req.end();
  });
}

// 检查数据库连接
async function checkDatabase() {
  try {
    const connection = await mysql.createConnection(CONFIG.database);
    await connection.execute('SELECT 1');
    await connection.end();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// 检查磁盘空间
async function checkDiskSpace() {
  const { execSync } = require('child_process');
  try {
    const output = execSync('df -h /', { encoding: 'utf8' });
    const lines = output.trim().split('\n');
    const data = lines[1].split(/\s+/);
    const usage = data[4];
    const usagePercent = parseInt(usage.replace('%', ''));
    
    return {
      success: usagePercent < 90,
      usage: usage,
      warning: usagePercent > 80
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// 检查内存使用
function checkMemoryUsage() {
  const used = process.memoryUsage();
  const total = require('os').totalmem();
  const free = require('os').freemem();
  const usagePercent = ((total - free) / total * 100).toFixed(2);
  
  return {
    success: usagePercent < 90,
    usage: `${usagePercent}%`,
    details: {
      rss: Math.round(used.rss / 1024 / 1024 * 100) / 100,
      heapTotal: Math.round(used.heapTotal / 1024 / 1024 * 100) / 100,
      heapUsed: Math.round(used.heapUsed / 1024 / 1024 * 100) / 100,
      external: Math.round(used.external / 1024 / 1024 * 100) / 100
    }
  };
}

// 主检查函数
async function runHealthCheck() {
  log('==========================================', 'blue');
  log('       AIMagic 服务健康检查', 'blue');
  log('==========================================', 'blue');
  log(`检查时间: ${new Date().toLocaleString()}`);
  log('');

  let allPassed = true;

  // 检查HTTP服务
  log('🌐 检查HTTP服务...', 'blue');
  const httpResult = await checkHttpService();
  if (httpResult.success) {
    log('✅ HTTP服务正常', 'green');
  } else {
    log(`❌ HTTP服务异常: ${httpResult.error}`, 'red');
    allPassed = false;
  }

  // 检查数据库
  log('🗄️  检查数据库连接...', 'blue');
  const dbResult = await checkDatabase();
  if (dbResult.success) {
    log('✅ 数据库连接正常', 'green');
  } else {
    log(`❌ 数据库连接异常: ${dbResult.error}`, 'red');
    allPassed = false;
  }

  // 检查磁盘空间
  log('💾 检查磁盘空间...', 'blue');
  const diskResult = await checkDiskSpace();
  if (diskResult.success) {
    if (diskResult.warning) {
      log(`⚠️  磁盘空间警告: ${diskResult.usage}`, 'yellow');
    } else {
      log(`✅ 磁盘空间正常: ${diskResult.usage}`, 'green');
    }
  } else {
    log(`❌ 磁盘空间检查失败: ${diskResult.error}`, 'red');
    allPassed = false;
  }

  // 检查内存使用
  log('🧠 检查内存使用...', 'blue');
  const memResult = checkMemoryUsage();
  if (memResult.success) {
    log(`✅ 内存使用正常: ${memResult.usage}`, 'green');
  } else {
    log(`⚠️  内存使用过高: ${memResult.usage}`, 'yellow');
  }

  log('');
  log('==========================================', 'blue');
  if (allPassed) {
    log('🎉 所有检查通过，服务运行正常！', 'green');
  } else {
    log('⚠️  发现问题，请检查服务状态！', 'red');
  }
  log('==========================================', 'blue');

  // 返回退出码
  process.exit(allPassed ? 0 : 1);
}

// 运行健康检查
if (require.main === module) {
  runHealthCheck().catch((error) => {
    log(`健康检查失败: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = { runHealthCheck };
