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

// 测试配置保存
const testConfigSave = (token) => {
  return new Promise((resolve) => {
    // 模拟配置数据
    const testConfigs = [
      {
        config_key: 'comfyui.server_url',
        config_value: 'https://your-comfyui-server.com',
        config_type: 'string'
      },
      {
        config_key: 'comfyui.timeout',
        config_value: '300000',
        config_type: 'number'
      }
    ];

    const postData = JSON.stringify({
      configs: testConfigs
    });

    const options = {
      hostname: 'localhost',
      port: 3006,
      path: '/api/admin/config',
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
        console.log(`配置保存状态码: ${res.statusCode}`);
        console.log('配置保存原始响应:', data);
        try {
          const response = JSON.parse(data);
          console.log('配置保存解析后响应:', JSON.stringify(response, null, 2));
          resolve({ success: res.statusCode === 200, data: response });
        } catch (e) {
          console.log('配置保存解析失败:', e.message);
          resolve({ success: false, error: '解析失败' });
        }
      });
    });

    req.on('error', (e) => {
      console.log('配置保存请求失败:', e.message);
      resolve({ success: false, error: '请求失败' });
    });

    req.write(postData);
    req.end();
  });
};

// 测试配置加载
const testConfigLoad = (token) => {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 3006,
      path: '/api/admin/config',
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
        console.log(`配置加载状态码: ${res.statusCode}`);
        try {
          const response = JSON.parse(data);
          console.log('配置加载成功，配置分组数量:', Object.keys(response.data).length);
          resolve({ success: res.statusCode === 200, data: response });
        } catch (e) {
          console.log('配置加载解析失败:', e.message);
          resolve({ success: false, error: '解析失败' });
        }
      });
    });

    req.on('error', (e) => {
      console.log('配置加载请求失败:', e.message);
      resolve({ success: false, error: '请求失败' });
    });

    req.end();
  });
};

async function testConfigAPIs() {
  console.log('🧪 测试配置管理API...\n');
  
  try {
    console.log('🔑 获取管理员token...');
    const token = await getAdminToken();
    console.log('✅ Token获取成功\n');
    
    console.log('📥 测试配置加载...');
    const loadResult = await testConfigLoad(token);
    if (loadResult.success) {
      console.log('✅ 配置加载成功');
    } else {
      console.log('❌ 配置加载失败');
    }
    
    console.log('\n💾 测试配置保存...');
    const saveResult = await testConfigSave(token);
    if (saveResult.success) {
      console.log('✅ 配置保存成功');
      if (saveResult.data.data) {
        console.log(`📊 保存了${saveResult.data.data.length}项配置`);
      }
    } else {
      console.log('❌ 配置保存失败');
    }
    
    console.log('\n🎉 配置管理API测试完成！');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

testConfigAPIs();
