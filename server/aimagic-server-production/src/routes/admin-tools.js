/**
 * 管理后台工具API
 * 提供部署检查、配置管理等工具功能
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

// 需要检查的硬编码模式
const HARDCODED_PATTERNS = [
  {
    pattern: /https:\/\/hwf0p724ub-8188\.cnb\.run/g,
    description: '硬编码的ComfyUI服务器URL (hwf0p724ub)',
    severity: 'high'
  },
  {
    pattern: /https:\/\/dzqgp58z0s-8188\.cnb\.run/g,
    description: '硬编码的ComfyUI服务器URL (dzqgp58z0s)',
    severity: 'high'
  },
  {
    pattern: /abc1373d4ad648a3a81d0587fbe5534b/g,
    description: '硬编码的ComfyUI客户端ID',
    severity: 'medium'
  },
  {
    pattern: /http:\/\/localhost:3006/g,
    description: '硬编码的本地API地址',
    severity: 'high'
  },
  {
    pattern: /114\.132\.50\.71/g,
    description: '硬编码的数据库IP地址',
    severity: 'high'
  },
  {
    pattern: /dFLJYsd82irJwHX5/g,
    description: '硬编码的数据库密码',
    severity: 'critical'
  },
  {
    pattern: /backup1\.comfyui\.com/g,
    description: '硬编码的备用服务器地址',
    severity: 'medium'
  }
];

// 需要检查的文件扩展名
const FILE_EXTENSIONS = ['.js', '.ts', '.vue', '.json', '.md'];

// 排除的目录
const EXCLUDED_DIRS = ['node_modules', '.git', 'dist', 'build', 'coverage', 'logs'];

// 扫描目录获取文件列表
function scanDirectory(dir, results = []) {
  try {
    const files = fs.readdirSync(dir);

    for (const file of files) {
      const filePath = path.join(dir, file);
      
      try {
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
          if (!EXCLUDED_DIRS.includes(file)) {
            scanDirectory(filePath, results);
          }
        } else {
          const ext = path.extname(file);
          if (FILE_EXTENSIONS.includes(ext)) {
            results.push(filePath);
          }
        }
      } catch (error) {
        // 忽略无法访问的文件
        console.warn(`无法访问文件: ${filePath}`);
      }
    }
  } catch (error) {
    console.warn(`无法访问目录: ${dir}`);
  }

  return results;
}

// 检查文件中的硬编码
function checkFileForHardcoding(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const issues = [];

    for (const { pattern, description, severity } of HARDCODED_PATTERNS) {
      const matches = content.match(pattern);
      if (matches) {
        // 获取行号
        const lines = content.split('\n');
        const lineNumbers = [];
        
        lines.forEach((line, index) => {
          if (pattern.test(line)) {
            lineNumbers.push(index + 1);
          }
        });

        issues.push({
          pattern: pattern.source,
          description,
          severity,
          matches: matches.length,
          lines: lineNumbers
        });
      }
    }

    return issues;
  } catch (error) {
    console.warn(`无法读取文件: ${filePath}`);
    return [];
  }
}

// 硬编码检查API
router.post('/check-hardcode', async (req, res) => {
  try {
    console.log('🔍 开始硬编码检查...');
    
    // 获取项目根目录
    const projectRoot = path.resolve(__dirname, '../../../');
    
    // 扫描所有文件
    const allFiles = scanDirectory(projectRoot);
    console.log(`📁 扫描到 ${allFiles.length} 个文件`);
    
    const issues = [];
    let totalIssues = 0;

    // 检查每个文件
    for (const filePath of allFiles) {
      const fileIssues = checkFileForHardcoding(filePath);
      if (fileIssues.length > 0) {
        // 转换为相对路径
        const relativePath = path.relative(projectRoot, filePath);
        issues.push({
          file: relativePath,
          issues: fileIssues
        });
        totalIssues += fileIssues.length;
      }
    }

    console.log(`✅ 硬编码检查完成，发现 ${totalIssues} 个问题`);

    res.json({
      success: true,
      data: {
        issues,
        totalIssues,
        scannedFiles: allFiles.length,
        summary: {
          critical: issues.flatMap(f => f.issues).filter(i => i.severity === 'critical').length,
          high: issues.flatMap(f => f.issues).filter(i => i.severity === 'high').length,
          medium: issues.flatMap(f => f.issues).filter(i => i.severity === 'medium').length,
          low: issues.flatMap(f => f.issues).filter(i => i.severity === 'low').length
        }
      }
    });

  } catch (error) {
    console.error('❌ 硬编码检查失败:', error);
    res.status(500).json({
      success: false,
      message: '硬编码检查失败: ' + error.message
    });
  }
});

// 部署就绪性检查API
router.post('/check-deployment-readiness', async (req, res) => {
  try {
    console.log('🚀 开始部署就绪性检查...');
    
    const checks = {
      hardcode: { status: 'checking', message: '检查硬编码问题...' },
      environment: { status: 'checking', message: '检查环境变量...' },
      database: { status: 'checking', message: '检查数据库连接...' },
      config: { status: 'checking', message: '检查系统配置...' }
    };

    // 1. 硬编码检查
    try {
      const projectRoot = path.resolve(__dirname, '../../../');
      const allFiles = scanDirectory(projectRoot);
      const issues = [];
      
      for (const filePath of allFiles) {
        const fileIssues = checkFileForHardcoding(filePath);
        if (fileIssues.length > 0) {
          issues.push({ file: filePath, issues: fileIssues });
        }
      }
      
      const criticalIssues = issues.flatMap(f => f.issues).filter(i => i.severity === 'critical');
      const highIssues = issues.flatMap(f => f.issues).filter(i => i.severity === 'high');
      
      if (criticalIssues.length > 0) {
        checks.hardcode = { 
          status: 'error', 
          message: `发现 ${criticalIssues.length} 个严重硬编码问题`,
          details: criticalIssues
        };
      } else if (highIssues.length > 0) {
        checks.hardcode = { 
          status: 'warning', 
          message: `发现 ${highIssues.length} 个高优先级硬编码问题`,
          details: highIssues
        };
      } else {
        checks.hardcode = { status: 'success', message: '未发现硬编码问题' };
      }
    } catch (error) {
      checks.hardcode = { status: 'error', message: '硬编码检查失败: ' + error.message };
    }

    // 2. 环境变量检查
    const requiredEnvVars = [
      'COMFYUI_SERVER_URL',
      'FRONTEND_API_BASE_URL', 
      'JWT_SECRET',
      'CORS_ORIGIN'
    ];
    
    const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingEnvVars.length > 0) {
      checks.environment = {
        status: 'error',
        message: `缺少必需的环境变量: ${missingEnvVars.join(', ')}`
      };
    } else {
      checks.environment = { status: 'success', message: '环境变量配置完整' };
    }

    // 3. 数据库检查
    try {
      const { query } = require('../config/database');
      await query('SELECT 1');
      checks.database = { status: 'success', message: '数据库连接正常' };
    } catch (error) {
      checks.database = { status: 'error', message: '数据库连接失败: ' + error.message };
    }

    // 4. 系统配置检查
    try {
      const { query } = require('../config/database');
      const configs = await query('SELECT COUNT(*) as count FROM system_config');
      
      if (configs[0].count > 0) {
        checks.config = { status: 'success', message: '系统配置已初始化' };
      } else {
        checks.config = { status: 'warning', message: '系统配置为空，建议运行初始化脚本' };
      }
    } catch (error) {
      checks.config = { status: 'error', message: '系统配置检查失败: ' + error.message };
    }

    // 计算总体状态
    const hasErrors = Object.values(checks).some(check => check.status === 'error');
    const hasWarnings = Object.values(checks).some(check => check.status === 'warning');
    
    let overallStatus = 'success';
    let overallMessage = '✅ 系统已准备好部署';
    
    if (hasErrors) {
      overallStatus = 'error';
      overallMessage = '❌ 存在阻止部署的问题，请修复后重试';
    } else if (hasWarnings) {
      overallStatus = 'warning';
      overallMessage = '⚠️ 可以部署，但建议修复警告问题';
    }

    console.log(`✅ 部署就绪性检查完成: ${overallStatus}`);

    res.json({
      success: true,
      data: {
        overall: {
          status: overallStatus,
          message: overallMessage
        },
        checks
      }
    });

  } catch (error) {
    console.error('❌ 部署就绪性检查失败:', error);
    res.status(500).json({
      success: false,
      message: '部署就绪性检查失败: ' + error.message
    });
  }
});

module.exports = router;
