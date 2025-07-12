#!/usr/bin/env node

/**
 * 删除comfyui.auto_switch配置项，改为默认切换
 * 遵循最简开发原则，减少配置复杂度
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

// 创建数据库连接
const connection = mysql.createConnection({
  host: process.env.DB_HOST || '114.132.50.71',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'aimagic',
  password: process.env.DB_PASSWORD || 'aimagic2024',
  database: process.env.DB_NAME || 'aimagic',
  charset: 'utf8mb4'
});

const query = async (sql, params = []) => {
  const conn = await connection;
  const [rows] = await conn.execute(sql, params);
  return rows;
};

async function removeAutoSwitchConfig() {
  try {
    console.log('🗑️ 删除comfyui.auto_switch配置项，改为默认切换...\n');

    // 1. 查看当前配置状态
    console.log('📊 当前ComfyUI配置项:');
    const currentConfigs = await query(`
      SELECT config_key, config_value, description 
      FROM system_config 
      WHERE config_group = 'comfyui'
      ORDER BY config_key
    `);
    
    currentConfigs.forEach(config => {
      console.log(`   ${config.config_key}: ${config.config_value} - ${config.description}`);
    });
    console.log(`   总计: ${currentConfigs.length} 项\n`);

    // 2. 检查auto_switch配置项是否存在
    const autoSwitchConfig = await query(`
      SELECT * FROM system_config 
      WHERE config_key = 'comfyui.auto_switch'
    `);

    if (autoSwitchConfig.length === 0) {
      console.log('✅ comfyui.auto_switch配置项不存在，无需删除');
    } else {
      console.log('🔍 找到comfyui.auto_switch配置项:');
      console.log(`   配置键: ${autoSwitchConfig[0].config_key}`);
      console.log(`   配置值: ${autoSwitchConfig[0].config_value}`);
      console.log(`   配置类型: ${autoSwitchConfig[0].config_type}`);
      console.log(`   描述: ${autoSwitchConfig[0].description}`);

      // 3. 删除auto_switch配置项
      console.log('\n🗑️ 删除comfyui.auto_switch配置项...');
      const deleteResult = await query(`
        DELETE FROM system_config 
        WHERE config_key = 'comfyui.auto_switch'
      `);

      console.log(`✅ 成功删除 ${deleteResult.affectedRows} 个配置项\n`);
    }

    // 4. 验证删除结果
    console.log('📊 删除后的ComfyUI配置项:');
    const remainingConfigs = await query(`
      SELECT config_key, config_value, description 
      FROM system_config 
      WHERE config_group = 'comfyui'
      ORDER BY config_key
    `);
    
    remainingConfigs.forEach(config => {
      console.log(`   ${config.config_key}: ${config.config_value} - ${config.description}`);
    });
    console.log(`   总计: ${remainingConfigs.length} 项\n`);

    // 5. 显示保留的配置项
    console.log('✅ 保留的ComfyUI配置项:');
    console.log('   ✅ comfyui.server_url - ComfyUI服务器地址');
    console.log('   ✅ comfyui.backup_servers - 备用服务器地址列表');
    console.log('   ✅ comfyui.health_check_timeout - 健康检查超时时间');
    console.log('   ✅ comfyui.timeout - 请求超时时间');
    console.log('   ❌ comfyui.auto_switch - 已删除，改为默认启用');

    console.log('\n💡 修改说明:');
    console.log('   - 删除了comfyui.auto_switch配置项');
    console.log('   - 自动切换功能改为默认启用');
    console.log('   - 简化了配置管理，减少复杂度');
    console.log('   - 遵循最简开发原则');

    console.log('\n🔧 后续需要修改的代码:');
    console.log('   1. 前端配置页面 - 移除自动切换开关');
    console.log('   2. 前端代码 - 移除AUTO_SWITCH检查，默认启用');
    console.log('   3. 后端配置API - 移除auto_switch相关逻辑');
    console.log('   4. 默认配置 - 移除auto_switch默认值');

    console.log('\n✅ 配置项删除完成！');

  } catch (error) {
    console.error('❌ 删除配置项失败:', error);
    throw error;
  }
}

// 运行删除
if (require.main === module) {
  removeAutoSwitchConfig()
    .then(() => {
      console.log('\n🎉 comfyui.auto_switch配置项删除完成！');
      console.log('💡 现在自动切换功能默认启用，无需配置');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 删除配置项失败:', error);
      process.exit(1);
    });
}

module.exports = { removeAutoSwitchConfig };
