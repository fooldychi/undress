console.log('测试开始');

try {
  require('dotenv').config();
  console.log('dotenv 加载成功');
  
  const express = require('express');
  console.log('express 加载成功');
  
  const app = express();
  const PORT = process.env.PORT || 3007;
  
  app.get('/test', (req, res) => {
    res.json({ message: '测试成功', timestamp: new Date().toISOString() });
  });
  
  app.listen(PORT, () => {
    console.log(`✅ 测试服务器启动成功，端口: ${PORT}`);
  });
  
} catch (error) {
  console.error('❌ 错误:', error);
  process.exit(1);
}
