const { query, testConnection } = require('../config/database');

// 数据库表结构
const createTables = async () => {
  try {
    console.log('🔧 开始创建数据库表...');

    // 用户表
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        avatar VARCHAR(255) DEFAULT NULL,
        status ENUM('active', 'inactive', 'banned') DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NULL,
        last_login DATETIME NULL,
        INDEX idx_email (email),
        INDEX idx_username (username),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ 用户表创建成功');

    // 图片表
    await query(`
      CREATE TABLE IF NOT EXISTS images (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        filename VARCHAR(255) NOT NULL,
        original_name VARCHAR(255) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        file_size INT NOT NULL,
        mime_type VARCHAR(100) NOT NULL,
        width INT DEFAULT NULL,
        height INT DEFAULT NULL,
        created_at DATETIME NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ 图片表创建成功');

    // 处理任务表
    await query(`
      CREATE TABLE IF NOT EXISTS processing_tasks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        type ENUM('undress', 'face-swap') NOT NULL,
        status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
        prompt TEXT DEFAULT NULL,
        settings TEXT DEFAULT NULL,
        progress INT DEFAULT 0,
        error_message TEXT DEFAULT NULL,
        created_at DATETIME NOT NULL,
        updated_at DATETIME NULL,
        completed_at DATETIME NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_status (status),
        INDEX idx_type (type),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ 处理任务表创建成功');

    // 任务图片关联表
    await query(`
      CREATE TABLE IF NOT EXISTS task_images (
        id INT AUTO_INCREMENT PRIMARY KEY,
        task_id INT NOT NULL,
        image_id INT NOT NULL,
        type ENUM('input', 'output') NOT NULL,
        created_at DATETIME NOT NULL,
        FOREIGN KEY (task_id) REFERENCES processing_tasks(id) ON DELETE CASCADE,
        FOREIGN KEY (image_id) REFERENCES images(id) ON DELETE CASCADE,
        INDEX idx_task_id (task_id),
        INDEX idx_image_id (image_id),
        INDEX idx_type (type)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ 任务图片关联表创建成功');

    // 用户积分表
    await query(`
      CREATE TABLE IF NOT EXISTS user_points (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        points INT DEFAULT 60,
        daily_reset_date DATE NOT NULL,
        purchased_points INT DEFAULT 0,
        total_used INT DEFAULT 0,
        created_at DATETIME NOT NULL,
        updated_at DATETIME NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user (user_id),
        INDEX idx_daily_reset (daily_reset_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ 用户积分表创建成功');

    // 积分使用记录表
    await query(`
      CREATE TABLE IF NOT EXISTS point_transactions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        type ENUM('use', 'purchase', 'daily_reset') NOT NULL,
        amount INT NOT NULL,
        balance_after INT NOT NULL,
        description VARCHAR(255) DEFAULT NULL,
        task_id INT DEFAULT NULL,
        created_at DATETIME NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (task_id) REFERENCES processing_tasks(id) ON DELETE SET NULL,
        INDEX idx_user_id (user_id),
        INDEX idx_type (type),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ 积分使用记录表创建成功');

    // 秒杀活动表
    await query(`
      CREATE TABLE IF NOT EXISTS seckill_activities (
        id INT AUTO_INCREMENT PRIMARY KEY,
        activity_date DATE NOT NULL,
        total_vouchers INT DEFAULT 100,
        remaining_vouchers INT DEFAULT 100,
        voucher_points INT DEFAULT 20,
        start_time TIME DEFAULT '23:00:00',
        status ENUM('pending', 'active', 'ended') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NULL,
        UNIQUE KEY unique_date (activity_date),
        INDEX idx_status (status),
        INDEX idx_date (activity_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ 秒杀活动表创建成功');

    // 秒杀参与记录表（无需用户登录，记录浏览器指纹）
    await query(`
      CREATE TABLE IF NOT EXISTS seckill_participations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        activity_id INT NOT NULL,
        browser_fingerprint VARCHAR(255) NOT NULL,
        ip_address VARCHAR(45) NOT NULL,
        points_awarded INT DEFAULT 20,
        participated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (activity_id) REFERENCES seckill_activities(id) ON DELETE CASCADE,
        UNIQUE KEY unique_participation (activity_id, browser_fingerprint),
        INDEX idx_activity (activity_id),
        INDEX idx_fingerprint (browser_fingerprint)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ 秒杀参与记录表创建成功');

    console.log('🎉 所有数据库表创建完成！');
  } catch (error) {
    console.error('❌ 创建数据库表失败:', error);
    throw error;
  }
};

// 创建默认数据
const createDefaultData = async () => {
  try {
    console.log('🔧 开始创建默认数据...');

    // 检查是否已有管理员用户
    const adminUsers = await query(
      'SELECT id FROM users WHERE email = ?',
      ['admin@imagic.com']
    );

    if (adminUsers.length === 0) {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('admin123456', 12);

      await query(
        'INSERT INTO users (username, email, password, status) VALUES (?, ?, ?, ?)',
        ['admin', 'admin@imagic.com', hashedPassword, 'active']
      );

      console.log('✅ 默认管理员用户创建成功');
      console.log('📧 邮箱: admin@imagic.com');
      console.log('🔑 密码: admin123456');
    } else {
      console.log('ℹ️  管理员用户已存在');
    }

    console.log('🎉 默认数据创建完成！');
  } catch (error) {
    console.error('❌ 创建默认数据失败:', error);
    throw error;
  }
};

// 主函数
const initDatabase = async () => {
  try {
    console.log('🚀 开始初始化数据库...');

    // 测试数据库连接
    const connected = await testConnection();
    if (!connected) {
      throw new Error('数据库连接失败');
    }

    // 创建表结构
    await createTables();

    // 创建默认数据
    await createDefaultData();

    console.log('🎉 数据库初始化完成！');
    process.exit(0);
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error);
    process.exit(1);
  }
};

// 如果直接运行此脚本
if (require.main === module) {
  initDatabase();
}

module.exports = {
  initDatabase,
  createTables,
  createDefaultData
};
