/**
 * 分析并转移最外层node_modules到对应子项目
 * 
 * 分析结果：
 * 最外层的package.json只包含两个依赖：
 * - dotenv: 用于环境变量管理
 * - mysql2: 用于MySQL数据库连接
 * 
 * 这些依赖主要用于根目录的脚本文件，如：
 * - check-deployment-readiness.js
 * - cleanup-hardcoded-values.js
 * - verify-real-data.js
 * - 各种测试和验证脚本
 */

const fs = require('fs');
const path = require('path');

// 分析最外层依赖的使用情况
function analyzeRootDependencies() {
  console.log('🔍 分析最外层node_modules的使用情况...\n');

  // 读取根目录package.json
  const rootPackageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const rootDependencies = rootPackageJson.dependencies || {};

  console.log('📦 根目录依赖:');
  Object.keys(rootDependencies).forEach(dep => {
    console.log(`   - ${dep}: ${rootDependencies[dep]}`);
  });

  // 扫描根目录脚本文件
  const rootScripts = fs.readdirSync('.')
    .filter(file => file.endsWith('.js') && !file.startsWith('node_modules'))
    .filter(file => !fs.statSync(file).isDirectory());

  console.log('\n📄 根目录脚本文件:');
  rootScripts.forEach(script => {
    console.log(`   - ${script}`);
  });

  // 分析每个脚本的依赖使用
  console.log('\n🔗 依赖使用分析:');
  
  const dependencyUsage = {
    dotenv: [],
    mysql2: []
  };

  rootScripts.forEach(script => {
    try {
      const content = fs.readFileSync(script, 'utf8');
      
      if (content.includes('require(\'dotenv\')') || content.includes('dotenv')) {
        dependencyUsage.dotenv.push(script);
      }
      
      if (content.includes('require(\'mysql2\')') || content.includes('mysql2')) {
        dependencyUsage.mysql2.push(script);
      }
    } catch (error) {
      console.warn(`   ⚠️ 无法读取文件: ${script}`);
    }
  });

  Object.keys(dependencyUsage).forEach(dep => {
    console.log(`   ${dep}:`);
    if (dependencyUsage[dep].length > 0) {
      dependencyUsage[dep].forEach(file => {
        console.log(`     - ${file}`);
      });
    } else {
      console.log(`     - 未发现直接使用`);
    }
  });

  return {
    rootDependencies,
    rootScripts,
    dependencyUsage
  };
}

// 检查子项目的依赖情况
function analyzeSubprojectDependencies() {
  console.log('\n📁 子项目依赖分析:');

  const subprojects = ['client', 'server', 'admin'];
  const subprojectDeps = {};

  subprojects.forEach(subproject => {
    const packageJsonPath = path.join(subproject, 'package.json');
    
    if (fs.existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        const dependencies = {
          ...packageJson.dependencies,
          ...packageJson.devDependencies
        };
        
        subprojectDeps[subproject] = dependencies;
        
        console.log(`\n   ${subproject}:`);
        console.log(`     依赖数量: ${Object.keys(dependencies).length}`);
        
        // 检查是否已包含根目录的依赖
        const hasDotenv = dependencies.dotenv || dependencies['dotenv'];
        const hasMysql2 = dependencies.mysql2 || dependencies['mysql2'];
        
        console.log(`     包含dotenv: ${hasDotenv ? '是' : '否'}`);
        console.log(`     包含mysql2: ${hasMysql2 ? '是' : '否'}`);
        
      } catch (error) {
        console.log(`     ❌ 读取package.json失败: ${error.message}`);
      }
    } else {
      console.log(`     ❌ 未找到package.json`);
    }
  });

  return subprojectDeps;
}

