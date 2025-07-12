require('dotenv').config({ path: './server/.env' });
const mysql = require('mysql2/promise');

async function checkCardTypes() {
  console.log('🔍 检查数据库中的卡片类型...\n');

  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      charset: 'utf8mb4'
    });

    console.log('✅ 数据库连接成功\n');

    // 查询卡片类型
    const [cardTypes] = await connection.execute(`
      SELECT id, name, icon, points, price, created_at
      FROM card_types
      ORDER BY points ASC
    `);

    console.log('📋 数据库中的卡片类型:');
    cardTypes.forEach(type => {
      console.log(`   ${type.icon} ${type.name}: ${type.points}积分 - ¥${type.price}`);
      console.log(`      ID: ${type.id}`);
    });

    console.log('\n🎯 前端应该使用的卡片类型选项:');
    cardTypes.forEach(type => {
      console.log(`   { label: '${type.icon} ${type.name} (${type.points}积分)', value: '${type.name}', id: ${type.id} }`);
    });

    await connection.end();

  } catch (error) {
    console.error('❌ 检查失败:', error.message);
  }
}

checkCardTypes();
