const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkDatabase() {
  let connection;
  try {
    console.log('🔍 检查数据库连接和表结构...');
    
    // 创建数据库连接
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'aimagic',
      charset: 'utf8mb4'
    });

    console.log('✅ 数据库连接成功');
    console.log(`📊 数据库: ${process.env.DB_NAME || 'aimagic'}`);

    // 检查现有表
    const [tables] = await connection.execute('SHOW TABLES');
    console.log('\n📋 现有数据表:');
    tables.forEach(table => {
      const tableName = Object.values(table)[0];
      console.log(`  - ${tableName}`);
    });

    // 检查是否存在工作流相关表
    const workflowTables = tables.filter(table => {
      const tableName = Object.values(table)[0];
      return tableName.includes('workflow');
    });

    if (workflowTables.length === 0) {
      console.log('\n❌ 未找到工作流相关表，需要创建');
      return false;
    } else {
      console.log('\n✅ 找到工作流相关表:');
      workflowTables.forEach(table => {
        const tableName = Object.values(table)[0];
        console.log(`  - ${tableName}`);
      });
      return true;
    }

  } catch (error) {
    console.error('❌ 数据库检查失败:', error.message);
    console.error('详细错误:', error);
    return false;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkDatabase().then(exists => {
  if (exists) {
    console.log('\n🎉 数据库表检查完成，工作流表已存在');
  } else {
    console.log('\n⚠️ 需要创建工作流表');
  }
  process.exit(0);
}).catch(error => {
  console.error('❌ 检查过程失败:', error);
  process.exit(1);
});
