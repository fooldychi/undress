// 数据库优化脚本
const { query } = require('../src/config/database');

async function optimizeDatabase() {
  console.log('🔧 开始执行数据库性能优化...');
  
  const optimizations = [
    {
      name: '用户表用户名索引',
      sql: 'CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)'
    },
    {
      name: '用户表状态索引',
      sql: 'CREATE INDEX IF NOT EXISTS idx_users_status ON users(status)'
    },
    {
      name: '等级卡绑定用户索引',
      sql: 'CREATE INDEX IF NOT EXISTS idx_level_cards_bound_user_id ON level_cards(bound_user_id)'
    },
    {
      name: '等级卡剩余积分索引',
      sql: 'CREATE INDEX IF NOT EXISTS idx_level_cards_remaining_points ON level_cards(remaining_points)'
    },
    {
      name: '等级卡用户积分复合索引',
      sql: 'CREATE INDEX IF NOT EXISTS idx_level_cards_user_points ON level_cards(bound_user_id, remaining_points)'
    },
    {
      name: '积分记录用户索引',
      sql: 'CREATE INDEX IF NOT EXISTS idx_point_logs_user_id ON point_logs(user_id)'
    },
    {
      name: '积分记录时间索引',
      sql: 'CREATE INDEX IF NOT EXISTS idx_point_logs_created_at ON point_logs(created_at)'
    },
    {
      name: '积分记录用户时间复合索引',
      sql: 'CREATE INDEX IF NOT EXISTS idx_point_logs_user_time ON point_logs(user_id, created_at DESC)'
    }
  ];

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (const optimization of optimizations) {
    try {
      await query(optimization.sql);
      console.log(`✅ ${optimization.name} - 创建成功`);
      successCount++;
    } catch (error) {
      if (error.code === 'ER_DUP_KEYNAME') {
        console.log(`ℹ️ ${optimization.name} - 已存在，跳过`);
        skipCount++;
      } else {
        console.error(`❌ ${optimization.name} - 失败: ${error.message}`);
        errorCount++;
      }
    }
  }

  console.log('\n📊 优化结果统计:');
  console.log(`✅ 成功创建: ${successCount} 个索引`);
  console.log(`ℹ️ 已存在跳过: ${skipCount} 个索引`);
  console.log(`❌ 创建失败: ${errorCount} 个索引`);
  
  if (errorCount === 0) {
    console.log('\n🎉 数据库优化完成!');
  } else {
    console.log('\n⚠️ 数据库优化完成，但有部分索引创建失败');
  }
}

// 运行优化
optimizeDatabase()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 优化过程中发生错误:', error);
    process.exit(1);
  });
