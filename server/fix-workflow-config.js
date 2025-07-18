const { query } = require('./src/config/database');

async function fixWorkflowConfig() {
  try {
    console.log('🔧 修复工作流配置...');
    
    const workflowConfigs = [
      // 换脸工作流节点映射
      ['workflow.faceswap.input_nodes.face_photo_1', '670'],
      ['workflow.faceswap.input_nodes.face_photo_2', '662'],
      ['workflow.faceswap.input_nodes.face_photo_3', '658'],
      ['workflow.faceswap.input_nodes.face_photo_4', '655'],
      ['workflow.faceswap.input_nodes.target_image', '737'],
      ['workflow.faceswap.output_nodes.primary', '812'],
      ['workflow.faceswap.output_nodes.secondary', '813,746,710'],
      ['workflow.faceswap.description', '高质量人脸替换工作流'],
      ['workflow.faceswap.name', 'Face Swap 2.0'],
      
      // 一键褪衣工作流节点映射
      ['workflow.undress.input_nodes.main_image', '49'],
      ['workflow.undress.input_nodes.seed_node', '174'],
      ['workflow.undress.output_nodes.primary', '730'],
      ['workflow.undress.output_nodes.secondary', '812,813,746,710'],
      ['workflow.undress.description', '一键褪衣AI工作流'],
      ['workflow.undress.name', 'Undress AI']
    ];
    
    for (const [key, value] of workflowConfigs) {
      await query(`
        UPDATE system_config 
        SET config_value = ? 
        WHERE config_key = ?
      `, [value, key]);
      console.log(`✅ 更新配置: ${key} = ${value}`);
    }
    
    console.log('🎉 工作流配置修复完成！');
    
    // 验证修复结果
    const rows = await query(`
      SELECT config_key, config_value 
      FROM system_config 
      WHERE config_group = 'workflow' 
      ORDER BY config_key
    `);
    
    console.log('\n📊 修复后的配置:');
    rows.forEach(row => {
      console.log(`  ${row.config_key}: ${row.config_value}`);
    });
    
  } catch (error) {
    console.error('❌ 修复失败:', error);
  }
  
  process.exit(0);
}

fixWorkflowConfig();
