const { query } = require('../config/database');

async function checkConfig() {
  try {
    console.log('🔍 检查ComfyUI配置...');
    
    // 检查所有配置
    const allConfigs = await query('SELECT * FROM system_config ORDER BY config_group, config_key');
    console.log(`📊 数据库中共有 ${allConfigs.length} 个配置项`);
    
    // 按分组统计
    const groups = {};
    allConfigs.forEach(config => {
      if (!groups[config.config_group]) {
        groups[config.config_group] = [];
      }
      groups[config.config_group].push(config);
    });
    
    console.log('\n📋 配置分组:');
    Object.keys(groups).forEach(group => {
      console.log(`  ${group}: ${groups[group].length} 项`);
      groups[group].forEach(config => {
        console.log(`    - ${config.config_key} = ${config.config_value}`);
      });
    });
    
    // 特别检查ComfyUI配置
    const comfyuiConfigs = await query('SELECT * FROM system_config WHERE config_group = ?', ['comfyui']);
    console.log(`\n🎯 ComfyUI配置项: ${comfyuiConfigs.length} 个`);
    
    if (comfyuiConfigs.length === 0) {
      console.log('❌ 没有找到ComfyUI配置，需要重新添加');
    }
    
  } catch (error) {
    console.error('❌ 检查失败:', error);
  }
  process.exit(0);
}

checkConfig();
