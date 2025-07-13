#!/usr/bin/env node

/**
 * 端口配置保护工具
 * 防止端口管理脚本被意外修改，确保配置一致性
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class PortConfigProtector {
  constructor() {
    this.projectRoot = path.join(__dirname, '..');
    this.protectedFiles = [
      'port-config.json',
      'scripts/port-manager.js',
      'scripts/start-with-port-management.js',
      'start-managed.js',
      'start-managed.bat',
      'start-managed.sh'
    ];
    this.checksumFile = path.join(__dirname, '.port-config-checksums.json');
  }

  /**
   * 计算文件的MD5校验和
   */
  calculateChecksum(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      return crypto.createHash('md5').update(content).digest('hex');
    } catch (error) {
      return null;
    }
  }

  /**
   * 生成所有保护文件的校验和
   */
  generateChecksums() {
    const checksums = {};

    for (const file of this.protectedFiles) {
      const filePath = path.join(this.projectRoot, file);
      const checksum = this.calculateChecksum(filePath);

      if (checksum) {
        checksums[file] = {
          checksum,
          lastModified: fs.statSync(filePath).mtime.toISOString()
        };
      }
    }

    fs.writeFileSync(this.checksumFile, JSON.stringify(checksums, null, 2));
    console.log('✅ 端口配置文件校验和已生成');
    return checksums;
  }

  /**
   * 验证文件完整性
   */
  verifyIntegrity() {
    if (!fs.existsSync(this.checksumFile)) {
      console.log('⚠️ 校验和文件不存在，正在生成...');
      return this.generateChecksums();
    }

    const savedChecksums = JSON.parse(fs.readFileSync(this.checksumFile, 'utf8'));
    const issues = [];

    for (const file of this.protectedFiles) {
      const filePath = path.join(this.projectRoot, file);
      const currentChecksum = this.calculateChecksum(filePath);
      const savedData = savedChecksums[file];

      if (!savedData) {
        issues.push({
          file,
          issue: 'missing_baseline',
          message: '缺少基线校验和'
        });
        continue;
      }

      if (!currentChecksum) {
        issues.push({
          file,
          issue: 'file_missing',
          message: '文件不存在'
        });
        continue;
      }

      if (currentChecksum !== savedData.checksum) {
        issues.push({
          file,
          issue: 'modified',
          message: '文件已被修改',
          expected: savedData.checksum,
          actual: currentChecksum
        });
      }
    }

    return issues;
  }

  /**
   * 显示完整性检查报告
   */
  showIntegrityReport() {
    console.log('🔍 端口配置文件完整性检查');
    console.log('='.repeat(50));

    const issues = this.verifyIntegrity();

    if (!Array.isArray(issues) || issues.length === 0) {
      console.log('✅ 所有端口配置文件完整性正常');
      return true;
    }

    console.log('❌ 发现以下问题:');
    issues.forEach(issue => {
      console.log(`\n📁 文件: ${issue.file}`);
      console.log(`🚨 问题: ${issue.message}`);
      if (issue.expected && issue.actual) {
        console.log(`   期望校验和: ${issue.expected}`);
        console.log(`   实际校验和: ${issue.actual}`);
      }
    });

    console.log('\n💡 建议:');
    console.log('1. 检查文件是否被意外修改');
    console.log('2. 如果修改是预期的，运行: node scripts/protect-port-config.js update');
    console.log('3. 如果需要恢复，请从版本控制系统恢复文件');

    return false;
  }

  /**
   * 更新校验和基线
   */
  updateBaseline() {
    console.log('🔄 更新端口配置文件校验和基线...');
    this.generateChecksums();
    console.log('✅ 校验和基线已更新');
  }

  /**
   * 检查硬编码端口
   */
  checkHardcodedPorts() {
    console.log('🔍 检查硬编码端口...');

    const hardcodedPatterns = [
      {
        pattern: /localhost:3001(?![0-9])/g,
        description: '硬编码的客户端端口 3001'
      },
      {
        pattern: /localhost:3002(?![0-9])/g,
        description: '硬编码的端口 3002'
      },
      {
        pattern: /localhost:3003(?![0-9])/g,
        description: '硬编码的后台管理端口 3003'
      },
      {
        pattern: /localhost:3006(?![0-9])/g,
        description: '硬编码的旧后端端口 3006'
      },
      {
        pattern: /localhost:3007(?![0-9])/g,
        description: '硬编码的后端端口 3007'
      },
      {
        pattern: /localhost:3009(?![0-9])/g,
        description: '硬编码的端口 3009'
      }
    ];

    const filesToCheck = [
      'client/src/services/api.js',
      'admin/src/utils/request.js',
      'client/vite.config.js',
      'admin/vite.config.js',
      'server/src/app.js'
    ];

    const issues = [];

    for (const file of filesToCheck) {
      const filePath = path.join(this.projectRoot, file);

      if (!fs.existsSync(filePath)) {
        continue;
      }

      const content = fs.readFileSync(filePath, 'utf8');

      for (const { pattern, description } of hardcodedPatterns) {
        const matches = content.match(pattern);
        if (matches) {
          const lines = content.split('\n');
          const lineNumbers = [];

          lines.forEach((line, index) => {
            if (pattern.test(line)) {
              lineNumbers.push(index + 1);
            }
          });

          issues.push({
            file,
            description,
            matches: matches.length,
            lines: lineNumbers
          });
        }
      }
    }

    if (issues.length === 0) {
      console.log('✅ 未发现硬编码端口问题');
      return true;
    }

    console.log('❌ 发现硬编码端口问题:');
    issues.forEach(issue => {
      console.log(`\n📁 文件: ${issue.file}`);
      console.log(`🚨 问题: ${issue.description}`);
      console.log(`📍 行号: ${issue.lines.join(', ')}`);
      console.log(`🔢 匹配数: ${issue.matches}`);
    });

    console.log('\n💡 建议:');
    console.log('1. 使用环境变量或配置文件替代硬编码端口');
    console.log('2. 在开发环境使用代理配置');
    console.log('3. 运行: node scripts/protect-port-config.js fix 自动修复');

    return false;
  }

  /**
   * 自动修复硬编码端口问题
   */
  fixHardcodedPorts() {
    console.log('🔧 自动修复硬编码端口问题...');

    // 修复 client/src/services/api.js
    const apiFilePath = path.join(this.projectRoot, 'client/src/services/api.js');
    if (fs.existsSync(apiFilePath)) {
      let content = fs.readFileSync(apiFilePath, 'utf8');

      // 替换硬编码的 localhost:3007
      const oldPattern = "BASE_URL: import.meta.env.DEV ? '' : 'http://localhost:3007'";
      const newPattern = "BASE_URL: import.meta.env.DEV ? '' : `http://localhost:${import.meta.env.VITE_SERVER_PORT || 3007}`";

      if (content.includes(oldPattern)) {
        content = content.replace(oldPattern, newPattern);
        fs.writeFileSync(apiFilePath, content);
        console.log('✅ 修复了 client/src/services/api.js 中的硬编码端口');
      }
    }

    console.log('✅ 硬编码端口修复完成');
  }

  /**
   * 显示帮助信息
   */
  showHelp() {
    console.log('🛡️ 端口配置保护工具');
    console.log('');
    console.log('用法:');
    console.log('  node scripts/protect-port-config.js <命令>');
    console.log('');
    console.log('命令:');
    console.log('  check      检查文件完整性和硬编码端口');
    console.log('  verify     验证文件完整性');
    console.log('  update     更新校验和基线');
    console.log('  hardcode   检查硬编码端口');
    console.log('  fix        自动修复硬编码端口');
    console.log('  help       显示帮助信息');
    console.log('');
    console.log('示例:');
    console.log('  node scripts/protect-port-config.js check');
    console.log('  node scripts/protect-port-config.js fix');
  }
}

// 主函数
async function main() {
  const protector = new PortConfigProtector();
  const command = process.argv[2] || 'check';

  switch (command) {
    case 'check':
      const integrityOk = protector.showIntegrityReport();
      const hardcodeOk = protector.checkHardcodedPorts();
      process.exit(integrityOk && hardcodeOk ? 0 : 1);
      break;

    case 'verify':
      const ok = protector.showIntegrityReport();
      process.exit(ok ? 0 : 1);
      break;

    case 'update':
      protector.updateBaseline();
      break;

    case 'hardcode':
      const hardcodeResult = protector.checkHardcodedPorts();
      process.exit(hardcodeResult ? 0 : 1);
      break;

    case 'fix':
      protector.fixHardcodedPorts();
      break;

    case 'help':
    default:
      protector.showHelp();
      break;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch(console.error);
}

module.exports = PortConfigProtector;
