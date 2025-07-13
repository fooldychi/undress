#!/usr/bin/env node

/**
 * 端口配置同步工具
 * 确保所有配置文件中的端口设置与 port-config.json 保持一致
 */

const fs = require('fs');
const path = require('path');

class PortConfigSyncer {
  constructor() {
    this.projectRoot = path.join(__dirname, '..');
    this.portConfigPath = path.join(this.projectRoot, 'port-config.json');
    this.portConfig = this.loadPortConfig();
  }

  /**
   * 加载端口配置
   */
  loadPortConfig() {
    try {
      const configData = fs.readFileSync(this.portConfigPath, 'utf8');
      return JSON.parse(configData);
    } catch (error) {
      console.error('❌ 无法加载端口配置文件:', error.message);
      process.exit(1);
    }
  }

  /**
   * 同步环境变量文件
   */
  syncEnvFiles() {
    const envFiles = ['.env.example'];
    
    for (const envFile of envFiles) {
      const envPath = path.join(this.projectRoot, envFile);
      
      if (!fs.existsSync(envPath)) {
        console.log(`⚠️ 环境变量文件不存在: ${envFile}`);
        continue;
      }

      let content = fs.readFileSync(envPath, 'utf8');
      let modified = false;

      // 更新端口配置
      const portMappings = {
        'CLIENT_PORT': this.portConfig.ports.client,
        'VITE_CLIENT_PORT': this.portConfig.ports.client,
        'ADMIN_PORT': this.portConfig.ports.admin,
        'VITE_ADMIN_PORT': this.portConfig.ports.admin,
        'SERVER_PORT': this.portConfig.ports.server,
        'VITE_SERVER_PORT': this.portConfig.ports.server,
        'PORT': this.portConfig.ports.server
      };

      for (const [key, value] of Object.entries(portMappings)) {
        const pattern = new RegExp(`^${key}=.*$`, 'm');
        const replacement = `${key}=${value}`;
        
        if (pattern.test(content)) {
          const oldContent = content;
          content = content.replace(pattern, replacement);
          if (content !== oldContent) {
            modified = true;
          }
        }
      }

      if (modified) {
        fs.writeFileSync(envPath, content);
        console.log(`✅ 已同步环境变量文件: ${envFile}`);
      } else {
        console.log(`✓ 环境变量文件已是最新: ${envFile}`);
      }
    }
  }

  /**
   * 同步Vite配置文件
   */
  syncViteConfigs() {
    const viteConfigs = [
      { file: 'client/vite.config.js', service: 'client' },
      { file: 'admin/vite.config.js', service: 'admin' }
    ];

    for (const { file, service } of viteConfigs) {
      const configPath = path.join(this.projectRoot, file);
      
      if (!fs.existsSync(configPath)) {
        console.log(`⚠️ Vite配置文件不存在: ${file}`);
        continue;
      }

      let content = fs.readFileSync(configPath, 'utf8');
      let modified = false;

      // 检查是否使用了环境变量配置
      const hasEnvConfig = content.includes('loadEnv') && 
                          content.includes(`${service.toUpperCase()}_PORT`) &&
                          content.includes('SERVER_PORT');

      if (hasEnvConfig) {
        console.log(`✓ Vite配置文件使用环境变量: ${file}`);
      } else {
        console.log(`⚠️ Vite配置文件未使用环境变量: ${file}`);
        console.log(`   建议使用环境变量配置以避免硬编码端口`);
      }
    }
  }

  /**
   * 检查package.json脚本
   */
  checkPackageScripts() {
    const packageFiles = [
      'package.json',
      'client/package.json',
      'admin/package.json',
      'server/package.json'
    ];

    for (const packageFile of packageFiles) {
      const packagePath = path.join(this.projectRoot, packageFile);
      
      if (!fs.existsSync(packagePath)) {
        continue;
      }

      const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      
      if (packageData.scripts) {
        const scripts = JSON.stringify(packageData.scripts, null, 2);
        
        // 检查是否有硬编码端口
        const hardcodedPorts = ['3001', '3002', '3003', '3006', '3007', '3009'];
        const foundHardcoded = hardcodedPorts.some(port => scripts.includes(port));
        
        if (foundHardcoded) {
          console.log(`⚠️ 在 ${packageFile} 的脚本中发现可能的硬编码端口`);
        } else {
          console.log(`✓ ${packageFile} 脚本配置正常`);
        }
      }
    }
  }

