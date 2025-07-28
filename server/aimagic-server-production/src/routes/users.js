const express = require('express');
const bcrypt = require('bcryptjs');
const Joi = require('joi');
const { query } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// 更新用户信息验证规则
const updateUserSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30),
  email: Joi.string().email(),
  avatar: Joi.string().uri()
});

// 修改密码验证规则
const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(6).required()
});

// 获取用户列表（分页）
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // 获取用户总数
    const countResult = await query('SELECT COUNT(*) as total FROM users');
    const total = countResult[0].total;

    // 获取用户列表
    const users = await query(
      `SELECT id, username, email, status, created_at, last_login 
       FROM users 
       ORDER BY created_at DESC 
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// 获取用户详情
router.get('/:id', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.params.id;

    const users = await query(
      'SELECT id, username, email, status, created_at, last_login FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    res.json({
      success: true,
      data: {
        user: users[0]
      }
    });
  } catch (error) {
    next(error);
  }
});

// 更新用户信息
router.put('/:id', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.params.id;

    // 检查权限（只能修改自己的信息）
    if (req.user.id !== parseInt(userId)) {
      return res.status(403).json({
        success: false,
        message: '无权限修改其他用户信息'
      });
    }

    // 验证输入数据
    const { error, value } = updateUserSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const updateFields = [];
    const updateValues = [];

    // 动态构建更新字段
    Object.keys(value).forEach(key => {
      if (value[key] !== undefined) {
        updateFields.push(`${key} = ?`);
        updateValues.push(value[key]);
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: '没有提供要更新的字段'
      });
    }

    updateValues.push(userId);

    // 检查用户名和邮箱是否已被其他用户使用
    if (value.username || value.email) {
      const checkQuery = [];
      const checkParams = [];

      if (value.username) {
        checkQuery.push('username = ?');
        checkParams.push(value.username);
      }
      if (value.email) {
        checkQuery.push('email = ?');
        checkParams.push(value.email);
      }

      checkParams.push(userId);

      const existingUsers = await query(
        `SELECT id FROM users WHERE (${checkQuery.join(' OR ')}) AND id != ?`,
        checkParams
      );

      if (existingUsers.length > 0) {
        return res.status(400).json({
          success: false,
          message: '用户名或邮箱已被使用'
        });
      }
    }

    // 执行更新
    await query(
      `UPDATE users SET ${updateFields.join(', ')}, updated_at = NOW() WHERE id = ?`,
      updateValues
    );

    // 获取更新后的用户信息
    const updatedUsers = await query(
      'SELECT id, username, email, status, created_at, updated_at FROM users WHERE id = ?',
      [userId]
    );

    res.json({
      success: true,
      message: '用户信息更新成功',
      data: {
        user: updatedUsers[0]
      }
    });
  } catch (error) {
    next(error);
  }
});

// 修改密码
router.put('/:id/password', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.params.id;

    // 检查权限（只能修改自己的密码）
    if (req.user.id !== parseInt(userId)) {
      return res.status(403).json({
        success: false,
        message: '无权限修改其他用户密码'
      });
    }

    // 验证输入数据
    const { error, value } = changePasswordSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { currentPassword, newPassword } = value;

    // 获取当前密码
    const users = await query(
      'SELECT password FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    // 验证当前密码
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, users[0].password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: '当前密码错误'
      });
    }

    // 加密新密码
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // 更新密码
    await query(
      'UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?',
      [hashedNewPassword, userId]
    );

    res.json({
      success: true,
      message: '密码修改成功'
    });
  } catch (error) {
    next(error);
  }
});

// 删除用户（软删除）
router.delete('/:id', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.params.id;

    // 检查权限（只能删除自己的账户）
    if (req.user.id !== parseInt(userId)) {
      return res.status(403).json({
        success: false,
        message: '无权限删除其他用户账户'
      });
    }

    // 软删除（更新状态为inactive）
    await query(
      'UPDATE users SET status = ?, updated_at = NOW() WHERE id = ?',
      ['inactive', userId]
    );

    res.json({
      success: true,
      message: '账户删除成功'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
