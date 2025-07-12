const express = require('express');
const Joi = require('joi');
const { query, transaction } = require('../config/database');

const router = express.Router();

// 生成浏览器指纹的辅助函数
function generateBrowserFingerprint(req) {
  const userAgent = req.headers['user-agent'] || '';
  const acceptLanguage = req.headers['accept-language'] || '';
  const acceptEncoding = req.headers['accept-encoding'] || '';
  const ip = req.ip || req.connection.remoteAddress || '';
  
  // 简单的指纹生成（实际项目中可以使用更复杂的算法）
  const fingerprint = Buffer.from(`${userAgent}-${acceptLanguage}-${acceptEncoding}-${ip}`).toString('base64');
  return fingerprint.substring(0, 255); // 限制长度
}

// 获取当前秒杀活动状态
router.get('/current', async (req, res, next) => {
  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD格式
    const currentTime = new Date().toTimeString().split(' ')[0]; // HH:MM:SS格式
    
    // 查询今天的秒杀活动
    const activities = await query(
      'SELECT * FROM seckill_activities WHERE activity_date = ?',
      [today]
    );

    let activity = activities[0];
    
    // 如果今天没有活动，创建一个
    if (!activity) {
      const result = await query(
        `INSERT INTO seckill_activities (activity_date, total_vouchers, remaining_vouchers, voucher_points, start_time, status, created_at) 
         VALUES (?, 100, 100, 20, '23:00:00', 'pending', NOW())`,
        [today]
      );
      
      activity = {
        id: result.insertId,
        activity_date: today,
        total_vouchers: 100,
        remaining_vouchers: 100,
        voucher_points: 20,
        start_time: '23:00:00',
        status: 'pending'
      };
    }

    // 判断活动状态
    let activityStatus = activity.status;
    if (currentTime >= '23:00:00' && activity.remaining_vouchers > 0 && activityStatus === 'pending') {
      // 更新活动状态为进行中
      await query(
        'UPDATE seckill_activities SET status = ?, updated_at = NOW() WHERE id = ?',
        ['active', activity.id]
      );
      activityStatus = 'active';
    } else if (activity.remaining_vouchers <= 0 && activityStatus === 'active') {
      // 券已抢完，结束活动
      await query(
        'UPDATE seckill_activities SET status = ?, updated_at = NOW() WHERE id = ?',
        ['ended', activity.id]
      );
      activityStatus = 'ended';
    }

    // 检查当前浏览器是否已参与
    const browserFingerprint = generateBrowserFingerprint(req);
    const participations = await query(
      'SELECT * FROM seckill_participations WHERE activity_id = ? AND browser_fingerprint = ?',
      [activity.id, browserFingerprint]
    );

    const hasParticipated = participations.length > 0;

    // 计算距离23:00的倒计时
    const now = new Date();
    const today23 = new Date(now);
    today23.setHours(23, 0, 0, 0);
    
    let countdown = 0;
    if (now < today23) {
      countdown = Math.max(0, today23.getTime() - now.getTime());
    }

    res.json({
      success: true,
      data: {
        activity: {
          id: activity.id,
          date: activity.activity_date,
          totalVouchers: activity.total_vouchers,
          remainingVouchers: activity.remaining_vouchers,
          voucherPoints: activity.voucher_points,
          startTime: activity.start_time,
          status: activityStatus
        },
        hasParticipated,
        countdown, // 毫秒
        canParticipate: activityStatus === 'active' && !hasParticipated && activity.remaining_vouchers > 0
      }
    });
  } catch (error) {
    next(error);
  }
});

// 参与秒杀
router.post('/participate', async (req, res, next) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const currentTime = new Date().toTimeString().split(' ')[0];
    const browserFingerprint = generateBrowserFingerprint(req);
    const ipAddress = req.ip || req.connection.remoteAddress || '';

    // 检查当前时间是否可以参与秒杀
    if (currentTime < '23:00:00') {
      return res.status(400).json({
        success: false,
        message: '秒杀活动尚未开始，请等待23:00'
      });
    }

    await transaction(async (connection) => {
      // 查询今天的活动
      const [activities] = await connection.execute(
        'SELECT * FROM seckill_activities WHERE activity_date = ? FOR UPDATE',
        [today]
      );

      if (activities.length === 0) {
        throw new Error('今日秒杀活动不存在');
      }

      const activity = activities[0];

      // 检查活动状态
      if (activity.status !== 'active' && activity.status !== 'pending') {
        throw new Error('秒杀活动已结束');
      }

      // 检查是否还有剩余券
      if (activity.remaining_vouchers <= 0) {
        throw new Error('体验券已抢完');
      }

      // 检查是否已经参与过
      const [existingParticipations] = await connection.execute(
        'SELECT * FROM seckill_participations WHERE activity_id = ? AND browser_fingerprint = ?',
        [activity.id, browserFingerprint]
      );

      if (existingParticipations.length > 0) {
        throw new Error('您已经参与过今日的秒杀活动');
      }

      // 更新活动状态为active（如果还是pending）
      if (activity.status === 'pending') {
        await connection.execute(
          'UPDATE seckill_activities SET status = ?, updated_at = NOW() WHERE id = ?',
          ['active', activity.id]
        );
      }

      // 减少剩余券数
      await connection.execute(
        'UPDATE seckill_activities SET remaining_vouchers = remaining_vouchers - 1, updated_at = NOW() WHERE id = ?',
        [activity.id]
      );

      // 记录参与
      await connection.execute(
        'INSERT INTO seckill_participations (activity_id, browser_fingerprint, ip_address, points_awarded, participated_at) VALUES (?, ?, ?, ?, NOW())',
        [activity.id, browserFingerprint, ipAddress, activity.voucher_points]
      );

      // 如果券抢完了，结束活动
      if (activity.remaining_vouchers - 1 <= 0) {
        await connection.execute(
          'UPDATE seckill_activities SET status = ?, updated_at = NOW() WHERE id = ?',
          ['ended', activity.id]
        );
      }
    });

    res.json({
      success: true,
      message: '恭喜您！成功获得20积分体验券',
      data: {
        points: 20,
        expiresAt: new Date(new Date().setHours(23, 59, 59, 999)).toISOString() // 当天23:59:59过期
      }
    });
  } catch (error) {
    if (error.message.includes('已经参与') || error.message.includes('已抢完') || error.message.includes('已结束')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
});

// 获取参与统计
router.get('/stats', async (req, res, next) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const stats = await query(`
      SELECT 
        sa.total_vouchers,
        sa.remaining_vouchers,
        sa.voucher_points,
        sa.status,
        COUNT(sp.id) as participated_count
      FROM seckill_activities sa
      LEFT JOIN seckill_participations sp ON sa.id = sp.activity_id
      WHERE sa.activity_date = ?
      GROUP BY sa.id
    `, [today]);

    if (stats.length === 0) {
      return res.json({
        success: true,
        data: {
          totalVouchers: 100,
          remainingVouchers: 100,
          participatedCount: 0,
          status: 'pending'
        }
      });
    }

    const stat = stats[0];
    res.json({
      success: true,
      data: {
        totalVouchers: stat.total_vouchers,
        remainingVouchers: stat.remaining_vouchers,
        participatedCount: stat.participated_count,
        status: stat.status
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
