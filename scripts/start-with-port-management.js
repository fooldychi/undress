#!/usr/bin/env node

/**
 * AIMagic 项目统一启动脚本
 * 使用端口管理工具确保端口配置正确
 */

const PortManager = require('./port-manager');
const { spawn } = require('child_process');
const path = require('path');

class ProjectStarter {
  constructor() {
    this.portManager = new PortManager();
    this.processes = new Map();
  }

  /**
   * 启动所有服务
   */
  async startAll() {
    console.log('🚀 AIMagic 项目启动器');
    console.log('='.repeat(40));
    console.log('');

    // 首先验证所有端口
    console.log('第一步: 验证端口配置...');
    const portResults = await this.portManager.validateAllPorts();

    // 检查是否所有端口都可用
    const unavailablePorts = Object.entries(portResults)
      .filter(([_, result]) => !result.available);

    if (unavailablePorts.length > 0) {
      console.error('❌ 以下端口不可用:');
      unavailablePorts.forEach(([service, result]) => {
        console.error(`  - ${result.config.name}: 端口 ${result.port}`);
      });
      console.error('\n请解决端口冲突后重试。');
      process.exit(1);
    }

    console.log('✅ 所有端口验证通过！\n');

    // 按顺序启动服务
    const startOrder = ['server', 'client', 'admin'];

    for (const serviceName of startOrder) {
      await this.startServiceWithDelay(serviceName);
    }

    // 显示启动完成信息
    this.showStartupComplete();

    // 设置进程退出处理
    this.setupExitHandlers();
  }

  /**
   * 启动单个服务并等待
   */
  async startServiceWithDelay(serviceName) {
    const serviceConfig = this.portManager.config.services[serviceName];

    console.log(`🔄 启动 ${serviceConfig.name}...`);

    const cwd = path.join(__dirname, '..', serviceConfig.directory);
    const [command, ...args] = serviceConfig.startCommand.split(' ');

    const child = spawn(command, args, {
      cwd,
      stdio: ['inherit', 'pipe', 'pipe'],
      shell: true
    });

    // 存储进程引用
    this.processes.set(serviceName, {
      process: child,
      config: serviceConfig
    });

    // 监听进程输出
    child.stdout.on('data', (data) => {
      const output = data.toString().trim();
      if (output) {
        console.log(`[${serviceConfig.name}] ${output}`);
      }
    });

    child.stderr.on('data', (data) => {
      const output = data.toString().trim();
      if (output) {
        console.error(`[${serviceConfig.name}] ${output}`);
      }
    });

    child.on('error', (error) => {
      console.error(`❌ ${serviceConfig.name} 启动失败:`, error.message);
    });

    child.on('exit', (code) => {
      if (code !== 0) {
        console.error(`❌ ${serviceConfig.name} 异常退出，代码: ${code}`);
      }
      this.processes.delete(serviceName);
    });

    // 等待服务启动
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log(`✅ ${serviceConfig.name} 启动完成`);
    console.log(`🌐 访问地址: ${serviceConfig.url}\n`);
  }

  /**
   * 显示启动完成信息
   */
  showStartupComplete() {
    console.log('🎉 所有服务启动完成！');
    console.log('='.repeat(40));
    console.log('');
    console.log('📍 访问地址:');

    Object.entries(this.portManager.config.services).forEach(([_, config]) => {
      console.log(`  ${config.name}: ${config.url}`);
    });

    console.log('');
    console.log('💡 提示:');
    console.log('  - 按 Ctrl+C 停止所有服务');
    console.log('  - 建议按以下顺序访问: 后端API → 客户端 → 后台管理');
    console.log('');
    console.log('🔧 端口管理:');
    console.log('  - 所有端口都已通过端口管理工具验证');
    console.log('  - 如遇端口冲突，工具会自动处理');
    console.log('');
  }

  /**
   * 设置退出处理程序
   */
  setupExitHandlers() {
    const cleanup = () => {
      console.log('\n🛑 正在停止所有服务...');

      this.processes.forEach((serviceInfo, serviceName) => {
        console.log(`⏹️ 停止 ${serviceInfo.config.name}...`);
        try {
          serviceInfo.process.kill('SIGTERM');
        } catch (error) {
          console.error(`❌ 停止 ${serviceInfo.config.name} 失败:`, error.message);
        }
      });

      setTimeout(() => {
        console.log('✅ 所有服务已停止');
        process.exit(0);
      }, 2000);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    process.on('exit', cleanup);
  }

  /**
   * 启动单个服务
   */
  async startSingle(serviceName) {
    console.log(`🚀 启动 ${serviceName} 服务`);
    console.log('='.repeat(30));
    console.log('');

    // 验证端口
    const available = await this.portManager.handlePortConflict(
      serviceName,
      this.portManager.config.services[serviceName].port
    );

    if (!available) {
      console.error(`❌ 端口冲突，无法启动 ${serviceName}`);
      process.exit(1);
    }

    // 启动服务
    await this.startServiceWithDelay(serviceName);

    console.log('✅ 服务启动完成！');
    console.log('按 Ctrl+C 停止服务');

    // 设置退出处理
    this.setupExitHandlers();

    // 保持进程运行
    process.stdin.resume();
  }

  /**
   * 显示帮助信息
   */
  showHelp() {
    console.log('🛠️ AIMagic 项目启动器');
    console.log('');
    console.log('用法:');
    console.log('  node scripts/start-with-port-management.js [命令] [服务]');
    console.log('');
    console.log('命令:');
    console.log('  all            启动所有服务 (默认)');
    console.log('  single <服务>  启动单个服务');
    console.log('  help           显示帮助信息');
    console.log('');
    console.log('服务:');
    console.log('  server         后端API服务 (端口 3007)');
    console.log('  client         客户端前端 (端口 3001)');
    console.log('  admin          后台管理系统 (端口 3003)');
    console.log('');
    console.log('示例:');
    console.log('  node scripts/start-with-port-management.js');
    console.log('  node scripts/start-with-port-management.js all');
    console.log('  node scripts/start-with-port-management.js single server');
    console.log('');
    console.log('特性:');
    console.log('  ✅ 自动检测端口冲突');
    console.log('  ✅ 自动终止冲突进程');
    console.log('  ✅ 强制使用指定端口');
    console.log('  ✅ 统一启动管理');
  }
}

// 主函数
async function main() {
  const starter = new ProjectStarter();
  const command = process.argv[2] || 'all';
  const service = process.argv[3];

  try {
    switch (command) {
      case 'all':
        await starter.startAll();
        break;

      case 'single':
        if (!service) {
          console.error('❌ 请指定要启动的服务: server, client, 或 admin');
          process.exit(1);
        }
        if (!starter.portManager.config.services[service]) {
          console.error(`❌ 未知服务: ${service}`);
          process.exit(1);
        }
        await starter.startSingle(service);
        break;

      case 'help':
      default:
        starter.showHelp();
        break;
    }
  } catch (error) {
    console.error('❌ 启动失败:', error.message);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = ProjectStarter;
