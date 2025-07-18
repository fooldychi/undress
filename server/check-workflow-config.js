const { query } = require('./src/config/database');

async function checkWorkflowConfig() {
  try {
    console.log('🔍 检查工作流配置...');
    
    const rows = await query(`
      SELECT config_key, config_value, config_group 
      FROM system_config 
      WHERE config_group = 'workflow' 
      ORDER BY config_key
    `);
    
    console.log(`📊 找到 ${rows.length} 个工作流配置项:`);
    rows.forEach(row => {
      console.log(`  ${row.config_key}: ${row.config_value}`);
    });
    
    if (rows.length === 0) {
      console.log('❌ 未找到工作流配置，需要运行初始化脚本');
    } else {
      console.log('✅ 工作流配置已存在');
    }
    
  } catch (error) {
    console.error('❌ 检查失败:', error);
  }
  
  process.exit(0);
}

checkWorkflowConfig();
