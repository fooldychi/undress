require('dotenv').config();
const mysql = require('mysql2/promise');

async function checkDatabase() {
  let connection;
  try {
    console.log('🔍 连接数据库...');
    console.log('数据库配置:', {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      database: process.env.DB_NAME
    });
    
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });
    
    console.log('✅ 数据库连接成功');
    
    console.log('🔍 检查 system_config 表...');
    const [tables] = await connection.execute('SHOW TABLES LIKE "system_config"');
    if (tables.length === 0) {
      console.log('❌ system_config 表不存在');
      await connection.end();
      return;
    }
    console.log('✅ system_config 表存在');
    
    console.log('🔍 检查配置数据...');
    const [configs] = await connection.execute('SELECT config_key, config_value, config_group FROM system_config ORDER BY config_group, config_key');
    console.log(`📊 配置表中共有 ${configs.length} 条记录`);
    
    if (configs.length === 0) {
      console.log('❌ 配置表为空，需要初始化数据');
    } else {
      console.log('📋 现有配置:');
      configs.forEach(config => {
        console.log(`   ${config.config_group}.${config.config_key} = ${config.config_value}`);
      });
    }
    
    await connection.end();
    
  } catch (error) {
    console.error('❌ 检查失败:', error.message);
    if (connection) {
      await connection.end();
    }
  }
}

checkDatabase();
