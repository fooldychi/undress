// 用户积分计算工具
const { query } = require('../config/database');

/**
 * 计算用户总积分（从绑定的等级卡剩余积分计算）
 * @param {number} userId - 用户ID
 * @returns {Promise<number>} 用户总积分
 */
async function calculateUserPoints(userId) {
  try {
    const result = await query(`
      SELECT COALESCE(SUM(remaining_points), 0) as total_points
      FROM level_cards
      WHERE bound_user_id = ?
    `, [userId]);

    return result[0].total_points;
  } catch (error) {
    console.error('计算用户积分失败:', error);
    return 0;
  }
}

/**
 * 获取用户积分详情（包含各卡片的积分分布）
 * @param {number} userId - 用户ID
 * @returns {Promise<Object>} 积分详情
 */
async function getUserPointsDetails(userId) {
  try {
    // 获取用户绑定的所有卡片及其积分
    const cards = await query(`
      SELECT
        lc.id,
        lc.card_number,
        lc.remaining_points,
        ct.name as type_name,
        ct.icon,
        ct.points as total_points
      FROM level_cards lc
      JOIN card_types ct ON lc.type_id = ct.id
      WHERE lc.bound_user_id = ?
      ORDER BY lc.bound_at DESC
    `, [userId]);

    // 计算总积分
    const totalPoints = cards.reduce((sum, card) => sum + card.remaining_points, 0);

    return {
      totalPoints,
      cards,
      cardCount: cards.length
    };
  } catch (error) {
    console.error('获取用户积分详情失败:', error);
    return {
      totalPoints: 0,
      cards: [],
      cardCount: 0
    };
  }
}

/**
 * 消耗用户积分（从绑定的卡片中扣除）
 * @param {number} userId - 用户ID
 * @param {number} pointsToConsume - 要消耗的积分
 * @param {string} description - 消费描述
 * @param {string} mediaUrl - 生成的媒体文件URL（图片、视频等，可选）
 * @returns {Promise<Object>} 消耗结果
 */
async function consumeUserPoints(userId, pointsToConsume, description = '积分消费', mediaUrl = null) {
  try {
    // 获取用户有积分的卡片，优先消耗体验卡
    const cards = await query(`
      SELECT lc.id, lc.card_number, lc.remaining_points, lc.type_id, ct.name as type_name
      FROM level_cards lc
      JOIN card_types ct ON lc.type_id = ct.id
      WHERE lc.bound_user_id = ? AND lc.remaining_points > 0
      ORDER BY
        CASE WHEN ct.name = '体验卡' THEN 1 ELSE 2 END,
        lc.bound_at ASC
    `, [userId]);

    // 检查总积分是否足够
    const totalAvailable = cards.reduce((sum, card) => sum + card.remaining_points, 0);
    if (totalAvailable < pointsToConsume) {
      return {
        success: false,
        message: '积分不足',
        available: totalAvailable,
        required: pointsToConsume
      };
    }

    // 开始消耗积分
    let remainingToConsume = pointsToConsume;
    const consumedCards = [];

    for (const card of cards) {
      if (remainingToConsume <= 0) break;

      const consumeFromThisCard = Math.min(card.remaining_points, remainingToConsume);
      const newRemainingPoints = card.remaining_points - consumeFromThisCard;

      // 更新卡片剩余积分
      await query(`
        UPDATE level_cards
        SET remaining_points = ?
        WHERE id = ?
      `, [newRemainingPoints, card.id]);

      consumedCards.push({
        cardId: card.id,
        cardNumber: card.card_number,
        cardType: card.type_name,
        consumed: consumeFromThisCard,
        remaining: newRemainingPoints
      });

      remainingToConsume -= consumeFromThisCard;
    }

    // 记录积分消费日志（包含媒体文件URL）
    await query(`
      INSERT INTO point_logs (user_id, action_type, points_amount, description, url)
      VALUES (?, 'consume', ?, ?, ?)
    `, [userId, pointsToConsume, description, mediaUrl]);

    return {
      success: true,
      message: '积分消耗成功',
      totalConsumed: pointsToConsume,
      consumedCards,
      remainingPoints: totalAvailable - pointsToConsume,
      mediaUrl
    };

  } catch (error) {
    console.error('消耗用户积分失败:', error);
    return {
      success: false,
      message: '积分消耗失败',
      error: error.message
    };
  }
}

/**
 * 检查用户是否有足够积分
 * @param {number} userId - 用户ID
 * @param {number} requiredPoints - 需要的积分
 * @returns {Promise<boolean>} 是否有足够积分
 */
async function hasEnoughPoints(userId, requiredPoints) {
  try {
    const totalPoints = await calculateUserPoints(userId);
    return totalPoints >= requiredPoints;
  } catch (error) {
    console.error('检查用户积分失败:', error);
    return false;
  }
}

module.exports = {
  calculateUserPoints,
  getUserPointsDetails,
  consumeUserPoints,
  hasEnoughPoints
};
