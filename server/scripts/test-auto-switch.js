#!/usr/bin/env node

/**
 * 测试ComfyUI自动切换功能是否正常工作
 */

const http = require('http');

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

// 测试管理员配置API
const testAdminConfig = (token) => {
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
  console.log('🧪 测试ComfyUI自动切换功能...\n');

  try {
    // 1. 测试公共配置API
    console.log('📊 1. 测试公共配置API...');
    const publicResult = await testPublicConfig();
    
    if (publicResult.success) {
      console.log('✅ 公共配置API正常');
      console.log('📋 ComfyUI配置:');
      console.log(`   主服务器: ${publicResult.data['comfyui.server_url']}`);
      console.log(`   备用服务器: ${publicResult.data['comfyui.backup_servers']}`);
      console.log(`   自动切换: ${publicResult.data['comfyui.auto_switch']} (类型: ${typeof publicResult.data['comfyui.auto_switch']})`);
      console.log(`   健康检查超时: ${publicResult.data['comfyui.health_check_timeout']}ms`);
      console.log(`   请求超时: ${publicResult.data['comfyui.timeout']}ms`);
      
      // 检查自动切换配置
      const autoSwitch = publicResult.data['comfyui.auto_switch'];
      if (autoSwitch === true) {
        console.log('✅ 自动切换功能已启用');
      } else if (autoSwitch === false) {
        console.log('⚠️ 自动切换功能已禁用');
      } else {
        console.log(`❌ 自动切换配置异常: ${autoSwitch} (应该是布尔值)`);
      }
      
      // 检查备用服务器配置
      const backupServers = publicResult.data['comfyui.backup_servers'];
      if (backupServers && backupServers.trim()) {
        const servers = backupServers.split(',').map(s => s.trim()).filter(s => s);
        console.log(`✅ 配置了 ${servers.length} 个备用服务器:`);
        servers.forEach((server, index) => {
          console.log(`      ${index + 1}. ${server}`);
        });
      } else {
        console.log('⚠️ 没有配置备用服务器');
      }
      
    } else {
      console.log('❌ 公共配置API异常:', publicResult.error || publicResult.statusCode);
    }

    // 2. 测试管理员配置API
    console.log('\n📊 2. 测试管理员配置API...');
    const token = await getAdminToken();
    const adminResult = await testAdminConfig(token);
    
    if (adminResult.success) {
      console.log('✅ 管理员配置API正常');
      
      if (adminResult.data.comfyui) {
        console.log('📋 管理员ComfyUI配置:');
        adminResult.data.comfyui.forEach(config => {
          let value = config.config_value;
          if (config.config_key.includes('password') || config.config_key.includes('secret')) {
            value = '***';
          }
          console.log(`   ${config.config_key}: ${value} (类型: ${config.config_type})`);
        });
        
        // 检查auto_switch配置项
        const autoSwitchConfig = adminResult.data.comfyui.find(c => c.config_key === 'comfyui.auto_switch');
        if (autoSwitchConfig) {
          console.log(`\n🔍 自动切换配置详情:`);
          console.log(`   配置键: ${autoSwitchConfig.config_key}`);
          console.log(`   配置值: ${autoSwitchConfig.config_value}`);
          console.log(`   配置类型: ${autoSwitchConfig.config_type}`);
          console.log(`   描述: ${autoSwitchConfig.description}`);
          
          if (autoSwitchConfig.config_type === 'boolean') {
            if (autoSwitchConfig.config_value === '1' || autoSwitchConfig.config_value === 'true') {
              console.log('✅ 自动切换配置正确 (启用)');
            } else {
              console.log('⚠️ 自动切换配置正确 (禁用)');
            }
          } else {
            console.log(`❌ 自动切换配置类型错误: ${autoSwitchConfig.config_type} (应该是 boolean)`);
          }
        } else {
          console.log('❌ 未找到自动切换配置项');
        }
      }
    } else {
      console.log('❌ 管理员配置API异常:', adminResult.error || adminResult.statusCode);
    }

    // 3. 总结
    console.log('\n📊 测试总结:');
    console.log(`   公共配置API: ${publicResult.success ? '✅ 正常' : '❌ 异常'}`);
    console.log(`   管理员配置API: ${adminResult.success ? '✅ 正常' : '❌ 异常'}`);
    
    if (publicResult.success) {
      const autoSwitch = publicResult.data['comfyui.auto_switch'];
      const backupServers = publicResult.data['comfyui.backup_servers'];
      
      console.log(`   自动切换状态: ${autoSwitch ? '✅ 启用' : '⚠️ 禁用'}`);
      console.log(`   备用服务器: ${backupServers && backupServers.trim() ? '✅ 已配置' : '⚠️ 未配置'}`);
      
      if (autoSwitch && backupServers && backupServers.trim()) {
        console.log('\n🎉 自动切换功能配置完整，应该正常工作！');
        console.log('\n💡 如果自动切换不工作，可能的原因:');
        console.log('   1. 前端代码没有正确读取配置');
        console.log('   2. 服务器管理器初始化失败');
        console.log('   3. 健康检查逻辑有问题');
        console.log('   4. 前端缓存了旧配置');
      } else {
        console.log('\n⚠️ 自动切换功能配置不完整:');
        if (!autoSwitch) {
          console.log('   - 自动切换功能已禁用');
        }
        if (!backupServers || !backupServers.trim()) {
          console.log('   - 没有配置备用服务器');
        }
      }
    }

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

// 运行测试
runTest().catch(console.error);
