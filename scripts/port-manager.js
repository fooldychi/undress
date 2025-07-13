#!/usr/bin/env node

/**
 * AIMagic 项目端口管理工具
 * 统一管理项目端口，防止端口冲突，强制使用指定端口
 */

const fs = require('fs');
const path = require('path');
const { spawn, exec } = require('child_process');
const os = require('os');

class PortManager {
  constructor() {
    this.configPath = path.join(__dirname, '../port-config.json');
    this.config = this.loadConfig();
    this.platform = os.platform();
  }

  /**
   * 加载端口配置
   */
  loadConfig() {
    try {
      const configData = fs.readFileSync(this.configPath, 'utf8');
      return JSON.parse(configData);
    } catch (error) {
      console.error('❌ 无法加载端口配置文件:', error.message);
      process.exit(1);
    }
  }

  /**
   * 检查端口是否被占用
   */
  async checkPortInUse(port) {
    return new Promise((resolve) => {
      const command = this.platform === 'win32'
        ? `netstat -ano | findstr :${port}`
        : `lsof -i :${port}`;

      exec(command, (error, stdout) => {
        if (error) {
          resolve(false); // 端口未被占用
        } else {
          resolve(stdout.trim().length > 0); // 有输出说明端口被占用
        }
      });
    });
  }

  /**
   * 获取占用端口的进程ID
   */
  async getPortProcessId(port) {
    return new Promise((resolve) => {
      const command = this.platform === 'win32'
        ? `netstat -ano | findstr :${port}`
        : `lsof -ti :${port}`;

      exec(command, (error, stdout) => {
        if (error || !stdout.trim()) {
          resolve(null);
          return;
        }

        if (this.platform === 'win32') {
          // Windows: 解析netstat输出获取PID
          const lines = stdout.trim().split('\n');
          for (const line of lines) {
            const parts = line.trim().split(/\s+/);
            if (parts.length >= 5) {
              const pid = parts[parts.length - 1];
              if (pid && !isNaN(pid)) {
                resolve(parseInt(pid));
                return;
              }
            }
          }
          resolve(null);
        } else {
          // Unix/Linux/Mac: lsof直接返回PID
          const pid = parseInt(stdout.trim().split('\n')[0]);
          resolve(isNaN(pid) ? null : pid);
        }
      });
    });
  }

  /**
   * 终止占用端口的进程
   */
  async killProcess(pid) {
    return new Promise((resolve) => {
      const command = this.platform === 'win32'
        ? `taskkill /PID ${pid} /F`
        : `kill -9 ${pid}`;

      exec(command, (error) => {
        resolve(!error);
      });
    });
  }

  /**
   * 检查并处理端口冲突
   */
  async handlePortConflict(serviceName, port) {
    const isInUse = await this.checkPortInUse(port);

    if (!isInUse) {
      console.log(`✅ 端口 ${port} (${serviceName}) 可用`);
      return true;
    }

    console.log(`⚠️ 端口 ${port} (${serviceName}) 被占用`);

    if (!this.config.rules.killConflictingProcesses) {
      console.log(`❌ 端口冲突处理已禁用，请手动处理端口 ${port} 的冲突`);
      return false;
    }

    const pid = await this.getPortProcessId(port);
    if (!pid) {
      console.log(`❌ 无法获取占用端口 ${port} 的进程ID`);
      return false;
    }

    console.log(`🔄 正在终止进程 ${pid} (占用端口 ${port})...`);
    const killed = await this.killProcess(pid);

    if (killed) {
      console.log(`✅ 成功终止进程 ${pid}，端口 ${port} 现在可用`);
      // 等待一秒确保端口释放
      await new Promise(resolve => setTimeout(resolve, 1000));
      return true;
    } else {
      console.log(`❌ 无法终止进程 ${pid}`);
      return false;
    }
  }

  /**
   * 验证所有端口
   */
  async validateAllPorts() {
    console.log('🔍 检查端口配置...\n');

    const results = {};

    for (const [serviceName, serviceConfig] of Object.entries(this.config.services)) {
      const port = serviceConfig.port;
      console.log(`📍 检查 ${serviceConfig.name} (端口 ${port})...`);

      const available = await this.handlePortConflict(serviceName, port);
      results[serviceName] = {
        port,
        available,
        config: serviceConfig
      };

      console.log('');
    }

    return results;
  }

  /**
   * 启动服务
   */
  async startService(serviceName) {
    const serviceConfig = this.config.services[serviceName];
    if (!serviceConfig) {
      console.error(`❌ 未找到服务配置: ${serviceName}`);
      return false;
    }

    console.log(`🚀 启动 ${serviceConfig.name}...`);

    // 检查端口
    const available = await this.handlePortConflict(serviceName, serviceConfig.port);
    if (!available) {
      console.error(`❌ 端口 ${serviceConfig.port} 不可用，无法启动 ${serviceConfig.name}`);
      return false;
    }

    // 启动服务
    const cwd = path.join(__dirname, '..', serviceConfig.directory);
    const [command, ...args] = serviceConfig.startCommand.split(' ');

    console.log(`📂 工作目录: ${cwd}`);
    console.log(`⚡ 执行命令: ${serviceConfig.startCommand}`);
    console.log(`🌐 访问地址: ${serviceConfig.url}\n`);

    const child = spawn(command, args, {
      cwd,
      stdio: 'inherit',
      shell: true
    });

    child.on('error', (error) => {
      console.error(`❌ 启动 ${serviceConfig.name} 失败:`, error.message);
    });

    return child;
  }

  /**
   * 显示端口状态报告
   */
  async showPortStatus() {
    console.log('📊 AIMagic 项目端口状态报告');
    console.log('='.repeat(50));
    console.log('');

    for (const [serviceName, serviceConfig] of Object.entries(this.config.services)) {
      const port = serviceConfig.port;
      const isInUse = await this.checkPortInUse(port);
      const status = isInUse ? '🔴 占用' : '🟢 可用';

      console.log(`${serviceConfig.name}:`);
      console.log(`  端口: ${port}`);
      console.log(`  状态: ${status}`);
      console.log(`  访问: ${serviceConfig.url}`);
      console.log('');
    }
  }

  /**
   * 显示帮助信息
   */
  showHelp() {
    console.log('🛠️ AIMagic 端口管理工具');
    console.log('');
    console.log('用法:');
    console.log('  node scripts/port-manager.js <命令> [选项]');
    console.log('');
    console.log('命令:');
    console.log('  check          检查所有端口状态');
    console.log('  validate       验证并处理端口冲突');
    console.log('  start <服务>   启动指定服务 (client|admin|server)');
    console.log('  status         显示端口状态报告');
    console.log('  help           显示帮助信息');
    console.log('');
    console.log('示例:');
    console.log('  node scripts/port-manager.js validate');
    console.log('  node scripts/port-manager.js start server');
    console.log('  node scripts/port-manager.js status');
  }
}

// 主函数
async function main() {
  const manager = new PortManager();
  const command = process.argv[2];
  const service = process.argv[3];

  switch (command) {
    case 'check':
    case 'validate':
      await manager.validateAllPorts();
      break;

    case 'start':
      if (!service) {
        console.error('❌ 请指定要启动的服务: client, admin, 或 server');
        process.exit(1);
      }
      await manager.startService(service);
      break;

    case 'status':
      await manager.showPortStatus();
      break;

    case 'help':
    default:
      manager.showHelp();
      break;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch(console.error);
}

module.exports = PortManager;
