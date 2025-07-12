#!/usr/bin/env node

/**
 * 验证数据库配置项与后台配置页面的同步状态
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

async function verifyConfigSync() {
  console.log('🔍 验证数据库配置项与后台配置页面的同步状态...\n');

  try {
    console.log('🔑 获取管理员token...');
    const token = await getAdminToken();
    console.log('✅ Token获取成功\n');

    console.log('📊 获取后台配置API数据...');
    const adminResult = await testAdminConfig(token);
    
    if (!adminResult.success) {
      console.log('❌ 后台配置API异常:', adminResult.error || adminResult.statusCode);
      return;
    }

    console.log('✅ 后台配置API正常\n');

    // 定义后台配置页面的标签页和对应的配置分组
    const configTabs = {
      'ComfyUI配置': 'comfyui',
      '数据库配置': 'database', 
      'JWT配置': 'jwt',
      'AI积分配置': 'ai'
    };

    console.log('📋 后台配置页面标签页与数据库配置对应关系:');
    
    let totalConfigs = 0;
    let allConfigsSupported = true;

    Object.keys(configTabs).forEach(tabName => {
      const groupName = configTabs[tabName];
      const groupConfigs = adminResult.data[groupName] || [];
      
      console.log(`\n📁 ${tabName} (${groupName}):`);
      console.log(`   配置项数量: ${groupConfigs.length}`);
      
      if (groupConfigs.length === 0) {
        console.log('   ⚠️ 该分组没有配置项');
        allConfigsSupported = false;
      } else {
        groupConfigs.forEach(config => {
          const value = config.config_key.includes('password') || config.config_key.includes('secret') 
            ? '***' 
            : config.config_value;
          console.log(`   ✅ ${config.config_key}: ${value}`);
          console.log(`      类型: ${config.config_type}, 描述: ${config.description}`);
        });
      }
      
      totalConfigs += groupConfigs.length;
    });

    console.log(`\n📊 配置同步状态总结:`);
    console.log(`   后台支持的标签页: ${Object.keys(configTabs).length} 个`);
    console.log(`   数据库配置分组: ${Object.keys(adminResult.data).length} 个`);
    console.log(`   总配置项数量: ${totalConfigs} 项`);

    // 检查是否有未分类的配置分组
    const supportedGroups = Object.values(configTabs);
    const allGroups = Object.keys(adminResult.data);
    const unsupportedGroups = allGroups.filter(group => !supportedGroups.includes(group));

    if (unsupportedGroups.length > 0) {
      console.log(`\n⚠️ 发现未支持的配置分组:`);
      unsupportedGroups.forEach(group => {
        const configs = adminResult.data[group] || [];
        console.log(`   ❌ ${group}: ${configs.length} 项配置`);
        configs.forEach(config => {
          console.log(`      - ${config.config_key}`);
        });
      });
      allConfigsSupported = false;
    }

    // 验证每个标签页的配置完整性
    console.log(`\n🔍 配置完整性验证:`);
    
    // ComfyUI配置验证
    const comfyuiConfigs = adminResult.data.comfyui || [];
    const requiredComfyuiConfigs = ['server_url', 'backup_servers', 'auto_switch', 'health_check_timeout', 'timeout'];
    const missingComfyui = requiredComfyuiConfigs.filter(key => 
      !comfyuiConfigs.some(c => c.config_key === `comfyui.${key}`)
    );
    
    if (missingComfyui.length === 0) {
      console.log(`   ✅ ComfyUI配置完整 (${comfyuiConfigs.length}/5)`);
    } else {
      console.log(`   ❌ ComfyUI配置不完整，缺少: ${missingComfyui.join(', ')}`);
      allConfigsSupported = false;
    }

    // 数据库配置验证
    const databaseConfigs = adminResult.data.database || [];
    const requiredDatabaseConfigs = ['host', 'port', 'name', 'user', 'password'];
    const missingDatabase = requiredDatabaseConfigs.filter(key => 
      !databaseConfigs.some(c => c.config_key === `database.${key}`)
    );
    
    if (missingDatabase.length === 0) {
      console.log(`   ✅ 数据库配置完整 (${databaseConfigs.length}/5)`);
    } else {
      console.log(`   ❌ 数据库配置不完整，缺少: ${missingDatabase.join(', ')}`);
      allConfigsSupported = false;
    }

    // JWT配置验证
    const jwtConfigs = adminResult.data.jwt || [];
    const requiredJwtConfigs = ['secret', 'expires_in'];
    const missingJwt = requiredJwtConfigs.filter(key => 
      !jwtConfigs.some(c => c.config_key === `jwt.${key}`)
    );
    
    if (missingJwt.length === 0) {
      console.log(`   ✅ JWT配置完整 (${jwtConfigs.length}/2)`);
    } else {
      console.log(`   ❌ JWT配置不完整，缺少: ${missingJwt.join(', ')}`);
      allConfigsSupported = false;
    }

    // AI积分配置验证
    const aiConfigs = adminResult.data.ai || [];
    const requiredAiConfigs = ['text_to_image_points', 'face_swap_points', 'undress_points'];
    const missingAi = requiredAiConfigs.filter(key => 
      !aiConfigs.some(c => c.config_key === `ai.${key}`)
    );
    
    if (missingAi.length === 0) {
      console.log(`   ✅ AI积分配置完整 (${aiConfigs.length}/3)`);
    } else {
      console.log(`   ❌ AI积分配置不完整，缺少: ${missingAi.join(', ')}`);
      allConfigsSupported = false;
    }

    // 最终结果
    console.log(`\n🎯 同步状态结果:`);
    if (allConfigsSupported) {
      console.log(`✅ 数据库配置项与后台配置页面完全同步`);
      console.log(`✅ 所有配置分组都有对应的标签页`);
      console.log(`✅ 所有必需的配置项都存在`);
      console.log(`✅ 后台配置页面可以完整管理所有配置`);
      
      console.log(`\n🎉 配置同步验证通过！`);
      console.log(`💡 用户可以通过后台配置页面管理所有系统配置`);
      console.log(`🌐 配置页面地址: http://localhost:3007/#/config`);
    } else {
      console.log(`❌ 数据库配置项与后台配置页面存在不同步`);
      console.log(`⚠️ 需要检查配置项的完整性和分组`);
    }

  } catch (error) {
    console.error('❌ 验证失败:', error.message);
  }
}

// 运行验证
verifyConfigSync().catch(console.error);
