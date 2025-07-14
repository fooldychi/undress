// 数据迁移脚本：将 level_card_types 表数据迁移到 card_types 表
const { query } = require('../src/config/database');

async function migrateCardTypes() {
  try {
    console.log('🔄 开始数据迁移：level_card_types -> card_types');

    // 1. 检查 level_card_types 表是否存在
    const checkOldTable = await query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() 
      AND table_name = 'level_card_types'
    `);

    if (checkOldTable[0].count === 0) {
      console.log('ℹ️ level_card_types 表不存在，无需迁移');
      return;
    }

    // 2. 检查 card_types 表是否存在，如果不存在则创建
    const checkNewTable = await query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() 
      AND table_name = 'card_types'
    `);

    if (checkNewTable[0].count === 0) {
      console.log('📝 创建 card_types 表...');
      await query(`
        CREATE TABLE card_types (
          id INT PRIMARY KEY AUTO_INCREMENT,
          name VARCHAR(50) NOT NULL COMMENT '等级卡名称',
          icon VARCHAR(10) NOT NULL COMMENT '等级卡图标',
          price DECIMAL(10,2) NOT NULL COMMENT '价格',
          points INT NOT NULL COMMENT '积分数量',
          description TEXT COMMENT '描述',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='等级卡类型表'
      `);
      console.log('✅ card_types 表创建成功');
    }

    // 3. 检查 level_card_types 表中是否有数据
    const oldData = await query('SELECT * FROM level_card_types');
    
    if (oldData.length === 0) {
      console.log('ℹ️ level_card_types 表中没有数据，跳过数据迁移');
    } else {
      console.log(`📊 发现 ${oldData.length} 条数据需要迁移`);

      // 4. 检查 card_types 表中是否已有数据
      const existingData = await query('SELECT * FROM card_types');
      
      if (existingData.length > 0) {
        console.log('⚠️ card_types 表中已有数据，将跳过重复数据的迁移');
        
        // 检查每条数据是否已存在
        for (const oldRecord of oldData) {
          const existing = await query(
            'SELECT id FROM card_types WHERE name = ? AND points = ?',
            [oldRecord.name, oldRecord.points]
          );
          
          if (existing.length === 0) {
            // 插入不存在的数据
            await query(`
              INSERT INTO card_types (name, icon, price, points, description, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
              oldRecord.name,
              oldRecord.icon,
              oldRecord.price,
              oldRecord.points,
              oldRecord.description,
              oldRecord.created_at,
              oldRecord.updated_at
            ]);
            console.log(`✅ 迁移数据: ${oldRecord.name}`);
          } else {
            console.log(`ℹ️ 跳过重复数据: ${oldRecord.name}`);
          }
        }
      } else {
        // 5. 直接迁移所有数据
        console.log('📋 开始迁移数据...');
        for (const oldRecord of oldData) {
          await query(`
            INSERT INTO card_types (name, icon, price, points, description, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `, [
            oldRecord.name,
            oldRecord.icon,
            oldRecord.price,
            oldRecord.points,
            oldRecord.description,
            oldRecord.created_at,
            oldRecord.updated_at
          ]);
          console.log(`✅ 迁移数据: ${oldRecord.name}`);
        }
      }
    }

    // 6. 检查 level_cards 表是否存在外键约束
    console.log('🔍 检查外键约束...');
    const foreignKeys = await query(`
      SELECT CONSTRAINT_NAME 
      FROM information_schema.KEY_COLUMN_USAGE 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'level_cards' 
      AND REFERENCED_TABLE_NAME = 'level_card_types'
    `);

    // 7. 删除外键约束（如果存在）
    if (foreignKeys.length > 0) {
      console.log('🔧 删除外键约束...');
      for (const fk of foreignKeys) {
        await query(`ALTER TABLE level_cards DROP FOREIGN KEY ${fk.CONSTRAINT_NAME}`);
        console.log(`✅ 删除外键约束: ${fk.CONSTRAINT_NAME}`);
      }
    }

    // 8. 更新 level_cards 表的外键引用
    console.log('🔧 更新 level_cards 表的外键引用...');
    
    // 检查是否需要更新 type_id
    const cardsNeedUpdate = await query(`
      SELECT lc.id, lc.type_id, lct.name 
      FROM level_cards lc 
      JOIN level_card_types lct ON lc.type_id = lct.id
    `);

    if (cardsNeedUpdate.length > 0) {
      console.log(`📊 需要更新 ${cardsNeedUpdate.length} 条等级卡记录的 type_id`);
      
      for (const card of cardsNeedUpdate) {
        // 查找对应的新 type_id
        const newType = await query(
          'SELECT id FROM card_types WHERE name = ?',
          [card.name]
        );
        
        if (newType.length > 0) {
          await query(
            'UPDATE level_cards SET type_id = ? WHERE id = ?',
            [newType[0].id, card.id]
          );
          console.log(`✅ 更新等级卡 ${card.id} 的 type_id: ${card.type_id} -> ${newType[0].id}`);
        }
      }
    }

    // 9. 添加新的外键约束
    console.log('🔧 添加新的外键约束...');
    await query(`
      ALTER TABLE level_cards 
      ADD CONSTRAINT fk_level_cards_card_types 
      FOREIGN KEY (type_id) REFERENCES card_types(id)
    `);
    console.log('✅ 新外键约束添加成功');

    // 10. 删除旧表
    console.log('🗑️ 删除 level_card_types 表...');
    await query('DROP TABLE level_card_types');
    console.log('✅ level_card_types 表删除成功');

    console.log('🎉 数据迁移完成！');

    // 11. 显示迁移后的数据
    const finalData = await query('SELECT * FROM card_types ORDER BY points ASC');
    console.log('\n📋 迁移后的卡片类型:');
    finalData.forEach(type => {
      console.log(`${type.icon} ${type.name} - ${type.points}积分 - ¥${type.price}`);
    });

  } catch (error) {
    console.error('❌ 数据迁移失败:', error);
    throw error;
  }
}

// 执行迁移
if (require.main === module) {
  migrateCardTypes()
    .then(() => {
      console.log('✅ 迁移完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 迁移失败:', error);
      process.exit(1);
    });
}

module.exports = { migrateCardTypes };
