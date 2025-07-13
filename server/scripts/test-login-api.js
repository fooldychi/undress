// 测试登录API
const http = require('http');

const testLoginAPI = () => {
  console.log('🧪 测试登录API...');

  const postData = JSON.stringify({
    username: 'admin',
    password: 'admin123'
  });

  const options = {
    hostname: 'localhost',
    port: 3007,
    path: '/api/admin-auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const req = http.request(options, (res) => {
    let data = '';

    console.log(`📊 状态码: ${res.statusCode}`);
    console.log(`📊 响应头:`, res.headers);

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      console.log('📊 响应数据:', data);

      try {
        const jsonData = JSON.parse(data);
        console.log('✅ JSON解析成功:', JSON.stringify(jsonData, null, 2));
      } catch (error) {
        console.log('❌ JSON解析失败:', error.message);
        console.log('原始响应:', data);
      }
    });
  });

  req.on('error', (error) => {
    console.log(`❌ 请求失败: ${error.message}`);
    console.log('错误详情:', error);
  });

  req.on('timeout', () => {
    console.log('⏰ 请求超时');
    req.destroy();
  });

  req.write(postData);
  req.end();
};

testLoginAPI();