// 生成转移建议
function generateTransferRecommendations(analysis) {
  console.log('\n💡 转移建议:');

  const { rootDependencies, dependencyUsage } = analysis;

  // 分析哪些依赖应该转移到哪个子项目
  const recommendations = {
    server: [],
    client: [],
    admin: [],
    keep: []
  };

  // dotenv主要用于服务端和根目录脚本
  if (dependencyUsage.dotenv.length > 0) {
    recommendations.server.push({
      package: 'dotenv',
      reason: '服务端需要环境变量管理',
      usage: dependencyUsage.dotenv
    });
  }

  // mysql2主要用于服务端
  if (dependencyUsage.mysql2.length > 0) {
    recommendations.server.push({
      package: 'mysql2',
      reason: '服务端需要数据库连接',
      usage: dependencyUsage.mysql2
    });
  }

  // 如果根目录脚本较多，建议保留部分依赖
  const rootScriptCount = dependencyUsage.dotenv.length + dependencyUsage.mysql2.length;
  if (rootScriptCount > 5) {
    recommendations.keep.push({
      package: 'dotenv',
      reason: '根目录有多个脚本需要环境变量支持',
      usage: dependencyUsage.dotenv
    });
  }

  // 输出建议
  Object.keys(recommendations).forEach(target => {
    if (recommendations[target].length > 0) {
      console.log(`\n   转移到 ${target}:`);
      recommendations[target].forEach(rec => {
        console.log(`     📦 ${rec.package}`);
        console.log(`        原因: ${rec.reason}`);
        console.log(`        使用文件: ${rec.usage.join(', ')}`);
      });
    }
  });

  return recommendations;
}

// 执行转移操作
function executeTransfer(recommendations) {
  console.log('\n🚀 执行转移操作...');

  // 1. 更新服务端package.json
  const serverPackageJsonPath = 'server/package.json';
  if (fs.existsSync(serverPackageJsonPath)) {
    try {
      const serverPackageJson = JSON.parse(fs.readFileSync(serverPackageJsonPath, 'utf8'));
      
      // 确保服务端包含必要的依赖
      if (!serverPackageJson.dependencies) {
        serverPackageJson.dependencies = {};
      }

      // 添加dotenv和mysql2（如果还没有）
      if (!serverPackageJson.dependencies.dotenv) {
        serverPackageJson.dependencies.dotenv = '^17.2.0';
        console.log('   ✅ 添加dotenv到server/package.json');
      }

      if (!serverPackageJson.dependencies.mysql2) {
        serverPackageJson.dependencies.mysql2 = '^3.14.1';
        console.log('   ✅ 添加mysql2到server/package.json');
      }

      // 写回文件
      fs.writeFileSync(serverPackageJsonPath, JSON.stringify(serverPackageJson, null, 2));
      console.log('   ✅ 更新server/package.json完成');

    } catch (error) {
      console.error(`   ❌ 更新server/package.json失败: ${error.message}`);
    }
  }

  // 2. 创建根目录脚本的package.json（如果需要保留依赖）
  const rootScriptPackageJson = {
    name: "aimagic-scripts",
    version: "1.0.0",
    description: "Root level scripts for AIMagic project",
    private: true,
    dependencies: {
      "dotenv": "^17.2.0",
      "mysql2": "^3.14.1"
    },
    scripts: {
      "check-deployment": "node check-deployment-readiness.js",
      "cleanup-hardcode": "node cleanup-hardcoded-values.js",
      "verify-data": "node verify-real-data.js"
    }
  };

  // 检查是否需要保留根目录依赖
  const rootScripts = fs.readdirSync('.')
    .filter(file => file.endsWith('.js') && !file.startsWith('node_modules'))
    .filter(file => !fs.statSync(file).isDirectory());

  if (rootScripts.length > 3) {
    console.log('\n   📝 根目录脚本较多，保留独立的package.json');
    // 保持当前的package.json不变
  } else {
    console.log('\n   📝 根目录脚本较少，建议移除根目录依赖');
    
    // 创建备份
    if (fs.existsSync('package.json')) {
      fs.copyFileSync('package.json', 'package.json.backup');
      console.log('   ✅ 创建package.json备份');
    }
  }
}

