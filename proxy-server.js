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

// ComfyUI服务器地址
const COMFYUI_BASE_URL = 'https://dzqgp58z0s-8188.cnb.run';

console.log('🚀 启动ComfyUI代理服务器...');

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'ComfyUI代理服务器运行正常' });
});

// 代理GET请求（如system_stats）
app.get('/api/*', createProxyMiddleware({
  target: COMFYUI_BASE_URL,
  changeOrigin: true,
  timeout: 30000, // 30秒超时
  proxyTimeout: 30000, // 代理超时
  pathRewrite: {
    '^/api': '', // 移除/api前缀
  },
  onProxyReq: (proxyReq, req, res) => {
    console.log(`📡 代理GET请求: ${req.method} ${req.url} -> ${COMFYUI_BASE_URL}${req.url.replace('/api', '')}`);
    // 设置更长的超时时间
    proxyReq.setTimeout(30000);
  },
  onProxyRes: (proxyRes, req, res) => {
    console.log(`📥 代理响应: ${proxyRes.statusCode} ${req.url}`);
  },
  onError: (err, req, res) => {
    console.error('❌ 代理错误:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: '代理请求失败', details: err.message });
    }
  }
}));

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

    console.log(`🌐 转发到: ${COMFYUI_BASE_URL}/upload/image`);

    // 发送到ComfyUI服务器
    const response = await fetch(`${COMFYUI_BASE_URL}/upload/image`, {
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

    const response = await fetch(`${COMFYUI_BASE_URL}/prompt`, {
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

// 代理其他POST请求
app.post('/api/*', createProxyMiddleware({
  target: COMFYUI_BASE_URL,
  changeOrigin: true,
  timeout: 30000, // 30秒超时
  proxyTimeout: 30000, // 代理超时
  pathRewrite: {
    '^/api': '', // 移除/api前缀
  },
  onProxyReq: (proxyReq, req, res) => {
    console.log(`📡 代理POST请求: ${req.method} ${req.url} -> ${COMFYUI_BASE_URL}${req.url.replace('/api', '')}`);
    // 设置更长的超时时间
    proxyReq.setTimeout(30000);
  },
  onProxyRes: (proxyRes, req, res) => {
    console.log(`📥 代理响应: ${proxyRes.statusCode} ${req.url}`);
  },
  onError: (err, req, res) => {
    console.error('❌ 代理错误:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: '代理请求失败', details: err.message });
    }
  }
}));

// 启动服务器
app.listen(PORT, () => {
  console.log(`✅ ComfyUI代理服务器启动成功!`);
  console.log(`📡 代理地址: http://localhost:${PORT}`);
  console.log(`🎯 目标服务器: ${COMFYUI_BASE_URL}`);
  console.log(`🔧 健康检查: http://localhost:${PORT}/health`);
  console.log('');
  console.log('📋 使用方法:');
  console.log(`   原始: ${COMFYUI_BASE_URL}/system_stats`);
  console.log(`   代理: http://localhost:${PORT}/api/system_stats`);
  console.log('');
  console.log('🔄 现在可以在前端使用代理地址避免CORS问题');
});

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\n🛑 正在关闭代理服务器...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 正在关闭代理服务器...');
  process.exit(0);
});


