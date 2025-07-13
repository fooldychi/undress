// 检查服务器状态脚本
const http = require('http');

const checkServerStatus = () => {
  const port = process.env.SERVER_PORT || 3007;
  
  console.log(`🔍 检查服务器状态 (http://localhost:${port})...`);
  
  const options = {
    hostname: 'localhost',
    port: port,
    path: '/health',
    method: 'GET',
    timeout: 5000
  };

  const req = http.request(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log(`✅ 服务器运行正常 (状态码: ${res.statusCode})`);
      
      try {
        const healthData = JSON.parse(data);
        console.log('📊 健康状态:', JSON.stringify(healthData, null, 2));
      } catch (error) {
        console.log('📊 响应数据:', data);
      }
    });
  });

  req.on('error', (error) => {
    console.log(`❌ 服务器未运行或无法连接: ${error.message}`);
    console.log('💡 请先启动服务器:');
    console.log('   Windows: start-stable-server.bat');
    console.log('   Linux/Mac: ./start-stable-server.sh');
    console.log('   或者: cd server && node start-with-manager.js');
  });

  req.on('timeout', () => {
    console.log('⏰ 连接超时，服务器可能未响应');
    req.destroy();
  });

  req.end();
};

checkServerStatus();
