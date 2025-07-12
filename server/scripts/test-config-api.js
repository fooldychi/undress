#!/usr/bin/env node

/**
 * 测试配置API是否正常工作
 */

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

// 测试配置API
const testConfigAPI = (token) => {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 3006,
      path: '/api/admin/config',
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
            data: response,
            statusCode: res.statusCode
          });
        } catch (e) {
          resolve({ success: false, error: '解析失败', data: data });
        }
      });
    });

    req.on('error', (error) => resolve({ success: false, error: error.message }));
    req.end();
  });
};

async function runTest() {
  console.log('🧪 测试配置API...\n');

  try {
    console.log('🔑 获取管理员token...');
    const token = await getAdminToken();
    console.log('✅ Token获取成功\n');

    console.log('📊 测试配置API...');
    const result = await testConfigAPI(token);
    
    if (result.success) {
      console.log('✅ 配置API测试成功');
      console.log('📋 配置分组:');
      
      if (result.data.data) {
        Object.keys(result.data.data).forEach(group => {
          const configs = result.data.data[group];
          console.log(`   ${group}: ${configs.length} 项`);
          
          // 显示每个配置项
          configs.forEach(config => {
            const value = config.config_key.includes('password') || config.config_key.includes('secret') 
              ? '***' 
              : config.config_value;
            console.log(`      ${config.config_key}: ${value}`);
          });
        });
      }
    } else {
      console.log('❌ 配置API测试失败');
      console.log(`   状态码: ${result.statusCode}`);
      console.log(`   错误: ${result.error || '未知错误'}`);
      if (result.data) {
        console.log(`   响应数据: ${JSON.stringify(result.data, null, 2)}`);
      }
    }

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

// 运行测试
runTest().catch(console.error);
