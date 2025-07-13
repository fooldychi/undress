require('dotenv').config();
const mysql = require('mysql2/promise');

async function fixConfigDatabase() {
  let connection;
  try {
    console.log('🔍 开始修复配置管理数据...');
    
    // 连接数据库
    console.log('📡 连接数据库...');
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });
    console.log('✅ 数据库连接成功');
    
    // 检查并创建system_config表
    console.log('📝 检查system_config表...');
    const [tables] = await connection.execute('SHOW TABLES LIKE "system_config"');
    
    if (tables.length === 0) {
      console.log('📝 创建system_config表...');
      await connection.execute(`
        CREATE TABLE system_config (
          id int(11) NOT NULL AUTO_INCREMENT,
          config_key varchar(100) NOT NULL,
          config_value text,
          config_type varchar(20) DEFAULT 'string',
          config_group varchar(50) DEFAULT 'general',
          description varchar(255) DEFAULT NULL,
          is_encrypted tinyint(1) DEFAULT 0,
          created_at timestamp DEFAULT CURRENT_TIMESTAMP,
          updated_at timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY uk_config_key (config_key)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      console.log('✅ system_config表创建成功');
    } else {
      console.log('✅ system_config表已存在');
    }
    
    // 检查现有配置数据
    const [existingConfigs] = await connection.execute('SELECT COUNT(*) as count FROM system_config');
    console.log(`📊 当前配置数量: ${existingConfigs[0].count}`);
    
    // 插入或更新配置数据
    console.log('📊 插入/更新配置数据...');
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
    
    let insertCount = 0;
    let updateCount = 0;
    
    for (const [key, value, type, group, desc] of configs) {
      const [existing] = await connection.execute(
        'SELECT id FROM system_config WHERE config_key = ?',
        [key]
      );
      
      if (existing.length === 0) {
        await connection.execute(`
          INSERT INTO system_config (config_key, config_value, config_type, config_group, description)
          VALUES (?, ?, ?, ?, ?)
        `, [key, value, type, group, desc]);
        insertCount++;
        console.log(`✅ 新增配置: ${key}`);
      } else {
        await connection.execute(`
          UPDATE system_config 
          SET config_value = ?, config_type = ?, config_group = ?, description = ?, updated_at = NOW()
          WHERE config_key = ?
        `, [value, type, group, desc, key]);
        updateCount++;
        console.log(`🔄 更新配置: ${key}`);
      }
    }
    
    console.log(`📊 配置处理完成: 新增 ${insertCount} 个，更新 ${updateCount} 个`);
    
    // 验证结果
    const [finalConfigs] = await connection.execute('SELECT COUNT(*) as count FROM system_config');
    console.log(`📊 最终配置数量: ${finalConfigs[0].count}`);
    
    // 显示ComfyUI配置
    const [comfyuiConfigs] = await connection.execute(`
      SELECT config_key, config_value 
      FROM system_config 
      WHERE config_group = 'comfyui' 
      ORDER BY config_key
    `);
    
    console.log('\n📋 ComfyUI配置:');
    comfyuiConfigs.forEach(config => {
      console.log(`   ${config.config_key}: ${config.config_value}`);
    });
    
    await connection.end();
    console.log('🎉 配置管理数据修复完成！');
    
  } catch (error) {
    console.error('❌ 修复失败:', error.message);
    if (connection) {
      await connection.end();
    }
    throw error;
  }
}

// 运行修复
fixConfigDatabase()
  .then(() => {
    console.log('✅ 修复脚本执行成功');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ 修复脚本执行失败:', error);
    process.exit(1);
  });
