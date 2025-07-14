// 快速初始化等级卡表
const { query } = require('./src/config/database');

async function initLevelCards() {
  try {
    console.log('🗃️ 开始创建等级卡相关数据库表...');

    // 1. 创建等级卡类型表
    console.log('📝 创建等级卡类型表...');
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
    console.log('✅ 等级卡类型表创建成功');

    // 2. 创建等级卡表
    console.log('📝 创建等级卡表...');
    await query(`
      CREATE TABLE IF NOT EXISTS level_cards (
        id INT AUTO_INCREMENT PRIMARY KEY,
        card_number VARCHAR(20) UNIQUE NOT NULL COMMENT '卡号',
        card_password VARCHAR(20) NOT NULL COMMENT '卡密',
        type_id INT NOT NULL COMMENT '等级卡类型ID',
        total_points INT NOT NULL COMMENT '总积分',
        remaining_points INT NOT NULL COMMENT '剩余积分',
        status ENUM('active', 'used', 'expired', 'disabled') DEFAULT 'active' COMMENT '状态',
        bound_user_id INT NULL COMMENT '绑定的用户ID',
        bound_at DATETIME NULL COMMENT '绑定时间',
        expires_at DATETIME NULL COMMENT '过期时间',
        created_at DATETIME NOT NULL,
        updated_at DATETIME NULL,
        INDEX idx_card_number (card_number),
        INDEX idx_bound_user (bound_user_id),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ 等级卡表创建成功');

    // 3. 插入等级卡类型数据（包含体验卡）
    const existingTypes = await query('SELECT COUNT(*) as count FROM card_types');
    if (existingTypes[0].count === 0) {
      await query(`
        INSERT INTO card_types (name, icon, price, points, description) VALUES
        ('体验卡', '🎁', 0.00, 20, '免费体验卡，每张20积分'),
        ('基础卡', '🥉', 9.90, 300, '适合轻度使用的用户'),
        ('高级卡', '🥈', 30.00, 1000, '适合中度使用的用户'),
        ('至尊卡', '🥇', 50.00, 2000, '适合重度使用的用户')
      `);
      console.log('✅ 等级卡类型数据插入成功');
    } else {
      console.log('ℹ️ 等级卡类型数据已存在，跳过插入');
    }

    console.log('🎉 等级卡数据库表初始化完成！');

    // 显示创建的类型
    const cardTypes = await query('SELECT * FROM card_types ORDER BY points ASC');
    console.log('\n📋 等级卡类型列表:');
    cardTypes.forEach(type => {
      console.log(`${type.icon} ${type.name} - ${type.points}积分 - ¥${type.price}`);
    });

  } catch (error) {
    console.error('❌ 初始化失败:', error);
    throw error;
  }
}

// 执行初始化
initLevelCards()
  .then(() => {
    console.log('✅ 初始化完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 初始化失败:', error);
    process.exit(1);
  });
