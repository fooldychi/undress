require('dotenv').config({ path: './server/.env' });
const mysql = require('mysql2/promise');

async function removeClientIdConfig() {
  console.log('🗑️ 删除ComfyUI客户端ID配置项...\n');
  
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
    
    // 查看删除前的配置
    console.log('📋 删除前的ComfyUI配置:');
    const [beforeConfigs] = await connection.execute(`
      SELECT config_key, config_value, description
      FROM system_config
      WHERE config_group = 'comfyui'
      ORDER BY config_key
    `);
    
    beforeConfigs.forEach(config => {
      console.log(`   ${config.config_key}: ${config.config_value}`);
      console.log(`      描述: ${config.description}`);
    });
    
    // 删除客户端ID配置
    console.log('\n🗑️ 删除comfyui.client_id配置项...');
    const result = await connection.execute(`
      DELETE FROM system_config 
      WHERE config_key = 'comfyui.client_id'
    `);
    
    if (result[0].affectedRows > 0) {
      console.log('✅ 成功删除comfyui.client_id配置项');
    } else {
      console.log('⚠️ 未找到comfyui.client_id配置项');
    }
    
    // 查看删除后的配置
    console.log('\n📋 删除后的ComfyUI配置:');
    const [afterConfigs] = await connection.execute(`
      SELECT config_key, config_value, description
      FROM system_config
      WHERE config_group = 'comfyui'
      ORDER BY config_key
    `);
    
    afterConfigs.forEach(config => {
      console.log(`   ${config.config_key}: ${config.config_value}`);
      console.log(`      描述: ${config.description}`);
    });
    
    console.log(`\n📊 删除结果: ${beforeConfigs.length} → ${afterConfigs.length} 项配置`);
    
    await connection.end();
    
  } catch (error) {
    console.error('❌ 删除失败:', error.message);
  }
}

removeClientIdConfig();
