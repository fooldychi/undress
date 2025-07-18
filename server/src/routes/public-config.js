const express = require('express');
const router = express.Router();
const { query } = require('../config/database');

// 获取前端公开配置（不需要认证）
router.get('/', async (req, res) => {
  try {
    console.log('📥 客户端请求公开配置...');

    // 使用环境变量或系统默认值作为备用配置
    const defaultConfigs = {
      'comfyui.server_url': process.env.COMFYUI_SERVER_URL || 'https://l9s75ay3rp-8188.cnb.run',
      'comfyui.backup_servers': process.env.COMFYUI_BACKUP_SERVERS || 'https://0rv00xh2vg-8188.cnb.run',
      'comfyui.health_check_timeout': parseInt(process.env.COMFYUI_HEALTH_CHECK_TIMEOUT || '10000'),
      'comfyui.timeout': parseInt(process.env.COMFYUI_TIMEOUT || '300000'),
      'ai.text_to_image_points': parseInt(process.env.AI_TEXT_TO_IMAGE_POINTS || '20'),
      'ai.face_swap_points': parseInt(process.env.AI_FACE_SWAP_POINTS || '20'),
      'ai.undress_points': parseInt(process.env.AI_UNDRESS_POINTS || '20')
    };

    try {
      // 尝试从数据库获取配置
      const configs = await query(`
        SELECT config_key, config_value, config_type
        FROM system_config
        WHERE config_group IN ('comfyui', 'ai', 'workflow')
        AND config_key NOT LIKE '%password%'
        AND config_key NOT LIKE '%secret%'
        ORDER BY config_group, config_key
      `);

      console.log(`📊 从数据库加载了${configs.length}项公开配置`);

      // 转换为前端需要的格式
      const configMap = {};
      configs.forEach(config => {
        let value = config.config_value;

        // 根据类型转换值
        if (config.config_type === 'number') {
          value = parseInt(value);
        } else if (config.config_type === 'boolean') {
          value = value === 'true' || value === '1';
        }

        configMap[config.config_key] = value;
      });

      // 合并默认配置和数据库配置
      const finalConfig = { ...defaultConfigs, ...configMap };

      console.log('📋 返回给客户端的配置:');
      console.log(`   ComfyUI主服务器: ${finalConfig['comfyui.server_url']}`);
      console.log(`   备用服务器: ${finalConfig['comfyui.backup_servers']}`);
      console.log(`   超时时间: ${finalConfig['comfyui.timeout']}ms`);


      res.json({
        success: true,
        data: finalConfig
      });

    } catch (dbError) {
      console.error('❌ 数据库查询失败，使用默认配置:', dbError.message);

      res.json({
        success: true,
        data: defaultConfigs,
        message: '使用默认配置'
      });
    }

  } catch (error) {
    console.error('❌ 获取公开配置失败:', error);

    // 最后的备用配置 - 使用环境变量
    const fallbackConfig = {
      'comfyui.server_url': process.env.COMFYUI_SERVER_URL || 'https://l9s75ay3rp-8188.cnb.run',
      'comfyui.backup_servers': process.env.COMFYUI_BACKUP_SERVERS || 'https://0rv00xh2vg-8188.cnb.run',
      'comfyui.health_check_timeout': parseInt(process.env.COMFYUI_HEALTH_CHECK_TIMEOUT || '10000'),
      'comfyui.timeout': parseInt(process.env.COMFYUI_TIMEOUT || '300000'),
      'ai.text_to_image_points': parseInt(process.env.AI_TEXT_TO_IMAGE_POINTS || '20'),
      'ai.face_swap_points': parseInt(process.env.AI_FACE_SWAP_POINTS || '20'),
      'ai.undress_points': parseInt(process.env.AI_UNDRESS_POINTS || '20'),
      'frontend.api_base_url': process.env.FRONTEND_API_BASE_URL || 'https://your-api-server.com/api',
      'frontend.title': process.env.FRONTEND_TITLE || 'AI Magic - AI图像处理平台',
      'frontend.version': process.env.FRONTEND_VERSION || '1.0.0'
    };

    res.json({
      success: true,
      data: fallbackConfig,
      message: '使用备用配置'
    });
  }
});

// 获取特定分组的配置
router.get('/:group', async (req, res) => {
  try {
    const { group } = req.params;

    // 只允许获取公开的配置分组
    const allowedGroups = ['comfyui', 'ai', 'frontend', 'workflow'];
    if (!allowedGroups.includes(group)) {
      return res.status(403).json({
        success: false,
        message: '不允许访问该配置分组'
      });
    }

    const configs = await query(`
      SELECT config_key, config_value, config_type, description
      FROM system_config
      WHERE config_group = ?
      AND config_key NOT LIKE '%password%'
      AND config_key NOT LIKE '%secret%'
      ORDER BY config_key
    `, [group]);

    // 转换为前端需要的格式
    const configMap = {};
    configs.forEach(config => {
      let value = config.config_value;

      // 根据类型转换值
      if (config.config_type === 'number') {
        value = parseInt(value);
      } else if (config.config_type === 'boolean') {
        value = value === 'true' || value === '1';
      }

      configMap[config.config_key] = {
        value,
        description: config.description
      };
    });

    res.json({
      success: true,
      data: configMap
    });
  } catch (error) {
    console.error('获取配置分组失败:', error);
    res.status(500).json({
      success: false,
      message: '获取配置失败'
    });
  }
});

module.exports = router;

