const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3006;

// 中间件配置
app.use(cors({
  origin: function (origin, callback) {
    // 允许的源列表
    const allowedOrigins = [
      'http://localhost:3002', // 后台管理系统
      'http://localhost:3003', // 客户端
      'http://localhost:3000',
      'http://127.0.0.1:3002',
      'http://127.0.0.1:3003',
      'http://127.0.0.1:3000'
    ];

    // 允许没有origin的请求
    if (!origin || origin === 'null') return callback(null, true);

    // 检查origin是否在允许列表中
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log(`❌ CORS blocked origin: ${origin}`);
      callback(null, true); // 临时允许所有源
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 健康检查
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// 简化的管理员登录路由
app.post('/api/admin-auth/login', (req, res) => {
  const { username, password } = req.body;
  
  console.log('🔐 管理员登录尝试:', username);
  
  // 简单的硬编码验证（仅用于测试）
  if (username === 'admin' && password === 'admin123') {
    console.log('✅ 管理员登录成功');
    
    // 生成简单的token
    const token = Buffer.from(`${username}:${Date.now()}`).toString('base64');
    
    res.json({
      success: true,
      message: '登录成功',
      data: {
        token,
        admin: {
          id: 1,
          username: 'admin',
          email: 'admin@example.com',
          realName: '系统管理员',
          role: 'super_admin'
        }
      }
    });
  } else {
    console.log('❌ 管理员登录失败: 用户名或密码错误');
    res.status(401).json({
      success: false,
      message: '用户名或密码错误',
      code: 'INVALID_CREDENTIALS'
    });
  }
});

// 获取管理员信息
app.get('/api/admin-auth/me', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({
      success: false,
      message: '未提供认证令牌',
      code: 'NO_TOKEN'
    });
  }
  
  res.json({
    success: true,
    data: {
      admin: {
        id: 1,
        username: 'admin',
        email: 'admin@example.com',
        realName: '系统管理员',
        role: 'super_admin'
      }
    }
  });
});

// 管理员登出
app.post('/api/admin-auth/logout', (req, res) => {
  res.json({
    success: true,
    message: '登出成功'
  });
});

// 模拟用户列表API
app.get('/api/admin/users', (req, res) => {
  res.json({
    success: true,
    data: {
      items: [
        {
          id: 1,
          username: 'testuser1',
          email: 'test1@example.com',
          status: 'active',
          total_points: 100,
          created_at: new Date().toISOString(),
          last_login: new Date().toISOString()
        },
        {
          id: 2,
          username: 'testuser2',
          email: 'test2@example.com',
          status: 'inactive',
          total_points: 50,
          created_at: new Date().toISOString(),
          last_login: null
        }
      ],
      total: 2,
      page: 1,
      pageSize: 20
    }
  });
});

// 更新用户状态API
app.put('/api/admin/users/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  console.log(`🔄 更新用户${id}状态为: ${status}`);
  
  res.json({
    success: true,
    message: '用户状态更新成功'
  });
});

// 模拟等级卡列表API
app.get('/api/admin/cards', (req, res) => {
  res.json({
    success: true,
    data: {
      items: [
        {
          id: 1,
          card_number: 'CARD001',
          type_name: '体验卡',
          total_points: 100,
          remaining_points: 80,
          status: 'active',
          bound_username: 'testuser1',
          bound_user_id: 1,
          created_at: new Date().toISOString()
        },
        {
          id: 2,
          card_number: 'CARD002',
          type_name: '标准卡',
          total_points: 500,
          remaining_points: 500,
          status: 'active',
          bound_username: null,
          bound_user_id: null,
          created_at: new Date().toISOString()
        }
      ],
      total: 2,
      page: 1,
      pageSize: 20
    }
  });
});

// 解绑等级卡API
app.put('/api/admin/cards/:id/unbind', (req, res) => {
  const { id } = req.params;
  console.log(`🔓 解绑等级卡: ${id}`);
  
  res.json({
    success: true,
    message: '等级卡解绑成功'
  });
});

// 更新等级卡状态API
app.put('/api/admin/cards/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  console.log(`🔄 更新等级卡${id}状态为: ${status}`);
  
  res.json({
    success: true,
    message: '等级卡状态更新成功'
  });
});

// 模拟积分记录API
app.get('/api/admin/points-logs', (req, res) => {
  res.json({
    success: true,
    data: {
      items: [
        {
          id: 1,
          user_id: 1,
          username: 'testuser1',
          action_type: 'consume',
          points_amount: 20,
          description: '生成图片',
          url: 'https://example.com/result1.jpg',
          created_at: new Date().toISOString()
        },
        {
          id: 2,
          user_id: 1,
          username: 'testuser1',
          action_type: 'bind',
          points_amount: 100,
          description: '绑定体验卡',
          url: null,
          created_at: new Date().toISOString()
        },
        {
          id: 3,
          user_id: 2,
          username: 'testuser2',
          action_type: 'consume',
          points_amount: 15,
          description: '生成图片',
          url: '/uploads/images/result2.png',
          created_at: new Date().toISOString()
        }
      ],
      total: 3,
      page: 1,
      pageSize: 20
    }
  });
});

// 404处理
app.use('*', (req, res) => {
  console.log(`❌ 404: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    message: '接口不存在',
    path: req.originalUrl
  });
});

// 错误处理
app.use((error, req, res, next) => {
  console.error('❌ 服务器错误:', error);
  res.status(500).json({
    success: false,
    message: '服务器内部错误',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log('🚀 简化服务器启动成功!');
  console.log(`📍 服务地址: http://localhost:${PORT}`);
  console.log(`🌍 环境: ${process.env.NODE_ENV || 'development'}`);
  console.log(`⏰ 启动时间: ${new Date().toLocaleString()}`);
  console.log('');
  console.log('📋 测试账号:');
  console.log('   用户名: admin');
  console.log('   密码: admin123');
});

module.exports = app;
