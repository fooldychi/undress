const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkWorkflowStatus() {
  let connection;
  try {
    console.log('🔍 检查工作流启用状态一致性...');
    
    // 创建数据库连接
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'aimagic',
      charset: 'utf8mb4'
    });

    console.log('✅ 数据库连接成功');

    // 1. 检查工作流基础信息表的启用状态
    console.log('\n📊 检查工作流基础信息表...');
    const [workflowInfos] = await connection.execute(`
      SELECT workflow_type, workflow_name, is_enabled, updated_at
      FROM workflow_info
      ORDER BY workflow_type
    `);
    
    console.log('工作流基础信息:');
    workflowInfos.forEach(info => {
      console.log(`  - ${info.workflow_type}: ${info.workflow_name}`);
      console.log(`    启用状态: ${info.is_enabled ? '✅ 启用' : '❌ 禁用'}`);
      console.log(`    更新时间: ${info.updated_at}`);
    });

    // 2. 检查节点配置表的启用状态
    console.log('\n🔧 检查节点配置表...');
    const [nodeConfigs] = await connection.execute(`
      SELECT workflow_type, 
             COUNT(*) as total_nodes,
             SUM(CASE WHEN is_enabled = 1 THEN 1 ELSE 0 END) as enabled_nodes,
             SUM(CASE WHEN is_enabled = 0 THEN 1 ELSE 0 END) as disabled_nodes
      FROM workflow_configs
      GROUP BY workflow_type
      ORDER BY workflow_type
    `);
    
    console.log('节点配置统计:');
    nodeConfigs.forEach(config => {
      console.log(`  - ${config.workflow_type}:`);
      console.log(`    总节点数: ${config.total_nodes}`);
      console.log(`    启用节点: ${config.enabled_nodes}`);
      console.log(`    禁用节点: ${config.disabled_nodes}`);
    });

    // 3. 检查API返回的数据格式
    console.log('\n🌐 模拟API响应格式...');
    
    // 模拟公开API的数据组织方式
    const result = {};
    
    workflowInfos.forEach(info => {
      result[info.workflow_type] = {
        name: info.workflow_name,
        enabled: Boolean(info.is_enabled), // 确保是布尔值
        inputNodes: {},
        outputNodes: []
      };
    });

    const [allNodeConfigs] = await connection.execute(`
      SELECT workflow_type, node_type, node_key, node_id, node_order, is_enabled
      FROM workflow_configs
      WHERE is_enabled = TRUE
      ORDER BY workflow_type, node_type, node_order
    `);

    allNodeConfigs.forEach(config => {
      const workflow = result[config.workflow_type];
      if (!workflow) return;

      if (config.node_type === 'input') {
        workflow.inputNodes[config.node_key] = config.node_id;
      } else if (config.node_type === 'output') {
        workflow.outputNodes.push({
          key: config.node_key,
          nodeId: config.node_id,
          order: config.node_order
        });
      }
    });

    // 对输出节点按优先级排序
    Object.values(result).forEach(workflow => {
      workflow.outputNodes.sort((a, b) => a.order - b.order);
    });

    console.log('API响应数据:');
    console.log(JSON.stringify(result, null, 2));

    // 4. 检查数据一致性问题
    console.log('\n🔍 数据一致性检查...');
    
    let hasInconsistency = false;
    
    for (const info of workflowInfos) {
      const workflowType = info.workflow_type;
      const workflowEnabled = Boolean(info.is_enabled);
      
      // 检查该工作流的节点配置
      const [workflowNodes] = await connection.execute(`
        SELECT COUNT(*) as total, 
               SUM(CASE WHEN is_enabled = 1 THEN 1 ELSE 0 END) as enabled
        FROM workflow_configs
        WHERE workflow_type = ?
      `, [workflowType]);
      
      const nodeStats = workflowNodes[0];
      const hasEnabledNodes = nodeStats.enabled > 0;
      
      console.log(`\n${workflowType} 一致性检查:`);
      console.log(`  工作流启用状态: ${workflowEnabled ? '启用' : '禁用'}`);
      console.log(`  启用节点数量: ${nodeStats.enabled}/${nodeStats.total}`);
      
      if (workflowEnabled && !hasEnabledNodes) {
        console.log(`  ⚠️ 不一致: 工作流已启用但没有启用的节点`);
        hasInconsistency = true;
      } else if (!workflowEnabled && hasEnabledNodes) {
        console.log(`  ⚠️ 不一致: 工作流已禁用但有启用的节点`);
        hasInconsistency = true;
      } else {
        console.log(`  ✅ 一致: 状态匹配`);
      }
    }

    if (hasInconsistency) {
      console.log('\n❌ 发现数据一致性问题！');
      return false;
    } else {
      console.log('\n✅ 数据一致性检查通过！');
      return true;
    }

  } catch (error) {
    console.error('❌ 检查失败:', error.message);
    console.error('详细错误:', error);
    return false;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkWorkflowStatus().then(success => {
  if (success) {
    console.log('\n🎉 工作流状态检查完成');
  } else {
    console.log('\n❌ 工作流状态检查发现问题');
  }
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('❌ 检查过程失败:', error);
  process.exit(1);
});
