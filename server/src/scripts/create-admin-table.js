// 创建管理员表和初始管理员账号
const { query } = require('../config/database');
const bcrypt = require('bcryptjs');

async function createAdminTable() {
  try {
    console.log('🔧 开始创建管理员表...');

    // 创建管理员表
    await query(`
      CREATE TABLE IF NOT EXISTS admins (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL COMMENT '管理员用户名',
        password VARCHAR(255) NOT NULL COMMENT '密码哈希',
        email VARCHAR(100) UNIQUE NOT NULL COMMENT '邮箱',
        real_name VARCHAR(50) COMMENT '真实姓名',
        role ENUM('super_admin', 'admin', 'operator') DEFAULT 'admin' COMMENT '角色',
        status ENUM('active', 'inactive', 'locked') DEFAULT 'active' COMMENT '状态',
        last_login_at DATETIME NULL COMMENT '最后登录时间',
        last_login_ip VARCHAR(45) NULL COMMENT '最后登录IP',
        login_attempts INT DEFAULT 0 COMMENT '登录尝试次数',
        locked_until DATETIME NULL COMMENT '锁定到期时间',
        created_at DATETIME NOT NULL COMMENT '创建时间',
        updated_at DATETIME NULL COMMENT '更新时间',
        INDEX idx_username (username),
        INDEX idx_email (email),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='管理员表'
    `);
    console.log('✅ 管理员表创建成功');

    // 检查是否已有管理员账号
    const existingAdmins = await query('SELECT COUNT(*) as count FROM admins');

    if (existingAdmins[0].count === 0) {
      console.log('📝 创建默认管理员账号...');

      // 创建默认管理员账号
      const defaultPassword = 'admin123456';
      const hashedPassword = await bcrypt.hash(defaultPassword, 10);

      await query(`
        INSERT INTO admins (username, password, email, real_name, role, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, NOW())
      `, ['admin', hashedPassword, 'admin@imagic.com', '系统管理员', 'super_admin', 'active']);

      console.log('✅ 默认管理员账号创建成功');
      console.log('📋 默认登录信息:');
      console.log('   用户名: admin');
      console.log('   密码: admin123456');
      console.log('   邮箱: admin@imagic.com');
      console.log('⚠️  请登录后立即修改默认密码！');
    } else {
      console.log('ℹ️  管理员账号已存在，跳过创建');
    }

    console.log('ℹ️ 管理员登录日志功能已移除，使用控制台日志记录');

    console.log('🎉 管理员系统初始化完成！');

  } catch (error) {
    console.error('❌ 创建管理员表失败:', error);
    throw error;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  createAdminTable()
    .then(() => {
      console.log('✅ 脚本执行完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 脚本执行失败:', error);
      process.exit(1);
    });
}

module.exports = { createAdminTable };
