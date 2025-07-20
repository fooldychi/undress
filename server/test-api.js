// 直接测试API接口
const fetch = require('node-fetch');

async function testCardTypesAPI() {
  try {
    console.log('🧪 测试 /admin/card-types 接口...');
    
    const response = await fetch('http://localhost:3007/api/admin/card-types', {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer admin-token',
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📡 响应状态:', response.status, response.statusText);
    
    const data = await response.text();
    console.log('📄 响应内容:', data);
    
    if (response.ok) {
      const jsonData = JSON.parse(data);
      console.log('✅ 接口测试成功');
      console.log('📊 返回数据:', JSON.stringify(jsonData, null, 2));
    } else {
      console.log('❌ 接口测试失败');
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

async function testHealthAPI() {
  try {
    console.log('🧪 测试健康检查接口...');
    
    const response = await fetch('http://localhost:3007/api/health', {
      method: 'GET'
    });
    
    console.log('📡 健康检查响应状态:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ 健康检查成功:', data);
    } else {
      console.log('❌ 健康检查失败');
    }
    
  } catch (error) {
    console.error('❌ 健康检查失败:', error.message);
  }
}

// 运行测试
async function runTests() {
  console.log('🚀 开始API测试...\n');
  
  await testHealthAPI();
  console.log('\n' + '='.repeat(50) + '\n');
  await testCardTypesAPI();
  
  console.log('\n🎉 测试完成');
}

runTests();
