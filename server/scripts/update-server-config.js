require('dotenv').config({ path: './server/.env' });
const mysql = require('mysql2/promise');

async function updateServerConfig() {
  console.log('🔧 更新ComfyUI服务器配置...\n');
  
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
    
    // 查看更新前的配置
    console.log('📋 更新前的ComfyUI配置:');
    const [beforeConfigs] = await connection.execute(`
      SELECT config_key, config_value, description
      FROM system_config
      WHERE config_group = 'comfyui' AND config_key IN ('comfyui.server_url', 'comfyui.backup_servers')
      ORDER BY config_key
    `);
    
    beforeConfigs.forEach(config => {
      console.log(`   ${config.config_key}: ${config.config_value}`);
      console.log(`      描述: ${config.description}`);
    });
    
    // 更新配置
    const updates = [
      {
        key: 'comfyui.server_url',
        value: 'https://l9s75ay3rp-8188.cnb.run',
        description: 'ComfyUI主服务器地址'
      },
      {
        key: 'comfyui.backup_servers',
        value: 'https://0rv00xh2vg-8188.cnb.run',
        description: 'ComfyUI备用服务器地址列表（每行一个或逗号分隔）'
      }
    ];
    
    console.log('\n🔧 更新服务器配置...');
    
    for (const update of updates) {
      try {
        // 检查配置是否存在
        const [existing] = await connection.execute(`
          SELECT config_key FROM system_config WHERE config_key = ?
        `, [update.key]);
        
        if (existing.length > 0) {
          // 更新现有配置
          await connection.execute(`
            UPDATE system_config 
            SET config_value = ?, description = ?
            WHERE config_key = ?
          `, [update.value, update.description, update.key]);
          
          console.log(`✅ 更新配置: ${update.key} = ${update.value}`);
        } else {
          // 插入新配置
          await connection.execute(`
            INSERT INTO system_config (config_key, config_value, config_type, config_group, description, is_encrypted)
            VALUES (?, ?, 'string', 'comfyui', ?, 0)
          `, [update.key, update.value, update.description]);
          
          console.log(`✅ 添加配置: ${update.key} = ${update.value}`);
        }
      } catch (error) {
        console.log(`❌ 更新配置失败: ${update.key} - ${error.message}`);
      }
    }
    
    // 查看更新后的配置
    console.log('\n📋 更新后的ComfyUI配置:');
    const [afterConfigs] = await connection.execute(`
      SELECT config_key, config_value, description
      FROM system_config
      WHERE config_group = 'comfyui' AND config_key IN ('comfyui.server_url', 'comfyui.backup_servers')
      ORDER BY config_key
    `);
    
    afterConfigs.forEach(config => {
      console.log(`   ${config.config_key}: ${config.config_value}`);
      console.log(`      描述: ${config.description}`);
    });
    
    console.log('\n✅ 服务器配置更新完成!');
    console.log('\n📝 更新内容:');
    console.log('   主服务器: https://l9s75ay3rp-8188.cnb.run');
    console.log('   备用服务器: https://0rv00xh2vg-8188.cnb.run');
    console.log('\n💡 提示: 重启应用后新配置将生效');
    
    await connection.end();
    
  } catch (error) {
    console.error('❌ 更新失败:', error.message);
    process.exit(1);
  }
}

updateServerConfig();
