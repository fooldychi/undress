const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function executeSQLFile() {
  let connection;
  try {
    console.log('🔧 开始执行SQL文件...');
    
    // 创建数据库连接
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'aimagic',
      charset: 'utf8mb4',
      multipleStatements: true  // 允许执行多条SQL语句
    });

    console.log('✅ 数据库连接成功');

    // 读取SQL文件
    const sqlFile = path.join(__dirname, 'workflow-tables.sql');
    const sqlContent = fs.readFileSync(sqlFile, 'utf8');
    
    console.log('📝 执行SQL语句...');
    
    // 分割SQL语句并逐个执行
    const statements = sqlContent.split(';').filter(stmt => stmt.trim().length > 0);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      if (statement) {
        try {
          await connection.execute(statement);
          console.log(`  ✅ 执行语句 ${i + 1}/${statements.length}`);
        } catch (error) {
          console.log(`  ⚠️ 语句 ${i + 1} 跳过: ${error.message}`);
        }
      }
    }

    // 验证创建结果
    console.log('\n📊 验证创建结果...');
    
    // 检查表是否存在
    const [tables] = await connection.execute("SHOW TABLES LIKE 'workflow%'");
    console.log('工作流相关表:');
    tables.forEach(table => {
      const tableName = Object.values(table)[0];
      console.log(`  ✅ ${tableName}`);
    });

    if (tables.length >= 2) {
      // 检查数据
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
    }

    console.log('\n🎉 SQL文件执行完成！');
    return true;

  } catch (error) {
    console.error('❌ 执行SQL文件失败:', error.message);
    return false;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

executeSQLFile().then(success => {
  if (success) {
    console.log('\n✅ 工作流表创建成功，可以开始使用配置功能');
  } else {
    console.log('\n❌ 工作流表创建失败，请检查错误信息');
  }
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('❌ 执行过程失败:', error);
  process.exit(1);
});
