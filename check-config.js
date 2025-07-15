const { query } = require('./server/src/config/database.js');

async function checkConfig() {
  try {
    console.log('🔍 检查数据库中的ComfyUI配置...');
    
    const configs = await query(`
      SELECT config_key, config_value 
      FROM system_config 
      WHERE config_group = 'comfyui' 
      ORDER BY config_key
    `);
    
    console.log('\n📋 当前数据库中的ComfyUI配置:');
    configs.forEach(config => {
      console.log(`  ${config.config_key}: ${config.config_value}`);
    });
    
    console.log('\n✅ 检查完成');
  } catch (error) {
    console.error('❌ 查询失败:', error);
  }
  process.exit(0);
}

checkConfig();
