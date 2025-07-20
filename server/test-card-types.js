// 测试等级卡类型接口
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { query } = require('./src/config/database');

const app = express();
const PORT = 3007;

// 中间件
app.use(cors());
app.use(express.json());

// 简单的管理员认证中间件（测试用）
const adminAuth = (req, res, next) => {
  req.admin = { id: 1, username: 'admin' };
  next();
};

// 测试等级卡类型接口
app.get('/api/admin/card-types', adminAuth, async (req, res) => {
  try {
    console.log('🔍 测试获取等级卡类型列表...');

    // 确保表存在
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
    console.log('✅ 表确保存在');

    // 检查数据
    const existingData = await query(`SELECT COUNT(*) as count FROM card_types`);
    if (existingData[0].count === 0) {
      console.log('📝 插入初始数据...');
      await query(`
        INSERT INTO card_types (name, icon, price, points, description) VALUES
        ('体验卡', '🎁', 0.00, 20, '免费体验卡，每张20积分'),
        ('基础卡', '🥉', 9.90, 300, '适合轻度使用的用户'),
        ('高级卡', '🥈', 30.00, 1000, '适合中度使用的用户'),
        ('至尊卡', '🥇', 50.00, 2000, '适合重度使用的用户')
      `);
      console.log('✅ 初始数据插入成功');
    }

    // 获取数据
    const cardTypes = await query(`
      SELECT id, name, icon, points, price, created_at
      FROM card_types
      ORDER BY points ASC
    `);

    console.log('✅ 成功获取等级卡类型:', cardTypes.length, '个');
    console.log('📊 数据:', cardTypes);

    res.json({
      success: true,
      data: {
        cardTypes
      }
    });

  } catch (error) {
    console.error('❌ 错误:', error);
    res.status(500).json({
      success: false,
      message: '获取等级卡类型失败: ' + error.message,
      error: {
        code: error.code,
        sqlState: error.sqlState,
        sqlMessage: error.sqlMessage
      }
    });
  }
});

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: '服务器运行正常', timestamp: new Date().toISOString() });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 测试服务器启动成功: http://localhost:${PORT}`);
  console.log(`📍 测试接口: http://localhost:${PORT}/api/admin/card-types`);
  console.log(`🔍 健康检查: http://localhost:${PORT}/api/health`);
});
