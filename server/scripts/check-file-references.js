// 简化验证脚本：只检查文件中的 level_card_types 引用
const fs = require('fs');
const path = require('path');

// 需要检查的文件列表
const filesToCheck = [
  'server/init-level-cards.js',
  'server/src/scripts/create-level-cards-tables.js',
  'server/src/routes/admin.js',
  'server/src/routes/levelCards.js'
];

// 检查文件中是否还有 level_card_types 引用
function checkFileForOldReferences(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const issues = [];

    lines.forEach((line, index) => {
      if (line.includes('level_card_types') && !line.trim().startsWith('//')) {
        issues.push({
          line: index + 1,
          content: line.trim()
        });
      }
    });

    return issues;
  } catch (error) {
    return [{ error: `无法读取文件: ${error.message}` }];
  }
}

// 主验证函数
function verifyFileReferences() {
  console.log('🔍 检查文件中的 level_card_types 引用...\n');

  let hasIssues = false;

  filesToCheck.forEach(filePath => {
    const issues = checkFileForOldReferences(filePath);
    if (issues.length > 0) {
      hasIssues = true;
      console.log(`❌ ${filePath}:`);
      issues.forEach(issue => {
        if (issue.error) {
          console.log(`   错误: ${issue.error}`);
        } else {
          console.log(`   第${issue.line}行: ${issue.content}`);
        }
      });
    } else {
      console.log(`✅ ${filePath}: 无 level_card_types 引用`);
    }
  });

  console.log('\n📋 文件检查总结:');
  if (hasIssues) {
    console.log('❌ 发现问题，需要修复上述文件中的 level_card_types 引用');
  } else {
    console.log('✅ 所有文件检查通过，没有发现 level_card_types 引用！');
    console.log('\n🎉 文件统一修改完成！');
    console.log('\n📝 下一步操作:');
    console.log('1. 启动数据库服务');
    console.log('2. 运行迁移脚本: node server/scripts/migrate-card-types.js');
    console.log('3. 验证数据库迁移结果');
  }

  return !hasIssues;
}

// 执行验证
if (require.main === module) {
  const success = verifyFileReferences();
  process.exit(success ? 0 : 1);
}

module.exports = { verifyFileReferences };
