const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
require('dotenv').config();

const { testConnection } = require('./config/database');
const errorHandler = require('./middleware/errorHandler');
// const { healthMonitor } = require('./utils/healthMonitor');
// const { memoryManager } = require('./utils/memoryManager');
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
const PORT = process.env.PORT || 3007;

// 中间件配置
app.use(helmet()); // 安全头
app.use(compression()); // 压缩响应
app.use(morgan('combined')); // 日志记录

// CORS配置 - 支持动态端口
app.use(cors({
  origin: function (origin, callback) {
    // 从环境变量获取端口配置
    const CLIENT_PORT = process.env.CLIENT_PORT || 3001;
    const ADMIN_PORT = process.env.ADMIN_PORT || 3003;

    // 允许的域名列表 - 使用环境变量配置端口
    const allowedOrigins = [
      'http://localhost:3000',
      `http://localhost:${CLIENT_PORT}`,  // 客户端端口
      `http://localhost:${ADMIN_PORT}`,   // 后台管理系统端口
      'http://localhost:5173',  // Vite 默认端口
      'http://localhost:5174',  // Vite 备用端口
      'http://127.0.0.1:3000',
      `http://127.0.0.1:${CLIENT_PORT}`,  // 客户端端口
      `http://127.0.0.1:${ADMIN_PORT}`,   // 后台管理系统端口
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

// 健康检查端点 - 简化版本，适用于开发环境
app.get('/health', async (req, res) => {
  try {
    // 检查数据库连接状态
    let dbStatus = false;
    let dbError = null;
    try {
      dbStatus = await testConnection();
    } catch (error) {
      dbError = error.message;
    }

    // 检查内存使用情况
    const memoryUsage = process.memoryUsage();
    const formatBytes = (bytes) => Math.round(bytes / 1024 / 1024); // MB

    const healthData = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      pid: process.pid,
      database: {
        connected: dbStatus,
        error: dbError
      },
      memory: {
        rss: formatBytes(memoryUsage.rss),
        heapUsed: formatBytes(memoryUsage.heapUsed),
        heapTotal: formatBytes(memoryUsage.heapTotal),
        external: formatBytes(memoryUsage.external)
      }
    };

    // 如果数据库连接失败，返回警告状态但不返回500错误
    if (!dbStatus) {
      healthData.status = 'WARNING';
      healthData.message = '数据库未连接，某些功能可能不可用';
    }

    res.json(healthData);
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
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
    // 测试数据库连接 - 暂时跳过以快速启动
    console.log('⚠️ 跳过数据库连接测试，直接启动服务器');
    const dbConnected = false;
    // const dbConnected = await testConnection();
    // if (!dbConnected) {
    //   console.warn('⚠️ 数据库连接失败，但服务器将继续启动（仅用于管理界面）');
    // }

    // 启动HTTP服务器
    global.httpServer = app.listen(PORT, () => {
      console.log('🚀 Imagic服务器启动成功!');
      console.log(`📍 服务地址: http://localhost:${PORT}`);
      console.log(`🌍 环境: ${process.env.NODE_ENV}`);
      console.log(`⏰ 启动时间: ${new Date().toLocaleString()}`);
      console.log(`🆔 进程ID: ${process.pid}`);
      if (!dbConnected) {
        console.log('⚠️ 注意：数据库未连接，某些功能可能不可用');
      }

      // 启动内存监控
      console.log('📊 内存监控已启动，每5分钟报告一次');
      monitorMemoryUsage(); // 立即执行一次

      // 启动健康监控
      // healthMonitor.start();

      // 启动内存管理
      // memoryManager.start();
    });
  } catch (error) {
    console.error('❌ 服务器启动失败:', error);
    process.exit(1);
  }
}

// 全局异常处理
process.on('uncaughtException', (error) => {
  console.error('❌ 未捕获的异常:', error);
  console.error('堆栈信息:', error.stack);

  // 记录错误到日志文件
  const fs = require('fs');
  const logEntry = `[${new Date().toISOString()}] UNCAUGHT EXCEPTION: ${error.message}\n${error.stack}\n\n`;
  fs.appendFileSync('logs/error.log', logEntry, { flag: 'a' });

  // 优雅关闭服务器
  gracefulShutdown('uncaughtException').catch(error => {
    console.error('❌ 优雅关闭失败:', error);
    process.exit(1);
  });
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ 未处理的Promise拒绝:', reason);
  console.error('Promise:', promise);

  // 记录错误到日志文件
  const fs = require('fs');
  const logEntry = `[${new Date().toISOString()}] UNHANDLED REJECTION: ${reason}\nPromise: ${promise}\n\n`;
  fs.appendFileSync('logs/error.log', logEntry, { flag: 'a' });

  // 对于Promise拒绝，不立即退出，但记录错误
  console.warn('⚠️ 服务器继续运行，但建议检查上述错误');
});

// 内存使用监控
const monitorMemoryUsage = () => {
  const usage = process.memoryUsage();
  const formatBytes = (bytes) => (bytes / 1024 / 1024).toFixed(2) + ' MB';

  console.log('📊 内存使用情况:');
  console.log(`   RSS: ${formatBytes(usage.rss)}`);
  console.log(`   Heap Used: ${formatBytes(usage.heapUsed)}`);
  console.log(`   Heap Total: ${formatBytes(usage.heapTotal)}`);
  console.log(`   External: ${formatBytes(usage.external)}`);

  // 内存使用超过500MB时发出警告
  if (usage.heapUsed > 500 * 1024 * 1024) {
    console.warn('⚠️ 内存使用过高，可能存在内存泄漏');
  }
};

// 每5分钟监控一次内存使用
const memoryMonitorInterval = setInterval(monitorMemoryUsage, 5 * 60 * 1000);

// 优雅关闭函数
const gracefulShutdown = async (signal) => {
  console.log(`🛑 收到${signal}信号，正在优雅关闭服务器...`);

  // 清理定时器和监控
  if (memoryMonitorInterval) {
    clearInterval(memoryMonitorInterval);
  }

  // 停止健康监控
  healthMonitor.stop();

  // 停止内存管理
  memoryManager.stop();

  // 关闭数据库连接池
  try {
    const { closePool } = require('./config/database');
    await closePool();
  } catch (error) {
    console.error('❌ 关闭数据库连接池失败:', error);
  }

  // 设置超时强制退出
  const forceExitTimer = setTimeout(() => {
    console.log('⚠️ 强制退出服务器');
    process.exit(1);
  }, 10000); // 10秒后强制退出

  // 优雅关闭HTTP服务器
  if (global.httpServer) {
    global.httpServer.close(() => {
      console.log('✅ HTTP服务器已关闭');
      clearTimeout(forceExitTimer);
      process.exit(0);
    });
  } else {
    clearTimeout(forceExitTimer);
    process.exit(0);
  }
};

// 信号处理
process.on('SIGTERM', () => {
  gracefulShutdown('SIGTERM').catch(error => {
    console.error('❌ 优雅关闭失败:', error);
    process.exit(1);
  });
});

process.on('SIGINT', () => {
  gracefulShutdown('SIGINT').catch(error => {
    console.error('❌ 优雅关闭失败:', error);
    process.exit(1);
  });
});

startServer();

module.exports = app;
