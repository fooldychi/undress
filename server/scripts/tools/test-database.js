require('dotenv').config({ path: './server/.env' });
const mysql = require('mysql2/promise');

async function testDatabaseConnection() {
  console.log('🔍 测试数据库连接...\n');
  console.log('📋 数据库配置:');
  console.log(`   主机: ${process.env.DB_HOST}`);
  console.log(`   端口: ${process.env.DB_PORT}`);
  console.log(`   数据库: ${process.env.DB_NAME}`);
  console.log(`   用户: ${process.env.DB_USER}`);
  console.log('');

  try {
    // 直接创建连接测试
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      charset: 'utf8mb4'
    });

    console.log('✅ 数据库连接成功');
    console.log(`📍 连接到: ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`);

    // 使用连接进行查询
    const query = async (sql, params = []) => {
      const [rows] = await connection.execute(sql, params);
      return rows;
    };

    console.log('\n📊 检查数据库表结构...');

    // 检查用户表
    try {
      const users = await query('SELECT COUNT(*) as count FROM users');
      console.log(`✅ users 表: ${users[0].count} 条记录`);
    } catch (error) {
      console.log('❌ users 表不存在或有问题');
    }

    // 检查等级卡表
    try {
      const cards = await query('SELECT COUNT(*) as count FROM level_cards');
      console.log(`✅ level_cards 表: ${cards[0].count} 条记录`);
    } catch (error) {
      console.log('❌ level_cards 表不存在或有问题');
    }

    // 检查积分记录表
    try {
      const pointLogs = await query('SELECT COUNT(*) as count FROM point_logs');
      console.log(`✅ point_logs 表: ${pointLogs[0].count} 条记录`);
    } catch (error) {
      console.log('❌ point_logs 表不存在或有问题');
    }

    // 检查管理员表
    try {
      const admins = await query('SELECT COUNT(*) as count FROM admins');
      console.log(`✅ admins 表: ${admins[0].count} 条记录`);
    } catch (error) {
      console.log('❌ admins 表不存在或有问题');
    }

    // 检查卡片类型表
    try {
      const cardTypes = await query('SELECT COUNT(*) as count FROM card_types');
      console.log(`✅ card_types 表: ${cardTypes[0].count} 条记录`);
    } catch (error) {
      console.log('❌ card_types 表不存在或有问题');
    }

    console.log('\n🎯 测试管理员登录数据...');

    // 检查管理员账号
    try {
      const adminUser = await query('SELECT username FROM admins WHERE username = ?', ['admin']);
      if (adminUser.length > 0) {
        console.log('✅ 管理员账号存在: admin');
      } else {
        console.log('❌ 管理员账号不存在');
      }
    } catch (error) {
      console.log('❌ 无法检查管理员账号');
    }

    console.log('\n🎉 数据库连接测试完成！');

    // 关闭连接
    await connection.end();

  } catch (error) {
    console.error('❌ 数据库测试失败:', error.message);
    console.error('详细错误:', error);
  }

  process.exit(0);
}

testDatabaseConnection();
