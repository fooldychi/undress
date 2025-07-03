// 简单的代理服务器，解决ComfyUI CORS问题
import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import cors from 'cors';
import multer from 'multer';
import FormData from 'form-data';
import fetch from 'node-fetch';

const app = express();
const PORT = 3008;

// 启用CORS
app.use(cors({
  origin: ['http://localhost:3001', 'http://localhost:3002', 'http://localhost:3000'],
  credentials: true
}));

// 解析JSON
app.use(express.json());

// 配置multer处理文件上传
const upload = multer({ storage: multer.memoryStorage() });

// 动态ComfyUI服务器配置
let currentConfig = {
  COMFYUI_BASE_URL: 'https://hwf0p724ub-8188.cnb.run', // 默认值
  CLIENT_ID: 'abc1373d4ad648a3a81d0587fbe5534b'
};

console.log('🚀 启动ComfyUI代理服务器...');
console.log(`🎯 默认目标服务器: ${currentConfig.COMFYUI_BASE_URL}`);

// 健康检查
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'ComfyUI代理服务器运行正常',
    currentTarget: currentConfig.COMFYUI_BASE_URL
  });
});

// 获取当前配置
app.get('/api/config', (req, res) => {
  res.json(currentConfig);
});

// 更新配置
app.post('/api/config', (req, res) => {
  try {
    console.log('🔧 收到配置更新请求:', req.body);

    if (req.body.COMFYUI_SERVER_URL) {
      currentConfig.COMFYUI_BASE_URL = req.body.COMFYUI_SERVER_URL;
      console.log(`🎯 更新目标服务器: ${currentConfig.COMFYUI_BASE_URL}`);
    }

    if (req.body.CLIENT_ID) {
      currentConfig.CLIENT_ID = req.body.CLIENT_ID;
      console.log(`🆔 更新客户端ID: ${currentConfig.CLIENT_ID}`);
    }

    res.json({
      success: true,
      message: '配置更新成功',
      config: currentConfig
    });
  } catch (error) {
    console.error('❌ 配置更新失败:', error);
    res.status(500).json({
      success: false,
      error: '配置更新失败',
      details: error.message
    });
  }
});



// 特殊处理文件上传
app.post('/api/upload/image', upload.single('image'), async (req, res) => {
  try {
    console.log('📤 处理文件上传请求...');

    if (!req.file) {
      return res.status(400).json({ error: '没有上传文件' });
    }

    console.log(`📁 文件信息: ${req.file.originalname}, ${req.file.size} bytes, ${req.file.mimetype}`);

    // 创建FormData发送到ComfyUI
    const formData = new FormData();
    formData.append('image', req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype
    });

    // 添加其他参数
    if (req.body.type) formData.append('type', req.body.type);
    if (req.body.subfolder !== undefined) formData.append('subfolder', req.body.subfolder);
    if (req.body.overwrite !== undefined) formData.append('overwrite', req.body.overwrite);

    console.log(`🌐 转发到: ${currentConfig.COMFYUI_BASE_URL}/upload/image`);

    // 发送到ComfyUI服务器
    const response = await fetch(`${currentConfig.COMFYUI_BASE_URL}/upload/image`, {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders(),
      timeout: 30000, // 30秒超时
      agent: false // 禁用keep-alive
    });

    console.log(`📥 ComfyUI响应: ${response.status} ${response.statusText}`);

    const responseText = await response.text();

    if (response.ok) {
      try {
        const result = JSON.parse(responseText);
        console.log('✅ 上传成功:', result);
        res.json(result);
      } catch (e) {
        console.log('⚠️ 响应不是JSON格式:', responseText);
        res.json({ success: true, response: responseText });
      }
    } else {
      console.error('❌ ComfyUI上传失败:', responseText);
      res.status(response.status).json({
        error: 'ComfyUI上传失败',
        status: response.status,
        details: responseText
      });
    }

  } catch (error) {
    console.error('❌ 代理上传错误:', error);
    res.status(500).json({
      error: '代理服务器错误',
      details: error.message
    });
  }
});

