/**
 * 清理硬编码值脚本
 * 自动修复项目中的硬编码问题
 */

const fs = require('fs');
const path = require('path');

// 硬编码替换规则
const REPLACEMENT_RULES = [
  // ComfyUI服务器URL
  {
    pattern: /https:\/\/hwf0p724ub-8188\.cnb\.run/g,
    replacement: 'https://your-comfyui-server.com',
    description: 'ComfyUI服务器URL (hwf0p724ub)'
  },
  {
    pattern: /https:\/\/dzqgp58z0s-8188\.cnb\.run/g,
    replacement: 'https://your-comfyui-server.com',
    description: 'ComfyUI服务器URL (dzqgp58z0s)'
  },
  
  // ComfyUI客户端ID
  {
    pattern: /abc1373d4ad648a3a81d0587fbe5534b/g,
    replacement: 'your-comfyui-client-id',
    description: 'ComfyUI客户端ID'
  },
  
  // 本地API地址
  {
    pattern: /http:\/\/localhost:3006\/api/g,
    replacement: 'https://your-api-server.com/api',
    description: '本地API地址'
  },
  {
    pattern: /http:\/\/localhost:3006/g,
    replacement: 'https://your-api-server.com',
    description: '本地服务器地址'
  },
  
  // 数据库IP地址
  {
    pattern: /114\.132\.50\.71/g,
    replacement: 'your-database-host.com',
    description: '数据库IP地址'
  },
  
  // 数据库密码
  {
    pattern: /dFLJYsd82irJwHX5/g,
    replacement: 'your-database-password',
    description: '数据库密码'
  },
  
  // 备用服务器地址
  {
    pattern: /backup1\.comfyui\.com/g,
    replacement: 'backup1.your-domain.com',
    description: '备用服务器地址'
  }
];

// 需要处理的文件扩展名
const FILE_EXTENSIONS = ['.js', '.ts', '.vue', '.json', '.md'];

// 排除的目录和文件
const EXCLUDED_PATHS = [
  'node_modules',
  '.git',
  'dist',
  'build',
  'coverage',
  'logs',
  'cleanup-hardcoded-values.js', // 排除自己
  'check-deployment-readiness.js' // 保留检查脚本中的模式
];

// 扫描目录获取文件列表
function scanDirectory(dir, results = []) {
  try {
    const files = fs.readdirSync(dir);

    for (const file of files) {
      const filePath = path.join(dir, file);
      const relativePath = path.relative('.', filePath);
      
      // 检查是否在排除列表中
      if (EXCLUDED_PATHS.some(excluded => relativePath.includes(excluded))) {
        continue;
      }
      
      try {
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
          scanDirectory(filePath, results);
        } else {
          const ext = path.extname(file);
          if (FILE_EXTENSIONS.includes(ext)) {
            results.push(filePath);
          }
        }
      } catch (error) {
        console.warn(`无法访问文件: ${filePath}`);
      }
    }
  } catch (error) {
    console.warn(`无法访问目录: ${dir}`);
  }

  return results;
}

// 处理单个文件
function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    const changes = [];

    for (const rule of REPLACEMENT_RULES) {
      const matches = content.match(rule.pattern);
      if (matches) {
        content = content.replace(rule.pattern, rule.replacement);
        modified = true;
        changes.push({
          description: rule.description,
          count: matches.length
        });
      }
    }

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      return changes;
    }

    return null;
  } catch (error) {
    console.warn(`处理文件失败: ${filePath} - ${error.message}`);
    return null;
  }
}

// 主函数
function cleanupHardcodedValues() {
  console.log('🧹 开始清理硬编码值...\n');

  // 扫描所有文件
  const allFiles = scanDirectory('.');
  console.log(`📁 扫描到 ${allFiles.length} 个文件\n`);

  let processedFiles = 0;
  let totalChanges = 0;
  const modifiedFiles = [];

  // 处理每个文件
  for (const filePath of allFiles) {
    const changes = processFile(filePath);
    
    if (changes) {
      processedFiles++;
      const relativePath = path.relative('.', filePath);
      modifiedFiles.push({
        file: relativePath,
        changes
      });
      
      const fileChanges = changes.reduce((sum, change) => sum + change.count, 0);
      totalChanges += fileChanges;
      
      console.log(`✅ ${relativePath}:`);
      changes.forEach(change => {
        console.log(`   - ${change.description}: ${change.count} 处`);
      });
    }
  }

  // 显示结果
  console.log('\n📊 清理结果:');
  console.log(`   扫描文件: ${allFiles.length}`);
  console.log(`   修改文件: ${processedFiles}`);
  console.log(`   总计修改: ${totalChanges} 处`);

  if (processedFiles > 0) {
    console.log('\n🎉 硬编码值清理完成！');
    console.log('\n📝 后续步骤:');
    console.log('   1. 检查修改的文件确保正确性');
    console.log('   2. 配置环境变量文件');
    console.log('   3. 在后台管理系统中设置正确的配置');
    console.log('   4. 重新运行部署检查: node check-deployment-readiness.js');
  } else {
    console.log('\n✅ 未发现需要清理的硬编码值');
  }

  return {
    scannedFiles: allFiles.length,
    modifiedFiles: processedFiles,
    totalChanges,
    details: modifiedFiles
  };
}

