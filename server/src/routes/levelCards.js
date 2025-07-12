const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { calculateUserPoints, getUserPointsDetails, consumeUserPoints } = require('../utils/pointsCalculator');

// 获取等级卡类型列表
router.get('/types', async (req, res, next) => {
  try {
    const cardTypes = await query(`
      SELECT id, name, icon, points, price
      FROM card_types
      ORDER BY points ASC
    `);

    res.json({
      success: true,
      data: {
        cardTypes
      }
    });
  } catch (error) {
    next(error);
  }
});

// 绑定等级卡
router.post('/bind', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { cardNumber, cardPassword } = req.body;

    if (!cardNumber || !cardPassword) {
      return res.status(400).json({
        success: false,
        message: '请输入卡号和卡密'
      });
    }

    console.log(`🎫 用户${userId}尝试绑定等级卡: ${cardNumber}`);

    // 查找等级卡及其类型信息
    const cardResult = await query(`
      SELECT lc.*, ct.name as type_name, ct.icon, ct.points as total_points
      FROM level_cards lc
      JOIN card_types ct ON lc.type_id = ct.id
      WHERE lc.card_number = ? AND lc.card_password = ?
    `, [cardNumber, cardPassword]);

    if (cardResult.length === 0) {
      return res.status(400).json({
        success: false,
        message: '卡号或卡密错误，请检查后重试'
      });
    }

    const card = cardResult[0];

    // 检查是否已被绑定
    if (card.bound_user_id) {
      return res.status(400).json({
        success: false,
        message: '该等级卡已被绑定，请使用其他卡片'
      });
    }

    // 体验卡特殊逻辑：检查用户是否已有有积分的体验卡
    if (card.type_name === '体验卡') {
      const existingExperienceCard = await query(`
        SELECT COUNT(*) as count
        FROM level_cards lc
        JOIN card_types ct ON lc.type_id = ct.id
        WHERE lc.bound_user_id = ? AND ct.name = '体验卡' AND lc.remaining_points > 0
      `, [userId]);

      if (existingExperienceCard[0].count > 0) {
        return res.status(400).json({
          success: false,
          message: '您已有可用的体验卡，请先使用完当前体验卡积分'
        });
      }
    }

    try {
      // 1. 绑定卡片到用户
      await query(`
        UPDATE level_cards
        SET bound_user_id = ?, bound_at = NOW()
        WHERE id = ?
      `, [userId, card.id]);

      // 2. 记录绑定日志
      await query(`
        INSERT INTO point_logs (user_id, action_type, points_amount, description)
        VALUES (?, 'bind', ?, ?)
      `, [userId, card.remaining_points, `绑定${card.type_name}`]);

      console.log(`✅ 用户${userId}成功绑定${card.type_name}${cardNumber}，获得${card.remaining_points}积分`);

      // 根据卡片类型返回不同的消息
      const message = card.type_name === '体验卡'
        ? '体验卡绑定成功！每个用户只能绑定一张体验卡'
        : '等级卡绑定成功';

      res.json({
        success: true,
        message,
        data: {
          cardType: card.type_name,
          cardIcon: card.icon,
          pointsAdded: card.remaining_points,
          cardNumber: card.card_number,
          isExperienceCard: card.type_name === '体验卡'
        }
      });

    } catch (error) {
      throw error;
    }

  } catch (error) {
    console.error(`❌ 用户${req.user?.userId}绑定等级卡失败:`, error);
    next(error);
  }
});

// 获取用户绑定的等级卡列表
router.get('/my-cards', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.userId;

    // 查找用户绑定的等级卡及其类型信息
    // 体验卡一次性使用，积分为0时不再显示
    const cards = await query(`
      SELECT lc.id, lc.card_number, lc.remaining_points, lc.bound_at,
             ct.name as type_name, ct.icon, ct.points as total_points, ct.price
      FROM level_cards lc
      JOIN card_types ct ON lc.type_id = ct.id
      WHERE lc.bound_user_id = ?
        AND (
          ct.name != '体验卡' OR
          (ct.name = '体验卡' AND lc.remaining_points > 0)
        )
      ORDER BY lc.bound_at DESC
    `, [userId]);

    res.json({
      success: true,
      data: {
        cards
      }
    });

  } catch (error) {
    next(error);
  }
});

