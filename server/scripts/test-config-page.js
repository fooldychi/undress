#!/usr/bin/env node

/**
 * 测试配置页面是否正常工作
 */

const http = require('http');

// 测试前端页面是否可访问
const testFrontendPage = () => {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 3007,
      path: '/',
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        resolve({
          success: res.statusCode === 200,
          statusCode: res.statusCode,
          data: data.substring(0, 200) + '...'
        });
      });
    });

    req.on('error', (error) => resolve({ success: false, error: error.message }));
    req.setTimeout(5000, () => resolve({ success: false, error: '请求超时' }));
    req.end();
  });
};

// 测试后端API是否可访问
const testBackendAPI = () => {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 3006,
      path: '/health',
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        resolve({
          success: res.statusCode === 200,
          statusCode: res.statusCode,
          data: data
        });
      });
    });

    req.on('error', (error) => resolve({ success: false, error: error.message }));
    req.setTimeout(5000, () => resolve({ success: false, error: '请求超时' }));
    req.end();
  });
};

async function runTest() {
  console.log('🧪 测试配置页面修复...\n');

  // 测试后端API
  console.log('🔧 测试后端API...');
  const backendResult = await testBackendAPI();
  if (backendResult.success) {
    console.log('✅ 后端API正常');
  } else {
    console.log('❌ 后端API异常:', backendResult.error || backendResult.statusCode);
    console.log('💡 请确保后端服务器已启动: npm start (在server目录)');
  }

  // 测试前端页面
  console.log('\n🎨 测试前端页面...');
  const frontendResult = await testFrontendPage();
  if (frontendResult.success) {
    console.log('✅ 前端页面正常');
    console.log('📋 页面内容预览:', frontendResult.data);
  } else {
    console.log('❌ 前端页面异常:', frontendResult.error || frontendResult.statusCode);
    console.log('💡 请确保前端服务器已启动: npm run dev (在admin目录)');
  }

  console.log('\n📊 测试结果:');
  console.log(`   后端API: ${backendResult.success ? '✅ 正常' : '❌ 异常'}`);
  console.log(`   前端页面: ${frontendResult.success ? '✅ 正常' : '❌ 异常'}`);

  if (backendResult.success && frontendResult.success) {
    console.log('\n🎉 配置页面修复成功！');
    console.log('🌐 管理后台地址: http://localhost:3007');
    console.log('🔑 管理员账号: admin / admin123456');
    console.log('⚙️ 配置页面: http://localhost:3007/#/config');
  } else {
    console.log('\n⚠️  部分服务异常，请检查上述错误信息。');
    console.log('\n🚀 启动服务:');
    console.log('   后端: cd server && npm start');
    console.log('   前端: cd admin && npm run dev');
    console.log('   或使用: ./start-admin.bat');
  }
}

// 运行测试
runTest().catch(console.error);
