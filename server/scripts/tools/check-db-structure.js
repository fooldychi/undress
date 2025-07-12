require('dotenv').config({ path: './server/.env' });
const mysql = require('mysql2/promise');

async function checkDatabaseStructure() {
  console.log('🔍 检查数据库表结构...\n');
  
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
    
    // 检查system_config表是否存在
    const [tables] = await connection.execute(`
      SHOW TABLES LIKE 'system_config'
    `);
    
    if (tables.length === 0) {
      console.log('❌ system_config表不存在');
      
      // 创建system_config表
      console.log('🔧 创建system_config表...');
      await connection.execute(`
        CREATE TABLE system_config (
          id INT AUTO_INCREMENT PRIMARY KEY,
          config_key VARCHAR(100) NOT NULL UNIQUE,
          config_value TEXT,
          config_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
          config_group VARCHAR(50) DEFAULT 'general',
          description VARCHAR(255),
          is_encrypted TINYINT(1) DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);
      
      console.log('✅ system_config表创建成功');
      
      // 插入默认配置
      const defaultConfigs = [
        // ComfyUI配置
        ['comfyui.server_url', 'https://your-comfyui-server.com', 'string', 'comfyui', 'ComfyUI服务器地址', 0],
        ['comfyui.client_id', 'your-comfyui-client-id', 'string', 'comfyui', 'ComfyUI客户端ID', 0],
        ['comfyui.timeout', '300000', 'number', 'comfyui', 'ComfyUI请求超时时间(毫秒)', 0],
        
        // AI功能配置
        ['ai.text_to_image_points', '20', 'number', 'ai', '文生图消耗积分', 0],
        ['ai.face_swap_points', '20', 'number', 'ai', '换脸消耗积分', 0],
        ['ai.undress_points', '20', 'number', 'ai', '换衣消耗积分', 0],
        
        // 服务器配置
        ['server.port', '3006', 'number', 'server', '服务器端口', 0],
        ['server.node_env', 'development', 'string', 'server', '运行环境', 0],
        
        // 数据库配置
        ['database.host', process.env.DB_HOST, 'string', 'database', '数据库主机', 0],
        ['database.port', process.env.DB_PORT, 'number', 'database', '数据库端口', 0],
        ['database.name', process.env.DB_NAME, 'string', 'database', '数据库名称', 0],
        ['database.user', process.env.DB_USER, 'string', 'database', '数据库用户名', 0],
        ['database.password', process.env.DB_PASSWORD, 'string', 'database', '数据库密码', 1],
        
        // JWT配置
        ['jwt.secret', process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production', 'string', 'jwt', 'JWT密钥', 1],
        ['jwt.expires_in', '7d', 'string', 'jwt', 'JWT过期时间', 0],
        
        // 前端配置
        ['frontend.api_base_url', 'https://your-api-server.com/api', 'string', 'frontend', '前端API基础地址', 0],
        ['frontend.title', 'AI Magic - AI图像处理平台', 'string', 'frontend', '应用标题', 0],
        ['frontend.version', '1.0.0', 'string', 'frontend', '应用版本', 0],
        
        // 跨域配置
        ['cors.origin', 'http://localhost:3000', 'string', 'cors', '允许的跨域源', 0],
        
        // 上传配置
        ['upload.max_file_size', '10485760', 'number', 'upload', '最大文件大小(字节)', 0],
        ['upload.path', 'uploads/', 'string', 'upload', '上传路径', 0],
        
        // 日志配置
        ['log.level', 'info', 'string', 'log', '日志级别', 0]
      ];
      
      for (const config of defaultConfigs) {
        await connection.execute(`
          INSERT INTO system_config (config_key, config_value, config_type, config_group, description, is_encrypted)
          VALUES (?, ?, ?, ?, ?, ?)
        `, config);
      }
      
      console.log(`✅ 插入了${defaultConfigs.length}条默认配置`);
      
    } else {
      console.log('✅ system_config表已存在');
    }
    
    // 查看表结构
    const [columns] = await connection.execute(`
      DESCRIBE system_config
    `);
    
    console.log('\n📋 system_config表结构:');
    columns.forEach(col => {
      console.log(`   ${col.Field}: ${col.Type} ${col.Null === 'YES' ? '(可空)' : '(非空)'} ${col.Key ? `[${col.Key}]` : ''}`);
    });
    
    // 查询现有配置统计
    const [stats] = await connection.execute(`
      SELECT config_group, COUNT(*) as count
      FROM system_config
      GROUP BY config_group
      ORDER BY config_group
    `);
    
    console.log('\n📊 配置统计:');
    stats.forEach(stat => {
      console.log(`   ${stat.config_group}: ${stat.count} 项配置`);
    });
    
    // 查询ComfyUI配置示例
    const [comfyuiConfigs] = await connection.execute(`
      SELECT config_key, config_value, description
      FROM system_config
      WHERE config_group = 'comfyui'
      ORDER BY config_key
    `);
    
    console.log('\n🎯 ComfyUI配置示例:');
    comfyuiConfigs.forEach(config => {
      console.log(`   ${config.config_key}: ${config.config_value}`);
      console.log(`      描述: ${config.description}`);
    });
    
    await connection.end();
    
  } catch (error) {
    console.error('❌ 检查失败:', error.message);
  }
}

checkDatabaseStructure();
