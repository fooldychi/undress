const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

// JWT密钥
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

// 生成JWT令牌
function generateToken(admin) {
  const payload = {
    id: admin.id,
    username: admin.username,
    role: admin.role,
    type: 'admin'
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: '7d',
    issuer: 'imagic-admin',
    audience: 'imagic-admin-panel'
  });
}

// 验证JWT令牌
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET, {
      issuer: 'imagic-admin',
      audience: 'imagic-admin-panel'
    });
  } catch (error) {
    throw new Error('无效的令牌');
  }
}

// 管理员认证中间件
const adminAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: '未提供认证令牌',
        code: 'NO_TOKEN'
      });
    }

    const token = authHeader.substring(7);

    // 开发环境下的特殊处理：允许使用 admin-token 作为测试token
    if (process.env.NODE_ENV === 'development' && token === 'admin-token') {
      console.log('🔧 使用开发环境测试token');
      req.admin = {
        id: 1,
        username: 'admin',
        role: 'super_admin',
        status: 'active'
      };
      return next();
    }

    const decoded = verifyToken(token);

    // 确保 admins 表存在
    try {
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
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
          updated_at DATETIME NULL COMMENT '更新时间',
          INDEX idx_username (username),
          INDEX idx_email (email),
          INDEX idx_status (status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='管理员表'
      `);

      // 检查是否有管理员账号，如果没有则创建默认账号
      const adminCount = await query('SELECT COUNT(*) as count FROM admins');
      if (adminCount[0].count === 0) {
        const bcrypt = require('bcryptjs');
        const defaultPassword = 'admin123456';
        const hashedPassword = await bcrypt.hash(defaultPassword, 10);

        await query(`
          INSERT INTO admins (username, password, email, real_name, role, status, created_at)
          VALUES (?, ?, ?, ?, ?, ?, NOW())
        `, ['admin', hashedPassword, 'admin@imagic.com', '系统管理员', 'super_admin', 'active']);

        console.log('✅ 默认管理员账号已创建: admin / admin123456');
      }
    } catch (tableError) {
      console.error('❌ 创建管理员表失败:', tableError);
    }

    // 验证管理员是否存在且状态正常
    const admins = await query(
      'SELECT id, username, role, status FROM admins WHERE id = ? AND status = "active"',
      [decoded.id]
    );

    if (admins.length === 0) {
      return res.status(401).json({
        success: false,
        message: '管理员账户不存在或已被禁用',
        code: 'ADMIN_NOT_FOUND'
      });
    }

    // 将管理员信息添加到请求对象
    req.admin = admins[0];
    next();
  } catch (error) {
    console.error('❌ 管理员认证失败:', error);
    return res.status(401).json({
      success: false,
      message: '认证失败',
      code: 'AUTH_FAILED'
    });
  }
};

// 角色权限中间件
function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.admin) {
      return res.status(401).json({
        success: false,
        message: '未认证',
        code: 'NOT_AUTHENTICATED'
      });
    }

    const adminRole = req.admin.role;

    // 如果是数组，检查是否包含管理员角色
    if (Array.isArray(allowedRoles)) {
      if (!allowedRoles.includes(adminRole)) {
        return res.status(403).json({
          success: false,
          message: '权限不足',
          code: 'INSUFFICIENT_PERMISSIONS'
        });
      }
    } else {
      // 如果是字符串，直接比较
      if (adminRole !== allowedRoles) {
        return res.status(403).json({
          success: false,
          message: '权限不足',
          code: 'INSUFFICIENT_PERMISSIONS'
        });
      }
    }

    next();
  };
}

module.exports = {
  generateToken,
  verifyToken,
  adminAuth,
  requireRole,
  JWT_SECRET
};
