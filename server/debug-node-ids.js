const { query } = require('./src/config/database');

async function debugNodeIds() {
  console.log('🔍 调试节点ID数据...');
  console.log('='.repeat(80));

  try {
    // 获取所有节点配置
    const nodeConfigs = await query(`
      SELECT id, workflow_type, node_type, node_key, node_id
      FROM workflow_configs
      ORDER BY workflow_type, node_type, node_key
    `);

    console.log(`📊 找到 ${nodeConfigs.length} 个节点配置\n`);

    nodeConfigs.forEach(config => {
      const { id, workflow_type, node_type, node_key, node_id } = config;
      
      console.log(`ID: ${id}`);
      console.log(`工作流: ${workflow_type}`);
      console.log(`节点类型: ${node_type}`);
      console.log(`节点键: ${node_key}`);
      console.log(`节点ID: ${node_id}`);
      console.log(`节点ID长度: ${node_id.length}`);
      console.log(`节点ID类型: ${typeof node_id}`);
      
      // 检查是否是JSON格式
      let isJson = false;
      let extractedId = node_id;
      let depth = 0;
      
      try {
        if (typeof node_id === 'string' && node_id.startsWith('{')) {
          let temp = node_id;
          while (temp && typeof temp === 'string' && temp.startsWith('{')) {
            const parsed = JSON.parse(temp);
            if (parsed && typeof parsed === 'object' && parsed.nodeId) {
              temp = parsed.nodeId;
              depth++;
              isJson = true;
            } else {
              break;
            }
          }
          extractedId = temp;
        }
      } catch (e) {
        console.log(`JSON解析错误: ${e.message}`);
      }
      
      if (isJson) {
        console.log(`❌ 这是JSON格式的节点ID！`);
        console.log(`嵌套深度: ${depth}`);
        console.log(`提取的实际节点ID: ${extractedId}`);
      } else {
        console.log(`✅ 正常的节点ID`);
      }
      
      console.log('-'.repeat(60));
    });

  } catch (error) {
    console.error('❌ 调试失败:', error);
  }
}

// 修复函数
async function fixNodeIds() {
  console.log('🔧 开始修复节点ID...');
  
  try {
    const nodeConfigs = await query(`
      SELECT id, workflow_type, node_type, node_key, node_id
      FROM workflow_configs
      ORDER BY workflow_type, node_type, node_key
    `);

    let fixedCount = 0;
    
    for (const config of nodeConfigs) {
      const { id, workflow_type, node_type, node_key, node_id } = config;
      
      let needsFix = false;
      let extractedId = node_id;
      
      try {
        if (typeof node_id === 'string' && node_id.startsWith('{')) {
          let temp = node_id;
          while (temp && typeof temp === 'string' && temp.startsWith('{')) {
            const parsed = JSON.parse(temp);
            if (parsed && typeof parsed === 'object' && parsed.nodeId) {
              temp = parsed.nodeId;
              needsFix = true;
            } else {
              break;
            }
          }
          extractedId = temp;
        }
      } catch (e) {
        console.log(`跳过无法解析的节点: ${workflow_type}.${node_type}.${node_key}`);
        continue;
      }
      
      if (needsFix) {
        console.log(`🔧 修复: ${workflow_type}.${node_type}.${node_key}`);
        console.log(`  原始: ${node_id.substring(0, 100)}...`);
        console.log(`  修复为: ${extractedId}`);
        
        try {
          const result = await query(`
            UPDATE workflow_configs 
            SET node_id = ?, updated_at = NOW()
            WHERE id = ?
          `, [extractedId, id]);
          
          if (result.affectedRows > 0) {
            console.log(`  ✅ 修复成功`);
            fixedCount++;
          } else {
            console.log(`  ❌ 修复失败: 没有影响任何行`);
          }
        } catch (error) {
          console.log(`  ❌ 修复失败: ${error.message}`);
        }
        
        console.log('');
      }
    }
    
    console.log(`🎉 修复完成！共修复 ${fixedCount} 个节点ID`);
    
  } catch (error) {
    console.error('❌ 修复失败:', error);
  }
}

// 主函数
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'debug';
  
  try {
    if (command === 'debug') {
      await debugNodeIds();
    } else if (command === 'fix') {
      await fixNodeIds();
    } else {
      console.log('用法:');
      console.log('  node debug-node-ids.js debug  # 调试节点ID');
      console.log('  node debug-node-ids.js fix    # 修复节点ID');
    }
  } catch (error) {
    console.error('❌ 执行失败:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