  /**
   * 验证配置一致性
   */
  validateConsistency() {
    console.log('🔍 验证端口配置一致性...');
    console.log('');

    const issues = [];

    // 检查端口配置文件
    const expectedPorts = {
      client: 3001,
      admin: 3003,
      server: 3007
    };

    for (const [service, expectedPort] of Object.entries(expectedPorts)) {
      const actualPort = this.portConfig.ports[service];
      if (actualPort !== expectedPort) {
        issues.push({
          type: 'port_mismatch',
          service,
          expected: expectedPort,
          actual: actualPort,
          file: 'port-config.json'
        });
      }
    }

    // 检查服务配置
    for (const [serviceName, serviceConfig] of Object.entries(this.portConfig.services)) {
      const expectedPort = this.portConfig.ports[serviceName];
      if (serviceConfig.port !== expectedPort) {
        issues.push({
          type: 'service_port_mismatch',
          service: serviceName,
          expected: expectedPort,
          actual: serviceConfig.port,
          file: 'port-config.json'
        });
      }
    }

    if (issues.length === 0) {
      console.log('✅ 端口配置一致性验证通过');
      return true;
    }

    console.log('❌ 发现配置不一致问题:');
    issues.forEach(issue => {
      console.log(`\n🚨 ${issue.type}:`);
      console.log(`   服务: ${issue.service}`);
      console.log(`   期望端口: ${issue.expected}`);
      console.log(`   实际端口: ${issue.actual}`);
      console.log(`   文件: ${issue.file}`);
    });

    return false;
  }

  /**
   * 执行完整同步
   */
  syncAll() {
    console.log('🔄 开始端口配置同步...');
    console.log('');

    // 验证配置一致性
    if (!this.validateConsistency()) {
      console.log('\n❌ 配置不一致，请先修复 port-config.json');
      return false;
    }

    // 同步各种配置文件
    this.syncEnvFiles();
    console.log('');
    
    this.syncViteConfigs();
    console.log('');
    
    this.checkPackageScripts();
    console.log('');

    console.log('✅ 端口配置同步完成');
    return true;
  }

  /**
   * 显示当前配置状态
   */
  showStatus() {
    console.log('📊 当前端口配置状态');
    console.log('='.repeat(40));
    console.log('');

    console.log('🔧 配置的端口:');
    Object.entries(this.portConfig.ports).forEach(([service, port]) => {
      const serviceConfig = this.portConfig.services[service];
      console.log(`  ${serviceConfig.name}: ${port}`);
    });

    console.log('');
    console.log('📁 配置文件:');
    console.log(`  主配置: port-config.json`);
    console.log(`  环境变量: .env.example`);
    console.log(`  客户端: client/vite.config.js`);
    console.log(`  后台管理: admin/vite.config.js`);
    console.log(`  后端: server/src/app.js`);
  }

  /**
   * 显示帮助信息
   */
  showHelp() {
    console.log('🔄 端口配置同步工具');
    console.log('');
    console.log('用法:');
    console.log('  node scripts/sync-port-config.js <命令>');
    console.log('');
    console.log('命令:');
    console.log('  sync       同步所有配置文件');
    console.log('  validate   验证配置一致性');
    console.log('  status     显示当前配置状态');
    console.log('  env        同步环境变量文件');
    console.log('  vite       检查Vite配置文件');
    console.log('  help       显示帮助信息');
    console.log('');
    console.log('示例:');
    console.log('  node scripts/sync-port-config.js sync');
    console.log('  node scripts/sync-port-config.js validate');
  }
}

// 主函数
async function main() {
  const syncer = new PortConfigSyncer();
  const command = process.argv[2] || 'sync';

  switch (command) {
    case 'sync':
      const success = syncer.syncAll();
      process.exit(success ? 0 : 1);
      break;
      
    case 'validate':
      const valid = syncer.validateConsistency();
      process.exit(valid ? 0 : 1);
      break;
      
    case 'status':
      syncer.showStatus();
      break;
      
    case 'env':
      syncer.syncEnvFiles();
      break;
      
    case 'vite':
      syncer.syncViteConfigs();
      break;
      
    case 'help':
    default:
      syncer.showHelp();
      break;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch(console.error);
}

module.exports = PortConfigSyncer;
