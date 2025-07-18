const mysql = require('mysql2/promise');
require('dotenv').config();

async function verifyDatabaseUpdate() {
  let connection;
  try {
    console.log('🔍 验证数据库实际更新情况...');
    
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

    // 1. 检查工作流基础信息
    console.log('\n📊 检查工作流基础信息...');
    const [workflowInfos] = await connection.execute(`
      SELECT workflow_type, workflow_name, is_enabled, updated_at
      FROM workflow_info
      ORDER BY workflow_type
    `);
    
    workflowInfos.forEach(info => {
      console.log(`  - ${info.workflow_type}: ${info.workflow_name} (${info.is_enabled ? '启用' : '禁用'}) - 更新时间: ${info.updated_at}`);
    });

    // 2. 检查节点配置
    console.log('\n🔧 检查节点配置...');
    const [nodeConfigs] = await connection.execute(`
      SELECT workflow_type, node_type, node_key, node_id, node_order, updated_at
      FROM workflow_configs
      ORDER BY workflow_type, node_type, node_order
    `);
    
    console.log('所有节点配置:');
    nodeConfigs.forEach(config => {
      console.log(`  - ${config.workflow_type}/${config.node_type}/${config.node_key}: ${config.node_id} (优先级: ${config.node_order}) - 更新时间: ${config.updated_at}`);
    });

    // 3. 检查最近的更新时间
    console.log('\n⏰ 检查最近更新时间...');
    const [recentUpdates] = await connection.execute(`
      SELECT 'workflow_info' as table_name, workflow_type as item_name, updated_at
      FROM workflow_info
      WHERE updated_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)
      UNION ALL
      SELECT 'workflow_configs' as table_name, CONCAT(workflow_type, '/', node_key) as item_name, updated_at
      FROM workflow_configs
      WHERE updated_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)
      ORDER BY updated_at DESC
    `);
    
    if (recentUpdates.length > 0) {
      console.log('最近1小时内的更新:');
      recentUpdates.forEach(update => {
        console.log(`  - ${update.table_name}.${update.item_name}: ${update.updated_at}`);
      });
    } else {
      console.log('❌ 最近1小时内没有任何更新记录！');
    }

    // 4. 测试一个简单的更新操作
    console.log('\n🧪 测试数据库更新操作...');
    const testUpdateTime = new Date().toISOString().slice(0, 19).replace('T', ' ');
    
    const [updateResult] = await connection.execute(`
      UPDATE workflow_configs
      SET updated_at = NOW()
      WHERE workflow_type = 'faceswap' AND node_key = 'face_photo_1'
      LIMIT 1
    `);
    
    console.log('测试更新结果:', updateResult);
    
    if (updateResult.affectedRows > 0) {
      console.log('✅ 数据库更新操作正常');
      
      // 验证更新是否生效
      const [verifyResult] = await connection.execute(`
        SELECT node_key, updated_at
        FROM workflow_configs
        WHERE workflow_type = 'faceswap' AND node_key = 'face_photo_1'
      `);
      
      console.log('验证更新结果:', verifyResult[0]);
    } else {
      console.log('❌ 数据库更新操作失败');
    }

    // 5. 检查数据库连接和权限
    console.log('\n🔐 检查数据库权限...');
    const [privileges] = await connection.execute(`
      SHOW GRANTS FOR CURRENT_USER()
    `);
    
    console.log('当前用户权限:');
    privileges.forEach(grant => {
      console.log(`  - ${Object.values(grant)[0]}`);
    });

    return true;

  } catch (error) {
    console.error('❌ 验证失败:', error.message);
    console.error('详细错误:', error);
    return false;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

verifyDatabaseUpdate().then(success => {
  if (success) {
    console.log('\n✅ 数据库验证完成');
  } else {
    console.log('\n❌ 数据库验证失败');
  }
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('❌ 验证过程失败:', error);
  process.exit(1);
});
