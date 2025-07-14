// 验证脚本：检查 card_types 表统一使用情况
const fs = require('fs');
const path = require('path');
const { query } = require('../src/config/database');

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

// 检查数据库表状态
async function checkDatabaseTables() {
  try {
    console.log('🔍 检查数据库表状态...');

    // 检查 card_types 表是否存在
    const cardTypesExists = await query(`
      SELECT COUNT(*) as count
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
      AND table_name = 'card_types'
    `);

    // 检查 level_card_types 表是否还存在
    const levelCardTypesExists = await query(`
      SELECT COUNT(*) as count
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
      AND table_name = 'level_card_types'
    `);

    // 检查 level_cards 表的外键约束
    const foreignKeys = await query(`
      SELECT
        CONSTRAINT_NAME,
        REFERENCED_TABLE_NAME,
        REFERENCED_COLUMN_NAME
      FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'level_cards'
      AND REFERENCED_TABLE_NAME IS NOT NULL
    `);

    return {
      cardTypesExists: cardTypesExists[0].count > 0,
      levelCardTypesExists: levelCardTypesExists[0].count > 0,
      foreignKeys
    };
  } catch (error) {
    return { error: error.message };
  }
}

// 检查 card_types 表数据
async function checkCardTypesData() {
  try {
    const cardTypes = await query('SELECT * FROM card_types ORDER BY points ASC');
    return cardTypes;
  } catch (error) {
    return { error: error.message };
  }
}

// 主验证函数
async function verifyMigration() {
  console.log('🔍 开始验证 card_types 表统一使用情况...\n');

  let hasIssues = false;

  // 1. 检查文件中的引用
  console.log('📁 检查文件中的 level_card_types 引用:');
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

  console.log('\n🗄️ 检查数据库表状态:');

  // 2. 检查数据库表状态
  let dbStatus;
  try {
    dbStatus = await checkDatabaseTables();
  } catch (error) {
    console.log(`⚠️ 数据库连接失败，跳过数据库检查: ${error.message}`);
    dbStatus = { error: '数据库连接失败' };
  }
  if (dbStatus.error) {
    console.log(`⚠️ 数据库检查失败: ${dbStatus.error}`);
    // 不将数据库连接问题视为错误
  } else {
    if (dbStatus.cardTypesExists) {
      console.log('✅ card_types 表存在');
    } else {
      console.log('❌ card_types 表不存在');
      hasIssues = true;
    }

    if (dbStatus.levelCardTypesExists) {
      console.log('⚠️ level_card_types 表仍然存在（需要运行迁移脚本）');
      hasIssues = true;
    } else {
      console.log('✅ level_card_types 表已删除');
    }

    console.log('\n🔗 外键约束检查:');
    if (dbStatus.foreignKeys && dbStatus.foreignKeys.length > 0) {
      dbStatus.foreignKeys.forEach(fk => {
        if (fk.REFERENCED_TABLE_NAME === 'card_types') {
          console.log(`✅ ${fk.CONSTRAINT_NAME}: level_cards -> card_types`);
        } else {
          console.log(`⚠️ ${fk.CONSTRAINT_NAME}: level_cards -> ${fk.REFERENCED_TABLE_NAME}`);
          if (fk.REFERENCED_TABLE_NAME === 'level_card_types') {
            hasIssues = true;
          }
        }
      });
    } else {
      console.log('⚠️ 没有找到外键约束');
    }
  }

  // 3. 检查 card_types 表数据
  if (!dbStatus.error) {
    console.log('\n📊 检查 card_types 表数据:');
    const cardTypesData = await checkCardTypesData();
    if (cardTypesData.error) {
      console.log(`⚠️ 无法获取 card_types 数据: ${cardTypesData.error}`);
    } else {
      console.log(`✅ card_types 表包含 ${cardTypesData.length} 条记录:`);
      cardTypesData.forEach(type => {
        console.log(`   ${type.icon} ${type.name} - ${type.points}积分 - ¥${type.price}`);
      });
    }
  }

  // 4. 总结
  console.log('\n📋 验证总结:');
  if (hasIssues) {
    console.log('❌ 发现问题，需要进一步处理');
    console.log('\n建议操作:');
    if (dbStatus.levelCardTypesExists) {
      console.log('1. 运行迁移脚本: node server/scripts/migrate-card-types.js');
    }
    console.log('2. 检查并修复上述文件中的 level_card_types 引用');
  } else {
    console.log('✅ 所有检查通过，card_types 表统一使用成功！');
  }

  return !hasIssues;
}

// 执行验证
if (require.main === module) {
  verifyMigration()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('❌ 验证过程出错:', error);
      process.exit(1);
    });
}

module.exports = { verifyMigration };
