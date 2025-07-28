const express = require('express');
const { query } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// 获取用户积分信息（基于等级卡系统）
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.userId;

    // 查询用户绑定的等级卡积分
    const cards = await query(`
      SELECT remaining_points
      FROM level_cards
      WHERE bound_user_id = ? AND remaining_points > 0
    `, [userId]);

    // 计算总积分
    const totalPoints = cards.reduce((sum, card) => sum + card.remaining_points, 0);

    console.log(`📊 查询积分: 用户${userId}, 等级卡积分=${totalPoints}, 卡片数量=${cards.length}`);

    res.json({
      success: true,
      data: {
        points: {
          points: 0, // 没有免费积分概念
          purchased_points: totalPoints,
          total_points: totalPoints,
          cards_count: cards.length
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// 获取积分使用记录
router.get('/transactions', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    // 获取积分交易记录
    const transactions = await query(
      'SELECT * FROM point_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [userId, parseInt(limit), parseInt(offset)]
    );

    // 获取总记录数
    const countResult = await query(
      'SELECT COUNT(*) as total FROM point_transactions WHERE user_id = ?',
      [userId]
    );

    res.json({
      success: true,
      data: {
        transactions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: countResult[0].total,
          totalPages: Math.ceil(countResult[0].total / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// 使用积分
router.post('/use', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { amount, description = '积分使用' } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: '使用积分数量必须大于0'
      });
    }

    // 获取当前积分
    const pointsResult = await query(
      'SELECT * FROM user_points WHERE user_id = ?',
      [userId]
    );

    if (pointsResult.length === 0) {
      return res.status(404).json({
        success: false,
        message: '用户积分记录不存在'
      });
    }

    const userPoints = pointsResult[0];
    const currentPoints = userPoints.points + userPoints.purchased_points;

    if (currentPoints < amount) {
      return res.status(400).json({
        success: false,
        message: '积分不足',
        data: {
          currentPoints,
          requiredPoints: amount
        }
      });
    }

    // 计算扣减逻辑：优先使用免费积分，再使用购买积分
    let remainingAmount = amount;
    let newFreePoints = userPoints.points;
    let newPurchasedPoints = userPoints.purchased_points;

    if (remainingAmount > 0 && newFreePoints > 0) {
      const deductFromFree = Math.min(remainingAmount, newFreePoints);
      newFreePoints -= deductFromFree;
      remainingAmount -= deductFromFree;
    }

    if (remainingAmount > 0 && newPurchasedPoints > 0) {
      const deductFromPurchased = Math.min(remainingAmount, newPurchasedPoints);
      newPurchasedPoints -= deductFromPurchased;
      remainingAmount -= deductFromPurchased;
    }

    const newTotalUsed = userPoints.total_used + amount;
    const balanceAfter = newFreePoints + newPurchasedPoints;

    // 更新积分（不使用事务，直接更新）
    console.log(`🔄 更新积分: userId=${userId}, newFreePoints=${newFreePoints}, newPurchasedPoints=${newPurchasedPoints}, newTotalUsed=${newTotalUsed}`);

    // 更新积分
    const updateResult = await query(
      'UPDATE user_points SET points = ?, purchased_points = ?, total_used = ?, updated_at = NOW() WHERE user_id = ?',
      [newFreePoints, newPurchasedPoints, newTotalUsed, userId]
    );

    console.log(`✅ 更新结果:`, updateResult);

    // 验证更新是否成功
    if (updateResult.affectedRows === 0) {
      throw new Error('积分更新失败：没有找到用户记录或更新失败');
    }

    // 记录积分使用记录
    await query(
      'INSERT INTO point_transactions (user_id, type, amount, balance_after, description, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
      [userId, 'use', -amount, balanceAfter, description]
    );

    console.log(`✅ 积分消耗完成: 用户${userId}消耗${amount}积分，余额${balanceAfter}`);

    res.json({
      success: true,
      message: '积分使用成功',
      data: {
        usedAmount: amount,
        balanceAfter,
        freePoints: newFreePoints,
        purchasedPoints: newPurchasedPoints
      }
    });
  } catch (error) {
    next(error);
  }
});

// 添加积分（用于等级卡绑定等）
router.post('/add', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { amount, type = 'purchase', description = '积分充值' } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: '积分数量必须大于0'
      });
    }

    console.log(`💰 添加积分: 用户${userId}, 数量=${amount}, 类型=${type}, 描述=${description}`);

    // 获取当前积分信息
    const pointsResult = await query(
      'SELECT * FROM user_points WHERE user_id = ?',
      [userId]
    );

    let userPoints;
    if (pointsResult.length === 0) {
      // 如果没有积分记录，创建初始记录
      const today = new Date().toISOString().split('T')[0];
      await query(
        'INSERT INTO user_points (user_id, points, daily_reset_date, purchased_points, total_used, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
        [userId, 0, today, 0, 0]
      );

      userPoints = {
        points: 0,
        purchased_points: 0,
        total_used: 0
      };
    } else {
      userPoints = pointsResult[0];
    }

    // 根据类型添加积分
    let newFreePoints = userPoints.points;
    let newPurchasedPoints = userPoints.purchased_points;

    if (type === 'free') {
      newFreePoints += amount;
    } else {
      newPurchasedPoints += amount;
    }

    const totalAfter = newFreePoints + newPurchasedPoints;

    console.log(`🔄 更新积分: userId=${userId}, newFreePoints=${newFreePoints}, newPurchasedPoints=${newPurchasedPoints}, totalAfter=${totalAfter}`);

    // 更新积分
    const updateResult = await query(
      'UPDATE user_points SET points = ?, purchased_points = ?, updated_at = NOW() WHERE user_id = ?',
      [newFreePoints, newPurchasedPoints, userId]
    );

    console.log(`✅ 更新结果:`, updateResult);

    // 验证更新是否成功
    if (updateResult.affectedRows === 0) {
      throw new Error('积分更新失败：没有找到用户记录或更新失败');
    }

    // 记录积分添加记录
    await query(
      'INSERT INTO point_transactions (user_id, type, amount, balance_after, description, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
      [userId, type, amount, totalAfter, description]
    );

    console.log(`✅ 积分添加完成: 用户${userId}获得${amount}积分，总余额${totalAfter}`);

    res.json({
      success: true,
      message: '积分添加成功',
      data: {
        addedAmount: amount,
        balanceAfter: totalAfter,
        freePoints: newFreePoints,
        purchasedPoints: newPurchasedPoints
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
