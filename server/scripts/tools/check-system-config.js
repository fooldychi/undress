require('dotenv').config({ path: './server/.env' });
const mysql = require('mysql2/promise');

async function checkSystemConfig() {
  console.log('🔍 检查系统配置表...\n');

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
    try {
      const [tables] = await connection.execute(`
        SHOW TABLES LIKE 'system_config'
      `);

      if (tables.length === 0) {
        console.log('❌ system_config表不存在，需要创建');

        // 创建system_config表
        await connection.execute(`
          CREATE TABLE system_config (
            id INT AUTO_INCREMENT PRIMARY KEY,
            config_key VARCHAR(100) NOT NULL UNIQUE,
            config_value TEXT,
            config_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
            config_category VARCHAR(50) DEFAULT 'general',
            description VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          )
        `);

        console.log('✅ system_config表创建成功');

        // 插入默认配置
        const defaultConfigs = [
          // 服务器配置
          ['server.port', '3006', 'number', 'server', '服务器端口'],
          ['server.host', 'localhost', 'string', 'server', '服务器主机'],

          // 数据库配置
          ['database.host', process.env.DB_HOST, 'string', 'database', '数据库主机'],
          ['database.port', process.env.DB_PORT, 'number', 'database', '数据库端口'],
          ['database.name', process.env.DB_NAME, 'string', 'database', '数据库名称'],

          // JWT配置
          ['jwt.secret', process.env.JWT_SECRET || 'your-secret-key', 'string', 'jwt', 'JWT密钥'],
          ['jwt.expires_in', '7d', 'string', 'jwt', 'JWT过期时间'],

          // ComfyUI配置
          ['comfyui.server_url', 'https://your-comfyui-server.com', 'string', 'comfyui', 'ComfyUI服务器地址'],
          ['comfyui.client_id', 'your-comfyui-client-id', 'string', 'comfyui', 'ComfyUI客户端ID'],
          ['comfyui.timeout', '300000', 'number', 'comfyui', 'ComfyUI请求超时时间(毫秒)'],

          // AI功能配置
          ['ai.text_to_image_points', '20', 'number', 'ai', '文生图消耗积分'],
          ['ai.face_swap_points', '20', 'number', 'ai', '换脸消耗积分'],
          ['ai.undress_points', '20', 'number', 'ai', '换衣消耗积分'],

          // 前端配置
          ['frontend.api_base_url', 'https://your-api-server.com/api', 'string', 'frontend', '前端API基础地址'],
          ['frontend.title', 'AI Magic - AI图像处理平台', 'string', 'frontend', '应用标题'],
          ['frontend.version', '1.0.0', 'string', 'frontend', '应用版本'],

          // CORS配置
          ['cors.allowed_origins', 'http://localhost:3000,http://localhost:3001,http://localhost:3007', 'string', 'cors', '允许的跨域源'],

          // 文件上传配置
          ['upload.max_file_size', '10485760', 'number', 'upload', '最大文件大小(字节)'],
          ['upload.allowed_types', 'jpg,jpeg,png,gif', 'string', 'upload', '允许的文件类型'],

          // 日志配置
          ['log.level', 'info', 'string', 'log', '日志级别'],
          ['log.file_path', './logs/app.log', 'string', 'log', '日志文件路径']
        ];

        for (const config of defaultConfigs) {
          await connection.execute(`
            INSERT INTO system_config (config_key, config_value, config_type, config_category, description)
            VALUES (?, ?, ?, ?, ?)
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
        console.log(`   ${col.Field}: ${col.Type} ${col.Null === 'YES' ? '(可空)' : '(非空)'}`);
      });

      // 查询现有配置
      const [configs] = await connection.execute(`
        SELECT * FROM system_config LIMIT 10
      `);

      console.log('\n🎯 现有配置示例:');
      configs.forEach(config => {
        console.log(`   ${config.config_key || config.key}: ${config.config_value || config.value}`);
      });

    } catch (error) {
      console.error('❌ 检查配置表失败:', error.message);
    }

    await connection.end();

  } catch (error) {
    console.error('❌ 数据库连接失败:', error.message);
  }
}

checkSystemConfig();

