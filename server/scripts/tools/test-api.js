const http = require('http');

// 测试积分记录API
const testPointsLogs = () => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3006,
      path: '/api/admin/points-logs?page=1&pageSize=20',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${global.authToken}`,
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      console.log(`✅ 积分记录API响应状态码: ${res.statusCode}`);

      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        console.log('📄 积分记录API响应:', data.substring(0, 200) + '...');
        resolve(data);
      });
    });

    req.on('error', (e) => {
      console.error(`❌ 积分记录API请求失败: ${e.message}`);
      reject(e);
    });

    req.end();
  });
};

// 测试用户列表API
const testUsers = () => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3006,
      path: '/api/admin/users?page=1&pageSize=20',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${global.authToken}`,
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      console.log(`✅ 用户列表API响应状态码: ${res.statusCode}`);

      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        console.log('📄 用户列表API响应:', data.substring(0, 200) + '...');
        resolve(data);
      });
    });

    req.on('error', (e) => {
      console.error(`❌ 用户列表API请求失败: ${e.message}`);
      reject(e);
    });

    req.end();
  });
};

// 获取管理员token
const getAdminToken = () => {
  return new Promise((resolve, reject) => {
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
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (response.success && response.data.token) {
            console.log('✅ 获取管理员token成功');
            resolve(response.data.token);
          } else {
            reject(new Error('登录失败: ' + response.message));
          }
        } catch (e) {
          reject(new Error('解析登录响应失败'));
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    req.write(postData);
    req.end();
  });
};

// 运行测试
async function runTests() {
  console.log('🧪 开始API测试...\n');

  try {
    // 先获取token
    const token = await getAdminToken();
    console.log('🔑 Token获取成功\n');

    // 更新测试函数中的token
    global.authToken = token;

    await testPointsLogs();
    console.log('');
    await testUsers();
    console.log('\n🎉 API测试完成！');
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

runTests();
