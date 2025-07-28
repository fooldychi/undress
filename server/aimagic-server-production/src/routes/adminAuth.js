const express = require('express');
const bcrypt = require('bcryptjs');
const { query } = require('../config/database');
const { generateToken, adminAuth } = require('../middleware/adminAuth');

const router = express.Router();

// 简单的登录频率限制
const loginAttempts = new Map();

function loginLimiter(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15分钟
  const maxAttempts = 5;

  if (!loginAttempts.has(ip)) {
    loginAttempts.set(ip, []);
  }

  const attempts = loginAttempts.get(ip);
  // 清理过期的尝试记录
  const validAttempts = attempts.filter(time => now - time < windowMs);

  if (validAttempts.length >= maxAttempts) {
    return res.status(429).json({
      success: false,
      message: '登录尝试过于频繁，请15分钟后再试',
      code: 'TOO_MANY_ATTEMPTS'
    });
  }

  validAttempts.push(now);
  loginAttempts.set(ip, validAttempts);
  next();
}

// 管理员登录
router.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const { username, password } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent') || '';

    // 验证输入
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: '用户名和密码不能为空',
        code: 'MISSING_CREDENTIALS'
      });
    }

    console.log(`🔐 管理员登录尝试: ${username} from ${ipAddress}`);

    // 查找管理员
    const adminResult = await query(`
      SELECT id, username, password, email, real_name, role, status,
             login_attempts, locked_until, last_login_at
      FROM admins
      WHERE username = ?
    `, [username]);

    if (adminResult.length === 0) {
      console.log(`❌ 管理员登录失败: ${username} - 用户名不存在`);
      return res.status(401).json({
        success: false,
        message: '用户名或密码错误',
        code: 'INVALID_CREDENTIALS'
      });
    }

    const admin = adminResult[0];

    // 检查账号状态
    if (admin.status !== 'active') {
      console.log(`❌ 管理员登录失败: ${username} - 账号已被禁用`);
      return res.status(401).json({
        success: false,
        message: '账号已被禁用，请联系系统管理员',
        code: 'ACCOUNT_DISABLED'
      });
    }

    // 检查是否被锁定
    if (admin.locked_until && new Date() < new Date(admin.locked_until)) {
      console.log(`❌ 管理员登录失败: ${username} - 账号被锁定`);
      return res.status(401).json({
        success: false,
        message: '账号已被锁定，请稍后再试',
        code: 'ACCOUNT_LOCKED'
      });
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, admin.password);

    if (!isPasswordValid) {
      // 增加失败次数
      const newAttempts = admin.login_attempts + 1;
      let lockedUntil = null;

      // 如果失败次数达到5次，锁定账号30分钟
      if (newAttempts >= 5) {
        lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30分钟后
      }

      await query(`
        UPDATE admins
        SET login_attempts = ?, locked_until = ?
        WHERE id = ?
      `, [newAttempts, lockedUntil, admin.id]);

      console.log(`❌ 管理员登录失败: ${username} - 密码错误`);

      return res.status(401).json({
        success: false,
        message: '用户名或密码错误',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // 登录成功，重置失败次数
    await query(`
      UPDATE admins
      SET login_attempts = 0, locked_until = NULL, last_login_at = NOW(), last_login_ip = ?
      WHERE id = ?
    `, [ipAddress, admin.id]);

    console.log(`✅ 管理员登录成功: ${username}`);

    // 生成JWT令牌
    const token = generateToken(admin);

    res.json({
      success: true,
      message: '登录成功',
      data: {
        token,
        admin: {
          id: admin.id,
          username: admin.username,
          email: admin.email,
          realName: admin.real_name,
          role: admin.role,
          lastLoginAt: admin.last_login_at
        }
      }
    });

  } catch (error) {
    console.error('❌ 管理员登录失败:', error);
    next(error);
  }
});

// 获取当前管理员信息
router.get('/me', adminAuth, async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: {
        admin: {
          id: req.admin.id,
          username: req.admin.username,
          email: req.admin.email,
          realName: req.admin.real_name,
          role: req.admin.role,
          lastLoginAt: req.admin.last_login_at
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// 管理员登出
router.post('/logout', adminAuth, async (req, res, next) => {
  try {
    // 这里可以实现token黑名单机制
    console.log(`🚪 管理员登出: ${req.admin.username}`);

    res.json({
      success: true,
      message: '登出成功'
    });
  } catch (error) {
    next(error);
  }
});

// 修改密码
router.post('/change-password', adminAuth, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: '当前密码和新密码不能为空'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: '新密码长度不能少于8位'
      });
    }

    // 验证当前密码
    const adminResult = await query('SELECT password FROM admins WHERE id = ?', [req.admin.id]);
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, adminResult[0].password);

    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: '当前密码错误'
      });
    }

    // 更新密码
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await query('UPDATE admins SET password = ? WHERE id = ?', [hashedNewPassword, req.admin.id]);

    console.log(`🔑 管理员修改密码: ${req.admin.username}`);

    res.json({
      success: true,
      message: '密码修改成功'
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;
