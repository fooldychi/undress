// 修复 level_cards 表的创建问题
const { query } = require('./src/config/database');

async function fixLevelCardsTable() {
  try {
    console.log('🔧 修复 level_cards 表...\n');

    // 1. 检查表是否存在
    console.log('📋 检查 level_cards 表是否存在...');
    try {
      const tableExists = await query("SHOW TABLES LIKE 'level_cards'");
      if (tableExists.length > 0) {
        console.log('⚠️ level_cards 表已存在，检查表结构...');
        
        // 检查表结构
        const structure = await query('DESCRIBE level_cards');
        console.log('📊 当前表结构:');
        structure.forEach(col => {
          console.log(`  ${col.Field}: ${col.Type} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${col.Default ? `DEFAULT ${col.Default}` : ''}`);
        });

        // 检查是否有数据
        const dataCount = await query('SELECT COUNT(*) as count FROM level_cards');
        console.log(`📊 当前数据量: ${dataCount[0].count} 条`);

        if (dataCount[0].count === 0) {
          console.log('🗑️ 表中无数据，删除并重新创建...');
          await query('DROP TABLE level_cards');
          console.log('✅ 旧表已删除');
        } else {
          console.log('⚠️ 表中有数据，尝试修改表结构...');
          try {
            // 尝试修改 created_at 字段
            await query('ALTER TABLE level_cards MODIFY created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
            await query('ALTER TABLE level_cards MODIFY updated_at TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP');
            console.log('✅ 表结构修改成功');
            return;
          } catch (alterError) {
            console.log('❌ 修改表结构失败:', alterError.message);
            console.log('⚠️ 建议手动备份数据后重新创建表');
            return;
          }
        }
      } else {
        console.log('📋 level_cards 表不存在，将创建新表');
      }
    } catch (error) {
      console.log('❌ 检查表失败:', error.message);
    }

    // 2. 创建新表
    console.log('🔧 创建 level_cards 表...');
    await query(`
      CREATE TABLE level_cards (
        id INT AUTO_INCREMENT PRIMARY KEY,
        card_number VARCHAR(20) UNIQUE NOT NULL COMMENT '卡号',
        card_password VARCHAR(20) NOT NULL COMMENT '卡密',
        type_id INT NOT NULL COMMENT '等级卡类型ID',
        remaining_points INT NOT NULL COMMENT '剩余积分',
        status ENUM('active', 'used', 'expired', 'disabled') DEFAULT 'active' COMMENT '状态',
        bound_user_id INT NULL COMMENT '绑定的用户ID',
        bound_at DATETIME NULL COMMENT '绑定时间',
        expires_at DATETIME NULL COMMENT '过期时间',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_card_number (card_number),
        INDEX idx_bound_user (bound_user_id),
        INDEX idx_status (status),
        INDEX idx_type (type_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='等级卡表'
    `);
    console.log('✅ level_cards 表创建成功');

    // 3. 验证表结构
    console.log('\n📋 验证新表结构...');
    const newStructure = await query('DESCRIBE level_cards');
    console.log('📊 新表结构:');
    newStructure.forEach(col => {
      console.log(`  ${col.Field}: ${col.Type} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${col.Default ? `DEFAULT ${col.Default}` : ''}`);
    });

    // 4. 测试插入数据
    console.log('\n🧪 测试插入数据...');
    try {
      await query(`
        INSERT INTO level_cards (card_number, card_password, type_id, remaining_points)
        VALUES ('TEST001', 'TESTPASS', 1, 100)
      `);
      console.log('✅ 测试插入成功');

      // 删除测试数据
      await query("DELETE FROM level_cards WHERE card_number = 'TEST001'");
      console.log('✅ 测试数据已清理');
    } catch (insertError) {
      console.log('❌ 测试插入失败:', insertError.message);
    }

    console.log('\n🎉 level_cards 表修复完成！');

  } catch (error) {
    console.error('❌ 修复失败:', error);
  }
}

// 运行修复
fixLevelCardsTable();
