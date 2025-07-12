/**
 * 部署配置初始化脚本
 * 用于在部署时初始化系统配置，移除硬编码问题
 */

const { query } = require('../config/database');
require('dotenv').config();

async function initDeploymentConfig() {
  console.log('🚀 开始初始化部署配置...\n');

  try {
    // 1. 检查system_config表是否存在
    console.log('📋 检查system_config表...');
    const tableExists = await query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() 
      AND table_name = 'system_config'
    `);

    if (tableExists[0].count === 0) {
      console.log('❌ system_config表不存在，请先运行数据库初始化脚本');
      process.exit(1);
    }

    // 2. 定义部署配置项
    const deploymentConfigs = [
      // ComfyUI配置 - 从环境变量获取
      {
        key: 'comfyui.server_url',
        value: process.env.COMFYUI_SERVER_URL || 'https://your-comfyui-server.com',
        type: 'string',
        group: 'comfyui',
        description: 'ComfyUI服务器地址',
        required: true
      },
      {
        key: 'comfyui.backup_servers',
        value: process.env.COMFYUI_BACKUP_SERVERS || '',
        type: 'string',
        group: 'comfyui',
        description: 'ComfyUI备用服务器地址(逗号分隔)',
        required: false
      },
      {
        key: 'comfyui.auto_switch',
        value: process.env.COMFYUI_AUTO_SWITCH || 'true',
        type: 'boolean',
        group: 'comfyui',
        description: '是否启用自动切换',
        required: false
      },
      {
        key: 'comfyui.health_check_timeout',
        value: process.env.COMFYUI_HEALTH_CHECK_TIMEOUT || '10000',
        type: 'number',
        group: 'comfyui',
        description: '健康检查超时时间(毫秒)',
        required: false
      },
      {
        key: 'comfyui.timeout',
        value: process.env.COMFYUI_TIMEOUT || '300000',
        type: 'number',
        group: 'comfyui',
        description: 'ComfyUI请求超时时间(毫秒)',
        required: false
      },

      // AI功能配置
      {
        key: 'ai.text_to_image_points',
        value: process.env.AI_TEXT_TO_IMAGE_POINTS || '20',
        type: 'number',
        group: 'ai',
        description: '文生图消耗积分',
        required: false
      },
      {
        key: 'ai.face_swap_points',
        value: process.env.AI_FACE_SWAP_POINTS || '20',
        type: 'number',
        group: 'ai',
        description: '换脸消耗积分',
        required: false
      },
      {
        key: 'ai.undress_points',
        value: process.env.AI_UNDRESS_POINTS || '20',
        type: 'number',
        group: 'ai',
        description: '换衣消耗积分',
        required: false
      },

      // 前端配置
      {
        key: 'frontend.api_base_url',
        value: process.env.FRONTEND_API_BASE_URL || 'https://your-api-server.com/api',
        type: 'string',
        group: 'frontend',
        description: '前端API基础地址',
        required: true
      },
      {
        key: 'frontend.title',
        value: process.env.FRONTEND_TITLE || 'AI Magic - AI图像处理平台',
        type: 'string',
        group: 'frontend',
        description: '应用标题',
        required: false
      },
      {
        key: 'frontend.version',
        value: process.env.FRONTEND_VERSION || '1.0.0',
        type: 'string',
        group: 'frontend',
        description: '应用版本',
        required: false
      },

      // 服务器配置
      {
        key: 'server.port',
        value: process.env.PORT || '3006',
        type: 'number',
        group: 'server',
        description: '服务器端口',
        required: false
      },
      {
        key: 'server.node_env',
        value: process.env.NODE_ENV || 'production',
        type: 'string',
        group: 'server',
        description: '运行环境',
        required: false
      },

      // 跨域配置
      {
        key: 'cors.origin',
        value: process.env.CORS_ORIGIN || 'https://your-frontend-domain.com',
        type: 'string',
        group: 'cors',
        description: '允许的跨域源',
        required: true
      },

      // JWT配置
      {
        key: 'jwt.secret',
        value: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
        type: 'string',
        group: 'jwt',
        description: 'JWT密钥',
        required: true
      },
      {
        key: 'jwt.expires_in',
        value: process.env.JWT_EXPIRES_IN || '7d',
        type: 'string',
        group: 'jwt',
        description: 'JWT过期时间',
        required: false
      }
    ];

    // 3. 检查必需的环境变量
    console.log('🔍 检查必需的环境变量...');
    const requiredConfigs = deploymentConfigs.filter(config => config.required);
    const missingConfigs = [];

    for (const config of requiredConfigs) {
      const envKey = config.key.toUpperCase().replace(/\./g, '_');
      if (!process.env[envKey] && config.value.includes('your-')) {
        missingConfigs.push({
          key: config.key,
          envKey: envKey,
          description: config.description
        });
      }
    }

    if (missingConfigs.length > 0) {
      console.log('⚠️ 发现缺失的必需配置:');
      missingConfigs.forEach(config => {
        console.log(`   - ${config.envKey}: ${config.description}`);
      });
      console.log('\n💡 请在环境变量中设置这些配置，或在后台管理中手动配置');
    }

    // 4. 插入或更新配置
    console.log('💾 更新系统配置...');
    let successCount = 0;
    let updateCount = 0;
    let insertCount = 0;

    for (const config of deploymentConfigs) {
      try {
        // 检查配置是否已存在
        const existing = await query(
          'SELECT id FROM system_config WHERE config_key = ?',
          [config.key]
        );

        if (existing.length > 0) {
          // 更新现有配置
          await query(`
            UPDATE system_config 
            SET config_value = ?, config_type = ?, config_group = ?, description = ?, updated_at = NOW()
            WHERE config_key = ?
          `, [config.value, config.type, config.group, config.description, config.key]);
          
          console.log(`  ✅ 更新: ${config.key} = ${config.value}`);
          updateCount++;
        } else {
          // 插入新配置
          await query(`
            INSERT INTO system_config (config_key, config_value, config_type, config_group, description)
            VALUES (?, ?, ?, ?, ?)
          `, [config.key, config.value, config.type, config.group, config.description]);
          
          console.log(`  ✅ 新增: ${config.key} = ${config.value}`);
          insertCount++;
        }
        
        successCount++;
      } catch (error) {
        console.log(`  ❌ 失败: ${config.key} - ${error.message}`);
      }
    }

    // 5. 显示结果
    console.log('\n📊 配置初始化完成:');
    console.log(`   总计: ${deploymentConfigs.length} 项`);
    console.log(`   成功: ${successCount} 项`);
    console.log(`   新增: ${insertCount} 项`);
    console.log(`   更新: ${updateCount} 项`);
    console.log(`   失败: ${deploymentConfigs.length - successCount} 项`);

    if (missingConfigs.length > 0) {
      console.log('\n⚠️ 注意事项:');
      console.log('   - 部分配置使用了默认值，建议在后台管理中修改');
      console.log('   - 生产环境请务必修改JWT密钥等敏感配置');
      console.log('   - 确保ComfyUI服务器地址和API地址配置正确');
    }

    console.log('\n🎉 部署配置初始化成功！');
    console.log('💡 可以通过后台管理系统进一步调整配置');

  } catch (error) {
    console.error('❌ 部署配置初始化失败:', error);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  initDeploymentConfig().then(() => {
    process.exit(0);
  }).catch(error => {
    console.error('脚本执行失败:', error);
    process.exit(1);
  });
}

module.exports = { initDeploymentConfig };
