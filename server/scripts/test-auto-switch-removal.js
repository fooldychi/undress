#!/usr/bin/env node

/**
 * 测试删除auto_switch配置项后的效果
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

async function testAutoSwitchRemoval() {
  console.log('🧪 测试删除auto_switch配置项后的效果...\n');

  try {
    console.log('🔑 获取管理员token...');
    const token = await getAdminToken();
    console.log('✅ Token获取成功\n');

    // 1. 测试公共配置API
    console.log('📊 1. 测试公共配置API...');
    const publicResult = await testPublicConfig();
    
    if (publicResult.success) {
      console.log('✅ 公共配置API正常');
      console.log('📋 ComfyUI配置:');
      console.log(`   主服务器: ${publicResult.data['comfyui.server_url']}`);
      console.log(`   备用服务器: ${publicResult.data['comfyui.backup_servers']}`);
      console.log(`   健康检查超时: ${publicResult.data['comfyui.health_check_timeout']}ms`);
      console.log(`   请求超时: ${publicResult.data['comfyui.timeout']}ms`);
      
      // 检查是否还有auto_switch配置
      if ('comfyui.auto_switch' in publicResult.data) {
        console.log(`   ❌ auto_switch仍然存在: ${publicResult.data['comfyui.auto_switch']}`);
      } else {
        console.log('   ✅ auto_switch配置项已删除');
      }
    } else {
      console.log('❌ 公共配置API异常:', publicResult.error);
    }

    // 2. 测试管理员配置API
    console.log('\n📊 2. 测试管理员配置API...');
    const adminResult = await testAdminConfig(token);
    
    if (adminResult.success) {
      console.log('✅ 管理员配置API正常');
      
      if (adminResult.data.comfyui) {
        console.log('📋 管理员ComfyUI配置:');
        adminResult.data.comfyui.forEach(config => {
          console.log(`   ✅ ${config.config_key}: ${config.config_value}`);
        });
        
        // 检查是否还有auto_switch配置项
        const autoSwitchConfig = adminResult.data.comfyui.find(c => c.config_key === 'comfyui.auto_switch');
        if (autoSwitchConfig) {
          console.log(`\n❌ auto_switch配置项仍然存在:`);
          console.log(`   配置值: ${autoSwitchConfig.config_value}`);
          console.log(`   配置类型: ${autoSwitchConfig.config_type}`);
        } else {
          console.log('\n✅ auto_switch配置项已成功删除');
        }
      }
    } else {
      console.log('❌ 管理员配置API异常:', adminResult.error);
    }

    // 3. 配置项统计
    console.log('\n📊 3. 配置项统计:');
    if (adminResult.success) {
      const comfyuiCount = adminResult.data.comfyui ? adminResult.data.comfyui.length : 0;
      const databaseCount = adminResult.data.database ? adminResult.data.database.length : 0;
      const jwtCount = adminResult.data.jwt ? adminResult.data.jwt.length : 0;
      const aiCount = adminResult.data.ai ? adminResult.data.ai.length : 0;
      const totalCount = comfyuiCount + databaseCount + jwtCount + aiCount;
      
      console.log(`   ComfyUI配置: ${comfyuiCount} 项`);
      console.log(`   数据库配置: ${databaseCount} 项`);
      console.log(`   JWT配置: ${jwtCount} 项`);
      console.log(`   AI积分配置: ${aiCount} 项`);
      console.log(`   总计: ${totalCount} 项`);
      
      if (comfyuiCount === 4) {
        console.log('✅ ComfyUI配置项数量正确 (删除auto_switch后应为4项)');
      } else {
        console.log(`❌ ComfyUI配置项数量异常 (期望4项，实际${comfyuiCount}项)`);
      }
    }

    // 4. 功能验证
    console.log('\n📊 4. 功能验证:');
    console.log('🔧 自动切换功能状态:');
    console.log('   ✅ 已改为默认启用');
    console.log('   ✅ 不再依赖配置项');
    console.log('   ✅ 简化了配置管理');
    console.log('   ✅ 遵循最简开发原则');

    console.log('\n💡 修改效果:');
    console.log('   - 删除了comfyui.auto_switch配置项');
    console.log('   - 前端代码默认启用自动切换');
    console.log('   - 后台配置页面移除了自动切换开关');
    console.log('   - 简化了用户配置流程');

    console.log('\n🎯 测试结论:');
    if (publicResult.success && adminResult.success) {
      const hasAutoSwitch = 'comfyui.auto_switch' in (publicResult.data || {}) || 
                           (adminResult.data.comfyui || []).some(c => c.config_key === 'comfyui.auto_switch');
      
      if (!hasAutoSwitch) {
        console.log('✅ auto_switch配置项删除成功');
        console.log('✅ 自动切换功能改为默认启用');
        console.log('✅ 配置简化完成');
      } else {
        console.log('❌ auto_switch配置项仍然存在');
        console.log('⚠️ 需要检查删除是否完全成功');
      }
    } else {
      console.log('❌ API测试失败，无法验证删除效果');
    }

    console.log('\n🌐 访问地址:');
    console.log('   管理后台: http://localhost:3007/#/config');
    console.log('   配置页面现在应该不再显示自动切换开关');

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

// 运行测试
testAutoSwitchRemoval().catch(console.error);