// 创建示例环境变量文件
function createExampleEnvFiles() {
  console.log('\n📝 创建示例环境变量文件...');

  // 客户端环境变量示例
  const clientEnvExample = `# 客户端生产环境配置示例
# 复制此文件为 .env.production 并修改相应值

# 应用基础信息
VITE_APP_TITLE=AI Magic - AI图像处理平台
VITE_APP_VERSION=1.0.0
VITE_APP_ENV=production

# ComfyUI服务器配置
VITE_COMFYUI_SERVER_URL=https://your-comfyui-server.com
VITE_COMFYUI_BACKUP_SERVERS=https://backup1.your-domain.com,https://backup2.your-domain.com
VITE_COMFYUI_AUTO_SWITCH=true
VITE_COMFYUI_TIMEOUT=300000
VITE_COMFYUI_HEALTH_CHECK_TIMEOUT=10000

# API服务器配置
VITE_API_BASE_URL=https://your-api-server.com/api
VITE_USE_PROXY=false

# AI功能配置
VITE_AI_TEXT_TO_IMAGE_POINTS=20
VITE_AI_FACE_SWAP_POINTS=20
VITE_AI_UNDRESS_POINTS=20
`;

  // 服务端环境变量示例
  const serverEnvExample = `# 服务端生产环境配置示例
# 复制此文件为 .env.production 并修改相应值

# 服务器配置
NODE_ENV=production
PORT=3006

# 数据库配置
DB_HOST=your-database-host.com
DB_PORT=3306
DB_USER=your-database-user
DB_PASSWORD=your-database-password
DB_NAME=your-database-name

# JWT配置
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-min-32-chars
JWT_EXPIRES_IN=7d

# ComfyUI配置
COMFYUI_SERVER_URL=https://your-comfyui-server.com
COMFYUI_BACKUP_SERVERS=https://backup1.your-domain.com,https://backup2.your-domain.com
COMFYUI_AUTO_SWITCH=true
COMFYUI_HEALTH_CHECK_TIMEOUT=10000
COMFYUI_TIMEOUT=300000

# 前端配置
FRONTEND_API_BASE_URL=https://your-api-server.com/api
FRONTEND_TITLE=AI Magic - AI图像处理平台
FRONTEND_VERSION=1.0.0

# 跨域配置
CORS_ORIGIN=https://your-frontend-domain.com

# AI功能配置
AI_TEXT_TO_IMAGE_POINTS=20
AI_FACE_SWAP_POINTS=20
AI_UNDRESS_POINTS=20
`;

  try {
    // 创建客户端环境变量示例
    if (!fs.existsSync('client/.env.production.example')) {
      fs.writeFileSync('client/.env.production.example', clientEnvExample);
      console.log('✅ 创建 client/.env.production.example');
    }

    // 创建服务端环境变量示例
    if (!fs.existsSync('server/.env.production.example')) {
      fs.writeFileSync('server/.env.production.example', serverEnvExample);
      console.log('✅ 创建 server/.env.production.example');
    }

    console.log('\n💡 请复制示例文件并修改配置:');
    console.log('   cp client/.env.production.example client/.env.production');
    console.log('   cp server/.env.production.example server/.env.production');
  } catch (error) {
    console.error('❌ 创建环境变量示例文件失败:', error.message);
  }
}

// 运行清理
if (require.main === module) {
  const result = cleanupHardcodedValues();
  createExampleEnvFiles();
  
  // 退出码：0表示成功，1表示有修改
  process.exit(result.modifiedFiles > 0 ? 1 : 0);
}

module.exports = { cleanupHardcodedValues, createExampleEnvFiles };
