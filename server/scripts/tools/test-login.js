const http = require('http');

// 测试登录API
const postData = JSON.stringify({
  username: 'admin',
  password: 'admin123456'
});

const options = {
  hostname: 'localhost',
  port: 3006,
  path: '/api/admin-auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData),
    'Origin': 'http://localhost:3007'
  }
};

const req = http.request(options, (res) => {
  console.log(`✅ 登录API响应状态码: ${res.statusCode}`);
  console.log(`📋 响应头:`, res.headers);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('📄 响应内容:', data);
    try {
      const response = JSON.parse(data);
      if (response.success) {
        console.log('🎉 登录测试成功！');
      } else {
        console.log('⚠️ 登录失败:', response.message);
      }
    } catch (e) {
      console.log('❌ 响应解析失败:', e.message);
    }
  });
});

req.on('error', (e) => {
  console.error(`❌ 请求失败: ${e.message}`);
});

req.write(postData);
req.end();
