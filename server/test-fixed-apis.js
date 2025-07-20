// 测试修复后的API接口
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3007/api';
const AUTH_TOKEN = 'admin-token';

async function testAPI(endpoint, method = 'GET', data = null) {
  try {
    const options = {
      method,
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json'
      }
    };

    if (data && method !== 'GET') {
      options.body = JSON.stringify(data);
    }

    console.log(`🧪 测试 ${method} ${endpoint}...`);
    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    
    console.log(`📡 响应状态: ${response.status} ${response.statusText}`);
    
    const responseText = await response.text();
    let responseData;
    
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      responseData = responseText;
    }

    if (response.ok) {
      console.log('✅ 测试成功');
      console.log('📊 响应数据:', JSON.stringify(responseData, null, 2));
      return { success: true, data: responseData };
    } else {
      console.log('❌ 测试失败');
      console.log('📄 错误响应:', responseData);
      return { success: false, error: responseData };
    }
  } catch (error) {
    console.error('❌ 请求失败:', error.message);
    return { success: false, error: error.message };
  }
}

async function runTests() {
  console.log('🚀 开始测试修复后的API接口...\n');

  // 1. 测试健康检查
  console.log('=' .repeat(60));
  await testAPI('/health');

  // 2. 测试获取等级卡类型
  console.log('\n' + '='.repeat(60));
  const cardTypesResult = await testAPI('/admin/card-types');
  
  let cardTypeId = null;
  if (cardTypesResult.success && cardTypesResult.data.data?.cardTypes?.length > 0) {
    cardTypeId = cardTypesResult.data.data.cardTypes[0].id;
    console.log(`📋 找到等级卡类型ID: ${cardTypeId}`);
  }

  // 3. 测试生成等级卡（如果有可用的类型ID）
  if (cardTypeId) {
    console.log('\n' + '='.repeat(60));
    await testAPI('/admin/generate-cards', 'POST', {
      cardTypeId: cardTypeId,
      count: 2
    });
  }

  // 4. 测试生成体验卡
  console.log('\n' + '='.repeat(60));
  await testAPI('/admin/generate-experience-cards', 'POST', {
    count: 1
  });

  // 5. 测试获取等级卡列表
  console.log('\n' + '='.repeat(60));
  await testAPI('/admin/cards?page=1&pageSize=5');

  console.log('\n🎉 所有测试完成！');
}

// 运行测试
runTests().catch(error => {
  console.error('❌ 测试运行失败:', error);
});
