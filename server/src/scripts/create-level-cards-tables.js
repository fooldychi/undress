// 创建等级卡相关数据库表
const { query } = require('../config/database');

async function createLevelCardsTables() {
  try {
    console.log('🗃️ 开始创建等级卡相关数据库表...');

    // 1. 创建等级卡类型表
    await query(`
      CREATE TABLE IF NOT EXISTS card_types (
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
    console.log('✅ 等级卡类型表创建成功');

    // 2. 创建等级卡表
    await query(`
      CREATE TABLE IF NOT EXISTS level_cards (
        id INT PRIMARY KEY AUTO_INCREMENT,
        card_number VARCHAR(20) UNIQUE NOT NULL COMMENT '卡号',
        card_password VARCHAR(20) NOT NULL COMMENT '卡密',
        type_id INT NOT NULL COMMENT '等级卡类型ID',
        total_points INT NOT NULL COMMENT '总积分',
        remaining_points INT NOT NULL COMMENT '剩余积分',
        status ENUM('active', 'used', 'expired', 'disabled') DEFAULT 'active' COMMENT '状态',
        bound_user_id INT NULL COMMENT '绑定的用户ID',
        bound_at TIMESTAMP NULL COMMENT '绑定时间',
        expires_at TIMESTAMP NULL COMMENT '过期时间',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (type_id) REFERENCES card_types(id),
        FOREIGN KEY (bound_user_id) REFERENCES users(id),
        INDEX idx_card_number (card_number),
        INDEX idx_bound_user (bound_user_id),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='等级卡表'
    `);
    console.log('✅ 等级卡表创建成功');

    // 3. 创建等级卡使用记录表
    await query(`
      CREATE TABLE IF NOT EXISTS level_card_transactions (
        id INT PRIMARY KEY AUTO_INCREMENT,
        card_id INT NOT NULL COMMENT '等级卡ID',
        user_id INT NOT NULL COMMENT '用户ID',
        type ENUM('bind', 'consume') NOT NULL COMMENT '交易类型',
        points_amount INT NOT NULL COMMENT '积分数量',
        remaining_points INT NOT NULL COMMENT '操作后剩余积分',
        description VARCHAR(255) COMMENT '描述',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (card_id) REFERENCES level_cards(id),
        FOREIGN KEY (user_id) REFERENCES users(id),
        INDEX idx_card_user (card_id, user_id),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='等级卡交易记录表'
    `);
    console.log('✅ 等级卡交易记录表创建成功');

    // 4. 插入等级卡类型数据
    console.log('📝 插入等级卡类型数据...');

    // 检查是否已有数据
    const existingTypes = await query('SELECT COUNT(*) as count FROM card_types');
    if (existingTypes[0].count === 0) {
      await query(`
        INSERT INTO card_types (name, icon, price, points, description) VALUES
        ('基础卡', '🥉', 9.90, 300, '适合轻度使用的用户'),
        ('高级卡', '🥈', 30.00, 1000, '适合中度使用的用户'),
        ('至尊卡', '🥇', 50.00, 2000, '适合重度使用的用户')
      `);
      console.log('✅ 等级卡类型数据插入成功');
    } else {
      console.log('ℹ️ 等级卡类型数据已存在，跳过插入');
    }

    console.log('🎉 等级卡数据库表创建完成！');

  } catch (error) {
    console.error('❌ 创建等级卡数据库表失败:', error);
    throw error;
  }
}

// 生成等级卡的函数
async function generateLevelCards() {
  try {
    console.log('🎫 开始生成等级卡...');

    // 获取等级卡类型
    const cardTypes = await query('SELECT * FROM card_types');

    for (const cardType of cardTypes) {
      console.log(`📋 生成${cardType.name}...`);

      // 为每种类型生成5张卡
      for (let i = 1; i <= 5; i++) {
        const cardNumber = generateCardNumber(cardType.name, i);
        const cardPassword = generateCardPassword();

        await query(`
          INSERT INTO level_cards (card_number, card_password, type_id, total_points, remaining_points, expires_at)
          VALUES (?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 1 YEAR))
        `, [cardNumber, cardPassword, cardType.id, cardType.points, cardType.points]);

        console.log(`  ✅ ${cardNumber} - ${cardPassword}`);
      }
    }

    console.log('🎉 等级卡生成完成！');

  } catch (error) {
    console.error('❌ 生成等级卡失败:', error);
    throw error;
  }
}

// 生成卡号
function generateCardNumber(cardName, index) {
  const prefix = {
    '基础卡': 'BC',
    '高级卡': 'AC',
    '至尊卡': 'PC'
  };

  const timestamp = Date.now().toString().slice(-6);
  return `${prefix[cardName]}${timestamp}${index.toString().padStart(2, '0')}`;
}

// 生成卡密
function generateCardPassword() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let password = '';
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// 如果直接运行此脚本
if (require.main === module) {
  (async () => {
    try {
      await createLevelCardsTables();
      await generateLevelCards();

      // 显示生成的卡片
      console.log('\n📋 生成的等级卡列表:');
      const cards = await query(`
        SELECT lc.card_number, lc.card_password, lct.name as type_name, lct.icon, lc.total_points
        FROM level_cards lc
        JOIN card_types lct ON lc.type_id = lct.id
        ORDER BY lct.id, lc.card_number
      `);

      console.log('\n' + '='.repeat(80));
      console.log('| 卡号          | 卡密     | 类型   | 积分  |');
      console.log('='.repeat(80));

      cards.forEach(card => {
        console.log(`| ${card.card_number.padEnd(12)} | ${card.card_password.padEnd(8)} | ${card.icon}${card.type_name.padEnd(4)} | ${card.total_points.toString().padEnd(4)} |`);
      });

      console.log('='.repeat(80));

      process.exit(0);
    } catch (error) {
      console.error('执行失败:', error);
      process.exit(1);
    }
  })();
}

module.exports = {
  createLevelCardsTables,
  generateLevelCards
};
