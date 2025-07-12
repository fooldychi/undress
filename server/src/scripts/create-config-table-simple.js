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
      ['server.port', '3006', 'number', 'server', '服务器端口'],
      ['server.node_env', 'development', 'string', 'server', '运行环境'],
      ['database.host', 'your-database-host.com', 'string', 'database', '数据库主机'],
      ['database.port', '3306', 'number', 'database', '数据库端口'],
      ['database.name', 'aimagic', 'string', 'database', '数据库名称'],
      ['database.user', 'aimagic', 'string', 'database', '数据库用户名'],
      ['database.password', 'your-database-password', 'string', 'database', '数据库密码'],
      ['jwt.secret', 'your-super-secret-jwt-key-change-this-in-production', 'string', 'jwt', 'JWT密钥'],
      ['jwt.expires_in', '7d', 'string', 'jwt', 'JWT过期时间'],
      ['cors.origin', 'http://localhost:3000', 'string', 'cors', '允许的跨域源'],
      ['upload.max_file_size', '10485760', 'number', 'upload', '最大文件大小(字节)'],
      ['upload.path', 'uploads/', 'string', 'upload', '上传路径'],
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
