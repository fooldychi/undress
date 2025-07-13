// 检查管理员用户
const { query } = require('../src/config/database');

async function checkAdminUsers() {
  try {
    console.log('🔍 检查管理员用户...');
    
    const admins = await query('SELECT id, username, email, real_name, role, status, login_attempts, locked_until, created_at FROM admins');
    
    if (admins.length === 0) {
      console.log('❌ 没有找到管理员用户');
      console.log('💡 请运行: node init-admin.js 创建管理员账号');
      return;
    }
    
    console.log(`✅ 找到 ${admins.length} 个管理员用户:`);
    console.log('');
    
    admins.forEach((admin, index) => {
      console.log(`👤 管理员 ${index + 1}:`);
      console.log(`   ID: ${admin.id}`);
      console.log(`   用户名: ${admin.username}`);
      console.log(`   邮箱: ${admin.email}`);
      console.log(`   真实姓名: ${admin.real_name}`);
      console.log(`   角色: ${admin.role}`);
      console.log(`   状态: ${admin.status}`);
      console.log(`   登录失败次数: ${admin.login_attempts}`);
      console.log(`   锁定到: ${admin.locked_until || '未锁定'}`);
      console.log(`   创建时间: ${admin.created_at}`);
      console.log('');
    });
    
    // 检查默认管理员
    const defaultAdmin = admins.find(admin => admin.username === 'admin');
    if (defaultAdmin) {
      console.log('🔑 默认管理员账号信息:');
      console.log(`   用户名: admin`);
      console.log(`   默认密码: admin123`);
      console.log(`   状态: ${defaultAdmin.status}`);
      console.log(`   是否锁定: ${defaultAdmin.locked_until ? '是' : '否'}`);
      
      if (defaultAdmin.status !== 'active') {
        console.log('⚠️ 默认管理员账号未激活');
      }
      
      if (defaultAdmin.locked_until && new Date() < new Date(defaultAdmin.locked_until)) {
        console.log('⚠️ 默认管理员账号被锁定');
      }
    } else {
      console.log('⚠️ 未找到默认管理员账号 (用户名: admin)');
    }
    
  } catch (error) {
    console.error('❌ 检查管理员用户失败:', error);
  }
}

checkAdminUsers();
