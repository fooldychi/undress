const mysql = require('mysql2/promise');
require('dotenv').config();

async function createTablesStepByStep() {
  let connection;
  try {
    console.log('🔧 开始分步创建工作流表...');
    
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

    // 步骤1：删除已存在的表（如果有）
    console.log('📝 步骤1：清理已存在的表...');
    try {
      await connection.execute('DROP TABLE IF EXISTS workflow_configs');
      await connection.execute('DROP TABLE IF EXISTS workflow_info');
      console.log('  ✅ 清理完成');
    } catch (error) {
      console.log('  ⚠️ 清理跳过:', error.message);
    }

    // 步骤2：创建workflow_info表
    console.log('📝 步骤2：创建workflow_info表...');
    await connection.execute(`
      CREATE TABLE workflow_info (
        id INT AUTO_INCREMENT PRIMARY KEY,
        workflow_type VARCHAR(50) NOT NULL UNIQUE,
        workflow_name VARCHAR(100) NOT NULL,
        description TEXT,
        file_path VARCHAR(255),
        is_enabled BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('  ✅ workflow_info表创建成功');

    // 步骤3：创建workflow_configs表
    console.log('📝 步骤3：创建workflow_configs表...');
    await connection.execute(`
      CREATE TABLE workflow_configs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        workflow_type VARCHAR(50) NOT NULL,
        node_type ENUM('input', 'output') NOT NULL,
        node_key VARCHAR(100) NOT NULL,
        node_id VARCHAR(50) NOT NULL,
        node_order INT DEFAULT 0,
        description VARCHAR(255) DEFAULT NULL,
        is_enabled BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('  ✅ workflow_configs表创建成功');

    // 步骤4：添加索引
    console.log('📝 步骤4：添加索引...');
    await connection.execute(`
      ALTER TABLE workflow_configs 
      ADD UNIQUE KEY uk_workflow_node (workflow_type, node_type, node_key)
    `);
    await connection.execute(`
      ALTER TABLE workflow_configs 
      ADD INDEX idx_workflow_type (workflow_type)
    `);
    await connection.execute(`
      ALTER TABLE workflow_configs 
      ADD INDEX idx_node_type (node_type)
    `);
    console.log('  ✅ 索引添加成功');

    // 步骤5：插入工作流基础信息
    console.log('📝 步骤5：插入工作流基础信息...');
    const workflowInfos = [
      ['faceswap', 'Face Swap 2.0', '高质量人脸替换工作流', 'workflows/faceswap2.0.json', true],
      ['undress', 'Undress AI', '一键褪衣AI工作流', 'workflows/undress.json', true]
    ];

    for (const [type, name, desc, path, enabled] of workflowInfos) {
      await connection.execute(`
        INSERT INTO workflow_info (workflow_type, workflow_name, description, file_path, is_enabled)
        VALUES (?, ?, ?, ?, ?)
      `, [type, name, desc, path, enabled]);
      console.log(`  ✅ 插入工作流: ${name}`);
    }

    // 步骤6：插入工作流节点配置
    console.log('📝 步骤6：插入工作流节点配置...');
    const nodeConfigs = [
      // 换脸工作流输入节点
      ['faceswap', 'input', 'face_photo_1', '670', 1, '第一张人脸照片节点'],
      ['faceswap', 'input', 'face_photo_2', '662', 2, '第二张人脸照片节点'],
      ['faceswap', 'input', 'face_photo_3', '658', 3, '第三张人脸照片节点'],
      ['faceswap', 'input', 'face_photo_4', '655', 4, '第四张人脸照片节点'],
      ['faceswap', 'input', 'target_image', '737', 5, '目标图片节点'],
      
      // 换脸工作流输出节点（按优先级排序）
      ['faceswap', 'output', 'primary', '812', 1, '主要输出节点'],
      ['faceswap', 'output', 'secondary_1', '813', 2, '备用输出节点1'],
      ['faceswap', 'output', 'secondary_2', '746', 3, '备用输出节点2'],
      ['faceswap', 'output', 'secondary_3', '710', 4, '备用输出节点3'],
      
      // 一键褪衣工作流输入节点
      ['undress', 'input', 'main_image', '49', 1, '主图片输入节点'],
      ['undress', 'input', 'seed_node', '174', 2, '随机种子节点'],
      
      // 一键褪衣工作流输出节点（按优先级排序）
      ['undress', 'output', 'primary', '730', 1, '主要输出节点'],
      ['undress', 'output', 'secondary_1', '812', 2, '备用输出节点1'],
      ['undress', 'output', 'secondary_2', '813', 3, '备用输出节点2'],
      ['undress', 'output', 'secondary_3', '746', 4, '备用输出节点3'],
      ['undress', 'output', 'secondary_4', '710', 5, '备用输出节点4']
    ];

    for (const [workflowType, nodeType, nodeKey, nodeId, order, desc] of nodeConfigs) {
      await connection.execute(`
        INSERT INTO workflow_configs (workflow_type, node_type, node_key, node_id, node_order, description)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [workflowType, nodeType, nodeKey, nodeId, order, desc]);
    }
    console.log(`  ✅ 插入 ${nodeConfigs.length} 个节点配置`);

    // 步骤7：验证创建结果
    console.log('📝 步骤7：验证创建结果...');
    
    const [tables] = await connection.execute("SHOW TABLES LIKE 'workflow%'");
    console.log('工作流相关表:');
    tables.forEach(table => {
      const tableName = Object.values(table)[0];
      console.log(`  ✅ ${tableName}`);
    });

    const [workflowInfoResult] = await connection.execute('SELECT * FROM workflow_info ORDER BY workflow_type');
    console.log('\n工作流信息:');
    workflowInfoResult.forEach(info => {
      console.log(`  - ${info.workflow_type}: ${info.workflow_name} (${info.is_enabled ? '启用' : '禁用'})`);
    });

    const [nodeConfigResult] = await connection.execute(`
      SELECT workflow_type, node_type, COUNT(*) as count 
      FROM workflow_configs 
      GROUP BY workflow_type, node_type 
      ORDER BY workflow_type, node_type
    `);
    console.log('\n节点配置统计:');
    nodeConfigResult.forEach(stat => {
      console.log(`  - ${stat.workflow_type} ${stat.node_type}: ${stat.count} 个节点`);
    });

    console.log('\n🎉 工作流表创建完成！');
    return true;

  } catch (error) {
    console.error('❌ 创建工作流表失败:', error.message);
    console.error('详细错误:', error);
    return false;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

createTablesStepByStep().then(success => {
  if (success) {
    console.log('\n✅ 工作流表创建成功，可以开始使用配置功能');
  } else {
    console.log('\n❌ 工作流表创建失败，请检查错误信息');
  }
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('❌ 创建过程失败:', error);
  process.exit(1);
});
