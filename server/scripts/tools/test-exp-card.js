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

// 测试生成体验卡
const testGenerateExperienceCard = (token) => {
  return new Promise((resolve) => {
    const postData = JSON.stringify({
      count: 1
    });

    const options = {
      hostname: 'localhost',
      port: 3006,
      path: '/api/admin/generate-experience-cards',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        console.log(`状态码: ${res.statusCode}`);
        console.log('原始响应:', data);
        try {
          const response = JSON.parse(data);
          console.log('解析后响应:', JSON.stringify(response, null, 2));
          resolve({ success: res.statusCode === 200, data: response });
        } catch (e) {
          console.log('解析失败:', e.message);
          resolve({ success: false, error: '解析失败' });
        }
      });
    });

    req.on('error', (e) => {
      console.log('请求失败:', e.message);
      resolve({ success: false, error: '请求失败' });
    });

    req.write(postData);
    req.end();
  });
};

async function testExpCard() {
  console.log('🧪 测试体验卡生成...\n');
  
  try {
    console.log('🔑 获取管理员token...');
    const token = await getAdminToken();
    console.log('✅ Token获取成功\n');
    
    console.log('🎁 测试生成体验卡...');
    const result = await testGenerateExperienceCard(token);
    
    if (result.success) {
      console.log('✅ 体验卡生成成功');
      if (result.data.data && result.data.data.cards) {
        const card = result.data.data.cards[0];
        console.log(`🎫 生成的卡片: ${card.cardNumber} - ${card.cardPassword}`);
      }
    } else {
      console.log('❌ 体验卡生成失败');
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

testExpCard();
