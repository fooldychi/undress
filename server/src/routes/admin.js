const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { createExperienceCardSystem, getAvailableExperienceCards } = require('../scripts/create-experience-cards');
const { adminAuth } = require('../middleware/adminAuth');

// 生成卡号的辅助函数
function generateCardNumber(cardType, index) {
  const typePrefix = {
    '基础卡': 'BC',
    '高级卡': 'AC',
    '至尊卡': 'PC',
    '体验卡': 'EXP'
  };

  const prefix = typePrefix[cardType] || 'CARD';
  const timestamp = Date.now().toString().slice(-8); // 取时间戳后8位
  const indexStr = String(index).padStart(2, '0'); // 序号补零到2位

  return `${prefix}${timestamp}${indexStr}`;
}

// 生成卡密的辅助函数
function generateCardPassword() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let password = '';
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}



// 获取系统统计信息
router.get('/stats', adminAuth, async (req, res, next) => {
  try {
    // 用户统计
    const userStats = await query(`
      SELECT
        COUNT(*) as total_users,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_users,
        COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive_users,
        COUNT(CASE WHEN status = 'banned' THEN 1 END) as banned_users,
        COUNT(CASE WHEN DATE(created_at) = CURDATE() THEN 1 END) as today_new_users
      FROM users
    `);

    // 等级卡统计
    const cardStats = await query(`
      SELECT
        COUNT(*) as total_cards,
        COUNT(CASE WHEN bound_user_id IS NOT NULL THEN 1 END) as bound_cards,
        COUNT(CASE WHEN bound_user_id IS NULL THEN 1 END) as available_cards,
        SUM(remaining_points) as total_remaining_points,
        COUNT(CASE WHEN ct.name = '体验卡' THEN 1 END) as experience_cards,
        COUNT(CASE WHEN ct.name != '体验卡' THEN 1 END) as level_cards
      FROM level_cards lc
      LEFT JOIN card_types ct ON lc.type_id = ct.id
    `);

    // 积分消费统计
    const pointsStats = await query(`
      SELECT
        COUNT(*) as total_transactions,
        SUM(points_amount) as total_points_consumed,
        COUNT(CASE WHEN DATE(created_at) = CURDATE() THEN 1 END) as today_transactions,
        SUM(CASE WHEN DATE(created_at) = CURDATE() THEN points_amount ELSE 0 END) as today_points_consumed
      FROM point_logs
      WHERE action_type = 'consume'
    `);

    // 最近7天的用户注册趋势
    const userTrend = await query(`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as count
      FROM users
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `);

    // 最近7天的积分消费趋势
    const pointsTrend = await query(`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as transactions,
        SUM(points_amount) as points_consumed
      FROM point_logs
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
        AND action_type = 'consume'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `);

    res.json({
      success: true,
      data: {
        users: userStats[0],
        cards: cardStats[0],
        points: pointsStats[0],
        trends: {
          users: userTrend,
          points: pointsTrend
        }
      }
    });

  } catch (error) {
    next(error);
  }
});

