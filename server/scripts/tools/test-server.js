const http = require('http');

// 测试服务器是否响应
const options = {
  hostname: 'localhost',
  port: 3006,
  path: '/',
  method: 'GET'
};

const req = http.request(options, (res) => {
  console.log(`✅ 服务器响应状态码: ${res.statusCode}`);
  console.log(`📋 响应头:`, res.headers);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('📄 响应内容:', data.substring(0, 200) + '...');
    console.log('🎉 后端服务器运行正常！');
  });
});

req.on('error', (e) => {
  console.error(`❌ 连接失败: ${e.message}`);
  console.log('💡 请确保后端服务器已启动：cd server && node src/app.js');
});

req.end();