// 特殊处理prompt提交
app.post('/api/prompt', async (req, res) => {
  try {
    console.log('📡 处理prompt提交请求...');
    console.log('📋 请求体大小:', JSON.stringify(req.body).length, 'bytes');

    const response = await fetch(`${currentConfig.COMFYUI_BASE_URL}/prompt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(req.body),
      timeout: 30000, // 30秒超时
      agent: false // 禁用keep-alive
    });

    console.log(`📥 ComfyUI响应: ${response.status} ${response.statusText}`);

    const responseText = await response.text();

    if (response.ok) {
      try {
        const result = JSON.parse(responseText);
        console.log('✅ prompt提交成功:', result);
        res.json(result);
      } catch (e) {
        console.log('⚠️ 响应不是JSON格式:', responseText);
        res.json({ success: true, response: responseText });
      }
    } else {
      console.error('❌ ComfyUI prompt提交失败:', responseText);
      res.status(response.status).json({
        error: 'ComfyUI prompt提交失败',
        status: response.status,
        details: responseText
      });
    }

  } catch (error) {
    console.error('❌ 代理prompt错误:', error);
    res.status(500).json({
      error: '代理服务器错误',
      details: error.message
    });
  }
});

// 动态代理中间件 - 使用函数来获取当前配置
const dynamicProxy = (req, res, next) => {
  // 跳过配置相关的路由
  if (req.path === '/api/config') {
    return next();
  }

  // 创建动态代理
  const proxy = createProxyMiddleware({
    target: currentConfig.COMFYUI_BASE_URL,
    changeOrigin: true,
    timeout: 30000,
    proxyTimeout: 30000,
    pathRewrite: {
      '^/api': '',
    },
    onProxyReq: (proxyReq, req) => {
      console.log(`📡 代理请求: ${req.method} ${req.url} -> ${currentConfig.COMFYUI_BASE_URL}${req.url.replace('/api', '')}`);
      proxyReq.setTimeout(30000);
    },
    onProxyRes: (proxyRes, req) => {
      console.log(`📥 代理响应: ${proxyRes.statusCode} ${req.url}`);
    },
    onError: (err, req, res) => {
      console.error('❌ 代理错误:', err.message);
      if (!res.headersSent) {
        res.status(500).json({ error: '代理请求失败', details: err.message });
      }
    }
  });

  return proxy(req, res, next);
};

// 代理其他请求（除了特殊处理的upload、prompt和config）
app.use('/api', dynamicProxy);

// 启动服务器
const server = app.listen(PORT, () => {
  console.log(`✅ ComfyUI代理服务器启动成功!`);
  console.log(`📡 代理地址: http://localhost:${PORT}`);
  console.log(`🎯 目标服务器: ${currentConfig.COMFYUI_BASE_URL}`);
  console.log(`🔧 健康检查: http://localhost:${PORT}/health`);
  console.log(`⚙️  配置管理: http://localhost:${PORT}/api/config`);
  console.log('');
  console.log('📋 使用方法:');
  console.log(`   原始: ${currentConfig.COMFYUI_BASE_URL}/system_stats`);
  console.log(`   代理: http://localhost:${PORT}/api/system_stats`);
  console.log('');
  console.log('🔄 现在可以在前端使用代理地址避免CORS问题');
  console.log('🔧 前端可以通过POST /api/config动态更新目标服务器地址');
});

// 处理服务器错误
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ 端口 ${PORT} 已被占用，请尝试其他端口或关闭占用该端口的程序`);
  } else {
    console.error('❌ 服务器启动错误:', error.message);
  }
  process.exit(1);
});

// 全局错误处理
process.on('uncaughtException', (error) => {
  console.error('❌ 未捕获的异常:', error.message);
  console.error('堆栈信息:', error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ 未处理的Promise拒绝:', reason);
  console.error('Promise:', promise);
  process.exit(1);
});

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\n🛑 正在关闭代理服务器...');
  server.close(() => {
    console.log('✅ 服务器已关闭');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n🛑 正在关闭代理服务器...');
  server.close(() => {
    console.log('✅ 服务器已关闭');
    process.exit(0);
  });
});


