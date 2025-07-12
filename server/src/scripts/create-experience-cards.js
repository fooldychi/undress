// 创建体验卡系统
const { query } = require('../config/database');

async function createExperienceCardSystem() {
  try {
    console.log('🎫 开始创建体验卡系统...');

    // 1. 添加体验卡类型到card_types表
    console.log('📝 添加体验卡类型...');

    // 检查是否已存在体验卡类型
    const existingExperienceType = await query(`
      SELECT * FROM card_types WHERE name = '体验卡'
    `);

    let experienceTypeId;
    if (existingExperienceType.length === 0) {
      const result = await query(`
        INSERT INTO card_types (name, icon, price, points, description)
        VALUES ('体验卡', '🎁', 0.00, 20, '免费体验卡，每张20积分，不可叠加绑定')
      `);
      experienceTypeId = result.insertId;
      console.log('✅ 体验卡类型创建成功，ID:', experienceTypeId);
    } else {
      experienceTypeId = existingExperienceType[0].id;
      console.log('ℹ️ 体验卡类型已存在，ID:', experienceTypeId);
    }

    // 2. 批量生成20张体验卡
    console.log('🎫 开始生成20张体验卡...');

    const experienceCards = [];
    for (let i = 1; i <= 20; i++) {
      const cardNumber = generateExperienceCardNumber(i);
      const cardPassword = generateCardPassword();

      try {
        await query(`
          INSERT INTO level_cards (
            card_number,
            card_password,
            type_id,
            remaining_points,
            created_at
          )
          VALUES (?, ?, ?, 20, NOW())
        `, [cardNumber, cardPassword, experienceTypeId]);

        experienceCards.push({
          cardNumber,
          cardPassword,
          points: 20
        });

        console.log(`  ✅ 体验卡 ${i}/20: ${cardNumber} - ${cardPassword}`);
      } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
          console.log(`  ⚠️ 体验卡 ${cardNumber} 已存在，跳过`);
        } else {
          throw error;
        }
      }
    }

    console.log('🎉 体验卡生成完成！');

    // 3. 显示生成的体验卡列表
    console.log('\n📋 生成的体验卡列表:');
    const cards = await query(`
      SELECT lc.card_number, lc.card_password, lc.remaining_points, lc.created_at
      FROM level_cards lc
      JOIN card_types ct ON lc.type_id = ct.id
      WHERE ct.name = '体验卡'
      ORDER BY lc.created_at DESC
    `);

    console.log('\n' + '='.repeat(60));
    console.log('| 卡号            | 卡密     | 积分 | 创建时间      |');
    console.log('='.repeat(60));

    cards.forEach(card => {
      const createdAt = new Date(card.created_at).toLocaleString('zh-CN');
      console.log(`| ${card.card_number.padEnd(14)} | ${card.card_password.padEnd(8)} | ${card.remaining_points.toString().padEnd(4)} | ${createdAt} |`);
    });
    console.log('='.repeat(60));

    return {
      success: true,
      experienceTypeId,
      generatedCards: experienceCards,
      totalCards: cards.length
    };

  } catch (error) {
    console.error('❌ 创建体验卡系统失败:', error);
    throw error;
  }
}

// 生成体验卡号
function generateExperienceCardNumber(index) {
  const timestamp = Date.now().toString().slice(-6);
  return `EXP${timestamp}${index.toString().padStart(3, '0')}`;
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

// 检查用户是否已绑定体验卡
async function checkUserExperienceCardBinding(userId) {
  try {
    const result = await query(`
      SELECT COUNT(*) as count
      FROM level_cards lc
      JOIN card_types ct ON lc.type_id = ct.id
      WHERE lc.bound_user_id = ? AND ct.name = '体验卡'
    `, [userId]);

    return result[0].count > 0;
  } catch (error) {
    console.error('检查用户体验卡绑定状态失败:', error);
    throw error;
  }
}

// 获取可用的体验卡列表
async function getAvailableExperienceCards() {
  try {
    const cards = await query(`
      SELECT lc.id, lc.card_number, lc.card_password, lc.remaining_points
      FROM level_cards lc
      JOIN card_types ct ON lc.type_id = ct.id
      WHERE ct.name = '体验卡'
        AND lc.bound_user_id IS NULL
        AND lc.remaining_points > 0
      ORDER BY lc.created_at ASC
    `);

    return cards;
  } catch (error) {
    console.error('获取可用体验卡失败:', error);
    throw error;
  }
}

module.exports = {
  createExperienceCardSystem,
  checkUserExperienceCardBinding,
  getAvailableExperienceCards,
  generateExperienceCardNumber,
  generateCardPassword
};

// 如果直接运行此脚本
if (require.main === module) {
  (async () => {
    try {
      const result = await createExperienceCardSystem();
      console.log('\n🎉 体验卡系统创建完成！');
      console.log(`📊 统计信息:`);
      console.log(`   - 体验卡类型ID: ${result.experienceTypeId}`);
      console.log(`   - 生成卡片数量: ${result.generatedCards.length}`);
      console.log(`   - 数据库中总卡片: ${result.totalCards}`);

      process.exit(0);
    } catch (error) {
      console.error('❌ 脚本执行失败:', error);
      process.exit(1);
    }
  })();
}
