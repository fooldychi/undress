const http = require('http');

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
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (response.success && response.data.token) {
            resolve(response.data.token);
          } else {
            reject(new Error('登录失败'));
          }
        } catch (e) {
          reject(new Error('解析响应失败'));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
};

// 测试等级卡API
const testCardsAPI = (token) => {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 3006,
      path: '/api/admin/cards?page=1&pageSize=10',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          console.log(`状态码: ${res.statusCode}`);
          console.log('响应数据:', JSON.stringify(response, null, 2));
          resolve({ success: res.statusCode === 200, data: response });
        } catch (e) {
          console.log('解析失败:', e.message);
          console.log('原始响应:', data);
          resolve({ success: false, error: '解析失败' });
        }
      });
    });

    req.on('error', (e) => {
      console.log('请求失败:', e.message);
      resolve({ success: false, error: '请求失败' });
    });

    req.end();
  });
};

// 测试积分记录API
const testPointsAPI = (token) => {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 3006,
      path: '/api/admin/points?page=1&pageSize=10',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          console.log(`状态码: ${res.statusCode}`);
          console.log('响应数据:', JSON.stringify(response, null, 2));
          resolve({ success: res.statusCode === 200, data: response });
        } catch (e) {
          console.log('解析失败:', e.message);
          console.log('原始响应:', data);
          resolve({ success: false, error: '解析失败' });
        }
      });
    });

    req.on('error', (e) => {
      console.log('请求失败:', e.message);
      resolve({ success: false, error: '请求失败' });
    });

    req.end();
  });
};

async function runTests() {
  console.log('🧪 测试等级卡和积分记录API...\n');
  
  try {
    console.log('🔑 获取管理员token...');
    const token = await getAdminToken();
    console.log('✅ Token获取成功\n');
    
    console.log('🎫 测试等级卡API...');
    const cardsResult = await testCardsAPI(token);
    if (cardsResult.success) {
      console.log('✅ 等级卡API正常');
    } else {
      console.log('❌ 等级卡API失败');
    }
    
    console.log('\n💰 测试积分记录API...');
    const pointsResult = await testPointsAPI(token);
    if (pointsResult.success) {
      console.log('✅ 积分记录API正常');
    } else {
      console.log('❌ 积分记录API失败');
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

runTests();