// 创建清理脚本
function createCleanupScript() {
  const cleanupScript = `#!/bin/bash
# 清理根目录node_modules的脚本

echo "🧹 开始清理根目录node_modules..."

# 1. 备份重要文件
if [ -f "package.json" ]; then
    cp package.json package.json.backup
    echo "✅ 备份package.json"
fi

if [ -f "package-lock.json" ]; then
    cp package-lock.json package-lock.json.backup
    echo "✅ 备份package-lock.json"
fi

# 2. 删除node_modules
if [ -d "node_modules" ]; then
    rm -rf node_modules
    echo "✅ 删除根目录node_modules"
fi

# 3. 删除package-lock.json
if [ -f "package-lock.json" ]; then
    rm package-lock.json
    echo "✅ 删除package-lock.json"
fi

# 4. 更新子项目依赖
echo "📦 更新子项目依赖..."

# 更新服务端依赖
if [ -d "server" ]; then
    cd server
    npm install
    echo "✅ 更新server依赖"
    cd ..
fi

# 更新客户端依赖
if [ -d "client" ]; then
    cd client
    npm install
    echo "✅ 更新client依赖"
    cd ..
fi

# 更新管理后台依赖
if [ -d "admin" ]; then
    cd admin
    npm install
    echo "✅ 更新admin依赖"
    cd ..
fi

echo "🎉 清理完成！"
echo "💡 如需恢复，请运行: cp package.json.backup package.json"
`;

  fs.writeFileSync('cleanup-root-node-modules.sh', cleanupScript);
  console.log('\n   ✅ 创建清理脚本: cleanup-root-node-modules.sh');

  // 创建Windows版本
  const cleanupBat = `@echo off
echo 🧹 开始清理根目录node_modules...

REM 1. 备份重要文件
if exist package.json (
    copy package.json package.json.backup
    echo ✅ 备份package.json
)

if exist package-lock.json (
    copy package-lock.json package-lock.json.backup
    echo ✅ 备份package-lock.json
)

REM 2. 删除node_modules
if exist node_modules (
    rmdir /s /q node_modules
    echo ✅ 删除根目录node_modules
)

REM 3. 删除package-lock.json
if exist package-lock.json (
    del package-lock.json
    echo ✅ 删除package-lock.json
)

REM 4. 更新子项目依赖
echo 📦 更新子项目依赖...

if exist server (
    cd server
    npm install
    echo ✅ 更新server依赖
    cd ..
)

if exist client (
    cd client
    npm install
    echo ✅ 更新client依赖
    cd ..
)

if exist admin (
    cd admin
    npm install
    echo ✅ 更新admin依赖
    cd ..
)

echo 🎉 清理完成！
echo 💡 如需恢复，请运行: copy package.json.backup package.json
pause
`;

  fs.writeFileSync('cleanup-root-node-modules.bat', cleanupBat);
  console.log('   ✅ 创建清理脚本: cleanup-root-node-modules.bat');
}

// 主函数
function main() {
  console.log('📊 最外层node_modules分析与转移工具\n');

  try {
    // 1. 分析根目录依赖
    const analysis = analyzeRootDependencies();

    // 2. 分析子项目依赖
    const subprojectDeps = analyzeSubprojectDependencies();

    // 3. 生成转移建议
    const recommendations = generateTransferRecommendations(analysis);

    // 4. 执行转移
    executeTransfer(recommendations);

    // 5. 创建清理脚本
    createCleanupScript();

    console.log('\n📋 总结:');
    console.log('   ✅ 分析完成');
    console.log('   ✅ 依赖已添加到server/package.json');
    console.log('   ✅ 创建了清理脚本');
    console.log('\n🚀 下一步操作:');
    console.log('   1. 检查server/package.json确认依赖正确');
    console.log('   2. 运行 ./cleanup-root-node-modules.sh (Linux/Mac)');
    console.log('      或 cleanup-root-node-modules.bat (Windows)');
    console.log('   3. 测试根目录脚本是否仍能正常工作');
    console.log('   4. 如有问题，可从备份文件恢复');

  } catch (error) {
    console.error('❌ 分析过程中发生错误:', error);
    process.exit(1);
  }
}

// 运行主函数
if (require.main === module) {
  main();
}

module.exports = {
  analyzeRootDependencies,
  analyzeSubprojectDependencies,
  generateTransferRecommendations,
  executeTransfer
};
