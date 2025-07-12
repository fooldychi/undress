const { query } = require('../config/database');

async function manageDatabaseTables() {
  try {
    console.log('🔧 开始管理数据库表...');

    // 1. 删除不需要的 admin_login_logs 表
    console.log('🗑️ 删除 admin_login_logs 表...');
    try {
      await query('DROP TABLE IF EXISTS admin_login_logs');
      console.log('✅ admin_login_logs 表已删除');
    } catch (error) {
      console.log('ℹ️ admin_login_logs 表不存在或已删除');
    }

    // 2. 创建 system_config 表
    console.log('📝 创建 system_config 表...');
    await query(`
      CREATE TABLE IF NOT EXISTS system_config (
        id int(11) NOT NULL AUTO_INCREMENT,
        config_key varchar(100) NOT NULL COMMENT '配置键名',
        config_value text COMMENT '配置值',
        config_type varchar(20) DEFAULT 'string' COMMENT '配置类型: string, number, boolean, json',
        config_group varchar(50) DEFAULT 'general' COMMENT '配置分组: database, server, jwt, cors, upload, log',
        description varchar(255) DEFAULT NULL COMMENT '配置描述',
        is_encrypted tinyint(1) DEFAULT 0 COMMENT '是否加密存储',
        created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uk_config_key (config_key),
        KEY idx_config_group (config_group)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='系统配置表'
    `);
    console.log('✅ system_config 表创建成功');

    // 3. 插入默认配置数据
    console.log('📊 插入默认配置数据...');
    
    const defaultConfigs = [
      // 服务器配置
      ['server.port', '3006', 'number', 'server', '服务器端口'],
      ['server.node_env', 'development', 'string', 'server', '运行环境'],
      
      // 数据库配置
      ['database.host', 'your-database-host.com', 'string', 'database', '数据库主机'],
      ['database.port', '3306', 'number', 'database', '数据库端口'],
      ['database.name', 'aimagic', 'string', 'database', '数据库名称'],
      ['database.user', 'aimagic', 'string', 'database', '数据库用户名'],
      ['database.password', 'your-database-password', 'string', 'database', '数据库密码'],
      
      // JWT配置
      ['jwt.secret', 'your-super-secret-jwt-key-change-this-in-production', 'string', 'jwt', 'JWT密钥'],
      ['jwt.expires_in', '7d', 'string', 'jwt', 'JWT过期时间'],
      
      // CORS配置
      ['cors.origin', 'http://localhost:3000', 'string', 'cors', '允许的跨域源'],
      
      // 文件上传配置
      ['upload.max_file_size', '10485760', 'number', 'upload', '最大文件大小(字节)'],
      ['upload.path', 'uploads/', 'string', 'upload', '上传路径'],
      
      // 日志配置
      ['log.level', 'info', 'string', 'log', '日志级别']
    ];

    for (const [key, value, type, group, desc] of defaultConfigs) {
      await query(`
        INSERT INTO system_config (config_key, config_value, config_type, config_group, description)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE 
          config_value = VALUES(config_value),
          updated_at = CURRENT_TIMESTAMP
      `, [key, value, type, group, desc]);
    }
    
    console.log(`✅ 插入了 ${defaultConfigs.length} 个默认配置`);

    // 4. 验证结果
    console.log('🔍 验证数据库表结构...');
    const tables = await query('SHOW TABLES');
    console.log('📋 当前数据库表:');
    tables.forEach(table => {
      const tableName = Object.values(table)[0];
      console.log('  -', tableName);
    });

    // 5. 验证配置数据
    const configs = await query('SELECT config_group, COUNT(*) as count FROM system_config GROUP BY config_group');
    console.log('\n📊 配置数据统计:');
    configs.forEach(config => {
      console.log(`  ${config.config_group}: ${config.count} 项`);
    });

    console.log('\n🎉 数据库管理完成！');

  } catch (error) {
    console.error('❌ 数据库管理失败:', error);
    throw error;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  manageDatabaseTables()
    .then(() => {
      console.log('✅ 数据库管理成功完成');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 数据库管理失败:', error);
      process.exit(1);
    });
}

module.exports = { manageDatabaseTables };
