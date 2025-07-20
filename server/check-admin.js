require('dotenv').config();
const { query } = require('./src/config/database');

async function checkAdmin() {
  try {
    console.log('🔍 检查管理员账号...');

    const admins = await query('SELECT id, username, role, status FROM admins');

    console.log('👨‍💼 管理员账号列表:');
    admins.forEach(admin => {
      console.log(`  - ID: ${admin.id}, 用户名: ${admin.username}, 角色: ${admin.role}, 状态: ${admin.status}`);
    });

    if (admins.length === 0) {
      console.log('❌ 没有找到管理员账号');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ 检查管理员账号失败:', error);
    process.exit(1);
  }
}

checkAdmin();
