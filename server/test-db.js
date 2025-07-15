const { query, testConnection } = require('./src/config/database');

async function testDatabase() {
  console.log('🔍 测试数据库连接和表结构...');

  try {
    // 测试连接
    const connected = await testConnection();
    if (!connected) {
      console.error('❌ 数据库连接失败');
      return;
    }

    // 检查system_config表是否存在
    console.log('\n📋 检查system_config表...');
    try {
      const tables = await query("SHOW TABLES LIKE 'system_config'");
      if (tables.length === 0) {
        console.log('❌ system_config表不存在');

        // 创建表
        console.log('🔧 创建system_config表...');
        await query(`
          CREATE TABLE system_config (
            id INT AUTO_INCREMENT PRIMARY KEY,
            config_key VARCHAR(255) NOT NULL UNIQUE,
            config_value TEXT,
            config_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
            config_group VARCHAR(100) DEFAULT 'general',
            description TEXT,
            is_encrypted TINYINT(1) DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_config_group (config_group),
            INDEX idx_config_key (config_key)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✅ system_config表创建成功');

        // 插入默认配置
        console.log('📝 插入默认配置...');
        const defaultConfigs = [
          ['comfyui.server_url', 'https://l9s75ay3rp-8188.cnb.run', 'string', 'comfyui', 'ComfyUI主服务器地址'],
          ['comfyui.backup_servers', 'https://0rv00xh2vg-8188.cnb.run', 'string', 'comfyui', 'ComfyUI备用服务器地址列表'],
          ['comfyui.health_check_timeout', '10000', 'number', 'comfyui', 'ComfyUI健康检查超时时间(毫秒)'],
          ['comfyui.timeout', '300000', 'number', 'comfyui', 'ComfyUI请求超时时间(毫秒)'],
          ['ai.face_swap_points', '20', 'number', 'ai', '换脸消耗积分'],
          ['ai.undress_points', '20', 'number', 'ai', '换衣消耗积分']
        ];

        for (const [key, value, type, group, desc] of defaultConfigs) {
          await query(
            'INSERT INTO system_config (config_key, config_value, config_type, config_group, description) VALUES (?, ?, ?, ?, ?)',
            [key, value, type, group, desc]
          );
        }
        console.log('✅ 默认配置插入成功');

      } else {
        console.log('✅ system_config表存在');
      }

      // 查询现有配置
      console.log('\n📊 当前配置:');
      const configs = await query('SELECT * FROM system_config ORDER BY config_group, config_key');
      configs.forEach(config => {
        console.log(`   ${config.config_key}: ${config.config_value} (${config.config_type})`);
      });

    } catch (error) {
      console.error('❌ 检查表结构失败:', error);
    }

  } catch (error) {
    console.error('❌ 数据库测试失败:', error);
  }

  process.exit(0);
}

testDatabase();
