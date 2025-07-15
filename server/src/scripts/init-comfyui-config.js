const { query } = require('../config/database');

async function initComfyUIConfig() {
  try {
    console.log('🔧 初始化ComfyUI配置...');

    // ComfyUI配置项
    const comfyuiConfigs = [
      {
        config_key: 'comfyui.server_url',
        config_value: 'https://your-comfyui-server.com',
        config_type: 'string',
        config_group: 'comfyui',
        description: 'ComfyUI主服务器地址',
        is_encrypted: 0
      },
      {
        config_key: 'comfyui.backup_servers',
        config_value: '',
        config_type: 'string',
        config_group: 'comfyui',
        description: 'ComfyUI备用服务器地址列表（每行一个或逗号分隔）',
        is_encrypted: 0
      },
      {
        config_key: 'comfyui.request_timeout',
        config_value: '30000',
        config_type: 'number',
        config_group: 'comfyui',
        description: 'ComfyUI请求超时时间（毫秒）',
        is_encrypted: 0
      },
      {
        config_key: 'comfyui.health_check_timeout',
        config_value: '10000',
        config_type: 'number',
        config_group: 'comfyui',
        description: 'ComfyUI健康检查超时时间（毫秒）',
        is_encrypted: 0
      },
      {
        config_key: 'comfyui.auto_switch',
        config_value: 'true',
        config_type: 'boolean',
        config_group: 'comfyui',
        description: '是否自动切换到备用服务器',
        is_encrypted: 0
      },
      {
        config_key: 'comfyui.client_id',
        config_value: '',
        config_type: 'string',
        config_group: 'comfyui',
        description: 'ComfyUI客户端ID',
        is_encrypted: 0
      },
      {
        config_key: 'comfyui.max_retries',
        config_value: '3',
        config_type: 'number',
        config_group: 'comfyui',
        description: '最大重试次数',
        is_encrypted: 0
      }
    ];

    // 检查并插入配置
    for (const config of comfyuiConfigs) {
      // 检查配置是否已存在
      const existing = await query(
        'SELECT id FROM system_config WHERE config_key = ?',
        [config.config_key]
      );

      if (existing.length === 0) {
        // 插入新配置
        await query(`
          INSERT INTO system_config (
            config_key, config_value, config_type, config_group,
            description, is_encrypted, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, NOW())
        `, [
          config.config_key,
          config.config_value,
          config.config_type,
          config.config_group,
          config.description,
          config.is_encrypted
        ]);

        console.log(`✅ 添加配置: ${config.config_key}`);
      } else {
        console.log(`ℹ️ 配置已存在: ${config.config_key}`);
      }
    }

    // 删除旧的基础配置和AI服务配置（如果存在）
    const configsToRemove = [
      'system.name',
      'system.description',
      'system.default_points',
      'ai.face_swap_enabled',
      'ai.clothing_swap_enabled',
      'ai.text_to_image_enabled'
    ];

    for (const configKey of configsToRemove) {
      const result = await query(
        'DELETE FROM system_config WHERE config_key = ?',
        [configKey]
      );

      if (result.affectedRows > 0) {
        console.log(`🗑️ 删除旧配置: ${configKey}`);
      }
    }

    console.log('🎉 ComfyUI配置初始化完成！');

    // 显示当前配置
    const allConfigs = await query(`
      SELECT config_key, config_value, description
      FROM system_config
      WHERE config_group = 'comfyui'
      ORDER BY config_key
    `);

    console.log('\n📋 当前ComfyUI配置:');
    allConfigs.forEach(config => {
      console.log(`  ${config.config_key}: ${config.config_value} (${config.description})`);
    });

  } catch (error) {
    console.error('❌ 初始化ComfyUI配置失败:', error);
    throw error;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  initComfyUIConfig()
    .then(() => {
      console.log('✅ 脚本执行完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 脚本执行失败:', error);
      process.exit(1);
    });
}

module.exports = { initComfyUIConfig };
