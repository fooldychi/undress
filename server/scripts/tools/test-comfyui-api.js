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

// 测试ComfyUI连接
const testComfyUIConnection = (token) => {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 3006,
      path: '/api/admin/test-comfyui',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        console.log(`状态码: ${res.statusCode}`);
        console.log('原始响应:', data);
        try {
          const response = JSON.parse(data);
          console.log('解析后响应:', JSON.stringify(response, null, 2));
          resolve({ success: res.statusCode === 200, data: response });
        } catch (e) {
          console.log('解析失败:', e.message);
          resolve({ success: false, error: '解析失败' });
        }
      });
    });

    req.on('error', (e) => {
      console.log('请求失败:', e.message);
      resolve({ success: false, error: '请求失败' });
    });

    req.end();
  });
};

// 测试系统配置接口
const testConfigAPI = (token) => {
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
        console.log(`配置API状态码: ${res.statusCode}`);
        try {
          const response = JSON.parse(data);
          console.log('配置API响应:', JSON.stringify(response, null, 2));
          resolve({ success: res.statusCode === 200, data: response });
        } catch (e) {
          console.log('配置API解析失败:', e.message);
          resolve({ success: false, error: '解析失败' });
        }
      });
    });

    req.on('error', (e) => {
      console.log('配置API请求失败:', e.message);
      resolve({ success: false, error: '请求失败' });
    });

    req.end();
  });
};

async function testComfyUIAPIs() {
  console.log('🧪 测试ComfyUI相关API...\n');
  
  try {
    console.log('🔑 获取管理员token...');
    const token = await getAdminToken();
    console.log('✅ Token获取成功\n');
    
    console.log('⚙️ 测试系统配置API...');
    const configResult = await testConfigAPI(token);
    if (configResult.success) {
      console.log('✅ 系统配置API正常');
      if (configResult.data.data && configResult.data.data.comfyui) {
        console.log(`📋 ComfyUI配置项数量: ${configResult.data.data.comfyui.length}`);
      }
    } else {
      console.log('❌ 系统配置API失败');
    }
    
    console.log('\n🎯 测试ComfyUI连接...');
    const comfyuiResult = await testComfyUIConnection(token);
    if (comfyuiResult.success) {
      console.log('✅ ComfyUI连接测试成功');
      if (comfyuiResult.data.data && comfyuiResult.data.data.serverUrl) {
        console.log(`🌐 服务器地址: ${comfyuiResult.data.data.serverUrl}`);
      }
    } else {
      console.log('❌ ComfyUI连接测试失败');
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

testComfyUIAPIs();
