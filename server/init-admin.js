const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// 数据库连接配置
const dbConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  charset: 'utf8mb4'
};

async function initAdmin() {
  let connection;
  
  try {
    console.log('🔗 连接数据库...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ 数据库连接成功');

    // 检查admins表是否存在
    console.log('📋 检查admins表...');
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'admins'
    `, [process.env.DB_NAME]);

    if (tables.length === 0) {
      console.log('📝 创建admins表...');
      await connection.execute(`
        CREATE TABLE admins (
          id INT AUTO_INCREMENT PRIMARY KEY,
          username VARCHAR(50) UNIQUE NOT NULL COMMENT '用户名',
          password VARCHAR(255) NOT NULL COMMENT '密码',
          email VARCHAR(100) COMMENT '邮箱',
          real_name VARCHAR(50) COMMENT '真实姓名',
          role ENUM('super_admin', 'admin') DEFAULT 'admin' COMMENT '角色',
          status ENUM('active', 'inactive') DEFAULT 'active' COMMENT '状态',
          login_attempts INT DEFAULT 0 COMMENT '登录失败次数',
          locked_until DATETIME NULL COMMENT '锁定到期时间',
          last_login_at DATETIME NULL COMMENT '最后登录时间',
          last_login_ip VARCHAR(45) NULL COMMENT '最后登录IP',
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
          updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='管理员表'
      `);
      console.log('✅ admins表创建成功');
    } else {
      console.log('✅ admins表已存在');
    }

    // 检查是否已有管理员
    const [admins] = await connection.execute('SELECT COUNT(*) as count FROM admins');
    
    if (admins[0].count === 0) {
      console.log('👤 创建默认管理员...');
      
      // 创建默认管理员
      const defaultUsername = 'admin';
      const defaultPassword = 'admin123';
      const hashedPassword = await bcrypt.hash(defaultPassword, 10);
      
      await connection.execute(`
        INSERT INTO admins (username, password, email, real_name, role, status)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [defaultUsername, hashedPassword, 'admin@example.com', '系统管理员', 'super_admin', 'active']);
      
      console.log('✅ 默认管理员创建成功');
      console.log(`📋 用户名: ${defaultUsername}`);
      console.log(`🔑 密码: ${defaultPassword}`);
    } else {
      console.log('✅ 管理员账号已存在');
    }

    console.log('🎉 管理员初始化完成');

  } catch (error) {
    console.error('❌ 初始化失败:', error);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('💡 请检查数据库连接配置和数据库服务是否启动');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('💡 请检查数据库用户名和密码是否正确');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.error('💡 请检查数据库名称是否正确');
    }
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 数据库连接已关闭');
    }
  }
}

// 运行初始化
initAdmin();
