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
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (response.success && response.data.token) {
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

// 测试API接口
const testAPI = (path, token, name) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3006,
      path: path,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
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
          if (res.statusCode === 200 && response.success) {
            console.log(`✅ ${name}: 成功获取真实数据`);
            
            // 显示数据摘要
            if (response.data.items) {
              console.log(`   📊 记录数: ${response.data.items.length}/${response.data.total}`);
            } else if (response.data.users) {
              console.log(`   👥 用户统计: ${response.data.users.total_users} 总用户`);
            } else if (response.data.cards) {
              console.log(`   🎫 卡片统计: ${response.data.cards.total_cards} 总卡片`);
            }
            
            resolve(true);
          } else {
            console.log(`❌ ${name}: 失败 (${res.statusCode}) - ${response.message || '未知错误'}`);
            resolve(false);
          }
        } catch (e) {
          console.log(`❌ ${name}: 响应解析失败`);
          resolve(false);
        }
      });
    });

    req.on('error', (e) => {
      console.log(`❌ ${name}: 连接失败 - ${e.message}`);
      resolve(false);
    });

    req.end();
  });
};

// 运行测试
async function runRealDataTests() {
  console.log('🔍 测试真实数据库API接口...\n');
  
  try {
    // 获取token
    console.log('🔑 获取管理员token...');
    const token = await getAdminToken();
    console.log('✅ Token获取成功\n');
    
    // 测试各个接口
    const tests = [
      { path: '/api/admin/stats', name: '系统统计' },
      { path: '/api/admin/users?page=1&pageSize=10', name: '用户列表' },
      { path: '/api/admin/cards?page=1&pageSize=10', name: '等级卡列表' },
      { path: '/api/admin/points?page=1&pageSize=10', name: '积分记录' },
      { path: '/api/admin/config', name: '系统配置' }
    ];
    
    let passed = 0;
    for (const test of tests) {
      const result = await testAPI(test.path, token, test.name);
      if (result) passed++;
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('\n📊 测试结果:');
    console.log(`✅ 通过: ${passed}/${tests.length}`);
    console.log(`❌ 失败: ${tests.length - passed}/${tests.length}`);
    
    if (passed === tests.length) {
      console.log('\n🎉 所有API接口都正常返回真实数据库数据！');
      console.log('💡 现在可以在管理后台看到真实的数据了。');
    } else {
      console.log('\n⚠️  部分API接口有问题，请检查后端服务器。');
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

runRealDataTests();
