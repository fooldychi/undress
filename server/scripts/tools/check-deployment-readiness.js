/**
 * 部署就绪性检查脚本
 * 检查项目中是否还存在硬编码问题，确保可以安全部署
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config();

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
const FILE_EXTENSIONS = ['.js', '.ts', '.vue', '.json', '.md', '.env'];

// 排除的目录
const EXCLUDED_DIRS = ['node_modules', '.git', 'dist', 'build', 'coverage'];

// 扫描文件
function scanDirectory(dir, results = []) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
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
  }

  return results;
}

// 检查文件中的硬编码
function checkFileForHardcoding(filePath) {
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
}

// 检查环境变量配置
function checkEnvironmentVariables() {
  console.log('🔍 检查环境变量配置...\n');

  const requiredVars = [
    'COMFYUI_SERVER_URL',
    'FRONTEND_API_BASE_URL',
    'JWT_SECRET',
    'CORS_ORIGIN'
  ];

  const optionalVars = [
    'COMFYUI_BACKUP_SERVERS',
    'AI_TEXT_TO_IMAGE_POINTS',
    'AI_FACE_SWAP_POINTS',
    'AI_UNDRESS_POINTS',
    'FRONTEND_TITLE',
    'FRONTEND_VERSION'
  ];

  const missingRequired = [];
  const missingOptional = [];

  // 检查必需的环境变量
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missingRequired.push(varName);
    } else {
      console.log(`✅ ${varName}: ${process.env[varName]}`);
    }
  }

  // 检查可选的环境变量
  for (const varName of optionalVars) {
    if (!process.env[varName]) {
      missingOptional.push(varName);
    } else {
      console.log(`✅ ${varName}: ${process.env[varName]}`);
    }
  }

  if (missingRequired.length > 0) {
    console.log('\n❌ 缺少必需的环境变量:');
    missingRequired.forEach(varName => {
      console.log(`   - ${varName}`);
    });
  }

  if (missingOptional.length > 0) {
    console.log('\n⚠️ 缺少可选的环境变量:');
    missingOptional.forEach(varName => {
      console.log(`   - ${varName}`);
    });
  }

  return {
    missingRequired,
    missingOptional
  };
}

// 主检查函数
function checkDeploymentReadiness() {
  console.log('🚀 开始部署就绪性检查...\n');

  // 1. 检查环境变量
  const envCheck = checkEnvironmentVariables();

  // 2. 扫描文件中的硬编码
  console.log('\n🔍 扫描文件中的硬编码问题...\n');
  
  const allFiles = scanDirectory('.');
  const issues = [];
  let totalIssues = 0;

  for (const filePath of allFiles) {
    const fileIssues = checkFileForHardcoding(filePath);
    if (fileIssues.length > 0) {
      issues.push({
        file: filePath,
        issues: fileIssues
      });
      totalIssues += fileIssues.length;
    }
  }

  // 3. 显示结果
  console.log('📊 检查结果:\n');

  if (issues.length === 0) {
    console.log('✅ 未发现硬编码问题！');
  } else {
    console.log(`❌ 发现 ${totalIssues} 个硬编码问题，涉及 ${issues.length} 个文件:\n`);

    issues.forEach(({ file, issues: fileIssues }) => {
      console.log(`📁 ${file}:`);
      fileIssues.forEach(issue => {
        const severityIcon = {
          critical: '🔴',
          high: '🟠',
          medium: '🟡',
          low: '🟢'
        }[issue.severity] || '⚪';
        
        console.log(`   ${severityIcon} ${issue.description}`);
        console.log(`      行号: ${issue.lines.join(', ')}`);
        console.log(`      匹配: ${issue.matches} 次`);
      });
      console.log('');
    });
  }

  // 4. 生成建议
  console.log('💡 部署建议:\n');

  if (envCheck.missingRequired.length > 0) {
    console.log('❌ 无法部署 - 缺少必需的环境变量');
    console.log('   请在.env.production文件中配置这些变量');
    return false;
  }

  if (issues.length > 0) {
    const criticalIssues = issues.flatMap(f => f.issues).filter(i => i.severity === 'critical');
    const highIssues = issues.flatMap(f => f.issues).filter(i => i.severity === 'high');

    if (criticalIssues.length > 0) {
      console.log('❌ 无法部署 - 存在严重的硬编码问题');
      console.log('   请修复所有标记为🔴的问题');
      return false;
    }

    if (highIssues.length > 0) {
      console.log('⚠️ 可以部署，但建议修复高优先级问题');
      console.log('   请修复所有标记为🟠的问题');
    } else {
      console.log('✅ 可以部署，但建议修复剩余的硬编码问题');
    }
  } else {
    console.log('✅ 项目已准备好部署！');
  }

  console.log('\n🔧 修复建议:');
  console.log('   1. 使用环境变量替代硬编码值');
  console.log('   2. 在后台管理系统中配置相关参数');
  console.log('   3. 运行 node server/src/scripts/init-deployment-config.js 初始化配置');
  console.log('   4. 确保生产环境的.env文件配置正确');

  return envCheck.missingRequired.length === 0 && 
         issues.flatMap(f => f.issues).filter(i => i.severity === 'critical').length === 0;
}

// 运行检查
if (require.main === module) {
  const isReady = checkDeploymentReadiness();
  process.exit(isReady ? 0 : 1);
}

module.exports = { checkDeploymentReadiness };
