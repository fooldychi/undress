// 检查现有的 level_cards 表结构
const { query } = require('./src/config/database');

async function checkExistingTable() {
  try {
    console.log('🔍 检查现有的 level_cards 表结构...\n');

    // 1. 检查表是否存在
    const tableExists = await query("SHOW TABLES LIKE 'level_cards'");
    if (tableExists.length === 0) {
      console.log('❌ level_cards 表不存在');
      return;
    }

    console.log('✅ level_cards 表存在');

    // 2. 查看表结构
    console.log('\n📋 表结构:');
    const structure = await query('DESCRIBE level_cards');
    structure.forEach(col => {
      console.log(`  ${col.Field}: ${col.Type} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${col.Default ? `DEFAULT ${col.Default}` : ''} ${col.Extra || ''}`);
    });

    // 3. 查看创建表的SQL
    console.log('\n📄 创建表的SQL:');
    try {
      const createTable = await query('SHOW CREATE TABLE level_cards');
      console.log(createTable[0]['Create Table']);
    } catch (error) {
      console.log('❌ 无法获取创建表的SQL:', error.message);
    }

    // 4. 查看数据量
    const dataCount = await query('SELECT COUNT(*) as count FROM level_cards');
    console.log(`\n📊 数据量: ${dataCount[0].count} 条记录`);

    // 5. 查看最近的几条记录
    if (dataCount[0].count > 0) {
      console.log('\n📝 最近的记录:');
      const recentData = await query('SELECT * FROM level_cards ORDER BY id DESC LIMIT 3');
      recentData.forEach(row => {
        console.log(`  ID:${row.id} ${row.card_number} - ${row.card_password} (类型:${row.type_id}, 积分:${row.remaining_points})`);
      });
    }

    // 6. 测试插入
    console.log('\n🧪 测试插入数据...');
    try {
      const testCardNumber = `TEST${Date.now()}`;
      await query(`
        INSERT INTO level_cards (card_number, card_password, type_id, remaining_points)
        VALUES (?, 'TESTPASS', 1, 100)
      `, [testCardNumber]);
      
      console.log('✅ 插入测试成功');
      
      // 删除测试数据
      await query('DELETE FROM level_cards WHERE card_number = ?', [testCardNumber]);
      console.log('✅ 测试数据已清理');
      
    } catch (insertError) {
      console.log('❌ 插入测试失败:', insertError.message);
      console.log('错误详情:', {
        code: insertError.code,
        sqlState: insertError.sqlState,
        sqlMessage: insertError.sqlMessage
      });
    }

  } catch (error) {
    console.error('❌ 检查失败:', error);
  }
}

// 运行检查
checkExistingTable();
