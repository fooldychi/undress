#!/usr/bin/env node

/**
 * 测试禁用自动切换后是否仍然会切换服务器
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

// 禁用自动切换
const disableAutoSwitch = (token) => {
  return new Promise((resolve) => {
    const postData = JSON.stringify({
      configs: [
        {
          config_key: 'comfyui.auto_switch',
          config_value: '0',
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
            data: response
          });
        } catch (e) {
          resolve({ success: false, error: '解析失败' });
        }
      });
    });

    req.on('error', (error) => resolve({ success: false, error: error.message }));
    req.write(postData);
    req.end();
  });
};

// 启用自动切换
const enableAutoSwitch = (token) => {
  return new Promise((resolve) => {
    const postData = JSON.stringify({
      configs: [
        {
          config_key: 'comfyui.auto_switch',
          config_value: '1',
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
            data: response
          });
        } catch (e) {
          resolve({ success: false, error: '解析失败' });
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
            data: response.data
          });
        } catch (e) {
          resolve({ success: false, error: '解析失败' });
        }
      });
    });

    req.on('error', (error) => resolve({ success: false, error: error.message }));
    req.setTimeout(5000, () => resolve({ success: false, error: '请求超时' }));
    req.end();
  });
};

async function testAutoSwitchDisable() {
  console.log('🧪 测试禁用自动切换后是否仍然会切换服务器...\n');

  try {
    console.log('🔑 获取管理员token...');
    const token = await getAdminToken();
    console.log('✅ Token获取成功\n');

    // 1. 先启用自动切换，确保初始状态
    console.log('📊 1. 启用自动切换...');
    const enableResult = await enableAutoSwitch(token);
    if (enableResult.success) {
      console.log('✅ 自动切换已启用');
      
      // 验证配置
      const enableConfig = await testPublicConfig();
      if (enableConfig.success) {
        console.log(`   验证: auto_switch = ${enableConfig.data['comfyui.auto_switch']}`);
      }
    } else {
      console.log('❌ 启用自动切换失败');
      return;
    }

    // 2. 禁用自动切换
    console.log('\n📊 2. 禁用自动切换...');
    const disableResult = await disableAutoSwitch(token);
    if (disableResult.success) {
      console.log('✅ 自动切换已禁用');
      
      // 验证配置
      const disableConfig = await testPublicConfig();
      if (disableConfig.success) {
        console.log(`   验证: auto_switch = ${disableConfig.data['comfyui.auto_switch']}`);
        
        if (disableConfig.data['comfyui.auto_switch'] === false) {
          console.log('✅ 配置正确禁用');
        } else {
          console.log('❌ 配置禁用失败');
          return;
        }
      }
    } else {
      console.log('❌ 禁用自动切换失败');
      return;
    }

    // 3. 分析前端代码中的自动切换逻辑
    console.log('\n📊 3. 分析自动切换逻辑...');
    console.log('🔍 检查前端代码中的自动切换实现:');
    console.log('   - client/src/services/comfyui.js');
    console.log('   - client/src/services/serverManager.js');
    console.log('   - 查看是否有硬编码的自动切换逻辑');

    console.log('\n💡 可能的问题原因:');
    console.log('   1. 前端代码中有硬编码的自动切换逻辑');
    console.log('   2. 服务器管理器没有正确读取配置');
    console.log('   3. 配置缓存没有及时更新');
    console.log('   4. 默认配置覆盖了数据库配置');

    console.log('\n🔧 建议的解决方案:');
    console.log('   方案1: 修复自动切换配置逻辑');
    console.log('   方案2: 删除auto_switch配置项，默认启用切换');
    console.log('   方案3: 简化为固定的切换策略');

    // 4. 检查当前配置状态
    console.log('\n📊 4. 当前配置状态:');
    const finalConfig = await testPublicConfig();
    if (finalConfig.success) {
      console.log('📋 ComfyUI配置:');
      console.log(`   主服务器: ${finalConfig.data['comfyui.server_url']}`);
      console.log(`   备用服务器: ${finalConfig.data['comfyui.backup_servers']}`);
      console.log(`   自动切换: ${finalConfig.data['comfyui.auto_switch']} (当前已禁用)`);
      console.log(`   健康检查超时: ${finalConfig.data['comfyui.health_check_timeout']}ms`);
      console.log(`   请求超时: ${finalConfig.data['comfyui.timeout']}ms`);
    }

    console.log('\n🎯 测试结论:');
    console.log('如果在禁用自动切换后，系统仍然会切换服务器，说明:');
    console.log('   ❌ auto_switch配置项不生效');
    console.log('   ❌ 前端代码没有正确读取或使用该配置');
    console.log('   ❌ 可能存在硬编码的切换逻辑');
    
    console.log('\n💡 推荐方案:');
    console.log('   ✅ 删除comfyui.auto_switch配置项');
    console.log('   ✅ 默认启用服务器切换功能');
    console.log('   ✅ 简化代码逻辑，减少配置复杂度');
    console.log('   ✅ 遵循最简开发原则');

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

// 运行测试
testAutoSwitchDisable().catch(console.error);
