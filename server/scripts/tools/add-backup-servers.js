require('dotenv').config({ path: './server/.env' });
const mysql = require('mysql2/promise');

async function addBackupServers() {
  console.log('🔧 添加ComfyUI备用服务器配置...\n');
  
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
    
    // 查看添加前的ComfyUI配置
    console.log('📋 添加前的ComfyUI配置:');
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
    
    // 添加备用服务器配置
    const backupConfigs = [
      ['comfyui.backup_servers', 'https://backup1.your-domain.com,https://backup2.comfyui.com', 'string', 'comfyui', 'ComfyUI备用服务器地址列表(逗号分隔)', 0],
      ['comfyui.auto_switch', 'true', 'boolean', 'comfyui', '是否启用自动切换备用服务器', 0],
      ['comfyui.health_check_timeout', '10000', 'number', 'comfyui', '服务器健康检查超时时间(毫秒)', 0],
      ['comfyui.retry_attempts', '3', 'number', 'comfyui', '服务器重试次数', 0],
      ['comfyui.switch_threshold', '2', 'number', 'comfyui', '连续失败多少次后切换服务器', 0]
    ];
    
    console.log('\n🔧 添加备用服务器配置...');
    
    for (const config of backupConfigs) {
      try {
        // 检查配置是否已存在
        const [existing] = await connection.execute(`
          SELECT config_key FROM system_config WHERE config_key = ?
        `, [config[0]]);
        
        if (existing.length > 0) {
          console.log(`⚠️ 配置 ${config[0]} 已存在，跳过`);
          continue;
        }
        
        // 插入新配置
        await connection.execute(`
          INSERT INTO system_config (config_key, config_value, config_type, config_group, description, is_encrypted)
          VALUES (?, ?, ?, ?, ?, ?)
        `, config);
        
        console.log(`✅ 添加配置: ${config[0]} = ${config[1]}`);
      } catch (error) {
        console.log(`❌ 添加配置失败: ${config[0]} - ${error.message}`);
      }
    }
    
    // 查看添加后的ComfyUI配置
    console.log('\n📋 添加后的ComfyUI配置:');
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
    
    console.log(`\n📊 配置结果: ${beforeConfigs.length} → ${afterConfigs.length} 项配置`);
    
    await connection.end();
    
  } catch (error) {
    console.error('❌ 添加失败:', error.message);
  }
}

addBackupServers();
