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

// 测试生成各种类型的等级卡
const testGenerateCardType = (token, cardType, count) => {
  return new Promise((resolve) => {
    const postData = JSON.stringify({
      cardType: cardType,
      count: count
    });

    const options = {
      hostname: 'localhost',
      port: 3006,
      path: '/api/admin/generate-cards',
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
        try {
          const response = JSON.parse(data);
          resolve({ 
            success: res.statusCode === 200 && response.success, 
            data: response,
            statusCode: res.statusCode
          });
        } catch (e) {
          resolve({ success: false, error: '解析失败' });
        }
      });
    });

    req.on('error', () => resolve({ success: false, error: '请求失败' }));
    req.write(postData);
    req.end();
  });
};

async function verifyCardGeneration() {
  console.log('🔍 验证等级卡生成功能...\n');
  
  try {
    console.log('🔑 获取管理员token...');
    const token = await getAdminToken();
    console.log('✅ Token获取成功\n');
    
    // 测试所有卡片类型
    const cardTypes = [
      { name: '体验卡', icon: '🎁', points: 20 },
      { name: '基础卡', icon: '🥉', points: 300 },
      { name: '高级卡', icon: '🥈', points: 1000 },
      { name: '至尊卡', icon: '🥇', points: 2000 }
    ];
    
    console.log('📋 测试各种卡片类型生成...\n');
    
    let totalSuccess = 0;
    let totalGenerated = 0;
    
    for (const cardType of cardTypes) {
      console.log(`${cardType.icon} 测试生成 ${cardType.name} (1张)...`);
      
      const result = await testGenerateCardType(token, cardType.name, 1);
      
      if (result.success) {
        console.log(`✅ ${cardType.name} 生成成功`);
        if (result.data.data && result.data.data.cards) {
          const cards = result.data.data.cards;
          console.log(`   📊 生成数量: ${cards.length} 张`);
          console.log(`   🎫 示例卡片: ${cards[0].cardNumber} - ${cards[0].cardPassword}`);
          console.log(`   💰 积分: ${cards[0].points}`);
          totalGenerated += cards.length;
        }
        totalSuccess++;
      } else {
        console.log(`❌ ${cardType.name} 生成失败`);
        if (result.data && result.data.message) {
          console.log(`   错误: ${result.data.message}`);
        }
      }
      
      console.log(''); // 空行分隔
      await new Promise(resolve => setTimeout(resolve, 1000)); // 延迟1秒
    }
    
    console.log('📊 验证结果:');
    console.log(`✅ 成功类型: ${totalSuccess}/${cardTypes.length}`);
    console.log(`🎫 总生成卡片: ${totalGenerated} 张`);
    
    if (totalSuccess === cardTypes.length) {
      console.log('\n🎉 所有卡片类型生成功能正常！');
      console.log('💡 前端管理后台现在可以：');
      console.log('   - 生成体验卡 (20积分)');
      console.log('   - 生成基础卡 (300积分)');
      console.log('   - 生成高级卡 (1000积分)');
      console.log('   - 生成至尊卡 (2000积分)');
      console.log('   - 批量复制生成的卡片信息');
      console.log('\n🌐 访问地址: http://localhost:3007');
      console.log('🔑 管理员账号: admin / admin123456');
      console.log('📍 功能位置: 等级卡管理 → 生成等级卡/生成体验卡');
    } else {
      console.log('\n⚠️  部分卡片类型生成有问题，请检查后端配置。');
    }
    
  } catch (error) {
    console.error('❌ 验证失败:', error.message);
  }
}

verifyCardGeneration();
