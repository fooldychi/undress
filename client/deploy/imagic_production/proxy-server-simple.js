// Imagic静态文件服务器 - 生产环境专用
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3008;

console.log('🚀 启动Imagic静态文件服务器...');

// 启用CORS
app.use(cors({
  origin: true, // 允许所有来源
  credentials: true
}));

// 解析JSON
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 静态文件服务
app.use(express.static('./', {
  index: 'index.html',
  setHeaders: (res, path) => {
    if (path.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache');
    } else if (path.includes('/assets/')) {
      res.setHeader('Cache-Control', 'public, max-age=31536000');
    }
  }
}));

// 健康检查
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Imagic静态文件服务器运行正常',
    timestamp: new Date().toISOString()
  });
});

// SPA路由支持 - 所有请求返回index.html
app.get('*', (req, res) => {
  // 所有请求返回index.html（SPA路由）
  res.sendFile(path.join(__dirname, 'index.html'));
});

// 全局错误处理
process.on('uncaughtException', (error) => {
  console.error('❌ 未捕获的异常:', error.message);
  // 不退出进程，继续运行
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ 未处理的Promise拒绝:', reason);
  // 不退出进程，继续运行
});

// 启动服务器
const server = app.listen(PORT, () => {
  console.log(`✅ Imagic静态文件服务器启动成功!`);
  console.log(`🌐 访问地址: http://localhost:${PORT}`);
  console.log(`🔧 健康检查: http://localhost:${PORT}/health`);
  console.log('');
  console.log('🎉 现在可以在浏览器中访问Imagic应用了！');
  console.log('📝 注意：应用将直接连接到ComfyUI服务器，无需代理');
});

// 处理服务器错误
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ 端口 ${PORT} 已被占用`);
    console.error('请尝试以下解决方案:');
    console.error('1. 关闭占用该端口的程序');
    console.error('2. 使用其他端口: PORT=3009 node proxy-server-simple.js');
    console.error('3. 检查是否有其他Imagic实例在运行');
  } else {
    console.error('❌ 服务器启动错误:', error.message);
  }
  process.exit(1);
});

// 优雅关闭
const gracefulShutdown = () => {
  console.log('\n🛑 正在关闭服务器...');
  server.close(() => {
    console.log('✅ 服务器已安全关闭');
    process.exit(0);
  });

  // 强制关闭超时
  setTimeout(() => {
    console.log('⚠️ 强制关闭服务器');
    process.exit(1);
  }, 5000);
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

// Windows下的关闭信号
if (process.platform === 'win32') {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.on('SIGINT', gracefulShutdown);
}
