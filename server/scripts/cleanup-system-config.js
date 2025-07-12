#!/usr/bin/env node

/**
 * 系统配置清理脚本
 * 只保留必要的配置项：ComfyUI配置、数据库配置、JWT配置
 * 删除前端硬编码的配置项
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

async function cleanupSystemConfig() {
  try {
    console.log('🧹 开始清理系统配置...\n');

    // 1. 查看当前配置
    console.log('📊 当前配置项:');
    const currentConfigs = await query('SELECT config_group, COUNT(*) as count FROM system_config GROUP BY config_group ORDER BY config_group');
    currentConfigs.forEach(group => {
      console.log(`   ${group.config_group}: ${group.count} 项`);
    });

    const totalBefore = await query('SELECT COUNT(*) as count FROM system_config');
    console.log(`   总计: ${totalBefore[0].count} 项\n`);

    // 2. 定义要保留的配置项
    const keepConfigs = [
      // ComfyUI配置 - 必需
      'comfyui.server_url',
      'comfyui.backup_servers',
      'comfyui.auto_switch',
      'comfyui.health_check_timeout',
      'comfyui.timeout',

      // 数据库配置 - 必需
      'database.host',
      'database.port',
      'database.name',
      'database.user',
      'database.password',
      'database.charset',
      'database.timezone',

      // JWT配置 - 必需
      'jwt.secret',
      'jwt.expires_in',
      'jwt.refresh_expires_in',

      // AI积分配置 - 必需
      'ai.text_to_image_points',
      'ai.face_swap_points',
      'ai.undress_points'
    ];

    console.log('🎯 保留的配置项:');
    keepConfigs.forEach(key => {
      console.log(`   ✅ ${key}`);
    });
    console.log(`   总计: ${keepConfigs.length} 项\n`);

    // 3. 删除不需要的配置项
    console.log('🗑️ 删除硬编码的配置项...');

    const deleteResult = await query(`
      DELETE FROM system_config
      WHERE config_key NOT IN (${keepConfigs.map(() => '?').join(',')})
    `, keepConfigs);

    console.log(`   删除了 ${deleteResult.affectedRows} 个配置项\n`);

    // 4. 验证结果
    console.log('📊 清理后配置项:');
    const afterConfigs = await query('SELECT config_group, COUNT(*) as count FROM system_config GROUP BY config_group ORDER BY config_group');
    afterConfigs.forEach(group => {
      console.log(`   ${group.config_group}: ${group.count} 项`);
    });

    const totalAfter = await query('SELECT COUNT(*) as count FROM system_config');
    console.log(`   总计: ${totalAfter[0].count} 项\n`);

    // 5. 显示保留的具体配置
    console.log('📋 保留的具体配置:');
    const remainingConfigs = await query(`
      SELECT config_key, config_value, config_group, description
      FROM system_config
      ORDER BY config_group, config_key
    `);

    let currentGroup = '';
    remainingConfigs.forEach(config => {
      if (config.config_group !== currentGroup) {
        currentGroup = config.config_group;
        console.log(`\n   📁 ${currentGroup}:`);
      }
      const value = config.config_key.includes('password') || config.config_key.includes('secret')
        ? '***'
        : config.config_value;
      console.log(`      ${config.config_key}: ${value}`);
    });

    console.log('\n✅ 系统配置清理完成！');
    console.log('\n💡 清理效果:');
    console.log(`   - 删除了 ${deleteResult.affectedRows} 个硬编码配置项`);
    console.log(`   - 保留了 ${totalAfter[0].count} 个必要配置项`);
    console.log('   - 只保留ComfyUI、数据库、JWT、AI积分配置');
    console.log('   - 前端硬编码的配置项已清理');

  } catch (error) {
    console.error('❌ 清理系统配置失败:', error);
    throw error;
  }
}

// 运行清理
if (require.main === module) {
  cleanupSystemConfig()
    .then(() => {
      console.log('\n🎉 配置清理完成！');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 配置清理失败:', error);
      process.exit(1);
    });
}

module.exports = { cleanupSystemConfig };
