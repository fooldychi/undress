// 测试管理员认证和等级卡类型接口
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { adminAuth } = require('./src/middleware/adminAuth');

const app = express();
const PORT = 3008; // 使用不同端口避免冲突

// 中间件
app.use(cors());
app.use(express.json());

// 测试等级卡类型接口（使用真实的adminAuth中间件）
app.get('/api/admin/card-types', adminAuth, async (req, res) => {
  try {
    const { query } = require('./src/config/database');
    
    console.log('🔍 测试获取等级卡类型列表...');
    console.log('👤 管理员信息:', req.admin);

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

    // 检查数据
    const existingData = await query(`SELECT COUNT(*) as count FROM card_types`);
    if (existingData[0].count === 0) {
      await query(`
        INSERT INTO card_types (name, icon, price, points, description) VALUES
        ('体验卡', '🎁', 0.00, 20, '免费体验卡，每张20积分'),
        ('基础卡', '🥉', 9.90, 300, '适合轻度使用的用户'),
        ('高级卡', '🥈', 30.00, 1000, '适合中度使用的用户'),
        ('至尊卡', '🥇', 50.00, 2000, '适合重度使用的用户')
      `);
    }

    // 获取数据
    const cardTypes = await query(`
      SELECT id, name, icon, points, price, created_at
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

  } catch (error) {
    console.error('❌ 错误:', error);
    res.status(500).json({
      success: false,
      message: '获取等级卡类型失败: ' + error.message
    });
  }
});

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: '测试服务器运行正常', 
    timestamp: new Date().toISOString(),
    port: PORT
  });
});

// 获取管理员token的测试接口
app.post('/api/admin-auth/login', async (req, res) => {
  try {
    const { generateToken } = require('./src/middleware/adminAuth');
    const { query } = require('./src/config/database');
    
    // 获取第一个管理员账号用于测试
    const admins = await query('SELECT * FROM admins LIMIT 1');
    if (admins.length > 0) {
      const token = generateToken(admins[0]);
      res.json({
        success: true,
        data: {
          token,
          admin: {
            id: admins[0].id,
            username: admins[0].username,
            role: admins[0].role
          }
        }
      });
    } else {
      res.status(404).json({
        success: false,
        message: '没有找到管理员账号'
      });
    }
  } catch (error) {
    console.error('❌ 登录测试失败:', error);
    res.status(500).json({
      success: false,
      message: '登录测试失败: ' + error.message
    });
  }
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 测试服务器启动成功: http://localhost:${PORT}`);
  console.log(`📍 健康检查: http://localhost:${PORT}/api/health`);
  console.log(`🔑 获取测试token: POST http://localhost:${PORT}/api/admin-auth/login`);
  console.log(`📋 测试接口: GET http://localhost:${PORT}/api/admin/card-types`);
  console.log(`💡 使用获取的token作为Bearer token访问card-types接口`);
});
