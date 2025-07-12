require('dotenv').config({ path: './server/.env' });
const mysql = require('mysql2/promise');

async function fixBackupConfig() {
  console.log('🔧 修复ComfyUI备用服务器配置...\n');
  
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
    
    // 查看修复前的配置
    console.log('📋 修复前的ComfyUI配置:');
    const [beforeConfigs] = await connection.execute(`
      SELECT config_key, config_value, description
      FROM system_config
      WHERE config_group = 'comfyui'
      ORDER BY config_key
    `);
    
    beforeConfigs.forEach(config => {
      console.log(`   ${config.config_key}: ${config.config_value}`);
    });
    
    // 修复配置
    const fixes = [
      // 设置合理的备用服务器地址
      ['comfyui.backup_servers', 'https://767s5wnv59-8188.cnb.run/,https://your-comfyui-server.com/'],
      // 设置合理的重试次数
      ['comfyui.retry_attempts', '3'],
      // 设置合理的切换阈值（1次失败就切换）
      ['comfyui.switch_threshold', '1']
    ];
    
    console.log('\n🔧 应用配置修复...');
    
    for (const [key, value] of fixes) {
      try {
        await connection.execute(`
          UPDATE system_config 
          SET config_value = ? 
          WHERE config_key = ?
        `, [value, key]);
        
        console.log(`✅ 更新配置: ${key} = ${value}`);
      } catch (error) {
        console.log(`❌ 更新配置失败: ${key} - ${error.message}`);
      }
    }
    
    // 查看修复后的配置
    console.log('\n📋 修复后的ComfyUI配置:');
    const [afterConfigs] = await connection.execute(`
      SELECT config_key, config_value, description
      FROM system_config
      WHERE config_group = 'comfyui'
      ORDER BY config_key
    `);
    
    afterConfigs.forEach(config => {
      console.log(`   ${config.config_key}: ${config.config_value}`);
    });
    
    console.log('\n🎉 配置修复完成！');
    
    await connection.end();
    
  } catch (error) {
    console.error('❌ 修复失败:', error.message);
  }
}

fixBackupConfig();
