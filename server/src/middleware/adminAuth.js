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
    const decoded = verifyToken(token);

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
