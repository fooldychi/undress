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

// 测试真实配置保存
const testRealConfigSave = (token) => {
  return new Promise((resolve) => {
    // 测试修改ComfyUI超时时间
    const testConfigs = [
      {
        config_key: 'comfyui.timeout',
        config_value: '350000',  // 修改为350秒
        config_type: 'number'
      },
      {
        config_key: 'ai.text_to_image_points',
        config_value: '25',  // 修改为25积分
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
        console.log(`真实保存状态码: ${res.statusCode}`);
        console.log('真实保存原始响应:', data);
        try {
          const response = JSON.parse(data);
          console.log('真实保存解析后响应:', JSON.stringify(response, null, 2));
          resolve({ success: res.statusCode === 200, data: response });
        } catch (e) {
          console.log('真实保存解析失败:', e.message);
          resolve({ success: false, error: '解析失败' });
        }
      });
    });

    req.on('error', (e) => {
      console.log('真实保存请求失败:', e.message);
      resolve({ success: false, error: '请求失败' });
    });

    req.write(postData);
    req.end();
  });
};

// 验证数据库中的配置是否真的更新了
const verifyDatabaseUpdate = async () => {
  require('dotenv').config({ path: './server/.env' });
  const mysql = require('mysql2/promise');

  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      charset: 'utf8mb4'
    });

    console.log('\n🔍 验证数据库中的配置更新...');

    // 查询刚才修改的配置
    const [configs] = await connection.execute(`
      SELECT config_key, config_value, updated_at
      FROM system_config
      WHERE config_key IN ('comfyui.timeout', 'ai.text_to_image_points')
      ORDER BY config_key
    `);

    console.log('📊 数据库中的配置值:');
    configs.forEach(config => {
      console.log(`   ${config.config_key}: ${config.config_value} (更新时间: ${config.updated_at})`);
    });

    await connection.end();

    return configs;

  } catch (error) {
    console.error('❌ 验证数据库失败:', error.message);
    return [];
  }
};

async function testRealConfigSaveAndVerify() {
  console.log('🧪 测试真实的配置保存和数据库更新...\n');
  
  try {
    console.log('🔑 获取管理员token...');
    const token = await getAdminToken();
    console.log('✅ Token获取成功\n');
    
    console.log('💾 测试真实配置保存...');
    const saveResult = await testRealConfigSave(token);
    if (saveResult.success) {
      console.log('✅ 配置保存API调用成功');
      if (saveResult.data.data && saveResult.data.data.summary) {
        const summary = saveResult.data.data.summary;
        console.log(`📊 保存结果: ${summary.success}项成功, ${summary.error}项失败`);
      }
    } else {
      console.log('❌ 配置保存API调用失败');
      return;
    }
    
    console.log('\n⏳ 等待2秒后验证数据库...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const dbConfigs = await verifyDatabaseUpdate();
    
    if (dbConfigs.length > 0) {
      console.log('\n🎉 数据库配置验证完成！');
      
      // 检查是否真的更新了
      const timeoutConfig = dbConfigs.find(c => c.config_key === 'comfyui.timeout');
      const pointsConfig = dbConfigs.find(c => c.config_key === 'ai.text_to_image_points');
      
      if (timeoutConfig && timeoutConfig.config_value === '350000') {
        console.log('✅ ComfyUI超时时间已成功更新为350000');
      } else {
        console.log('❌ ComfyUI超时时间更新失败');
      }
      
      if (pointsConfig && pointsConfig.config_value === '25') {
        console.log('✅ 文生图积分已成功更新为25');
      } else {
        console.log('❌ 文生图积分更新失败');
      }
    } else {
      console.log('❌ 无法验证数据库更新');
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

testRealConfigSaveAndVerify();
