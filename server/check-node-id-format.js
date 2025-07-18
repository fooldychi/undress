const { query } = require('./src/config/database');

/**
 * 检查数据库中节点ID的格式，识别可能的JSON序列化问题
 */
async function checkNodeIdFormat() {
  console.log('🔍 检查数据库中的节点ID格式...');
  console.log('='.repeat(60));

  try {
    // 获取所有节点配置
    const nodeConfigs = await query(`
      SELECT id, workflow_type, node_type, node_key, node_id, node_order, created_at, updated_at
      FROM workflow_configs
      ORDER BY workflow_type, node_type, node_key
    `);

    console.log(`📊 找到 ${nodeConfigs.length} 个节点配置`);
    console.log('');

    let issueCount = 0;
    const issues = [];

    nodeConfigs.forEach(config => {
      const { id, workflow_type, node_type, node_key, node_id } = config;

      // 检查是否是JSON格式的字符串
      let isJsonFormat = false;
      let actualNodeId = node_id;
      let depth = 0;

      // 检查是否包含JSON结构的特征
      if (typeof node_id === 'string' && (node_id.includes('{"nodeId":') || node_id.startsWith('{'))) {
        try {
          // 尝试解析JSON
          const parsed = JSON.parse(node_id);
          if (parsed && typeof parsed === 'object' && parsed.nodeId) {
            isJsonFormat = true;

            // 递归解析嵌套的JSON字符串
            let temp = parsed.nodeId;
            depth = 1;

            while (typeof temp === 'string') {
              try {
                if (temp.startsWith('{')) {
                  const innerParsed = JSON.parse(temp);
                  if (innerParsed && typeof innerParsed === 'object' && innerParsed.nodeId) {
                    temp = innerParsed.nodeId;
                    depth++;
                  } else {
                    break;
                  }
                } else {
                  break;
                }
              } catch (e) {
                break;
              }
            }

            actualNodeId = temp;

            issues.push({
              id,
              workflow_type,
              node_type,
              node_key,
              original: node_id,
              extracted: actualNodeId,
              depth,
              severity: depth > 2 ? 'high' : 'medium'
            });
            issueCount++;
          }
        } catch (e) {
          // 不是有效的JSON，忽略
        }
      }

      // 显示节点信息
      const status = isJsonFormat ? '❌ JSON格式' : '✅ 正常';
      const displayValue = node_id.length > 80 ? node_id.substring(0, 80) + '...' : node_id;
      console.log(`${status} ${workflow_type}.${node_type}.${node_key}: ${displayValue}`);

      if (isJsonFormat && actualNodeId !== node_id) {
        console.log(`    🔧 提取的实际节点ID: ${actualNodeId} (嵌套深度: ${depth})`);
      }
    });

    console.log('');
    console.log('='.repeat(60));
    console.log(`📋 检查完成: 发现 ${issueCount} 个问题节点`);

    if (issues.length > 0) {
      console.log('');
      console.log('🚨 问题详情:');
      issues.forEach((issue, index) => {
        console.log(`${index + 1}. ${issue.workflow_type}.${issue.node_type}.${issue.node_key}`);
        console.log(`   ID: ${issue.id}`);
        console.log(`   原始值: ${issue.original}`);
        console.log(`   提取值: ${issue.extracted}`);
        console.log(`   嵌套深度: ${issue.depth}`);
        console.log(`   严重程度: ${issue.severity}`);
        console.log('');
      });

      console.log('🔧 修复建议:');
      console.log('1. 运行修复脚本清理这些节点ID');
      console.log('2. 检查前端代码确保不再产生嵌套JSON');
      console.log('3. 在后台管理页面重新保存配置');
    } else {
      console.log('✅ 所有节点ID格式正常！');
    }

    return {
      total: nodeConfigs.length,
      issues: issues.length,
      details: issues
    };

  } catch (error) {
    console.error('❌ 检查失败:', error);
    throw error;
  }
}

/**
 * 修复有问题的节点ID
 */
async function fixNodeIdFormat() {
  console.log('🔧 开始修复节点ID格式...');

  try {
    const checkResult = await checkNodeIdFormat();

    if (checkResult.issues === 0) {
      console.log('✅ 没有需要修复的节点ID');
      return;
    }

    console.log(`🔧 准备修复 ${checkResult.issues} 个问题节点...`);

    let fixedCount = 0;

    for (const issue of checkResult.details) {
      try {
        console.log(`🔧 修复节点 ${issue.workflow_type}.${issue.node_type}.${issue.node_key}...`);

        const result = await query(`
          UPDATE workflow_configs
          SET node_id = ?, updated_at = NOW()
          WHERE id = ?
        `, [issue.extracted, issue.id]);

        if (result.affectedRows > 0) {
          console.log(`✅ 修复成功: ${issue.original} -> ${issue.extracted}`);
          fixedCount++;
        } else {
          console.log(`⚠️ 修复失败: 没有找到ID为 ${issue.id} 的记录`);
        }

      } catch (error) {
        console.error(`❌ 修复节点 ${issue.id} 失败:`, error);
      }
    }

    console.log('');
    console.log('='.repeat(60));
    console.log(`🎉 修复完成: 成功修复 ${fixedCount}/${checkResult.issues} 个节点`);

    // 再次检查确认修复结果
    console.log('');
    console.log('🔍 验证修复结果...');
    await checkNodeIdFormat();

  } catch (error) {
    console.error('❌ 修复失败:', error);
    throw error;
  }
}

// 主函数
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'check';

  try {
    if (command === 'check') {
      await checkNodeIdFormat();
    } else if (command === 'fix') {
      await fixNodeIdFormat();
    } else {
      console.log('用法:');
      console.log('  node check-node-id-format.js check  # 检查节点ID格式');
      console.log('  node check-node-id-format.js fix    # 修复节点ID格式');
    }
  } catch (error) {
    console.error('❌ 执行失败:', error);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = {
  checkNodeIdFormat,
  fixNodeIdFormat
};
