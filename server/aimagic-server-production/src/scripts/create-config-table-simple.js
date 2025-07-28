const { query } = require('../config/database');

async function createConfigTable() {
  try {
    console.log('🔧 开始创建配置表...');

    // 1. 删除 admin_login_logs 表
    console.log('🗑️ 删除 admin_login_logs 表...');
    await query('DROP TABLE IF EXISTS admin_login_logs');
    console.log('✅ admin_login_logs 表已删除');

    // 2. 创建 system_config 表
    console.log('📝 创建 system_config 表...');
    await query(`
      CREATE TABLE IF NOT EXISTS system_config (
        id int(11) NOT NULL AUTO_INCREMENT,
        config_key varchar(100) NOT NULL,
        config_value text,
        config_type varchar(20) DEFAULT 'string',
        config_group varchar(50) DEFAULT 'general',
        description varchar(255) DEFAULT NULL,
        is_encrypted tinyint(1) DEFAULT 0,
        created_at timestamp DEFAULT CURRENT_TIMESTAMP,
        updated_at datetime DEFAULT NULL,
        PRIMARY KEY (id),
        UNIQUE KEY uk_config_key (config_key)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('✅ system_config 表创建成功');

    // 3. 插入默认配置
    console.log('📊 插入默认配置...');
    const configs = [
      // 服务器配置
      ['server.port', '3007', 'number', 'server', '服务器端口'],
      ['server.node_env', 'development', 'string', 'server', '运行环境'],

      // 数据库配置
      ['database.host', '114.132.50.71', 'string', 'database', '数据库主机'],
      ['database.port', '3306', 'number', 'database', '数据库端口'],
      ['database.name', 'aimagic', 'string', 'database', '数据库名称'],
      ['database.user', 'aimagic', 'string', 'database', '数据库用户名'],
      ['database.password', 'dFLJYsd82irJwHX5', 'string', 'database', '数据库密码'],

      // JWT配置
      ['jwt.secret', 'aimagic.icomfy.co^~^', 'string', 'jwt', 'JWT密钥'],
      ['jwt.expires_in', '7d', 'string', 'jwt', 'JWT过期时间'],

      // CORS配置
      ['cors.origin', 'http://localhost:3001,http://localhost:3003', 'string', 'cors', '允许的跨域源'],

      // ComfyUI配置
      ['comfyui.server_url', 'https://your-comfyui-server.com', 'string', 'comfyui', 'ComfyUI主服务器地址'],
      ['comfyui.backup_servers', '', 'string', 'comfyui', 'ComfyUI备用服务器地址列表（每行一个）'],
      ['comfyui.request_timeout', '30000', 'number', 'comfyui', 'ComfyUI请求超时时间（毫秒）'],
      ['comfyui.health_check_timeout', '10000', 'number', 'comfyui', 'ComfyUI健康检查超时时间（毫秒）'],
      ['comfyui.auto_switch', 'true', 'boolean', 'comfyui', '是否自动切换到备用服务器'],
      ['comfyui.client_id', '', 'string', 'comfyui', 'ComfyUI客户端ID'],
      ['comfyui.max_retries', '3', 'number', 'comfyui', '最大重试次数'],

      // AI服务配置
      ['ai.text_to_image_points', '10', 'number', 'ai', '文生图消耗积分'],
      ['ai.face_swap_points', '5', 'number', 'ai', '换脸消耗积分'],
      ['ai.clothing_swap_points', '8', 'number', 'ai', '换装消耗积分'],

      // 前端配置
      ['frontend.version', '1.0.0', 'string', 'frontend', '前端版本'],
      ['frontend.title', 'AI Magic', 'string', 'frontend', '应用标题'],

      // 上传配置
      ['upload.max_file_size', '10485760', 'number', 'upload', '最大文件大小(字节)'],
      ['upload.path', 'uploads/', 'string', 'upload', '上传路径'],

      // 日志配置
      ['log.level', 'info', 'string', 'log', '日志级别']
    ];

    for (const [key, value, type, group, desc] of configs) {
      await query(`
        INSERT INTO system_config (config_key, config_value, config_type, config_group, description)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE config_value = VALUES(config_value)
      `, [key, value, type, group, desc]);
    }

    console.log(`✅ 插入了 ${configs.length} 个配置项`);

    // 4. 验证结果
    const result = await query('SELECT COUNT(*) as count FROM system_config');
    console.log(`📊 配置表中共有 ${result[0].count} 个配置项`);

    console.log('🎉 配置表创建完成！');

  } catch (error) {
    console.error('❌ 创建配置表失败:', error);
    throw error;
  }
}

if (require.main === module) {
  createConfigTable()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('💥 失败:', error);
      process.exit(1);
    });
}

module.exports = { createConfigTable };