// 获取用户列表（管理员用）
router.get('/users', adminAuth, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.pageSize || req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const status = req.query.status;
    const search = req.query.search;

    let whereClause = '';
    let queryParams = [];

    // 构建查询条件
    const conditions = [];
    if (status) {
      conditions.push('status = ?');
      queryParams.push(status);
    }
    if (search) {
      conditions.push('(username LIKE ? OR email LIKE ?)');
      queryParams.push(`%${search}%`, `%${search}%`);
    }

    if (conditions.length > 0) {
      whereClause = 'WHERE ' + conditions.join(' AND ');
    }

    // 获取用户总数
    const countQuery = `SELECT COUNT(*) as total FROM users ${whereClause}`;
    const countResult = await query(countQuery, queryParams);
    const total = countResult[0].total;

    // 获取用户列表
    const usersQuery = `
      SELECT u.id, u.username, u.email, u.status, u.created_at, u.last_login,
             COUNT(lc.id) as bound_cards,
             COALESCE(SUM(lc.remaining_points), 0) as total_points
      FROM users u
      LEFT JOIN level_cards lc ON u.id = lc.bound_user_id
      ${whereClause}
      GROUP BY u.id
      ORDER BY u.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const users = await query(usersQuery, [...queryParams, limit, offset]);

    res.json({
      success: true,
      data: {
        items: users,
        total,
        page,
        pageSize: limit,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    next(error);
  }
});

// 获取用户详情（管理员用）
router.get('/users/:id', adminAuth, async (req, res, next) => {
  try {
    const userId = req.params.id;

    // 获取用户基本信息
    const userResult = await query(`
      SELECT id, username, email, status, created_at, updated_at, last_login
      FROM users
      WHERE id = ?
    `, [userId]);

    if (userResult.length === 0) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    const user = userResult[0];

    // 获取用户绑定的等级卡
    const cards = await query(`
      SELECT lc.id, lc.card_number, lc.remaining_points, lc.bound_at,
             ct.name as type_name, ct.icon, ct.points as total_points
      FROM level_cards lc
      JOIN card_types ct ON lc.type_id = ct.id
      WHERE lc.bound_user_id = ?
      ORDER BY lc.bound_at DESC
    `, [userId]);

    // 获取用户积分消费记录
    const pointsHistory = await query(`
      SELECT id, action_type, points_amount, description, url, created_at
      FROM point_logs
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 20
    `, [userId]);

    res.json({
      success: true,
      data: {
        user,
        cards,
        pointsHistory,
        summary: {
          totalCards: cards.length,
          totalPoints: cards.reduce((sum, card) => sum + card.remaining_points, 0),
          totalConsumed: pointsHistory
            .filter(log => log.action_type === 'consume')
            .reduce((sum, log) => sum + log.points_amount, 0)
        }
      }
    });

  } catch (error) {
    next(error);
  }
});

// 更新用户状态（管理员用）
router.put('/users/:id/status', adminAuth, async (req, res, next) => {
  try {
    const userId = req.params.id;
    const { status } = req.body;

    if (!['active', 'inactive', 'banned'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: '无效的用户状态'
      });
    }

    await query(`
      UPDATE users
      SET status = ?, updated_at = NOW()
      WHERE id = ?
    `, [status, userId]);

    res.json({
      success: true,
      message: '用户状态更新成功'
    });

  } catch (error) {
    next(error);
  }
});

// 封禁用户（管理员用）
router.post('/users/:id/ban', adminAuth, async (req, res, next) => {
  try {
    const userId = req.params.id;

    await query(`
      UPDATE users
      SET status = 'banned', updated_at = NOW()
      WHERE id = ?
    `, [userId]);

    res.json({
      success: true,
      message: '用户已封禁'
    });

  } catch (error) {
    next(error);
  }
});

// 解封用户（管理员用）
router.post('/users/:id/unban', adminAuth, async (req, res, next) => {
  try {
    const userId = req.params.id;

    await query(`
      UPDATE users
      SET status = 'active', updated_at = NOW()
      WHERE id = ?
    `, [userId]);

    res.json({
      success: true,
      message: '用户已解封'
    });

  } catch (error) {
    next(error);
  }
});

// 初始化等级卡数据库表
router.post('/init-level-cards', async (req, res, next) => {
  try {
    console.log('🗃️ 开始创建等级卡相关数据库表...');

    // 1. 创建等级卡类型表
    console.log('📝 创建等级卡类型表...');
    await query(`
      CREATE TABLE IF NOT EXISTS card_types (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(50) NOT NULL COMMENT '等级卡名称',
        icon VARCHAR(10) NOT NULL COMMENT '等级卡图标',
        price DECIMAL(10,2) NOT NULL COMMENT '价格',
        points INT NOT NULL COMMENT '积分数量',
        description TEXT COMMENT '描述',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ 等级卡类型表创建成功');

    // 2. 创建等级卡表
    console.log('📝 创建等级卡表...');
    await query(`
      CREATE TABLE IF NOT EXISTS level_cards (
        id INT AUTO_INCREMENT PRIMARY KEY,
        card_number VARCHAR(20) UNIQUE NOT NULL COMMENT '卡号',
        card_password VARCHAR(20) NOT NULL COMMENT '卡密',
        type_id INT NOT NULL COMMENT '等级卡类型ID',
        total_points INT NOT NULL COMMENT '总积分',
        remaining_points INT NOT NULL COMMENT '剩余积分',
        status ENUM('active', 'used', 'expired', 'disabled') DEFAULT 'active' COMMENT '状态',
        bound_user_id INT NULL COMMENT '绑定的用户ID',
        bound_at DATETIME NULL COMMENT '绑定时间',
        expires_at DATETIME NULL COMMENT '过期时间',
        created_at DATETIME NOT NULL,
        updated_at DATETIME NULL,
        FOREIGN KEY (type_id) REFERENCES card_types(id),
        FOREIGN KEY (bound_user_id) REFERENCES users(id),
        INDEX idx_card_number (card_number),
        INDEX idx_bound_user (bound_user_id),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ 等级卡表创建成功');

    // 3. 创建等级卡使用记录表
    console.log('📝 创建等级卡交易记录表...');
    await query(`
      CREATE TABLE IF NOT EXISTS level_card_transactions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        card_id INT NOT NULL COMMENT '等级卡ID',
        user_id INT NOT NULL COMMENT '用户ID',
        type ENUM('bind', 'consume') NOT NULL COMMENT '交易类型',
        points_amount INT NOT NULL COMMENT '积分数量',
        remaining_points INT NOT NULL COMMENT '操作后剩余积分',
        description VARCHAR(255) COMMENT '描述',
        created_at DATETIME NOT NULL,
        FOREIGN KEY (card_id) REFERENCES level_cards(id),
        FOREIGN KEY (user_id) REFERENCES users(id),
        INDEX idx_card_user (card_id, user_id),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ 等级卡交易记录表创建成功');

    // 4. 插入等级卡类型数据（包含体验卡）
    const existingTypes = await query('SELECT COUNT(*) as count FROM card_types');
    if (existingTypes[0].count === 0) {
      await query(`
        INSERT INTO card_types (name, icon, price, points, description) VALUES
        ('体验卡', '🎁', 0.00, 20, '免费体验卡，每张20积分'),
        ('基础卡', '🥉', 9.90, 300, '适合轻度使用的用户'),
        ('高级卡', '🥈', 30.00, 1000, '适合中度使用的用户'),
        ('至尊卡', '🥇', 50.00, 2000, '适合重度使用的用户')
      `);
    }

    res.json({
      success: true,
      message: '等级卡数据库表创建成功'
    });

  } catch (error) {
    next(error);
  }
});


