const mysql = require('mysql2/promise');
require('dotenv').config();

async function verifyWorkflowConfig() {
  let connection;
  try {
    console.log('🔍 验证工作流配置功能...');
    
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

    // 1. 检查表是否存在
    console.log('\n📋 检查数据库表...');
    const [tables] = await connection.execute("SHOW TABLES LIKE 'workflow%'");
    
    if (tables.length < 2) {
      console.log('❌ 工作流表不存在或不完整');
      return false;
    }
    
    tables.forEach(table => {
      const tableName = Object.values(table)[0];
      console.log(`  ✅ ${tableName}`);
    });

    // 2. 检查工作流信息
    console.log('\n📊 检查工作流信息...');
    const [workflowInfos] = await connection.execute('SELECT * FROM workflow_info ORDER BY workflow_type');
    
    if (workflowInfos.length < 2) {
      console.log('❌ 工作流信息不完整');
      return false;
    }
    
    workflowInfos.forEach(info => {
      console.log(`  ✅ ${info.workflow_type}: ${info.workflow_name} (${info.is_enabled ? '启用' : '禁用'})`);
    });

    // 3. 检查节点配置
    console.log('\n🔧 检查节点配置...');
    const [nodeConfigs] = await connection.execute(`
      SELECT workflow_type, node_type, COUNT(*) as count 
      FROM workflow_configs 
      GROUP BY workflow_type, node_type 
      ORDER BY workflow_type, node_type
    `);
    
    if (nodeConfigs.length < 4) {
      console.log('❌ 节点配置不完整');
      return false;
    }
    
    nodeConfigs.forEach(config => {
      console.log(`  ✅ ${config.workflow_type} ${config.node_type}: ${config.count} 个节点`);
    });

    // 4. 检查具体节点配置
    console.log('\n🎯 检查具体节点配置...');
    
    // 检查换脸工作流
    const [faceswapNodes] = await connection.execute(`
      SELECT node_type, node_key, node_id, node_order 
      FROM workflow_configs 
      WHERE workflow_type = 'faceswap' 
      ORDER BY node_type, node_order
    `);
    
    console.log('换脸工作流节点:');
    faceswapNodes.forEach(node => {
      console.log(`  - ${node.node_type}/${node.node_key}: ${node.node_id} (优先级: ${node.node_order})`);
    });

    // 检查一键褪衣工作流
    const [undressNodes] = await connection.execute(`
      SELECT node_type, node_key, node_id, node_order 
      FROM workflow_configs 
      WHERE workflow_type = 'undress' 
      ORDER BY node_type, node_order
    `);
    
    console.log('\n一键褪衣工作流节点:');
    undressNodes.forEach(node => {
      console.log(`  - ${node.node_type}/${node.node_key}: ${node.node_id} (优先级: ${node.node_order})`);
    });

    // 5. 测试API响应格式
    console.log('\n🌐 测试API响应格式...');
    
    // 模拟API查询
    const [workflowInfoResult] = await connection.execute(`
      SELECT workflow_type, workflow_name, is_enabled
      FROM workflow_info
      WHERE is_enabled = TRUE
      ORDER BY workflow_type
    `);

    const [nodeConfigResult] = await connection.execute(`
      SELECT workflow_type, node_type, node_key, node_id, node_order
      FROM workflow_configs
      WHERE is_enabled = TRUE
      ORDER BY workflow_type, node_type, node_order
    `);

    // 组织数据结构（模拟API响应）
    const result = {};
    
    workflowInfoResult.forEach(info => {
      result[info.workflow_type] = {
        name: info.workflow_name,
        enabled: info.is_enabled,
        inputNodes: {},
        outputNodes: []
      };
    });

    nodeConfigResult.forEach(config => {
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

    console.log('API响应格式预览:');
    console.log(JSON.stringify(result, null, 2));

    console.log('\n🎉 工作流配置验证完成！');
    return true;

  } catch (error) {
    console.error('❌ 验证失败:', error.message);
    return false;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

verifyWorkflowConfig().then(success => {
  if (success) {
    console.log('\n✅ 工作流配置功能验证成功！');
    console.log('\n📋 下一步操作:');
    console.log('1. 打开测试页面: test-workflow-config.html');
    console.log('2. 访问后台管理系统的工作流配置页面');
    console.log('3. 测试前端工作流处理功能');
  } else {
    console.log('\n❌ 工作流配置功能验证失败！');
  }
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('❌ 验证过程失败:', error);
  process.exit(1);
});
