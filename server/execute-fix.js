const { query } = require('./src/config/database');

async function executeFix() {
  console.log('🔧 执行节点ID修复...');
  
  try {
    // 修复换脸工作流的输入节点
    console.log('📝 修复换脸工作流输入节点...');
    
    await query(`UPDATE workflow_configs SET node_id = '670', updated_at = NOW() 
                 WHERE workflow_type = 'faceswap' AND node_type = 'input' AND node_key = 'face_photo_1'`);
    console.log('✅ face_photo_1 -> 670');
    
    await query(`UPDATE workflow_configs SET node_id = '662', updated_at = NOW() 
                 WHERE workflow_type = 'faceswap' AND node_type = 'input' AND node_key = 'face_photo_2'`);
    console.log('✅ face_photo_2 -> 662');
    
    await query(`UPDATE workflow_configs SET node_id = '658', updated_at = NOW() 
                 WHERE workflow_type = 'faceswap' AND node_type = 'input' AND node_key = 'face_photo_3'`);
    console.log('✅ face_photo_3 -> 658');
    
    await query(`UPDATE workflow_configs SET node_id = '655', updated_at = NOW() 
                 WHERE workflow_type = 'faceswap' AND node_type = 'input' AND node_key = 'face_photo_4'`);
    console.log('✅ face_photo_4 -> 655');
    
    await query(`UPDATE workflow_configs SET node_id = '737', updated_at = NOW() 
                 WHERE workflow_type = 'faceswap' AND node_type = 'input' AND node_key = 'target_image'`);
    console.log('✅ target_image -> 737');
    
    // 修复一键褪衣工作流的输入节点
    console.log('\n📝 修复一键褪衣工作流输入节点...');
    
    await query(`UPDATE workflow_configs SET node_id = '49', updated_at = NOW() 
                 WHERE workflow_type = 'undress' AND node_type = 'input' AND node_key = 'main_image'`);
    console.log('✅ main_image -> 49');
    
    await query(`UPDATE workflow_configs SET node_id = '174', updated_at = NOW() 
                 WHERE workflow_type = 'undress' AND node_type = 'input' AND node_key = 'seed_node'`);
    console.log('✅ seed_node -> 174');
    
    console.log('\n🎉 修复完成！');
    
    // 验证结果
    console.log('\n🔍 验证修复结果...');
    const results = await query(`
      SELECT 
        workflow_type, 
        node_type, 
        node_key, 
        node_id,
        LENGTH(node_id) as id_length,
        CASE 
          WHEN node_id LIKE '%{%' THEN 'JSON格式'
          ELSE '正常'
        END as format_status
      FROM workflow_configs 
      ORDER BY workflow_type, node_type, node_key
    `);
    
    console.log('\n📋 当前节点ID状态:');
    console.log('-'.repeat(80));
    
    results.forEach(row => {
      const status = row.format_status === '正常' ? '✅' : '❌';
      console.log(`${status} ${row.workflow_type}.${row.node_type}.${row.node_key}: ${row.node_id} (长度: ${row.id_length})`);
    });
    
    const hasIssues = results.some(row => row.format_status !== '正常');
    if (!hasIssues) {
      console.log('\n🎉 所有节点ID格式正常！');
    } else {
      console.log('\n⚠️ 仍有节点ID格式异常');
    }
    
  } catch (error) {
    console.error('❌ 修复失败:', error);
  }
}

executeFix();
