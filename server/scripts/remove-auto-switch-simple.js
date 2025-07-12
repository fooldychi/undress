#!/usr/bin/env node

/**
 * 简单删除comfyui.auto_switch配置项
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

// 获取当前配置
const getCurrentConfigs = (token) => {
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
    req.end();
  });
};

// 保存配置（不包含auto_switch）
const saveConfigsWithoutAutoSwitch = (token, configs) => {
  return new Promise((resolve) => {
    const postData = JSON.stringify({
      configs: configs
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

async function removeAutoSwitchConfig() {
  console.log('🗑️ 删除comfyui.auto_switch配置项...\n');

  try {
    console.log('🔑 获取管理员token...');
    const token = await getAdminToken();
    console.log('✅ Token获取成功\n');

    console.log('📊 获取当前配置...');
    const configResult = await getCurrentConfigs(token);
    
    if (!configResult.success) {
      console.log('❌ 获取配置失败:', configResult.error);
      return;
    }

    console.log('✅ 配置获取成功\n');

    // 显示当前ComfyUI配置
    const comfyuiConfigs = configResult.data.comfyui || [];
    console.log('📋 当前ComfyUI配置项:');
    comfyuiConfigs.forEach(config => {
      console.log(`   ${config.config_key}: ${config.config_value} - ${config.description}`);
    });
    console.log(`   总计: ${comfyuiConfigs.length} 项\n`);

    // 检查是否有auto_switch配置
    const autoSwitchConfig = comfyuiConfigs.find(c => c.config_key === 'comfyui.auto_switch');
    
    if (!autoSwitchConfig) {
      console.log('✅ comfyui.auto_switch配置项不存在，无需删除');
      return;
    }

    console.log('🔍 找到comfyui.auto_switch配置项:');
    console.log(`   配置值: ${autoSwitchConfig.config_value}`);
    console.log(`   配置类型: ${autoSwitchConfig.config_type}`);
    console.log(`   描述: ${autoSwitchConfig.description}\n`);

    // 过滤掉auto_switch配置项
    const configsWithoutAutoSwitch = comfyuiConfigs.filter(c => c.config_key !== 'comfyui.auto_switch');
    
    console.log('🗑️ 删除auto_switch配置项...');
    console.log('📋 保留的ComfyUI配置项:');
    configsWithoutAutoSwitch.forEach(config => {
      console.log(`   ✅ ${config.config_key}: ${config.config_value}`);
    });
    console.log(`   总计: ${configsWithoutAutoSwitch.length} 项\n`);

    // 收集所有其他配置分组的配置项
    const allConfigsWithoutAutoSwitch = [];
    
    // 添加过滤后的ComfyUI配置
    allConfigsWithoutAutoSwitch.push(...configsWithoutAutoSwitch);
    
    // 添加其他分组的配置
    ['database', 'jwt', 'ai'].forEach(group => {
      const groupConfigs = configResult.data[group] || [];
      allConfigsWithoutAutoSwitch.push(...groupConfigs);
    });

    console.log(`💾 保存配置（不包含auto_switch），共 ${allConfigsWithoutAutoSwitch.length} 项...`);
    
    const saveResult = await saveConfigsWithoutAutoSwitch(token, allConfigsWithoutAutoSwitch);
    
    if (saveResult.success) {
      console.log('✅ 配置保存成功\n');
      
      // 验证删除结果
      console.log('📊 验证删除结果...');
      const verifyResult = await getCurrentConfigs(token);
      
      if (verifyResult.success) {
        const newComfyuiConfigs = verifyResult.data.comfyui || [];
        console.log('📋 删除后的ComfyUI配置项:');
        newComfyuiConfigs.forEach(config => {
          console.log(`   ✅ ${config.config_key}: ${config.config_value}`);
        });
        console.log(`   总计: ${newComfyuiConfigs.length} 项\n`);
        
        const stillHasAutoSwitch = newComfyuiConfigs.find(c => c.config_key === 'comfyui.auto_switch');
        if (stillHasAutoSwitch) {
          console.log('❌ auto_switch配置项仍然存在，删除失败');
        } else {
          console.log('✅ auto_switch配置项已成功删除');
        }
      }
    } else {
      console.log('❌ 配置保存失败:', saveResult.error);
    }

    console.log('\n💡 删除效果:');
    console.log('   ❌ comfyui.auto_switch - 已删除');
    console.log('   ✅ 自动切换功能改为默认启用');
    console.log('   ✅ 简化了配置管理');
    console.log('   ✅ 遵循最简开发原则');

  } catch (error) {
    console.error('❌ 删除失败:', error.message);
  }
}

// 运行删除
removeAutoSwitchConfig().catch(console.error);
