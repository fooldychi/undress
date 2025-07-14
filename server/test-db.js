console.log('测试数据库连接...');

require('dotenv').config();

async function testDatabase() {
  try {
    const mysql = require('mysql2/promise');
    
    const dbConfig = {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      connectTimeout: 10000,
      acquireTimeout: 10000,
      timeout: 10000
    };
    
    console.log('数据库配置:', {
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      database: dbConfig.database
    });
    
    console.log('正在连接数据库...');
    const connection = await mysql.createConnection(dbConfig);
    
    console.log('✅ 数据库连接成功');
    
    // 测试查询
    const [rows] = await connection.execute('SELECT 1 as test');
    console.log('✅ 数据库查询测试成功:', rows);
    
    await connection.end();
    console.log('✅ 数据库连接已关闭');
    
  } catch (error) {
    console.error('❌ 数据库连接失败:', error.message);
    console.error('错误详情:', error);
  }
}

testDatabase();
