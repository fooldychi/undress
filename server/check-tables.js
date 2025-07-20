// 检查数据库表结构
const { query } = require('./src/config/database');

async function checkTables() {
  try {
    console.log('🔍 检查数据库表结构...\n');

    // 1. 检查 card_types 表
    console.log('📋 检查 card_types 表:');
    try {
      const cardTypesStructure = await query('DESCRIBE card_types');
      console.log('✅ card_types 表结构:');
      cardTypesStructure.forEach(col => {
        console.log(`  ${col.Field}: ${col.Type} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${col.Key ? `(${col.Key})` : ''}`);
      });

      // 检查数据
      const cardTypesData = await query('SELECT * FROM card_types LIMIT 3');
      console.log(`📊 card_types 数据 (${cardTypesData.length} 条):`);
      cardTypesData.forEach(row => {
        console.log(`  ID:${row.id} ${row.icon || '🎫'} ${row.name} - ${row.points}积分 - ¥${row.price}`);
      });
    } catch (error) {
      console.log('❌ card_types 表不存在或查询失败:', error.message);
    }

    console.log('\n' + '='.repeat(60) + '\n');

    // 2. 检查 level_cards 表
    console.log('📋 检查 level_cards 表:');
    try {
      const levelCardsStructure = await query('DESCRIBE level_cards');
      console.log('✅ level_cards 表结构:');
      levelCardsStructure.forEach(col => {
        console.log(`  ${col.Field}: ${col.Type} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${col.Key ? `(${col.Key})` : ''}`);
      });

      // 检查数据
      const levelCardsCount = await query('SELECT COUNT(*) as count FROM level_cards');
      console.log(`📊 level_cards 数据: ${levelCardsCount[0].count} 条记录`);

      if (levelCardsCount[0].count > 0) {
        const sampleData = await query('SELECT * FROM level_cards LIMIT 3');
        sampleData.forEach(row => {
          console.log(`  ${row.card_number} - ${row.card_password} (类型:${row.type_id})`);
        });
      }
    } catch (error) {
      console.log('❌ level_cards 表不存在或查询失败:', error.message);
    }

    console.log('\n' + '='.repeat(60) + '\n');

    // 3. 检查 admins 表
    console.log('📋 检查 admins 表:');
    try {
      const adminsStructure = await query('DESCRIBE admins');
      console.log('✅ admins 表结构:');
      adminsStructure.forEach(col => {
        console.log(`  ${col.Field}: ${col.Type} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${col.Key ? `(${col.Key})` : ''}`);
      });

      const adminsCount = await query('SELECT COUNT(*) as count FROM admins');
      console.log(`📊 admins 数据: ${adminsCount[0].count} 条记录`);
    } catch (error) {
      console.log('❌ admins 表不存在或查询失败:', error.message);
    }

    console.log('\n' + '='.repeat(60) + '\n');

    // 4. 显示所有表
    console.log('📋 数据库中的所有表:');
    try {
      const tables = await query('SHOW TABLES');
      tables.forEach(table => {
        const tableName = Object.values(table)[0];
        console.log(`  📄 ${tableName}`);
      });
    } catch (error) {
      console.log('❌ 获取表列表失败:', error.message);
    }

  } catch (error) {
    console.error('❌ 检查表结构失败:', error);
  }
}

// 运行检查
checkTables();
