#!/usr/bin/env node

/**
 * 验证ComfyUI端点配置统一性
 * 检查是否还有硬编码的端点配置
 */

const fs = require('fs');
const path = require('path');

// 需要检查的硬编码端点模式
const HARDCODED_ENDPOINT_PATTERNS = [
  {
    pattern: /['"\/]queue['",\]]/g,
    description: '硬编码的 /queue 端点',
    severity: 'high',
    allowedFiles: ['docs/', 'test-', '.md', 'comfyui.config.js', 'routes/config.js', 'routes/admin.js'] // 允许在配置文件、文档和测试文件中出现
  },
  {
    pattern: /['"\/]system_stats['",\]]/g,
    description: '硬编码的 /system_stats 端点',
    severity: 'high',
    allowedFiles: ['docs/', 'test-', '.md', 'comfyui.config.js', 'routes/config.js', 'routes/admin.js']
  },
  {
    pattern: /['"\/]object_info['",\]]/g,
    description: '硬编码的 /object_info 端点',
    severity: 'medium',
    allowedFiles: ['docs/', 'test-', '.md', 'comfyui.config.js']
  },
  {
    pattern: /['"\/]prompt['",\]]/g,
    description: '硬编码的 /prompt 端点',
    severity: 'medium',
    allowedFiles: ['docs/', 'test-', '.md', 'comfyui.config.js']
  },
  {
    pattern: /['"\/]history['",\]]/g,
    description: '硬编码的 /history 端点',
    severity: 'medium',
    allowedFiles: ['docs/', 'test-', '.md', 'comfyui.config.js']
  },
  {
    pattern: /testEndpoints\s*=\s*\[/g,
    description: '可能的硬编码端点数组定义',
    severity: 'medium',
    allowedFiles: ['test-', '.md', 'config.js', 'routes/config.js', 'routes/admin.js']
  }
];

// 需要检查的文件扩展名
const FILE_EXTENSIONS = ['.js', '.ts', '.jsx', '.tsx', '.vue'];

// 排除的目录
const EXCLUDED_DIRS = ['node_modules', '.git', 'dist', 'build', '.lh'];

class ConfigVerifier {
  constructor() {
    this.issues = [];
    this.checkedFiles = 0;
  }

  /**
   * 检查文件是否应该被排除
   */
  shouldExcludeFile(filePath) {
    // 检查是否在排除目录中
    for (const excludedDir of EXCLUDED_DIRS) {
      if (filePath.includes(excludedDir)) {
        return true;
      }
    }
    return false;
  }

  /**
   * 检查文件是否在允许列表中
   */
  isFileAllowed(filePath, allowedFiles) {
    const normalizedPath = filePath.replace(/\\/g, '/');
    return allowedFiles.some(allowed => normalizedPath.includes(allowed));
  }

  /**
   * 检查单个文件
   */
  checkFile(filePath) {
    if (this.shouldExcludeFile(filePath)) {
      return;
    }

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      this.checkedFiles++;

      for (const { pattern, description, severity, allowedFiles } of HARDCODED_ENDPOINT_PATTERNS) {
        const matches = content.match(pattern);
        if (matches) {
          // 检查是否在允许列表中
          if (this.isFileAllowed(filePath, allowedFiles)) {
            continue;
          }

          this.issues.push({
            file: filePath,
            pattern: pattern.source,
            description,
            severity,
            matches: matches.length,
            lines: this.getMatchingLines(content, pattern)
          });
        }
      }
    } catch (error) {
      console.warn(`⚠️ 无法读取文件: ${filePath} - ${error.message}`);
    }
  }

  /**
   * 获取匹配的行号
   */
  getMatchingLines(content, pattern) {
    const lines = content.split('\n');
    const matchingLines = [];

    lines.forEach((line, index) => {
      if (pattern.test(line)) {
        matchingLines.push({
          number: index + 1,
          content: line.trim()
        });
      }
    });

    return matchingLines;
  }

  /**
   * 递归检查目录
   */
  checkDirectory(dirPath) {
    try {
      const items = fs.readdirSync(dirPath);

      for (const item of items) {
        const itemPath = path.join(dirPath, item);
        const stat = fs.statSync(itemPath);

        if (stat.isDirectory()) {
          this.checkDirectory(itemPath);
        } else if (stat.isFile()) {
          const ext = path.extname(itemPath);
          if (FILE_EXTENSIONS.includes(ext)) {
            this.checkFile(itemPath);
          }
        }
      }
    } catch (error) {
      console.warn(`⚠️ 无法读取目录: ${dirPath} - ${error.message}`);
    }
  }

  /**
   * 运行验证
   */
  verify() {
    console.log('🔍 开始验证ComfyUI端点配置统一性...');
    console.log('=' .repeat(60));

    const startTime = Date.now();

    // 检查主要目录
    const dirsToCheck = ['client/src', 'server/src', 'admin/src'];

    for (const dir of dirsToCheck) {
      if (fs.existsSync(dir)) {
        console.log(`📁 检查目录: ${dir}`);
        this.checkDirectory(dir);
      }
    }

    const endTime = Date.now();

    console.log('\n📊 检查结果:');
    console.log('=' .repeat(40));
    console.log(`   检查文件数: ${this.checkedFiles}`);
    console.log(`   发现问题数: ${this.issues.length}`);
    console.log(`   耗时: ${endTime - startTime}ms`);

    if (this.issues.length === 0) {
      console.log('\n✅ 恭喜！所有ComfyUI端点配置已统一，未发现硬编码问题。');
      return true;
    } else {
      console.log('\n❌ 发现硬编码端点配置问题:');
      this.reportIssues();
      return false;
    }
  }

  /**
   * 报告问题
   */
  reportIssues() {
    const groupedIssues = this.groupIssuesBySeverity();

    for (const [severity, issues] of Object.entries(groupedIssues)) {
      console.log(`\n🚨 ${severity.toUpperCase()} 级别问题 (${issues.length}个):`);
      console.log('-' .repeat(50));

      for (const issue of issues) {
        console.log(`📄 文件: ${issue.file}`);
        console.log(`🔍 问题: ${issue.description}`);
        console.log(`📊 匹配数: ${issue.matches}`);

        if (issue.lines.length > 0) {
          console.log('📍 位置:');
          issue.lines.forEach(line => {
            console.log(`   第${line.number}行: ${line.content}`);
          });
        }
        console.log('');
      }
    }

    console.log('\n💡 建议修复方案:');
    console.log('1. 将硬编码端点移动到 client/src/config/comfyui.config.js');
    console.log('2. 使用 comfyUIConfig.getHealthCheckEndpoints() 获取端点列表');
    console.log('3. 使用 comfyUIConfig.HEALTH_CHECK.HEADERS 获取请求头');
    console.log('4. 使用 comfyUIConfig.validateResponse() 验证响应');
  }

  /**
   * 按严重程度分组问题
   */
  groupIssuesBySeverity() {
    const grouped = {};

    for (const issue of this.issues) {
      if (!grouped[issue.severity]) {
        grouped[issue.severity] = [];
      }
      grouped[issue.severity].push(issue);
    }

    return grouped;
  }
}

// 运行验证
if (require.main === module) {
  const verifier = new ConfigVerifier();
  const success = verifier.verify();
  process.exit(success ? 0 : 1);
}

module.exports = ConfigVerifier;
