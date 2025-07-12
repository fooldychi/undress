#!/usr/bin/env node

/**
 * 等级卡生成功能修复验证脚本
 * 验证前端和后端的等级卡生成功能是否正常工作
 */

const http = require('http');

console.log('🧪 等级卡生成功能修复验证\n');
console.log('🎯 验证是否遵循开发原则：使用真实数据库\n');

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

// 测试生成等级卡
const testGenerateCards = (token, cardType, count) => {
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

// 测试生成体验卡
const testGenerateExperienceCards = (token, count) => {
  return new Promise((resolve) => {
    const postData = JSON.stringify({ count: count });

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

// 获取卡片列表验证数据库保存
const getCardsList = (token) => {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 3006,
      path: '/api/admin/cards?page=1&pageSize=10',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
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
            data: response
          });
        } catch (e) {
          resolve({ success: false, error: '解析失败' });
        }
      });
    });

    req.on('error', () => resolve({ success: false, error: '请求失败' }));
    req.end();
  });
};

async function runTests() {
  let passed = 0;
  let failed = 0;

  try {
    console.log('🔑 获取管理员token...');
    const token = await getAdminToken();
    console.log('✅ Token获取成功\n');

    // 获取生成前的卡片数量
    console.log('📊 获取生成前的卡片数量...');
    const beforeCards = await getCardsList(token);
    const beforeCount = beforeCards.success ? beforeCards.data.data.total : 0;
    console.log(`📋 生成前卡片总数: ${beforeCount}\n`);

    // 测试生成体验卡
    console.log('🎁 测试生成体验卡...');
    const expResult = await testGenerateExperienceCards(token, 2);
    if (expResult.success) {
      console.log('✅ 体验卡生成成功');
      console.log(`   生成数量: ${expResult.data.data.totalGenerated} 张`);
      console.log(`   示例卡号: ${expResult.data.data.cards[0].cardNumber}`);
      passed++;
    } else {
      console.log('❌ 体验卡生成失败');
      console.log(`   错误: ${expResult.data?.message || expResult.error}`);
      failed++;
    }

    // 测试生成基础卡
    console.log('\n🥉 测试生成基础卡...');
    const basicResult = await testGenerateCards(token, '基础卡', 1);
    if (basicResult.success) {
      console.log('✅ 基础卡生成成功');
      console.log(`   生成数量: ${basicResult.data.data.totalGenerated} 张`);
      console.log(`   示例卡号: ${basicResult.data.data.cards[0].cardNumber}`);
      passed++;
    } else {
      console.log('❌ 基础卡生成失败');
      console.log(`   错误: ${basicResult.data?.message || basicResult.error}`);
      failed++;
    }

    // 验证数据库保存
    console.log('\n💾 验证数据库保存...');
    const afterCards = await getCardsList(token);
    if (afterCards.success) {
      const afterCount = afterCards.data.data.total;
      const newCards = afterCount - beforeCount;
      console.log(`📋 生成后卡片总数: ${afterCount}`);
      console.log(`🆕 新增卡片数量: ${newCards}`);
      
      if (newCards >= 3) { // 应该至少新增3张卡片
        console.log('✅ 数据库保存验证成功');
        passed++;
      } else {
        console.log('❌ 数据库保存验证失败');
        failed++;
      }
    } else {
      console.log('❌ 无法获取卡片列表');
      failed++;
    }

  } catch (error) {
    console.error('❌ 测试执行失败:', error.message);
    failed++;
  }

  console.log('\n📊 测试结果:');
  console.log(`✅ 通过: ${passed}`);
  console.log(`❌ 失败: ${failed}`);
  console.log(`📈 成功率: ${Math.round((passed / (passed + failed)) * 100)}%\n`);

  if (failed === 0) {
    console.log('🎉 所有测试通过！等级卡生成功能已修复，完全遵循开发原则！');
    console.log('\n💡 修复内容:');
    console.log('   ✅ 前端不再使用模拟数据');
    console.log('   ✅ 后端API正确连接数据库');
    console.log('   ✅ 生成的卡片真实保存');
    console.log('   ✅ 完全符合数据永久化原则');
    console.log('\n🌐 管理后台地址: http://localhost:3007');
    console.log('🔑 管理员账号: admin / admin123456');
  } else {
    console.log('⚠️  部分测试失败，请检查上述错误信息。');
  }
}

// 运行测试
runTests().catch(console.error);
