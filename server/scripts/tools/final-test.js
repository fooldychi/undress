const http = require('http');

// 测试所有关键API接口
const tests = [
  {
    name: '管理员登录',
    method: 'POST',
    path: '/api/admin-auth/login',
    data: { username: 'admin', password: 'admin123456' }
  },
  {
    name: '统计数据',
    method: 'GET',
    path: '/api/admin/stats'
  },
  {
    name: '用户列表',
    method: 'GET',
    path: '/api/admin/users?page=1&pageSize=20'
  },
  {
    name: '等级卡列表',
    method: 'GET',
    path: '/api/admin/cards?page=1&pageSize=20'
  },
  {
    name: '积分记录',
    method: 'GET',
    path: '/api/admin/points?page=1&pageSize=20'
  }
];

async function runTest(test) {
  return new Promise((resolve, reject) => {
    const postData = test.data ? JSON.stringify(test.data) : null;
    
    const options = {
      hostname: 'localhost',
      port: 3006,
      path: test.path,
      method: test.method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (postData) {
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (res.statusCode === 200 && response.success) {
            console.log(`✅ ${test.name}: 通过`);
            resolve(true);
          } else {
            console.log(`❌ ${test.name}: 失败 (${res.statusCode})`);
            resolve(false);
          }
        } catch (e) {
          console.log(`❌ ${test.name}: 响应解析失败`);
          resolve(false);
        }
      });
    });

    req.on('error', (e) => {
      console.log(`❌ ${test.name}: 连接失败 - ${e.message}`);
      resolve(false);
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function runAllTests() {
  console.log('🧪 开始API接口验证测试...\n');
  
  let passed = 0;
  let total = tests.length;
  
  for (const test of tests) {
    const result = await runTest(test);
    if (result) passed++;
    await new Promise(resolve => setTimeout(resolve, 500)); // 延迟500ms
  }
  
  console.log('\n📊 测试结果:');
  console.log(`✅ 通过: ${passed}/${total}`);
  console.log(`❌ 失败: ${total - passed}/${total}`);
  
  if (passed === total) {
    console.log('\n🎉 所有API接口测试通过！管理后台可以正常使用。');
  } else {
    console.log('\n⚠️  部分API接口测试失败，请检查服务器状态。');
  }
}

runAllTests();
