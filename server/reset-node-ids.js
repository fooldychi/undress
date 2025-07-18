const { query } = require('./src/config/database');

// 正确的节点ID配置
const correctNodeIds = {
  faceswap: {
    input: {
      face_photo_1: '670',
      face_photo_2: '662', 
      face_photo_3: '658',
      face_photo_4: '655',
      target_image: '737'
    },
    output: {
      primary: '812',
      secondary_1: '813',
      secondary_2: '746',
      secondary_3: '710'
    }
  },
  undress: {
    input: {
      main_image: '49',
      seed_node: '174'
    },
    output: {
      primary: '730',
      secondary_1: '812',
      secondary_2: '813', 
      secondary_3: '746',
      secondary_4: '710'
    }
  }
};

async function resetNodeIds() {
  console.log('🔧 重置节点ID为正确值...');
  console.log('='.repeat(60));
  
  try {
    let updateCount = 0;
    
    for (const [workflowType, workflowConfig] of Object.entries(correctNodeIds)) {
      console.log(`\n📝 处理工作流: ${workflowType}`);
      
      for (const [nodeType, nodes] of Object.entries(workflowConfig)) {
        console.log(`  处理节点类型: ${nodeType}`);
        
        for (const [nodeKey, correctNodeId] of Object.entries(nodes)) {
          console.log(`    更新节点: ${nodeKey} -> ${correctNodeId}`);
          
          try {
            const result = await query(`
              UPDATE workflow_configs 
              SET node_id = ?, updated_at = NOW()
              WHERE workflow_type = ? AND node_type = ? AND node_key = ?
            `, [correctNodeId, workflowType, nodeType, nodeKey]);
            
            if (result.affectedRows > 0) {
              console.log(`    ✅ 更新成功`);
              updateCount++;
            } else {
              console.log(`    ⚠️ 没有找到匹配的记录`);
            }
          } catch (error) {
            console.log(`    ❌ 更新失败: ${error.message}`);
          }
        }
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log(`🎉 重置完成！共更新 ${updateCount} 个节点ID`);
    
    // 验证结果
    console.log('\n🔍 验证重置结果...');
    await verifyNodeIds();
    
  } catch (error) {
    console.error('❌ 重置失败:', error);
  }
}

async function verifyNodeIds() {
  try {
    const nodeConfigs = await query(`
      SELECT workflow_type, node_type, node_key, node_id
      FROM workflow_configs
      ORDER BY workflow_type, node_type, node_key
    `);
    
    console.log('\n📋 当前节点ID配置:');
    console.log('-'.repeat(60));
    
    let allCorrect = true;
    
    nodeConfigs.forEach(config => {
      const { workflow_type, node_type, node_key, node_id } = config;
      
      // 检查是否与预期值匹配
      const expectedId = correctNodeIds[workflow_type]?.[node_type]?.[node_key];
      const isCorrect = node_id === expectedId;
      
      if (!isCorrect) {
        allCorrect = false;
      }
      
      const status = isCorrect ? '✅' : '❌';
      console.log(`${status} ${workflow_type}.${node_type}.${node_key}: ${node_id} ${!isCorrect ? `(期望: ${expectedId})` : ''}`);
    });
    
    console.log('-'.repeat(60));
    if (allCorrect) {
      console.log('🎉 所有节点ID都正确！');
    } else {
      console.log('⚠️ 仍有节点ID不正确，请检查');
    }
    
  } catch (error) {
    console.error('❌ 验证失败:', error);
  }
}

async function showCurrentNodeIds() {
  console.log('📋 显示当前节点ID配置...');
  console.log('='.repeat(60));
  
  try {
    const nodeConfigs = await query(`
      SELECT workflow_type, node_type, node_key, node_id, LENGTH(node_id) as id_length
      FROM workflow_configs
      ORDER BY workflow_type, node_type, node_key
    `);
    
    nodeConfigs.forEach(config => {
      const { workflow_type, node_type, node_key, node_id, id_length } = config;
      
      console.log(`${workflow_type}.${node_type}.${node_key}:`);
      console.log(`  值: ${node_id}`);
      console.log(`  长度: ${id_length}`);
      
      // 检查是否看起来像JSON
      if (node_id.includes('{') || node_id.includes('"')) {
        console.log(`  ⚠️ 可能包含JSON格式`);
      }
      
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ 显示失败:', error);
  }
}

// 主函数
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'show';
  
  try {
    if (command === 'show') {
      await showCurrentNodeIds();
    } else if (command === 'reset') {
      await resetNodeIds();
    } else if (command === 'verify') {
      await verifyNodeIds();
    } else {
      console.log('用法:');
      console.log('  node reset-node-ids.js show    # 显示当前节点ID');
      console.log('  node reset-node-ids.js reset   # 重置节点ID为正确值');
      console.log('  node reset-node-ids.js verify  # 验证节点ID是否正确');
    }
  } catch (error) {
    console.error('❌ 执行失败:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
