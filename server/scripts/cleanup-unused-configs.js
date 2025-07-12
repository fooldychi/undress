#!/usr/bin/env node

/**
 * 清除system_config中后台配置页面没有的配置项
 * 只保留后台配置页面支持的配置项
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

async function cleanupUnusedConfigs() {
  try {
    console.log('🧹 开始清除后台没有的配置项...\n');

    // 1. 查看当前所有配置项
    console.log('📊 当前数据库中的所有配置项:');
    const allConfigs = await query(`
      SELECT config_key, config_group, description 
      FROM system_config 
      ORDER BY config_group, config_key
    `);
    
    console.log(`总计: ${allConfigs.length} 项配置`);
    
    let currentGroup = '';
    allConfigs.forEach(config => {
      if (config.config_group !== currentGroup) {
        currentGroup = config.config_group;
        console.log(`\n📁 ${currentGroup}:`);
      }
      console.log(`   ${config.config_key}: ${config.description}`);
    });

    // 2. 定义后台配置页面支持的配置项
    const supportedConfigs = [
      // ComfyUI配置 - 后台配置页面支持
      'comfyui.server_url',
      'comfyui.backup_servers', 
      'comfyui.auto_switch',
      'comfyui.health_check_timeout',
      'comfyui.timeout',
      
      // 数据库配置 - 后台配置页面支持
      'database.host',
      'database.port',
      'database.name',
      'database.user',
      'database.password',
      
      // JWT配置 - 后台配置页面支持
      'jwt.secret',
      'jwt.expires_in',
      
      // AI积分配置 - 后台配置页面支持
      'ai.text_to_image_points',
      'ai.face_swap_points',
      'ai.undress_points'
    ];

    console.log('\n🎯 后台配置页面支持的配置项:');
    supportedConfigs.forEach(key => {
      console.log(`   ✅ ${key}`);
    });
    console.log(`   总计: ${supportedConfigs.length} 项\n`);

    // 3. 找出不支持的配置项
    const unsupportedConfigs = allConfigs.filter(config => 
      !supportedConfigs.includes(config.config_key)
    );

    if (unsupportedConfigs.length === 0) {
      console.log('✅ 所有配置项都被后台支持，无需清理');
      return;
    }

    console.log('🗑️ 需要清理的配置项:');
    unsupportedConfigs.forEach(config => {
      console.log(`   ❌ ${config.config_key} (${config.config_group}): ${config.description}`);
    });
    console.log(`   总计: ${unsupportedConfigs.length} 项\n`);

    // 4. 按分组显示清理的配置项
    const groupedUnsupported = {};
    unsupportedConfigs.forEach(config => {
      if (!groupedUnsupported[config.config_group]) {
        groupedUnsupported[config.config_group] = [];
      }
      groupedUnsupported[config.config_group].push(config.config_key);
    });

    console.log('📋 按分组显示需要清理的配置:');
    Object.keys(groupedUnsupported).forEach(group => {
      console.log(`   ${group}: ${groupedUnsupported[group].length} 项`);
      groupedUnsupported[group].forEach(key => {
        console.log(`      - ${key}`);
      });
    });

    // 5. 执行清理
    console.log('\n🗑️ 开始清理不支持的配置项...');
    
    const unsupportedKeys = unsupportedConfigs.map(c => c.config_key);
    const deleteResult = await query(`
      DELETE FROM system_config 
      WHERE config_key NOT IN (${supportedConfigs.map(() => '?').join(',')})
    `, supportedConfigs);

    console.log(`✅ 成功删除 ${deleteResult.affectedRows} 个不支持的配置项\n`);

    // 6. 验证清理结果
    console.log('📊 清理后的配置项:');
    const remainingConfigs = await query(`
      SELECT config_group, COUNT(*) as count 
      FROM system_config 
      GROUP BY config_group 
      ORDER BY config_group
    `);
    
    remainingConfigs.forEach(group => {
      console.log(`   ${group.config_group}: ${group.count} 项`);
    });
    
    const totalRemaining = await query('SELECT COUNT(*) as count FROM system_config');
    console.log(`   总计: ${totalRemaining[0].count} 项\n`);

    // 7. 显示保留的具体配置
    console.log('📋 保留的配置项详情:');
    const finalConfigs = await query(`
      SELECT config_key, config_value, config_group, description 
      FROM system_config 
      ORDER BY config_group, config_key
    `);
    
    let currentFinalGroup = '';
    finalConfigs.forEach(config => {
      if (config.config_group !== currentFinalGroup) {
        currentFinalGroup = config.config_group;
        console.log(`\n   📁 ${currentFinalGroup}:`);
      }
      const value = config.config_key.includes('password') || config.config_key.includes('secret') 
        ? '***' 
        : config.config_value;
      console.log(`      ${config.config_key}: ${value}`);
    });

    console.log('\n✅ 配置项清理完成！');
    console.log('\n💡 清理效果:');
    console.log(`   - 删除了 ${deleteResult.affectedRows} 个后台不支持的配置项`);
    console.log(`   - 保留了 ${totalRemaining[0].count} 个后台支持的配置项`);
    console.log('   - 只保留ComfyUI、数据库、JWT、AI积分配置');
    console.log('   - 后台配置页面现在完全对应数据库配置');

    // 8. 显示清理的配置分组
    if (Object.keys(groupedUnsupported).length > 0) {
      console.log('\n🗑️ 已清理的配置分组:');
      Object.keys(groupedUnsupported).forEach(group => {
        console.log(`   ❌ ${group}: ${groupedUnsupported[group].length} 项配置`);
      });
    }

  } catch (error) {
    console.error('❌ 清理配置项失败:', error);
    throw error;
  }
}

// 运行清理
if (require.main === module) {
  cleanupUnusedConfigs()
    .then(() => {
      console.log('\n🎉 配置项清理完成！');
      console.log('🌐 请访问管理后台配置页面验证: http://localhost:3007/#/config');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 配置项清理失败:', error);
      process.exit(1);
    });
}

module.exports = { cleanupUnusedConfigs };
