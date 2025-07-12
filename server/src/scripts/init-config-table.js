const { query } = require('../config/database');
const fs = require('fs');
const path = require('path');

async function initConfigTable() {
  try {
    console.log('🔧 开始初始化系统配置表...');

    // 读取SQL文件
    const sqlFile = path.join(__dirname, '../../sql/create_config_table.sql');
    const sqlContent = fs.readFileSync(sqlFile, 'utf8');

    // 分割SQL语句
    const statements = sqlContent.split(';').filter(stmt => stmt.trim());

    for (const statement of statements) {
      if (statement.trim()) {
        await query(statement);
      }
    }

    console.log('✅ 系统配置表初始化完成');

    // 验证数据
    const configs = await query('SELECT * FROM system_config ORDER BY config_group, config_key');
    console.log(`📊 共加载 ${configs.length} 个配置项`);

    // 按分组显示
    const groups = {};
    configs.forEach(config => {
      if (!groups[config.config_group]) {
        groups[config.config_group] = [];
      }
      groups[config.config_group].push(config);
    });

    console.log('\n📋 配置分组统计:');
    Object.keys(groups).forEach(group => {
      console.log(`  ${group}: ${groups[group].length} 项`);
    });

  } catch (error) {
    console.error('❌ 初始化配置表失败:', error);
    throw error;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  initConfigTable()
    .then(() => {
      console.log('🎉 配置表初始化完成');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 初始化失败:', error);
      process.exit(1);
    });
}

module.exports = { initConfigTable };
