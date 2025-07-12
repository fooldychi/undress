const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
require('dotenv').config();

const { testConnection } = require('./config/database');
const errorHandler = require('./middleware/errorHandler');
const rateLimiter = require('./middleware/rateLimiter');

// 导入路由
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const imageRoutes = require('./routes/images');
const seckillRoutes = require('./routes/seckill');
const levelCardsRoutes = require('./routes/levelCards');
const adminAuthRoutes = require('./routes/adminAuth');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件配置
app.use(helmet()); // 安全头
app.use(compression()); // 压缩响应
app.use(morgan('combined')); // 日志记录

// CORS配置 - 支持动态端口
app.use(cors({
  origin: function (origin, callback) {
    // 允许的域名列表
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',  // 后台管理系统端口
      'http://localhost:3007',  // Vue 管理后台端口
      'http://localhost:5173',  // Vite 默认端口
      'http://localhost:5174',  // Vite 备用端口
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      'http://127.0.0.1:3002',  // 后台管理系统端口
      'http://127.0.0.1:3007',  // Vue 管理后台端口
      'http://127.0.0.1:5173',
      'http://127.0.0.1:5174'
    ];

    // 如果设置了环境变量，优先使用
    if (process.env.CORS_ORIGIN) {
      allowedOrigins.push(process.env.CORS_ORIGIN);
    }

    // 允许没有origin的请求（如移动应用、Postman等）
    // 以及origin为null的请求（如直接打开HTML文件）
    if (!origin || origin === 'null') return callback(null, true);

    // 允许file://协议的请求（用于直接打开HTML文件）
    if (origin && origin.startsWith('file://')) {
      return callback(null, true);
    }

    // 检查origin是否在允许列表中
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log(`❌ CORS blocked origin: ${origin}`);
      console.log(`✅ Allowed origins: ${allowedOrigins.join(', ')}, file://`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// 请求解析
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 静态文件服务
app.use('/uploads', express.static('uploads'));

// 速率限制
app.use(rateLimiter);

// 健康检查端点
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV
  });
});

// API路由
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/points', require('./routes/points'));
app.use('/api/level-cards', require('./routes/levelCards'));
app.use('/api/admin-auth', adminAuthRoutes);
// 注意：更具体的路由要放在前面
app.use('/api/admin/config', require('./routes/config'));
app.use('/api/admin', adminRoutes);
app.use('/api/config', require('./routes/public-config'));

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: '接口不存在',
    path: req.originalUrl
  });
});

// 错误处理中间件
app.use(errorHandler);

// 启动服务器
async function startServer() {
  try {
    // 测试数据库连接
    const dbConnected = await testConnection();
    if (!dbConnected) {
      console.warn('⚠️ 数据库连接失败，但服务器将继续启动（仅用于管理界面）');
    }

    // 启动HTTP服务器
    app.listen(PORT, () => {
      console.log('🚀 Imagic服务器启动成功!');
      console.log(`📍 服务地址: http://localhost:${PORT}`);
      console.log(`🌍 环境: ${process.env.NODE_ENV}`);
      console.log(`⏰ 启动时间: ${new Date().toLocaleString()}`);
      if (!dbConnected) {
        console.log('⚠️ 注意：数据库未连接，某些功能可能不可用');
      }
    });
  } catch (error) {
    console.error('❌ 服务器启动失败:', error);
    process.exit(1);
  }
}

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('🛑 收到SIGTERM信号，正在关闭服务器...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 收到SIGINT信号，正在关闭服务器...');
  process.exit(0);
});

startServer();

module.exports = app;
