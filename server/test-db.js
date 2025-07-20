// 测试数据库连接和表结构
const { query } = require('./src/config/database');

async function testDatabase() {
  try {
    console.log('🔍 测试数据库连接...');
    
    // 1. 测试基本连接
    await query('SELECT 1 as test');
    console.log('✅ 数据库连接正常');
    
    // 2. 检查表是否存在
    const tables = await query("SHOW TABLES LIKE 'card_types'");
    console.log('📋 card_types表存在:', tables.length > 0);
    
    if (tables.length > 0) {
      // 3. 检查表结构
      const structure = await query('DESCRIBE card_types');
      console.log('📊 card_types表结构:');
      structure.forEach(col => {
        console.log(`  ${col.Field}: ${col.Type} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
      });
      
      // 4. 检查数据
      const data = await query('SELECT * FROM card_types ORDER BY points ASC');
      console.log('📝 card_types表数据:');
      data.forEach(row => {
        console.log(`  ID:${row.id} ${row.icon} ${row.name} - ${row.points}积分 - ¥${row.price}`);
      });
    } else {
      console.log('⚠️ card_types表不存在，尝试创建...');
      
      // 创建表
      await query(`
        CREATE TABLE IF NOT EXISTS card_types (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(50) NOT NULL COMMENT '等级卡名称',
          icon VARCHAR(10) NOT NULL COMMENT '等级卡图标',
          price DECIMAL(10,2) NOT NULL COMMENT '价格',
          points INT NOT NULL COMMENT '积分数量',
          description TEXT COMMENT '描述',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('✅ card_types表创建成功');
      
      // 插入初始数据
      await query(`
        INSERT INTO card_types (name, icon, price, points, description) VALUES
        ('体验卡', '🎁', 0.00, 20, '免费体验卡，每张20积分'),
        ('基础卡', '🥉', 9.90, 300, '适合轻度使用的用户'),
        ('高级卡', '🥈', 30.00, 1000, '适合中度使用的用户'),
        ('至尊卡', '🥇', 50.00, 2000, '适合重度使用的用户')
      `);
      console.log('✅ 初始数据插入成功');
    }
    
    // 5. 检查level_cards表
    const levelCardsTables = await query("SHOW TABLES LIKE 'level_cards'");
    console.log('📋 level_cards表存在:', levelCardsTables.length > 0);
    
    if (levelCardsTables.length > 0) {
      const cardCount = await query('SELECT COUNT(*) as count FROM level_cards');
      console.log('📊 level_cards表记录数:', cardCount[0].count);
    }
    
    // 6. 测试获取等级卡类型的查询
    console.log('\n🧪 测试获取等级卡类型查询...');
    const cardTypes = await query(`
      SELECT id, name, icon, points, price, created_at
      FROM card_types
      ORDER BY points ASC
    `);
    console.log('✅ 查询成功，返回', cardTypes.length, '条记录');
    
  } catch (error) {
    console.error('❌ 数据库测试失败:', error);
    console.error('错误详情:', {
      message: error.message,
      code: error.code,
      sqlState: error.sqlState,
      sqlMessage: error.sqlMessage
    });
  }
}

testDatabase();
