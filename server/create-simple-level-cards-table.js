// 创建简单的 level_cards 表，避免MySQL版本兼容性问题
const { query } = require('./src/config/database');

async function createSimpleLevelCardsTable() {
  try {
    console.log('🔧 创建简单的 level_cards 表...\n');

    // 1. 删除现有表（如果存在）
    console.log('🗑️ 删除现有表（如果存在）...');
    try {
      await query('DROP TABLE IF EXISTS level_cards');
      console.log('✅ 现有表已删除');
    } catch (error) {
      console.log('⚠️ 删除表失败或表不存在:', error.message);
    }

    // 2. 创建简单的表结构
    console.log('🔧 创建新的 level_cards 表...');
    await query(`
      CREATE TABLE level_cards (
        id INT AUTO_INCREMENT PRIMARY KEY,
        card_number VARCHAR(20) UNIQUE NOT NULL,
        card_password VARCHAR(20) NOT NULL,
        type_id INT NOT NULL,
        remaining_points INT NOT NULL,
        status VARCHAR(20) DEFAULT 'active',
        bound_user_id INT NULL,
        bound_at DATETIME NULL,
        expires_at DATETIME NULL,
        created_at DATETIME NULL,
        updated_at DATETIME NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('✅ level_cards 表创建成功');

    // 3. 验证表结构
    console.log('\n📋 验证表结构...');
    const structure = await query('DESCRIBE level_cards');
    console.log('📊 表结构:');
    structure.forEach(col => {
      console.log(`  ${col.Field}: ${col.Type} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${col.Default ? `DEFAULT ${col.Default}` : ''}`);
    });

    // 4. 测试插入数据
    console.log('\n🧪 测试插入数据...');
    try {
      await query(`
        INSERT INTO level_cards (card_number, card_password, type_id, remaining_points, created_at)
        VALUES ('TEST001', 'TESTPASS', 1, 100, NOW())
      `);
      console.log('✅ 测试插入成功');

      // 查询测试数据
      const testData = await query("SELECT * FROM level_cards WHERE card_number = 'TEST001'");
      console.log('📊 插入的数据:', testData[0]);

      // 删除测试数据
      await query("DELETE FROM level_cards WHERE card_number = 'TEST001'");
      console.log('✅ 测试数据已清理');
    } catch (insertError) {
      console.log('❌ 测试插入失败:', insertError.message);
    }

    console.log('\n🎉 简单的 level_cards 表创建完成！');

  } catch (error) {
    console.error('❌ 创建表失败:', error);
  }
}

// 运行创建
createSimpleLevelCardsTable();
