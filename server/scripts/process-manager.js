// 进程管理和自动重启脚本
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

class ProcessManager {
  constructor() {
    this.serverProcess = null;
    this.restartCount = 0;
    this.maxRestarts = 10; // 最大重启次数
    this.restartDelay = 5000; // 重启延迟（毫秒）
    this.healthCheckInterval = 30000; // 健康检查间隔
    this.healthCheckTimer = null;
    this.isShuttingDown = false;
    this.logFile = path.join(__dirname, '../logs/process-manager.log');
  }

  // 启动服务器
  start() {
    this.log('🚀 启动进程管理器...');
    this.startServer();
    this.startHealthCheck();
    this.setupSignalHandlers();
  }

  // 启动服务器进程
  startServer() {
    if (this.serverProcess) {
      this.log('⚠️ 服务器进程已存在，先停止现有进程');
      this.stopServer();
    }

    this.log('🔄 启动服务器进程...');
    
    const serverScript = path.join(__dirname, '../src/app.js');
    this.serverProcess = spawn('node', [serverScript], {
      stdio: ['inherit', 'pipe', 'pipe'],
      env: { ...process.env, NODE_ENV: process.env.NODE_ENV || 'production' }
    });

    // 记录进程ID
    this.log(`📍 服务器进程ID: ${this.serverProcess.pid}`);

    // 监听进程输出
    this.serverProcess.stdout.on('data', (data) => {
      const output = data.toString().trim();
      if (output) {
        console.log(`[SERVER] ${output}`);
        this.log(`[STDOUT] ${output}`);
      }
    });

    this.serverProcess.stderr.on('data', (data) => {
      const output = data.toString().trim();
      if (output) {
        console.error(`[SERVER ERROR] ${output}`);
        this.log(`[STDERR] ${output}`);
      }
    });

    // 监听进程退出
    this.serverProcess.on('exit', (code, signal) => {
      this.log(`❌ 服务器进程退出: code=${code}, signal=${signal}`);
      this.serverProcess = null;

      if (!this.isShuttingDown) {
        this.handleProcessExit(code, signal);
      }
    });

    this.serverProcess.on('error', (error) => {
      this.log(`❌ 服务器进程错误: ${error.message}`);
    });
  }

  // 处理进程退出
  handleProcessExit(code, signal) {
    if (this.restartCount >= this.maxRestarts) {
      this.log(`❌ 达到最大重启次数 (${this.maxRestarts})，停止自动重启`);
      this.log('💡 请检查服务器日志并手动修复问题');
      return;
    }

    this.restartCount++;
    this.log(`🔄 准备重启服务器 (${this.restartCount}/${this.maxRestarts})`);
    this.log(`⏰ ${this.restartDelay / 1000}秒后重启...`);

    setTimeout(() => {
      if (!this.isShuttingDown) {
        this.startServer();
      }
    }, this.restartDelay);
  }

  // 停止服务器进程
  stopServer() {
    if (this.serverProcess) {
      this.log('🛑 停止服务器进程...');
      this.serverProcess.kill('SIGTERM');
      
      // 如果10秒后还没退出，强制杀死
      setTimeout(() => {
        if (this.serverProcess) {
          this.log('⚠️ 强制杀死服务器进程');
          this.serverProcess.kill('SIGKILL');
        }
      }, 10000);
    }
  }

  // 启动健康检查
  startHealthCheck() {
    this.log('🏥 启动健康检查...');
    this.healthCheckTimer = setInterval(() => {
      this.performHealthCheck();
    }, this.healthCheckInterval);
  }

  // 执行健康检查
  async performHealthCheck() {
    if (!this.serverProcess || this.isShuttingDown) {
      return;
    }

    try {
      const isHealthy = await this.checkServerHealth();
      
      if (isHealthy) {
        // 重置重启计数器
        if (this.restartCount > 0) {
          this.log('✅ 服务器健康状态良好，重置重启计数器');
          this.restartCount = 0;
        }
      } else {
        this.log('⚠️ 健康检查失败，服务器可能存在问题');
        // 可以在这里添加更多的健康检查逻辑
      }
    } catch (error) {
      this.log(`❌ 健康检查出错: ${error.message}`);
    }
  }

  // 检查服务器健康状态
  checkServerHealth() {
    return new Promise((resolve) => {
      const port = process.env.SERVER_PORT || 3007;
      const options = {
        hostname: 'localhost',
        port: port,
        path: '/health',
        method: 'GET',
        timeout: 5000
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const healthData = JSON.parse(data);
            resolve(res.statusCode === 200 && healthData.status === 'OK');
          } catch {
            resolve(false);
          }
        });
      });

      req.on('error', () => {
        resolve(false);
      });

      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });

      req.end();
    });
  }

  // 设置信号处理器
  setupSignalHandlers() {
    const gracefulShutdown = (signal) => {
      this.log(`🛑 收到${signal}信号，开始优雅关闭...`);
      this.shutdown();
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
    // Windows下的关闭信号
    if (process.platform === 'win32') {
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      rl.on('SIGINT', () => gracefulShutdown('SIGINT'));
    }
  }

  // 关闭进程管理器
  shutdown() {
    if (this.isShuttingDown) {
      return;
    }

    this.isShuttingDown = true;
    this.log('🛑 开始关闭进程管理器...');

    // 停止健康检查
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }

    // 停止服务器进程
    this.stopServer();

    // 等待服务器进程退出
    setTimeout(() => {
      this.log('✅ 进程管理器已关闭');
      process.exit(0);
    }, 15000);
  }

  // 记录日志
  log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    
    console.log(logMessage);
    
    // 写入日志文件
    try {
      const logDir = path.dirname(this.logFile);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      fs.appendFileSync(this.logFile, logMessage + '\n');
    } catch (error) {
      console.error('写入日志失败:', error);
    }
  }

  // 获取状态信息
  getStatus() {
    return {
      serverRunning: !!this.serverProcess,
      serverPid: this.serverProcess ? this.serverProcess.pid : null,
      restartCount: this.restartCount,
      maxRestarts: this.maxRestarts,
      isShuttingDown: this.isShuttingDown
    };
  }
}

// 如果直接运行此脚本，启动进程管理器
if (require.main === module) {
  const manager = new ProcessManager();
  manager.start();
  
  // 提供状态查询接口
  process.on('SIGUSR1', () => {
    console.log('📊 进程管理器状态:', manager.getStatus());
  });
}

module.exports = ProcessManager;
