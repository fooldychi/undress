const { query } = require('./src/config/database');

async function checkTableStructure() {
  console.log('🔍 检查数据库表结构...');
  
  try {
    // 检查 workflow_configs 表结构
    const structure = await query('DESCRIBE workflow_configs');
    
    console.log('📋 workflow_configs 表结构:');
    console.log('='.repeat(80));
    
    structure.forEach(column => {
      console.log(`字段: ${column.Field}`);
      console.log(`类型: ${column.Type}`);
      console.log(`允许NULL: ${column.Null}`);
      console.log(`键: ${column.Key}`);
      console.log(`默认值: ${column.Default}`);
      console.log(`额外: ${column.Extra}`);
      console.log('-'.repeat(40));
    });
    
    // 特别检查 node_id 字段
    const nodeIdColumn = structure.find(col => col.Field === 'node_id');
    if (nodeIdColumn) {
      console.log('🔍 node_id 字段详情:');
      console.log(`类型: ${nodeIdColumn.Type}`);
      
      // 检查是否是 VARCHAR(50)
      if (nodeIdColumn.Type === 'varchar(50)') {
        console.log('❌ 问题发现: node_id 字段长度只有50字符，这导致了JSON字符串被截断！');
        console.log('🔧 建议: 将 node_id 字段类型改为 TEXT 或 VARCHAR(500)');
      } else {
        console.log('✅ node_id 字段类型正常');
      }
    }
    
  } catch (error) {
    console.error('❌ 检查失败:', error);
  }
}

async function fixTableStructure() {
  console.log('🔧 修复表结构...');
  
  try {
    // 修改 node_id 字段类型
    console.log('📝 将 node_id 字段类型从 VARCHAR(50) 改为 TEXT...');
    
    await query(`
      ALTER TABLE workflow_configs 
      MODIFY COLUMN node_id TEXT NOT NULL COMMENT '节点ID'
    `);
    
    console.log('✅ 表结构修复成功！');
    
    // 重新检查表结构
    console.log('\n🔍 验证修复结果...');
    await checkTableStructure();
    
  } catch (error) {
    console.error('❌ 修复失败:', error);
  }
}

// 主函数
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'check';
  
  try {
    if (command === 'check') {
      await checkTableStructure();
    } else if (command === 'fix') {
      await fixTableStructure();
    } else {
      console.log('用法:');
      console.log('  node check-table-structure.js check  # 检查表结构');
      console.log('  node check-table-structure.js fix    # 修复表结构');
    }
  } catch (error) {
    console.error('❌ 执行失败:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
