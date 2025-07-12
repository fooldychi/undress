const { query } = require('../config/database');

async function addComfyUIConfig() {
  try {
    console.log('🔧 添加ComfyUI配置项...');

    const comfyuiConfigs = [
      // ComfyUI服务器配置
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
      ['frontend.version', '1.0.0', 'string', 'frontend', '应用版本']
    ];

    for (const [key, value, type, group, desc] of comfyuiConfigs) {
      await query(`
        INSERT INTO system_config (config_key, config_value, config_type, config_group, description)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE 
          config_value = VALUES(config_value),
          updated_at = CURRENT_TIMESTAMP
      `, [key, value, type, group, desc]);
    }
    
    console.log(`✅ 添加了 ${comfyuiConfigs.length} 个ComfyUI配置项`);

    // 验证结果
    const configs = await query('SELECT config_group, COUNT(*) as count FROM system_config GROUP BY config_group');
    console.log('\n📊 配置分组统计:');
    configs.forEach(config => {
      console.log(`  ${config.config_group}: ${config.count} 项`);
    });

    console.log('\n🎉 ComfyUI配置添加完成！');

  } catch (error) {
    console.error('❌ 添加ComfyUI配置失败:', error);
    throw error;
  }
}

if (require.main === module) {
  addComfyUIConfig()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('💥 失败:', error);
      process.exit(1);
    });
}

module.exports = { addComfyUIConfig };

