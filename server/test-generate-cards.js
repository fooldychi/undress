// 直接测试生成等级卡接口
const { query } = require('./src/config/database');

async function testGenerateCards() {
  try {
    console.log('🧪 测试生成等级卡功能...\n');

    // 1. 检查表结构
    console.log('📋 检查表结构...');

    try {
      const cardTypesStructure = await query('DESCRIBE card_types');
      console.log('✅ card_types 表结构:');
      cardTypesStructure.forEach(col => {
        console.log(`  ${col.Field}: ${col.Type}`);
      });
    } catch (error) {
      console.log('❌ card_types 表不存在:', error.message);
    }

    try {
      const levelCardsStructure = await query('DESCRIBE level_cards');
      console.log('✅ level_cards 表结构:');
      levelCardsStructure.forEach(col => {
        console.log(`  ${col.Field}: ${col.Type}`);
      });
    } catch (error) {
      console.log('❌ level_cards 表不存在:', error.message);

      // 创建表
      console.log('🔧 创建 level_cards 表...');
      await query(`
        CREATE TABLE IF NOT EXISTS level_cards (
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
    }

    // 2. 获取等级卡类型
    console.log('\n📋 获取等级卡类型...');
    const cardTypes = await query('SELECT * FROM card_types LIMIT 1');

    if (cardTypes.length === 0) {
      console.log('❌ 没有找到等级卡类型');
      return;
    }

    const cardType = cardTypes[0];
    console.log('✅ 找到等级卡类型:', cardType);

    // 3. 生成测试卡号和密码
    console.log('\n🎫 生成测试等级卡...');

    function generateCardNumber(cardTypeName, index) {
      const typePrefix = {
        '基础卡': 'BC',
        '高级卡': 'AC',
        '至尊卡': 'PC',
        '体验卡': 'EXP'
      };

      const prefix = typePrefix[cardTypeName] || 'CARD';
      const timestamp = Date.now().toString().slice(-8);
      const indexStr = String(index).padStart(2, '0');

      return `${prefix}${timestamp}${indexStr}`;
    }

    function generateCardPassword() {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let password = '';
      for (let i = 0; i < 8; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return password;
    }

    const cardNumber = generateCardNumber(cardType.name, 1);
    const cardPassword = generateCardPassword();

    console.log(`📝 生成卡号: ${cardNumber}`);
    console.log(`🔑 生成卡密: ${cardPassword}`);

    // 4. 插入数据库
    console.log('\n💾 插入数据库...');

    try {
      await query(`
        INSERT INTO level_cards (card_number, card_password, type_id, remaining_points)
        VALUES (?, ?, ?, ?)
      `, [cardNumber, cardPassword, cardType.id, cardType.points]);

      console.log('✅ 等级卡生成成功！');

      // 验证插入
      const insertedCard = await query(`
        SELECT * FROM level_cards WHERE card_number = ?
      `, [cardNumber]);

      console.log('📊 插入的数据:', insertedCard[0]);

    } catch (insertError) {
      console.error('❌ 插入失败:', insertError);
      console.error('错误详情:', {
        message: insertError.message,
        code: insertError.code,
        sqlState: insertError.sqlState
      });
    }

  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

// 运行测试
testGenerateCards();