// 获取等级卡使用记录
router.get('/transactions', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const transactions = await query(`
      SELECT lct.id, lct.type, lct.points_amount, lct.remaining_points, lct.description, lct.created_at,
             lc.card_number, lctype.name as card_type_name, lctype.icon
      FROM level_card_transactions lct
      JOIN level_cards lc ON lct.card_id = lc.id
      JOIN level_card_types lctype ON lc.type_id = lctype.id
      WHERE lct.user_id = ?
      ORDER BY lct.created_at DESC
      LIMIT ? OFFSET ?
    `, [userId, parseInt(limit), parseInt(offset)]);

    // 获取总记录数
    const countResult = await query(
      'SELECT COUNT(*) as total FROM level_card_transactions WHERE user_id = ?',
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

// 旧的consume接口已删除，请使用consume-points接口

// 获取用户总积分（基于绑定的等级卡）
router.get('/user-points', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.userId;

    // 使用积分计算工具获取详细信息
    const pointsDetails = await getUserPointsDetails(userId);

    // 生成卡片明细
    const cardsBreakdown = pointsDetails.cards.map(card => ({
      type: card.type_name,
      points: card.remaining_points
    }));

    res.json({
      success: true,
      data: {
        points: 0, // 没有免费积分概念
        purchased_points: pointsDetails.totalPoints,
        total_points: pointsDetails.totalPoints,
        cards_count: pointsDetails.cardCount,
        cards_breakdown: cardsBreakdown
      }
    });

  } catch (error) {
    next(error);
  }
});

// 消费积分（从等级卡扣除）
router.post('/consume-points', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { amount, description = '积分消费', mediaUrl = null } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: '消费积分数量必须大于0'
      });
    }

    console.log(`💰 用户${userId}尝试消费${amount}积分: ${description}`);
    if (mediaUrl) {
      console.log(`🎬 关联媒体URL: ${mediaUrl}`);
    }

    // 使用积分计算工具消费积分（包含媒体文件URL）
    const result = await consumeUserPoints(userId, amount, description, mediaUrl);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message,
        data: {
          available: result.available,
          required: result.required
        }
      });
    }

    console.log(`✅ 用户${userId}成功消费${amount}积分`);

    res.json({
      success: true,
      message: result.message,
      data: {
        consumed_amount: result.totalConsumed,
        remaining_points: result.remainingPoints,
        description,
        mediaUrl: result.mediaUrl
      }
    });

  } catch (error) {
    console.error(`❌ 用户${req.user?.userId}消费积分失败:`, error);
    next(error);
  }
});

// 获取用户积分记录
router.get('/point-logs', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 20, recent = false } = req.query;
    const offset = (page - 1) * limit;

    // 如果是获取最近记录，限制为3条
    const actualLimit = recent === 'true' ? 3 : parseInt(limit);
    const actualOffset = recent === 'true' ? 0 : parseInt(offset);

    // 获取积分记录（包含媒体文件URL）
    const logs = await query(`
      SELECT
        action_type,
        points_amount,
        description,
        url,
        created_at
      FROM point_logs
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `, [userId, actualLimit, actualOffset]);

    // 获取总记录数
    const totalResult = await query(`
      SELECT COUNT(*) as total
      FROM point_logs
      WHERE user_id = ?
    `, [userId]);

    const total = totalResult[0].total;

    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          page: parseInt(page),
          limit: actualLimit,
          total,
          totalPages: Math.ceil(total / actualLimit),
          hasMore: total > actualLimit
        }
      }
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;
