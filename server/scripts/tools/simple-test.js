const http = require('http');

// 简单测试服务器连接
const options = {
  hostname: 'localhost',
  port: 3006,
  path: '/',
  method: 'GET'
};

const req = http.request(options, (res) => {
  console.log(`状态码: ${res.statusCode}`);
  console.log(`响应头:`, res.headers);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('响应内容:', data.substring(0, 100));
    console.log('✅ 服务器连接正常');
  });
});

req.on('error', (e) => {
  console.error(`❌ 连接失败: ${e.message}`);
});

req.end();
