const http = require('http');

// HTTP请求辅助函数
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

// 测试管理员登录
async function testAdminLogin() {
  try {
    const options = {
      hostname: 'localhost',
      port: 3007,
      path: '/api/admin-auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const response = await makeRequest(options, {
      username: 'admin',
      password: 'admin123'
    });

    if (response.status === 200 && response.data.success) {
      console.log('✅ 登录成功');
      return response.data.data.token;
    } else {
      console.error('❌ 登录失败:', response.data);
      return null;
    }
  } catch (error) {
    console.error('❌ 登录失败:', error.message);
    return null;
  }
}

// 测试获取卡片类型
async function testGetCardTypes(token) {
  try {
    const options = {
      hostname: 'localhost',
      port: 3007,
      path: '/api/admin/card-types',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };

    const response = await makeRequest(options);

    if (response.status === 200 && response.data.success) {
      console.log('✅ 获取卡片类型成功:', response.data.data.cardTypes.length, '个类型');
      return response.data.data.cardTypes;
    } else {
      console.error('❌ 获取卡片类型失败:', response.data);
      return null;
    }
  } catch (error) {
    console.error('❌ 获取卡片类型失败:', error.message);
    return null;
  }
}

// 测试生成等级卡
async function testGenerateCards(token, cardTypeId) {
  try {
    const options = {
      hostname: 'localhost',
      port: 3007,
      path: '/api/admin/generate-cards',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };

    const response = await makeRequest(options, {
      cardTypeId: cardTypeId,
      count: 2
    });

    if (response.status === 200 && response.data.success) {
      console.log('✅ 生成等级卡成功:', response.data.message);
      console.log('📊 生成的卡片:', response.data.data.cards);
      return true;
    } else {
      console.error('❌ 生成等级卡失败:', response.data);
      return false;
    }
  } catch (error) {
    console.error('❌ 生成等级卡失败:', error.message);
    return false;
  }
}

// 主测试函数
async function runTests() {
  console.log('🚀 开始测试API接口...\n');

  // 1. 测试登录
  console.log('1. 测试管理员登录...');
  const token = await testAdminLogin();
  if (!token) {
    console.log('❌ 无法获取令牌，停止测试');
    return;
  }
  console.log('');

  // 2. 测试获取卡片类型
  console.log('2. 测试获取卡片类型...');
  const cardTypes = await testGetCardTypes(token);
  if (!cardTypes || cardTypes.length === 0) {
    console.log('❌ 无法获取卡片类型，停止测试');
    return;
  }
  console.log('');

  // 3. 测试生成等级卡
  console.log('3. 测试生成等级卡...');
  const firstCardType = cardTypes[0];
  console.log(`使用卡片类型: ${firstCardType.name} (ID: ${firstCardType.id})`);
  const success = await testGenerateCards(token, firstCardType.id);
  console.log('');

  if (success) {
    console.log('🎉 所有测试通过！等级卡生成功能正常工作。');
  } else {
    console.log('❌ 测试失败，需要进一步调试。');
  }
}

// 运行测试
runTests().catch(console.error);
