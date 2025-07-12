const http = require('http');

// 测试公开配置接口
const testPublicConfig = () => {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 3006,
      path: '/api/config',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        console.log(`公开配置API状态码: ${res.statusCode}`);
        console.log('公开配置API原始响应:', data);
        try {
          const response = JSON.parse(data);
          console.log('公开配置API解析后响应:', JSON.stringify(response, null, 2));
          resolve({ success: res.statusCode === 200, data: response });
        } catch (e) {
          console.log('公开配置API解析失败:', e.message);
          resolve({ success: false, error: '解析失败' });
        }
      });
    });

    req.on('error', (e) => {
      console.log('公开配置API请求失败:', e.message);
      resolve({ success: false, error: '请求失败' });
    });

    req.end();
  });
};

// 测试特定配置项
const testSpecificConfig = (key) => {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 3006,
      path: `/api/config/comfyui`,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        console.log(`ComfyUI配置分组状态码: ${res.statusCode}`);
        console.log('ComfyUI配置分组响应:', data);
        try {
          const response = JSON.parse(data);
          console.log('ComfyUI配置分组解析后:', JSON.stringify(response, null, 2));
          resolve({ success: res.statusCode === 200, data: response });
        } catch (e) {
          console.log('ComfyUI配置分组解析失败:', e.message);
          resolve({ success: false, error: '解析失败' });
        }
      });
    });

    req.on('error', (e) => {
      console.log('ComfyUI配置分组请求失败:', e.message);
      resolve({ success: false, error: '请求失败' });
    });

    req.end();
  });
};

async function testPublicConfigAPIs() {
  console.log('🧪 测试客户端公开配置API...\n');
  
  try {
    console.log('📥 测试获取所有公开配置...');
    const allConfigResult = await testPublicConfig();
    if (allConfigResult.success) {
      console.log('✅ 公开配置API正常');
      if (allConfigResult.data.data) {
        const config = allConfigResult.data.data;
        console.log(`📊 配置项数量: ${Object.keys(config).length}`);
        console.log(`🌐 ComfyUI服务器: ${config['comfyui.server_url']}`);
        console.log(`🔑 客户端ID: ${config['comfyui.client_id']}`);
        console.log(`⏱️ 超时时间: ${config['comfyui.timeout']}ms`);
        console.log(`💰 文生图积分: ${config['ai.text_to_image_points']}`);
      }
    } else {
      console.log('❌ 公开配置API失败');
    }
    
    console.log('\n📋 测试ComfyUI配置分组...');
    const comfyuiResult = await testSpecificConfig('comfyui');
    if (comfyuiResult.success) {
      console.log('✅ ComfyUI配置分组API正常');
      if (comfyuiResult.data.data) {
        const configs = comfyuiResult.data.data;
        console.log(`📊 ComfyUI配置项数量: ${Object.keys(configs).length}`);
        Object.keys(configs).forEach(key => {
          const config = configs[key];
          console.log(`   ${key}: ${config.value} (${config.description})`);
        });
      }
    } else {
      console.log('❌ ComfyUI配置分组API失败');
    }
    
    console.log('\n🎉 公开配置API测试完成！');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

testPublicConfigAPIs();
