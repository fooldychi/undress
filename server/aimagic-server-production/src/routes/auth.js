const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const { query, transaction } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// 注册验证规则
const registerSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).required(),
  password: Joi.string().min(6).required() // 密码最少6位
});

// 登录验证规则
const loginSchema = Joi.object({
  username: Joi.string().required(),
  password: Joi.string().required()
});

// 生成JWT令牌
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );
};

// 用户注册
router.post('/register', async (req, res, next) => {
  try {
    // 验证输入数据
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { username, password } = value;

    // 只接受用户名和密码，忽略其他字段

    // 检查用户名是否已存在
    const existingUsers = await query(
      'SELECT id FROM users WHERE username = ?',
      [username]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({
        success: false,
        message: '用户名已存在'
      });
    }

    // 加密密码（降低saltRounds以提高性能）
    const saltRounds = 8;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 创建用户
    const result = await query(
      'INSERT INTO users (username, password, status, created_at) VALUES (?, ?, ?, NOW())',
      [username, hashedPassword, 'active']
    );

    const userId = result.insertId;

    // 为新用户创建积分记录（初始20积分）
    try {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD格式
      await query(
        'INSERT INTO user_points (user_id, points, daily_reset_date, purchased_points, total_used, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
        [userId, 20, today, 0, 0]
      );

      // 记录积分获得记录
      await query(
        'INSERT INTO point_transactions (user_id, type, amount, balance_after, description, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
        [userId, 'daily_reset', 20, 20, '新用户注册赠送']
      );
    } catch (pointsError) {
      console.warn('创建积分记录失败，但用户创建成功:', pointsError.message);
      // 不影响用户注册，继续执行
    }

    // 生成JWT令牌
    const token = generateToken(userId);

    res.status(201).json({
      success: true,
      message: '注册成功',
      data: {
        user: {
          id: userId,
          username
        },
        token
      }
    });
  } catch (error) {
    next(error);
  }
});

// 用户登录
router.post('/login', async (req, res, next) => {
  try {
    // 验证输入数据
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { username, password } = value;

    // 查找用户
    const users = await query(
      'SELECT id, username, password, status FROM users WHERE username = ?',
      [username]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: '用户名或密码错误'
      });
    }

    const user = users[0];

    // 检查用户状态
    if (user.status !== 'active') {
      return res.status(401).json({
        success: false,
        message: '账户已被禁用'
      });
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: '用户名或密码错误'
      });
    }

    // 生成JWT令牌
    const token = generateToken(user.id);

    // 更新最后登录时间
    await query(
      'UPDATE users SET last_login = NOW() WHERE id = ?',
      [user.id]
    );

    res.json({
      success: true,
      message: '登录成功',
      data: {
        user: {
          id: user.id,
          username: user.username
        },
        token
      }
    });
  } catch (error) {
    next(error);
  }
});

// 获取当前用户信息
router.get('/me', authenticateToken, async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: {
        user: req.user
      }
    });
  } catch (error) {
    next(error);
  }
});

// 刷新令牌
router.post('/refresh', authenticateToken, async (req, res, next) => {
  try {
    const newToken = generateToken(req.user.id);

    res.json({
      success: true,
      message: '令牌刷新成功',
      data: {
        token: newToken
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
