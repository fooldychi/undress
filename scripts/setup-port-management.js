#!/usr/bin/env node

/**
 * AIMagic 端口管理系统安装脚本
 * 设置 Git hooks 和配置验证
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class PortManagementSetup {
  constructor() {
    this.projectRoot = path.join(__dirname, '..');
    this.gitHooksDir = path.join(this.projectRoot, '.git', 'hooks');
    this.customHooksDir = path.join(this.projectRoot, '.githooks');
  }

  // 安装 Git hooks
  setupGitHooks() {
    console.log('🔧 设置 Git hooks...');

    // 确保 .git/hooks 目录存在
    if (!fs.existsSync(this.gitHooksDir)) {
      console.log('⚠️ .git/hooks 目录不存在，可能不是 Git 仓库');
      return false;
    }

    // 复制 pre-commit hook
    const sourceHook = path.join(this.customHooksDir, 'pre-commit');
    const targetHook = path.join(this.gitHooksDir, 'pre-commit');

    if (fs.existsSync(sourceHook)) {
      fs.copyFileSync(sourceHook, targetHook);
      
      // 在 Unix 系统上设置执行权限
      if (process.platform !== 'win32') {
        fs.chmodSync(targetHook, '755');
      }
      
      console.log('✅ Pre-commit hook 已安装');
      return true;
    } else {
      console.log('❌ Pre-commit hook 源文件不存在');
      return false;
    }
  }

  // 验证端口配置
  async validatePortConfig() {
    console.log('🔍 验证端口配置...');

    try {
      const PortConfigManager = require('./port-config-manager.js');
      const manager = new PortConfigManager();
      
      const issues = await manager.checkPortConsistency();
      
      if (issues.length === 0) {
        console.log('✅ 端口配置验证通过');
        return true;
      } else {
        console.log('❌ 发现端口配置问题:');
        issues.forEach(issue => {
          const icon = issue.severity === 'error' ? '❌' : '⚠️';
          console.log(`${icon} ${issue.file}: ${issue.issue}`);
        });
        
        console.log('\n🔧 尝试自动修复...');
        const fixes = await manager.fixPortConfiguration();
        
        if (fixes.length > 0) {
          console.log(`✅ 已修复 ${fixes.length} 个配置问题`);
          return true;
        } else {
          console.log('❌ 自动修复失败，请手动检查');
          return false;
        }
      }
    } catch (error) {
      console.error('❌ 端口配置验证失败:', error.message);
      return false;
    }
  }

  // 创建快捷命令
  createShortcuts() {
    console.log('🔧 创建快捷命令...');

    const packageJsonPath = path.join(this.projectRoot, 'package.json');
    
    if (!fs.existsSync(packageJsonPath)) {
      console.log('⚠️ package.json 不存在，跳过快捷命令创建');
      return;
    }

    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      // 添加端口管理相关的脚本
      if (!packageJson.scripts) {
        packageJson.scripts = {};
      }

      const portScripts = {
        'port:check': 'node scripts/port-config-manager.js check',
        'port:fix': 'node scripts/port-config-manager.js fix',
        'port:report': 'node scripts/port-config-manager.js report',
        'port:availability': 'node scripts/port-config-manager.js availability',
        'setup:ports': 'node scripts/setup-port-management.js'
      };

      let added = 0;
      for (const [script, command] of Object.entries(portScripts)) {
        if (!packageJson.scripts[script]) {
          packageJson.scripts[script] = command;
          added++;
        }
      }

      if (added > 0) {
        fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
        console.log(`✅ 已添加 ${added} 个端口管理快捷命令`);
        
        console.log('\n📋 可用的快捷命令:');
        Object.keys(portScripts).forEach(script => {
          console.log(`  npm run ${script}`);
        });
      } else {
        console.log('✅ 快捷命令已存在');
      }
    } catch (error) {
      console.error('❌ 创建快捷命令失败:', error.message);
    }
  }

  // 生成配置报告
  async generateSetupReport() {
    console.log('\n📊 生成安装报告...');

    try {
      const PortConfigManager = require('./port-config-manager.js');
      const manager = new PortConfigManager();
      
      const report = await manager.generateReport();
      
      console.log('\n📋 端口配置状态:');
      console.log(`   标准端口: 客户端(${report.standardPorts.client}) 管理后台(${report.standardPorts.admin}) 服务器(${report.standardPorts.server})`);
      console.log(`   配置问题: ${report.summary.totalIssues} 个 (错误: ${report.summary.errorCount}, 警告: ${report.summary.warningCount})`);
      console.log(`   端口占用: ${report.summary.portsOccupied} 个`);
      
      if (report.summary.totalIssues === 0) {
        console.log('✅ 端口配置完全正确');
      } else {
        console.log('⚠️ 存在配置问题，建议运行: npm run port:fix');
      }

      // 保存详细报告
      const reportPath = path.join(this.projectRoot, 'port-config-report.json');
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(`📄 详细报告已保存到: ${reportPath}`);
      
    } catch (error) {
      console.error('❌ 生成报告失败:', error.message);
    }
  }

  // 主安装流程
  async install() {
    console.log('🚀 开始安装 AIMagic 端口管理系统...\n');

    let success = true;

    // 1. 设置 Git hooks
    if (!this.setupGitHooks()) {
      success = false;
    }

    // 2. 验证端口配置
    if (!await this.validatePortConfig()) {
      success = false;
    }

    // 3. 创建快捷命令
    this.createShortcuts();

    // 4. 生成安装报告
    await this.generateSetupReport();

    console.log('\n' + '='.repeat(60));
    
    if (success) {
      console.log('🎉 端口管理系统安装完成！');
      console.log('\n💡 使用指南:');
      console.log('  - 检查配置: npm run port:check');
      console.log('  - 修复问题: npm run port:fix');
      console.log('  - 查看报告: npm run port:report');
      console.log('  - 查看规则: cat PORT_CONFIG_RULES.md');
      console.log('\n⚠️ 重要提醒:');
      console.log('  - 端口配置修改需要团队讨论');
      console.log('  - 提交前会自动检查端口配置');
      console.log('  - 遇到问题请查阅 PORT_CONFIG_RULES.md');
    } else {
      console.log('❌ 端口管理系统安装遇到问题');
      console.log('\n🔧 建议操作:');
      console.log('  1. 检查是否在 Git 仓库中');
      console.log('  2. 运行: npm run port:fix');
      console.log('  3. 查看详细错误信息');
      console.log('  4. 参考 PORT_CONFIG_RULES.md');
    }
  }

  // 卸载端口管理系统
  uninstall() {
    console.log('🗑️ 卸载端口管理系统...');

    // 移除 Git hook
    const targetHook = path.join(this.gitHooksDir, 'pre-commit');
    if (fs.existsSync(targetHook)) {
      fs.unlinkSync(targetHook);
      console.log('✅ Pre-commit hook 已移除');
    }

    // 移除快捷命令（可选）
    console.log('⚠️ 快捷命令保留在 package.json 中，如需移除请手动删除');
    
    console.log('✅ 卸载完成');
  }
}

// CLI 接口
async function main() {
  const setup = new PortManagementSetup();
  const command = process.argv[2];

  switch (command) {
    case 'install':
    case undefined:
      await setup.install();
      break;
      
    case 'uninstall':
      setup.uninstall();
      break;
      
    case 'hooks':
      setup.setupGitHooks();
      break;
      
    case 'shortcuts':
      setup.createShortcuts();
      break;
      
    default:
      console.log(`
AIMagic 端口管理系统安装器

用法:
  node scripts/setup-port-management.js [command]

命令:
  install     完整安装端口管理系统 (默认)
  uninstall   卸载端口管理系统
  hooks       仅安装 Git hooks
  shortcuts   仅创建快捷命令

示例:
  node scripts/setup-port-management.js install
  npm run setup:ports
      `);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = PortManagementSetup;