// 获取等级卡类型列表（管理员用）
router.get('/card-types', adminAuth, async (req, res, next) => {
  try {
    console.log('🔍 获取等级卡类型列表...');

    // 首先检查表是否存在
    try {
      const cardTypes = await query(`
        SELECT id, name, icon, points, price, description
        FROM card_types
        ORDER BY points ASC
      `);

      console.log('✅ 成功获取等级卡类型:', cardTypes.length, '个');
      res.json({
        success: true,
        data: {
          cardTypes
        }
      });
    } catch (tableError) {
      console.log('⚠️ 等级卡类型表不存在，尝试创建...');

      // 创建表和初始数据
      await query(`
        CREATE TABLE IF NOT EXISTS card_types (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(50) NOT NULL COMMENT '等级卡名称',
          icon VARCHAR(10) NOT NULL COMMENT '等级卡图标',
          price DECIMAL(10,2) NOT NULL COMMENT '价格',
          points INT NOT NULL COMMENT '积分数量',
          description TEXT COMMENT '描述',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      // 插入初始数据
      await query(`
        INSERT INTO card_types (name, icon, price, points, description) VALUES
        ('体验卡', '🎁', 0.00, 20, '免费体验卡，每张20积分'),
        ('基础卡', '🥉', 9.90, 300, '适合轻度使用的用户'),
        ('高级卡', '🥈', 30.00, 1000, '适合中度使用的用户'),
        ('至尊卡', '🥇', 50.00, 2000, '适合重度使用的用户')
      `);

      // 重新获取数据
      const cardTypes = await query(`
        SELECT id, name, icon, points, price, description
        FROM card_types
        ORDER BY points ASC
      `);

      console.log('✅ 表创建成功，获取等级卡类型:', cardTypes.length, '个');
      res.json({
        success: true,
        data: {
          cardTypes
        }
      });
    }
  } catch (error) {
    console.error('❌ 获取等级卡类型失败:', error);
    next(error);
  }
});

// 获取所有等级卡列表（管理员用）
router.get('/cards', adminAuth, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.pageSize || req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const status = req.query.status;
    const cardType = req.query.type;
    const search = req.query.search;

    let whereClause = '';
    let queryParams = [];

    // 构建查询条件
    const conditions = [];
    if (status) {
      conditions.push('lc.status = ?');
      queryParams.push(status);
    }
    if (cardType) {
      conditions.push('ct.name = ?');
      queryParams.push(cardType);
    }
    if (search) {
      conditions.push('(lc.card_number LIKE ? OR u.username LIKE ?)');
      queryParams.push(`%${search}%`, `%${search}%`);
    }

    if (conditions.length > 0) {
      whereClause = 'WHERE ' + conditions.join(' AND ');
    }

    // 获取等级卡总数
    const countQuery = `
      SELECT COUNT(*) as total
      FROM level_cards lc
      LEFT JOIN card_types ct ON lc.type_id = ct.id
      LEFT JOIN users u ON lc.bound_user_id = u.id
      ${whereClause}
    `;
    const countResult = await query(countQuery, queryParams);
    const total = countResult[0].total;

    // 获取等级卡列表
    const cardsQuery = `
      SELECT lc.id, lc.card_number, lc.card_password, lc.remaining_points,
             lc.bound_at, lc.created_at,
             ct.name as type_name, ct.icon, ct.points as total_points, ct.price,
             u.username as bound_username, u.id as bound_user_id
      FROM level_cards lc
      LEFT JOIN card_types ct ON lc.type_id = ct.id
      LEFT JOIN users u ON lc.bound_user_id = u.id
      ${whereClause}
      ORDER BY lc.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const cards = await query(cardsQuery, [...queryParams, limit, offset]);

    res.json({
      success: true,
      data: {
        items: cards,
        total,
        page,
        pageSize: limit,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    next(error);
  }
});

// 获取等级卡详情（管理员用）
router.get('/cards/:id', adminAuth, async (req, res, next) => {
  try {
    const cardId = req.params.id;

    // 获取等级卡基本信息
    const cardResult = await query(`
      SELECT lc.id, lc.card_number, lc.card_password, lc.remaining_points,
             lc.bound_at, lc.created_at,
             ct.name as type_name, ct.icon, ct.points as total_points, ct.price,
             u.username as bound_username, u.id as bound_user_id, u.email as bound_user_email
      FROM level_cards lc
      LEFT JOIN card_types ct ON lc.type_id = ct.id
      LEFT JOIN users u ON lc.bound_user_id = u.id
      WHERE lc.id = ?
    `, [cardId]);

    if (cardResult.length === 0) {
      return res.status(404).json({
        success: false,
        message: '等级卡不存在'
      });
    }

    const card = cardResult[0];

    // 获取该卡的使用记录
    const usageHistory = await query(`
      SELECT id, action_type, points_amount, description, url, created_at
      FROM point_logs
      WHERE user_id = ? AND description LIKE '%${card.card_number}%'
      ORDER BY created_at DESC
      LIMIT 20
    `, [card.bound_user_id]);

    res.json({
      success: true,
      data: {
        card,
        usageHistory,
        summary: {
          totalUsed: card.total_points - card.remaining_points,
          usageCount: usageHistory.filter(log => log.action_type === 'consume').length
        }
      }
    });

  } catch (error) {
    next(error);
  }
});

// 禁用/启用等级卡（管理员用）
router.put('/cards/:id/status', adminAuth, async (req, res, next) => {
  try {
    const cardId = req.params.id;
    const { status } = req.body;

    if (!['active', 'disabled', 'expired'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: '无效的等级卡状态'
      });
    }

    await query(`
      UPDATE level_cards
      SET status = ?
      WHERE id = ?
    `, [status, cardId]);

    res.json({
      success: true,
      message: '等级卡状态更新成功'
    });

  } catch (error) {
    next(error);
  }
});

// 解绑等级卡（管理员用）
router.put('/cards/:id/unbind', adminAuth, async (req, res, next) => {
  try {
    const cardId = req.params.id;

    await query(`
      UPDATE level_cards
      SET bound_user_id = NULL, bound_at = NULL
      WHERE id = ?
    `, [cardId]);

    res.json({
      success: true,
      message: '等级卡解绑成功'
    });

  } catch (error) {
    next(error);
  }
});

// 获取积分记录列表（管理员用）- 兼容新前端路径
router.get('/points-logs', adminAuth, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 20;
    const offset = (page - 1) * pageSize;
    const actionType = req.query.type;
    const search = req.query.search;

    let whereClause = '';
    let queryParams = [];

    // 构建查询条件
    const conditions = [];
    if (actionType) {
      conditions.push('pl.action_type = ?');
      queryParams.push(actionType);
    }
    if (search) {
      conditions.push('u.username LIKE ?');
      queryParams.push(`%${search}%`);
    }

    if (conditions.length > 0) {
      whereClause = 'WHERE ' + conditions.join(' AND ');
    }

    // 获取积分记录总数
    const countQuery = `
      SELECT COUNT(*) as total
      FROM point_logs pl
      LEFT JOIN users u ON pl.user_id = u.id
      ${whereClause}
    `;
    const countResult = await query(countQuery, queryParams);
    const total = countResult[0].total;

    // 获取积分记录列表
    const pointsQuery = `
      SELECT pl.id, pl.action_type, pl.points_amount, pl.description, pl.url, pl.created_at,
             u.username, u.id as user_id
      FROM point_logs pl
      LEFT JOIN users u ON pl.user_id = u.id
      ${whereClause}
      ORDER BY pl.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const pointsLogs = await query(pointsQuery, [...queryParams, pageSize, offset]);

    res.json({
      success: true,
      data: {
        items: pointsLogs,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize)
      }
    });

  } catch (error) {
    next(error);
  }
});

// 获取积分记录列表（管理员用）- 保持原有接口兼容性
router.get('/points', adminAuth, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.pageSize || req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const actionType = req.query.type;
    const search = req.query.search;

    let whereClause = '';
    let queryParams = [];

    // 构建查询条件
    const conditions = [];
    if (actionType) {
      conditions.push('pl.action_type = ?');
      queryParams.push(actionType);
    }
    if (search) {
      conditions.push('u.username LIKE ?');
      queryParams.push(`%${search}%`);
    }

    if (conditions.length > 0) {
      whereClause = 'WHERE ' + conditions.join(' AND ');
    }

    // 获取积分记录总数
    const countQuery = `
      SELECT COUNT(*) as total
      FROM point_logs pl
      LEFT JOIN users u ON pl.user_id = u.id
      ${whereClause}
    `;
    const countResult = await query(countQuery, queryParams);
    const total = countResult[0].total;

    // 获取积分记录列表
    const pointsQuery = `
      SELECT pl.id, pl.action_type, pl.points_amount, pl.description, pl.url, pl.created_at,
             u.username, u.id as user_id
      FROM point_logs pl
      LEFT JOIN users u ON pl.user_id = u.id
      ${whereClause}
      ORDER BY pl.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const pointsLogs = await query(pointsQuery, [...queryParams, limit, offset]);

    res.json({
      success: true,
      data: {
        items: pointsLogs,
        total,
        page,
        pageSize: limit,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    next(error);
  }
});

// 获取系统配置信息（管理员用）
router.get('/config', adminAuth, async (req, res, next) => {
  try {
    console.log('📥 从数据库加载系统配置...');

    // 从数据库获取所有配置
    const configs = await query(`
      SELECT config_key, config_value, config_type, config_group, description, is_encrypted
      FROM system_config
      ORDER BY config_group, config_key
    `);

    console.log(`📊 从数据库加载了${configs.length}项配置`);

    // 按分组组织配置
    const groupedConfigs = {};
    configs.forEach(config => {
      const group = config.config_group || 'general';

      if (!groupedConfigs[group]) {
        groupedConfigs[group] = [];
      }

      // 处理敏感配置显示
      let displayValue = config.config_value;
      if (config.is_encrypted && config.config_value) {
        // 对于敏感配置，显示掩码
        if (config.config_key.includes('password') || config.config_key.includes('secret')) {
          displayValue = '***';
        }
      }

      groupedConfigs[group].push({
        config_key: config.config_key,
        config_value: displayValue,
        config_type: config.config_type || 'string',
        description: config.description || '',
        is_encrypted: config.is_encrypted || 0
      });
    });

    // 确保所有必要的分组都存在
    const requiredGroups = ['server', 'database', 'jwt', 'comfyui', 'ai', 'frontend', 'cors', 'upload', 'log', 'workflow'];
    requiredGroups.forEach(group => {
      if (!groupedConfigs[group]) {
        groupedConfigs[group] = [];
      }
    });

    console.log('📋 配置分组统计:');
    Object.keys(groupedConfigs).forEach(group => {
      console.log(`   ${group}: ${groupedConfigs[group].length} 项配置`);
    });

    res.json({
      success: true,
      data: groupedConfigs
    });

  } catch (error) {
    console.error('❌ 加载配置失败:', error);
    res.status(500).json({
      success: false,
      message: '加载配置失败: ' + error.message
    });
  }
});

// 保存系统配置（管理员用）
router.post('/config', adminAuth, async (req, res, next) => {
  try {
    const { configs } = req.body;

    if (!configs || !Array.isArray(configs)) {
      return res.status(400).json({
        success: false,
        message: '配置数据格式错误'
      });
    }

    console.log('💾 保存系统配置到数据库，共', configs.length, '项');

    // 真正保存配置到数据库
    const results = [];
    let successCount = 0;
    let errorCount = 0;

    for (const config of configs) {
      const { config_key, config_value } = config;

      try {
        // 更新数据库中的配置
        const result = await query(`
          UPDATE system_config
          SET config_value = ?, updated_at = NOW()
          WHERE config_key = ?
        `, [config_value, config_key]);

        if (result.affectedRows > 0) {
          console.log(`  ✅ 保存成功: ${config_key} = ${config_value}`);
          results.push({
            config_key,
            updated: true,
            message: '更新成功'
          });
          successCount++;
        } else {
          // 如果没有找到配置项，尝试插入新的
          try {
            await query(`
              INSERT INTO system_config (config_key, config_value, config_type, config_group, description)
              VALUES (?, ?, 'string', 'custom', '用户自定义配置')
            `, [config_key, config_value]);

            console.log(`  ✅ 新增成功: ${config_key} = ${config_value}`);
            results.push({
              config_key,
              updated: true,
              message: '新增成功'
            });
            successCount++;
          } catch (insertError) {
            console.log(`  ❌ 新增失败: ${config_key} - ${insertError.message}`);
            results.push({
              config_key,
              updated: false,
              message: '新增失败: ' + insertError.message
            });
            errorCount++;
          }
        }
      } catch (updateError) {
        console.log(`  ❌ 更新失败: ${config_key} - ${updateError.message}`);
        results.push({
          config_key,
          updated: false,
          message: '更新失败: ' + updateError.message
        });
        errorCount++;
      }
    }

    const message = `配置保存完成: ${successCount}项成功, ${errorCount}项失败`;
    console.log('📊', message);

    res.json({
      success: errorCount === 0,
      message: message,
      data: {
        results,
        summary: {
          total: configs.length,
          success: successCount,
          error: errorCount
        }
      }
    });

  } catch (error) {
    console.error('❌ 保存配置失败:', error);
    res.status(500).json({
      success: false,
      message: '保存配置失败: ' + error.message
    });
  }
});

// 批量操作用户状态（管理员用）
router.put('/users/batch-status', adminAuth, async (req, res, next) => {
  try {
    const { userIds, status } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请提供有效的用户ID列表'
      });
    }

    if (!['active', 'inactive', 'banned'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: '无效的用户状态'
      });
    }

    const placeholders = userIds.map(() => '?').join(',');
    await query(`
      UPDATE users
      SET status = ?, updated_at = NOW()
      WHERE id IN (${placeholders})
    `, [status, ...userIds]);

    res.json({
      success: true,
      message: `成功更新${userIds.length}个用户的状态`
    });

  } catch (error) {
    next(error);
  }
});

// 生成等级卡（管理员用）
router.post('/generate-cards', adminAuth, async (req, res, next) => {
  try {
    const { cardTypeId, count = 5 } = req.body;

    if (!cardTypeId) {
      return res.status(400).json({
        success: false,
        message: '请选择等级卡类型'
      });
    }

    if (!count || count <= 0 || count > 100) {
      return res.status(400).json({
        success: false,
        message: '生成数量必须在1-100之间'
      });
    }

    console.log(`🎫 开始生成${count}张等级卡，类型ID: ${cardTypeId}...`);

    // 确保level_cards表存在
    await query(`
      CREATE TABLE IF NOT EXISTS level_cards (
        id INT AUTO_INCREMENT PRIMARY KEY,
        card_number VARCHAR(20) UNIQUE NOT NULL COMMENT '卡号',
        card_password VARCHAR(20) NOT NULL COMMENT '卡密',
        type_id INT NOT NULL COMMENT '等级卡类型ID',
        total_points INT NOT NULL COMMENT '总积分',
        remaining_points INT NOT NULL COMMENT '剩余积分',
        status ENUM('active', 'used', 'expired', 'disabled') DEFAULT 'active' COMMENT '状态',
        bound_user_id INT NULL COMMENT '绑定的用户ID',
        bound_at DATETIME NULL COMMENT '绑定时间',
        expires_at DATETIME NULL COMMENT '过期时间',
        created_at DATETIME NOT NULL,
        updated_at DATETIME NULL,
        INDEX idx_card_number (card_number),
        INDEX idx_bound_user (bound_user_id),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 获取卡片类型信息
    const cardTypeResult = await query(`
      SELECT id, name, points, price, description
      FROM card_types
      WHERE id = ?
    `, [cardTypeId]);

    if (cardTypeResult.length === 0) {
      return res.status(400).json({
        success: false,
        message: '无效的卡片类型'
      });
    }

    const typeInfo = cardTypeResult[0];
    const generatedCards = [];

    // 批量生成等级卡
    for (let i = 1; i <= count; i++) {
      const cardNumber = generateCardNumber(typeInfo.name, i);
      const cardPassword = generateCardPassword();

      await query(`
        INSERT INTO level_cards (card_number, card_password, type_id, remaining_points, created_at)
        VALUES (?, ?, ?, ?, NOW())
      `, [cardNumber, cardPassword, typeInfo.id, typeInfo.points]);

      generatedCards.push({
        cardNumber,
        cardPassword,
        typeName: typeInfo.name,
        points: typeInfo.points,
        price: typeInfo.price
      });
    }

    console.log(`✅ 成功生成${count}张${typeInfo.name}`);

    res.json({
      success: true,
      message: `成功生成${count}张${typeInfo.name}`,
      data: {
        cards: generatedCards,
        cardType: typeInfo.name,
        totalGenerated: count
      }
    });

  } catch (error) {
    console.error('❌ 生成等级卡失败:', error);
    next(error);
  }
});

// 生成体验卡
router.post('/generate-experience-cards', adminAuth, async (req, res, next) => {
  try {
    const { count = 1 } = req.body;
    console.log(`🎫 管理员请求生成${count}张体验卡...`);

    // 获取体验卡类型信息 - 修复表名，遵循开发原则
    const cardTypeResult = await query(`
      SELECT id, name, points, price
      FROM card_types
      WHERE name = '体验卡'
    `);

    if (cardTypeResult.length === 0) {
      return res.status(400).json({
        success: false,
        message: '体验卡类型不存在'
      });
    }

    const typeInfo = cardTypeResult[0];
    const generatedCards = [];

    // 批量生成体验卡
    for (let i = 1; i <= count; i++) {
      const cardNumber = generateCardNumber('体验卡', i);
      const cardPassword = generateCardPassword();

      await query(`
        INSERT INTO level_cards (card_number, card_password, type_id, remaining_points, created_at)
        VALUES (?, ?, ?, ?, NOW())
      `, [cardNumber, cardPassword, typeInfo.id, typeInfo.points]);

      generatedCards.push({
        cardNumber,
        cardPassword,
        typeName: typeInfo.name,
        points: typeInfo.points
      });
    }

    console.log(`✅ 成功生成${count}张体验卡`);

    res.json({
      success: true,
      message: `成功生成${count}张体验卡`,
      data: {
        cards: generatedCards,
        cardType: typeInfo.name,
        totalGenerated: count
      }
    });

  } catch (error) {
    console.error('❌ 生成体验卡失败:', error);
    next(error);
  }
});

// 获取体验卡统计信息
router.get('/experience-cards-stats', adminAuth, async (req, res, next) => {
  try {
    // 获取体验卡统计
    const stats = await query(`
      SELECT
        COUNT(*) as total_cards,
        COUNT(CASE WHEN bound_user_id IS NULL THEN 1 END) as available_cards,
        COUNT(CASE WHEN bound_user_id IS NOT NULL THEN 1 END) as bound_cards,
        SUM(CASE WHEN bound_user_id IS NULL THEN remaining_points ELSE 0 END) as available_points,
        SUM(CASE WHEN bound_user_id IS NOT NULL THEN remaining_points ELSE 0 END) as bound_points
      FROM level_cards lc
      JOIN card_types ct ON lc.type_id = ct.id
      WHERE ct.name = '体验卡'
    `);

    // 获取可用体验卡列表
    const availableCards = await getAvailableExperienceCards();

    res.json({
      success: true,
      data: {
        stats: stats[0],
        availableCards: availableCards.slice(0, 10) // 只返回前10张作为示例
      }
    });

  } catch (error) {
    next(error);
  }
});

// 测试数据库连接（管理员用）
router.post('/test-database', adminAuth, async (req, res, next) => {
  try {
    // 简单的数据库连接测试
    await query('SELECT 1 as test');

    res.json({
      success: true,
      message: '数据库连接测试成功'
    });

  } catch (error) {
    console.error('❌ 数据库连接测试失败:', error);
    res.status(500).json({
      success: false,
      message: '数据库连接测试失败: ' + error.message
    });
  }
});

// 测试ComfyUI连接（管理员用）
router.post('/test-comfyui', adminAuth, async (req, res, next) => {
  try {
    // 从请求体获取服务器地址，如果没有则使用默认配置
    let serverUrl = req.body?.serverUrl;

    // 如果没有提供服务器地址，从数据库获取配置
    if (!serverUrl) {
      try {
        const [configRows] = await query(
          'SELECT config_value FROM system_config WHERE config_key = ?',
          ['comfyui.server_url']
        );
        serverUrl = configRows.length > 0 ? configRows[0].config_value : 'https://your-comfyui-server.com';
      } catch (dbError) {
        console.error('获取ComfyUI配置失败:', dbError);
        serverUrl = 'https://your-comfyui-server.com';
      }
    }

    // 确保URL格式正确
    if (serverUrl && !serverUrl.startsWith('http')) {
      serverUrl = 'https://' + serverUrl;
    }

    // 移除末尾的斜杠
    if (serverUrl && serverUrl.endsWith('/')) {
      serverUrl = serverUrl.slice(0, -1);
    }

    console.log('🧪 测试ComfyUI连接:', serverUrl);

    // 测试ComfyUI连接
    const fetch = require('node-fetch');

    // 使用ComfyUI官方端点进行检测
    const testEndpoints = [
      `${serverUrl}/api/queue`,        // ComfyUI官方队列端点
      `${serverUrl}/api/system_stats`, // ComfyUI官方系统状态端点
    ];

    let lastError = null;
    let response = null;

    // 依次尝试不同的端点
    for (const testUrl of testEndpoints) {
      try {
        console.log(`🔍 尝试端点: ${testUrl}`);

        response = await fetch(testUrl, {
          method: 'GET',
          timeout: 10000,
          headers: {
            'User-Agent': 'ComfyUI-Admin-Test/1.0'
          }
        });

        console.log(`📡 端点 ${testUrl} 响应状态:`, response.status, response.statusText);

        // 如果得到响应（即使是错误状态码），说明服务器是可达的
        if (response) {
          break;
        }
      } catch (error) {
        console.log(`❌ 端点 ${testUrl} 失败:`, error.message);
        lastError = error;
        continue;
      }
    }

    // 如果所有端点都失败了
    if (!response) {
      throw lastError || new Error('所有测试端点都无法访问');
    }

    if (response.status === 200) {
      // 服务器正常响应
      res.json({
        success: true,
        message: 'ComfyUI服务器连接成功',
        data: {
          serverUrl,
          status: 'connected',
          statusCode: response.status,
          message: '服务器可正常访问'
        }
      });
    } else if (response.status === 401) {
      // 服务器需要认证，但可以连接
      res.json({
        success: true,
        message: 'ComfyUI服务器连接成功（需要认证）',
        data: {
          serverUrl,
          status: 'connected_auth_required',
          statusCode: response.status,
          message: '服务器可访问，但需要认证'
        }
      });
    } else if (response.status === 404) {
      // 路径不存在，但服务器可达
      res.json({
        success: true,
        message: 'ComfyUI服务器连接成功',
        data: {
          serverUrl,
          status: 'connected',
          statusCode: response.status,
          message: '服务器可访问（路径不存在是正常的）'
        }
      });
    } else {
      // 其他状态码
      res.json({
        success: false,
        message: `ComfyUI服务器响应异常: ${response.status} ${response.statusText}`,
        data: {
          serverUrl,
          status: 'error',
          statusCode: response.status
        }
      });
    }

  } catch (error) {
    console.error('❌ ComfyUI连接测试失败:', error);

    if (error.code === 'ENOTFOUND') {
      res.status(500).json({
        success: false,
        message: 'ComfyUI服务器域名无法解析，请检查服务器地址是否正确',
        data: {
          serverUrl: serverUrl || 'unknown',
          status: 'dns_error',
          error: error.code,
          message: 'Domain name resolution failed'
        }
      });
    } else if (error.code === 'ECONNREFUSED') {
      res.status(500).json({
        success: false,
        message: 'ComfyUI服务器拒绝连接，请检查服务器是否运行',
        data: {
          serverUrl: serverUrl || 'unknown',
          status: 'connection_refused',
          error: error.code,
          message: 'Connection refused by server'
        }
      });
    } else if (error.name === 'AbortError' || error.message.includes('timeout')) {
      res.status(500).json({
        success: false,
        message: 'ComfyUI服务器连接超时，请检查网络连接',
        data: {
          serverUrl: serverUrl || 'unknown',
          status: 'timeout',
          error: 'timeout',
          message: 'Connection timeout'
        }
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'ComfyUI连接测试失败: ' + error.message,
        data: {
          serverUrl: serverUrl || 'unknown',
          status: 'error',
          error: error.message,
          message: 'Unknown connection error'
        }
      });
    }
  }
});

// 生成卡密函数已在文件开头定义，这里删除重复定义

module.exports = router;
