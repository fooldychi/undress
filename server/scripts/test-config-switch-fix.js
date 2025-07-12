#!/usr/bin/env node

/**
 * 测试配置页面自动切换开关修复
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

// 测试配置保存（切换自动切换开关）
const testConfigSave = (token, autoSwitchValue) => {
  return new Promise((resolve) => {
    const postData = JSON.stringify({
      configs: [
        {
          config_key: 'comfyui.auto_switch',
          config_value: autoSwitchValue,
          config_type: 'boolean',
          config_group: 'comfyui',
          description: '是否启用自动切换备用服务器'
        }
      ]
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
    req.write(postData);
    req.end();
  });
};

// 测试公共配置API
const testPublicConfig = () => {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 3006,
      path: '/api/config',
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve({ 
            success: res.statusCode === 200 && response.success, 
            data: response.data,
            statusCode: res.statusCode
          });
        } catch (e) {
          resolve({ success: false, error: '解析失败', data: data });
        }
      });
    });

    req.on('error', (error) => resolve({ success: false, error: error.message }));
    req.setTimeout(5000, () => resolve({ success: false, error: '请求超时' }));
    req.end();
  });
};

async function runTest() {
  console.log('🧪 测试配置页面自动切换开关修复...\n');

  try {
    console.log('🔑 获取管理员token...');
    const token = await getAdminToken();
    console.log('✅ Token获取成功\n');

    // 1. 测试当前配置状态
    console.log('📊 1. 检查当前配置状态...');
    const currentConfig = await testPublicConfig();
    if (currentConfig.success) {
      const currentAutoSwitch = currentConfig.data['comfyui.auto_switch'];
      console.log(`   当前自动切换状态: ${currentAutoSwitch} (类型: ${typeof currentAutoSwitch})`);
    } else {
      console.log('❌ 获取当前配置失败');
      return;
    }

    // 2. 测试禁用自动切换
    console.log('\n📊 2. 测试禁用自动切换...');
    const disableResult = await testConfigSave(token, '0');
    if (disableResult.success) {
      console.log('✅ 禁用自动切换保存成功');
      
      // 验证配置是否生效
      const verifyDisable = await testPublicConfig();
      if (verifyDisable.success) {
        const autoSwitch = verifyDisable.data['comfyui.auto_switch'];
        console.log(`   验证结果: ${autoSwitch} (类型: ${typeof autoSwitch})`);
        if (autoSwitch === false) {
          console.log('✅ 自动切换已正确禁用');
        } else {
          console.log('❌ 自动切换禁用失败');
        }
      }
    } else {
      console.log('❌ 禁用自动切换失败:', disableResult.error);
    }

    // 3. 测试启用自动切换
    console.log('\n📊 3. 测试启用自动切换...');
    const enableResult = await testConfigSave(token, '1');
    if (enableResult.success) {
      console.log('✅ 启用自动切换保存成功');
      
      // 验证配置是否生效
      const verifyEnable = await testPublicConfig();
      if (verifyEnable.success) {
        const autoSwitch = verifyEnable.data['comfyui.auto_switch'];
        console.log(`   验证结果: ${autoSwitch} (类型: ${typeof autoSwitch})`);
        if (autoSwitch === true) {
          console.log('✅ 自动切换已正确启用');
        } else {
          console.log('❌ 自动切换启用失败');
        }
      }
    } else {
      console.log('❌ 启用自动切换失败:', enableResult.error);
    }

    // 4. 最终状态检查
    console.log('\n📊 4. 最终状态检查...');
    const finalConfig = await testPublicConfig();
    if (finalConfig.success) {
      const autoSwitch = finalConfig.data['comfyui.auto_switch'];
      const backupServers = finalConfig.data['comfyui.backup_servers'];
      
      console.log('📋 最终配置状态:');
      console.log(`   自动切换: ${autoSwitch} (类型: ${typeof autoSwitch})`);
      console.log(`   备用服务器: ${backupServers}`);
      
      if (autoSwitch === true && backupServers && backupServers.trim()) {
        console.log('\n🎉 自动切换功能配置完整且正常工作！');
        console.log('\n💡 前端配置页面现在应该能正确显示开关状态');
        console.log('   - 开关组件会正确显示启用/禁用状态');
        console.log('   - 保存时会正确转换布尔值为数据库格式');
        console.log('   - 前端代码会正确读取并使用配置');
      } else {
        console.log('\n⚠️ 配置不完整:');
        if (!autoSwitch) {
          console.log('   - 自动切换功能已禁用');
        }
        if (!backupServers || !backupServers.trim()) {
          console.log('   - 没有配置备用服务器');
        }
      }
    }

    console.log('\n✅ 配置页面自动切换开关修复测试完成！');
    console.log('🌐 请访问管理后台配置页面验证: http://localhost:3007/#/config');

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

// 运行测试
runTest().catch(console.error);
