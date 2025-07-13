#!/usr/bin/env node

/**
 * Git钩子安装工具
 * 安装pre-commit钩子来保护端口配置文件
 */

const fs = require('fs');
const path = require('path');

class GitHookInstaller {
  constructor() {
    this.projectRoot = path.join(__dirname, '..');
    this.gitHooksDir = path.join(this.projectRoot, '.git', 'hooks');
  }

  /**
   * 检查Git仓库是否存在
   */
  checkGitRepo() {
    const gitDir = path.join(this.projectRoot, '.git');
    return fs.existsSync(gitDir);
  }

  /**
   * 创建pre-commit钩子
   */
  createPreCommitHook() {
    const hookPath = path.join(this.gitHooksDir, 'pre-commit');
    
    const hookContent = `#!/bin/sh
#
# AIMagic 端口配置保护钩子
# 在提交前检查端口配置文件的完整性
#

echo "🔍 检查端口配置文件..."

# 检查端口配置保护
if [ -f "scripts/protect-port-config.js" ]; then
    node scripts/protect-port-config.js check
    if [ $? -ne 0 ]; then
        echo "❌ 端口配置检查失败，提交被阻止"
        echo "💡 请运行以下命令修复问题:"
        echo "   node scripts/protect-port-config.js fix"
        echo "   node scripts/sync-port-config.js sync"
        exit 1
    fi
else
    echo "⚠️ 端口配置保护工具不存在，跳过检查"
fi

# 检查配置同步
if [ -f "scripts/sync-port-config.js" ]; then
    node scripts/sync-port-config.js validate
    if [ $? -ne 0 ]; then
        echo "❌ 端口配置同步检查失败，提交被阻止"
        echo "💡 请运行以下命令修复问题:"
        echo "   node scripts/sync-port-config.js sync"
        exit 1
    fi
else
    echo "⚠️ 端口配置同步工具不存在，跳过检查"
fi

echo "✅ 端口配置检查通过"
exit 0
`;

    fs.writeFileSync(hookPath, hookContent);
    
    // 在Unix系统上设置执行权限
    if (process.platform !== 'win32') {
      fs.chmodSync(hookPath, '755');
    }

    console.log('✅ pre-commit钩子已安装');
  }

  /**
   * 创建commit-msg钩子
   */
  createCommitMsgHook() {
    const hookPath = path.join(this.gitHooksDir, 'commit-msg');
    
    const hookContent = `#!/bin/sh
#
# AIMagic 提交消息检查钩子
# 检查是否修改了端口配置相关文件
#

commit_msg_file="$1"
commit_msg=$(cat "$commit_msg_file")

# 检查是否修改了端口配置文件
port_config_files="port-config.json scripts/port-manager.js scripts/start-with-port-management.js"
modified_port_files=""

for file in $port_config_files; do
    if git diff --cached --name-only | grep -q "^$file$"; then
        modified_port_files="$modified_port_files $file"
    fi
done

# 如果修改了端口配置文件，要求在提交消息中说明
if [ -n "$modified_port_files" ]; then
    if ! echo "$commit_msg" | grep -qi "port\\|端口"; then
        echo "❌ 检测到端口配置文件被修改，但提交消息中未说明原因"
        echo "📁 修改的文件:$modified_port_files"
        echo "💡 请在提交消息中包含 'port' 或 '端口' 关键词说明修改原因"
        exit 1
    fi
    
    echo "⚠️ 检测到端口配置文件被修改:$modified_port_files"
    echo "✅ 提交消息包含端口相关说明"
fi

exit 0
`;

    fs.writeFileSync(hookPath, hookContent);
    
    // 在Unix系统上设置执行权限
    if (process.platform !== 'win32') {
      fs.chmodSync(hookPath, '755');
    }

    console.log('✅ commit-msg钩子已安装');
  }

  /**
   * 安装所有钩子
   */
  installHooks() {
    if (!this.checkGitRepo()) {
      console.log('❌ 当前目录不是Git仓库，无法安装Git钩子');
      return false;
    }

    if (!fs.existsSync(this.gitHooksDir)) {
      fs.mkdirSync(this.gitHooksDir, { recursive: true });
    }

    console.log('🔧 安装Git钩子...');
    
    this.createPreCommitHook();
    this.createCommitMsgHook();
    
    console.log('');
    console.log('✅ Git钩子安装完成');
    console.log('');
    console.log('📋 已安装的钩子:');
    console.log('  - pre-commit: 提交前检查端口配置');
    console.log('  - commit-msg: 检查端口配置修改说明');
    console.log('');
    console.log('💡 这些钩子将帮助保护端口配置文件不被意外修改');
    
    return true;
  }

  /**
   * 卸载钩子
   */
  uninstallHooks() {
    const hooks = ['pre-commit', 'commit-msg'];
    let removed = 0;

    for (const hook of hooks) {
      const hookPath = path.join(this.gitHooksDir, hook);
      if (fs.existsSync(hookPath)) {
        fs.unlinkSync(hookPath);
        console.log(`✅ 已删除 ${hook} 钩子`);
        removed++;
      }
    }

    if (removed === 0) {
      console.log('ℹ️ 没有找到需要删除的钩子');
    } else {
      console.log(`✅ 已删除 ${removed} 个钩子`);
    }
  }

  /**
   * 检查钩子状态
   */
  checkHookStatus() {
    console.log('📊 Git钩子状态');
    console.log('='.repeat(30));
    
    if (!this.checkGitRepo()) {
      console.log('❌ 当前目录不是Git仓库');
      return;
    }

    const hooks = ['pre-commit', 'commit-msg'];
    
    for (const hook of hooks) {
      const hookPath = path.join(this.gitHooksDir, hook);
      const exists = fs.existsSync(hookPath);
      const status = exists ? '✅ 已安装' : '❌ 未安装';
      
      console.log(`${hook}: ${status}`);
      
      if (exists) {
        const stats = fs.statSync(hookPath);
        const isExecutable = (stats.mode & parseInt('111', 8)) !== 0;
        if (!isExecutable && process.platform !== 'win32') {
          console.log(`  ⚠️ 钩子文件不可执行`);
        }
      }
    }
  }

  /**
   * 显示帮助信息
   */
  showHelp() {
    console.log('🪝 Git钩子安装工具');
    console.log('');
    console.log('用法:');
    console.log('  node scripts/install-git-hooks.js <命令>');
    console.log('');
    console.log('命令:');
    console.log('  install    安装Git钩子');
    console.log('  uninstall  卸载Git钩子');
    console.log('  status     检查钩子状态');
    console.log('  help       显示帮助信息');
    console.log('');
    console.log('功能:');
    console.log('  - pre-commit: 提交前检查端口配置完整性');
    console.log('  - commit-msg: 要求端口配置修改说明');
    console.log('');
    console.log('示例:');
    console.log('  node scripts/install-git-hooks.js install');
    console.log('  node scripts/install-git-hooks.js status');
  }
}

// 主函数
async function main() {
  const installer = new GitHookInstaller();
  const command = process.argv[2] || 'install';

  switch (command) {
    case 'install':
      installer.installHooks();
      break;
      
    case 'uninstall':
      installer.uninstallHooks();
      break;
      
    case 'status':
      installer.checkHookStatus();
      break;
      
    case 'help':
    default:
      installer.showHelp();
      break;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch(console.error);
}

module.exports = GitHookInstaller;
