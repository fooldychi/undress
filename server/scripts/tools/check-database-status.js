require('dotenv').config({ path: './server/.env' });
const mysql = require('mysql2/promise');

async function checkDatabaseStatus() {
  console.log('🔍 检查数据库状态...\n');
  
  try {
    // 创建数据库连接
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      charset: 'utf8mb4'
    });
    
    console.log('✅ 数据库连接成功');
    console.log(`📍 连接到: ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}\n`);
    
    // 查询函数
    const query = async (sql, params = []) => {
      const [rows] = await connection.execute(sql, params);
      return rows;
    };
    
    // 获取详细统计信息
    console.log('📊 数据库统计信息:');
    
    // 用户统计
    const userStats = await query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_users,
        COUNT(CASE WHEN status = 'banned' THEN 1 END) as banned_users,
        COUNT(CASE WHEN DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) THEN 1 END) as recent_users
      FROM users
    `);
    
    const userStat = userStats[0];
    console.log(`   👥 用户: ${userStat.total_users} 总数 (${userStat.active_users} 活跃, ${userStat.banned_users} 封禁, ${userStat.recent_users} 近7天新增)`);
    
    // 等级卡统计
    const cardStats = await query(`
      SELECT 
        COUNT(*) as total_cards,
        COUNT(CASE WHEN bound_user_id IS NOT NULL THEN 1 END) as bound_cards,
        COUNT(CASE WHEN bound_user_id IS NULL THEN 1 END) as available_cards,
        SUM(remaining_points) as total_points
      FROM level_cards
    `);
    
    const cardStat = cardStats[0];
    console.log(`   🎫 等级卡: ${cardStat.total_cards} 总数 (${cardStat.bound_cards} 已绑定, ${cardStat.available_cards} 可用, ${cardStat.total_points} 总积分)`);
    
    // 积分记录统计
    const pointStats = await query(`
      SELECT 
        COUNT(*) as total_logs,
        COUNT(CASE WHEN action_type = 'consume' THEN 1 END) as consume_logs,
        COUNT(CASE WHEN action_type = 'bind' THEN 1 END) as bind_logs,
        SUM(CASE WHEN action_type = 'consume' THEN points_amount ELSE 0 END) as total_consumed
      FROM point_logs
    `);
    
    const pointStat = pointStats[0];
    console.log(`   💰 积分记录: ${pointStat.total_logs} 总记录 (${pointStat.consume_logs} 消费, ${pointStat.bind_logs} 绑定, ${pointStat.total_consumed} 总消费积分)`);
    
    // 管理员统计
    const adminStats = await query('SELECT COUNT(*) as admin_count FROM admins');
    console.log(`   👨‍💼 管理员: ${adminStats[0].admin_count} 个账号`);
    
    // 卡片类型统计
    const cardTypes = await query('SELECT name, COUNT(*) as count FROM level_cards lc JOIN card_types ct ON lc.type_id = ct.id GROUP BY ct.name');
    console.log('\n🎯 卡片类型分布:');
    cardTypes.forEach(type => {
      console.log(`   ${type.name}: ${type.count} 张`);
    });
    
    // 最近活动
    console.log('\n📈 最近活动:');
    const recentLogs = await query(`
      SELECT pl.action_type, pl.points_amount, pl.description, pl.created_at, u.username
      FROM point_logs pl
      LEFT JOIN users u ON pl.user_id = u.id
      ORDER BY pl.created_at DESC
      LIMIT 5
    `);
    
    if (recentLogs.length > 0) {
      recentLogs.forEach(log => {
        const date = new Date(log.created_at).toLocaleString('zh-CN');
        console.log(`   ${date} - ${log.username || '未知用户'}: ${log.description} (${log.points_amount}积分)`);
      });
    } else {
      console.log('   暂无积分记录');
    }
    
    console.log('\n🎉 数据库状态检查完成！');
    console.log('💡 数据库连接正常，可以启动管理后台使用真实数据。');
    
    await connection.end();
    
  } catch (error) {
    console.error('❌ 数据库连接失败:', error.message);
    console.log('\n🔧 请检查以下配置:');
    console.log(`   数据库主机: ${process.env.DB_HOST}`);
    console.log(`   数据库端口: ${process.env.DB_PORT}`);
    console.log(`   数据库名称: ${process.env.DB_NAME}`);
    console.log(`   数据库用户: ${process.env.DB_USER}`);
    console.log('\n💡 确保数据库服务器可访问且配置正确。');
  }
}

checkDatabaseStatus();
