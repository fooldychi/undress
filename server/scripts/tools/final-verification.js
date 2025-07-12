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

// 测试API接口
const testAPI = (path, token, name) => {
  return new Promise((resolve) => {
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
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (res.statusCode === 200 && response.success) {
            console.log(`✅ ${name}: 正常`);
            
            // 显示数据摘要
            if (response.data.items) {
              console.log(`   📊 数据: ${response.data.items.length}/${response.data.total} 条记录`);
              
              // 验证数据格式
              if (response.data.items.length > 0) {
                const firstItem = response.data.items[0];
                if (name.includes('用户') && firstItem.username) {
                  console.log(`   👤 示例用户: ${firstItem.username}`);
                } else if (name.includes('等级卡') && firstItem.card_number) {
                  console.log(`   🎫 示例卡片: ${firstItem.card_number} (${firstItem.type_name})`);
                } else if (name.includes('积分') && firstItem.action_type) {
                  console.log(`   💰 示例记录: ${firstItem.username} - ${firstItem.description}`);
                }
              }
            } else if (response.data.users) {
              console.log(`   👥 用户统计: ${response.data.users.total_users} 总用户`);
            } else if (response.data.cards) {
              console.log(`   🎫 卡片统计: ${response.data.cards.total_cards} 总卡片`);
            }
            
            resolve(true);
          } else {
            console.log(`❌ ${name}: 失败 (${res.statusCode})`);
            resolve(false);
          }
        } catch (e) {
          console.log(`❌ ${name}: 响应解析失败`);
          resolve(false);
        }
      });
    });

    req.on('error', (e) => {
      console.log(`❌ ${name}: 连接失败`);
      resolve(false);
    });

    req.end();
  });
};

async function runFinalVerification() {
  console.log('🔍 最终验证：等级卡和积分管理功能...\n');
  
  try {
    console.log('🔑 获取管理员token...');
    const token = await getAdminToken();
    console.log('✅ Token获取成功\n');
    
    // 测试所有关键接口
    const tests = [
      { path: '/api/admin/stats', name: '📊 系统统计' },
      { path: '/api/admin/users?page=1&pageSize=5', name: '👥 用户列表' },
      { path: '/api/admin/cards?page=1&pageSize=5', name: '🎫 等级卡列表' },
      { path: '/api/admin/points?page=1&pageSize=5', name: '💰 积分记录' },
      { path: '/api/admin/config', name: '⚙️ 系统配置' }
    ];
    
    let passed = 0;
    for (const test of tests) {
      const result = await testAPI(test.path, token, test.name);
      if (result) passed++;
      console.log(''); // 空行分隔
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('📋 验证结果:');
    console.log(`✅ 通过: ${passed}/${tests.length}`);
    console.log(`❌ 失败: ${tests.length - passed}/${tests.length}`);
    
    if (passed === tests.length) {
      console.log('\n🎉 所有功能验证通过！');
      console.log('💡 管理后台现在可以正常使用：');
      console.log('   - 等级卡管理：查看、解绑等级卡');
      console.log('   - 积分记录：查看用户积分消费记录');
      console.log('   - 用户管理：管理用户状态');
      console.log('   - 数据统计：查看系统统计信息');
      console.log('\n🌐 访问地址: http://localhost:3007');
      console.log('🔑 管理员账号: admin / admin123456');
    } else {
      console.log('\n⚠️  部分功能有问题，请检查后端服务器。');
    }
    
  } catch (error) {
    console.error('❌ 验证失败:', error.message);
  }
}

runFinalVerification();
