const { query, testConnection } = require('../config/database');

async function addWorkflowNodeConfig() {
  try {
    console.log('🔧 开始添加工作流节点配置...');

    // 测试数据库连接
    await testConnection();

    const workflowNodeConfigs = [
      // 换脸工作流节点映射
      ['workflow.faceswap.input_nodes.face_photo_1', '670', 'string', 'workflow', '第一张人脸照片节点ID'],
      ['workflow.faceswap.input_nodes.face_photo_2', '662', 'string', 'workflow', '第二张人脸照片节点ID'],
      ['workflow.faceswap.input_nodes.face_photo_3', '658', 'string', 'workflow', '第三张人脸照片节点ID'],
      ['workflow.faceswap.input_nodes.face_photo_4', '655', 'string', 'workflow', '第四张人脸照片节点ID'],
      ['workflow.faceswap.input_nodes.target_image', '737', 'string', 'workflow', '目标图片节点ID'],
      
      // 换脸工作流输出节点配置（按优先级排序）
      ['workflow.faceswap.output_nodes.primary', '812', 'string', 'workflow', '主要输出节点ID'],
      ['workflow.faceswap.output_nodes.secondary', '813,746,710', 'string', 'workflow', '备用输出节点ID（逗号分隔）'],
      
      // 一键褪衣工作流节点映射
      ['workflow.undress.input_nodes.main_image', '49', 'string', 'workflow', '主图片输入节点ID'],
      ['workflow.undress.input_nodes.seed_node', '174', 'string', 'workflow', '随机种子节点ID'],
      ['workflow.undress.output_nodes.primary', '730', 'string', 'workflow', '主要输出节点ID'],
      ['workflow.undress.output_nodes.secondary', '812,813,746,710', 'string', 'workflow', '备用输出节点ID（逗号分隔）'],
      
      // 工作流基础配置
      ['workflow.faceswap.enabled', 'true', 'boolean', 'workflow', '是否启用换脸工作流'],
      ['workflow.faceswap.name', 'Face Swap 2.0', 'string', 'workflow', '换脸工作流名称'],
      ['workflow.faceswap.description', '高质量人脸替换工作流', 'string', 'workflow', '换脸工作流描述'],
      ['workflow.faceswap.file_path', 'workflows/faceswap2.0.json', 'string', 'workflow', '换脸工作流文件路径'],
      
      ['workflow.undress.enabled', 'true', 'boolean', 'workflow', '是否启用一键褪衣工作流'],
      ['workflow.undress.name', 'Undress AI', 'string', 'workflow', '一键褪衣工作流名称'],
      ['workflow.undress.description', '一键褪衣AI工作流', 'string', 'workflow', '一键褪衣工作流描述'],
      ['workflow.undress.file_path', 'workflows/undress.json', 'string', 'workflow', '一键褪衣工作流文件路径']
    ];

    console.log(`📝 准备插入 ${workflowNodeConfigs.length} 个工作流节点配置...`);

    for (const [key, value, type, group, desc] of workflowNodeConfigs) {
      await query(`
        INSERT INTO system_config (config_key, config_value, config_type, config_group, description)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE 
          config_value = VALUES(config_value),
          config_type = VALUES(config_type),
          description = VALUES(description),
          updated_at = CURRENT_TIMESTAMP
      `, [key, value, type, group, desc]);
    }

    console.log(`✅ 成功添加 ${workflowNodeConfigs.length} 个工作流节点配置`);

    // 验证配置
    const configs = await query(`
      SELECT config_key, config_value, description 
      FROM system_config 
      WHERE config_group = 'workflow' 
      ORDER BY config_key
    `);

    console.log('\n📊 工作流配置验证:');
    configs.forEach(config => {
      console.log(`  ${config.config_key}: ${config.config_value} - ${config.description}`);
    });

    console.log('\n🎉 工作流节点配置添加完成！');

  } catch (error) {
    console.error('❌ 添加工作流节点配置失败:', error);
    throw error;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  addWorkflowNodeConfig()
    .then(() => {
      console.log('✅ 脚本执行完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 脚本执行失败:', error);
      process.exit(1);
    });
}

module.exports = { addWorkflowNodeConfig };
