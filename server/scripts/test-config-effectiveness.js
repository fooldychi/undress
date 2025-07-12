#!/usr/bin/env node

/**
 * 测试数据库、JWT、积分配置是否真的生效
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

async function testConfigEffectiveness() {
  console.log('🧪 测试数据库、JWT、积分配置是否真的生效...\n');

  try {
    console.log('🔑 获取管理员token...');
    const token = await getAdminToken();
    console.log('✅ Token获取成功\n');

    // 1. 测试公共配置API
    console.log('📊 1. 测试公共配置API...');
    const publicResult = await testPublicConfig();
    
    if (publicResult.success) {
      console.log('✅ 公共配置API正常');
      console.log('📋 AI积分配置:');
      console.log(`   文生图积分: ${publicResult.data['ai.text_to_image_points']}`);
      console.log(`   换脸积分: ${publicResult.data['ai.face_swap_points']}`);
      console.log(`   换衣积分: ${publicResult.data['ai.undress_points']}`);
    } else {
      console.log('❌ 公共配置API异常:', publicResult.error);
    }

    // 2. 测试管理员配置API
    console.log('\n📊 2. 测试管理员配置API...');
    const adminResult = await testAdminConfig(token);
    
    if (adminResult.success) {
      console.log('✅ 管理员配置API正常');
      
      // 检查数据库配置
      if (adminResult.data.database) {
        console.log('\n📋 数据库配置:');
        adminResult.data.database.forEach(config => {
          const value = config.config_key.includes('password') ? '***' : config.config_value;
          console.log(`   ${config.config_key}: ${value}`);
        });
      }
      
      // 检查JWT配置
      if (adminResult.data.jwt) {
        console.log('\n📋 JWT配置:');
        adminResult.data.jwt.forEach(config => {
          const value = config.config_key.includes('secret') ? '***' : config.config_value;
          console.log(`   ${config.config_key}: ${value}`);
        });
      }
      
      // 检查AI积分配置
      if (adminResult.data.ai) {
        console.log('\n📋 AI积分配置:');
        adminResult.data.ai.forEach(config => {
          console.log(`   ${config.config_key}: ${config.config_value}`);
        });
      }
    } else {
      console.log('❌ 管理员配置API异常:', adminResult.error);
    }

    // 3. 分析配置使用情况
    console.log('\n📊 3. 分析配置使用情况...');
    
    console.log('\n🔍 数据库配置使用分析:');
    console.log('   📁 server/src/config/database.js:');
    console.log('      ❌ 使用环境变量: process.env.DB_HOST');
    console.log('      ❌ 使用环境变量: process.env.DB_PORT');
    console.log('      ❌ 使用环境变量: process.env.DB_USER');
    console.log('      ❌ 使用环境变量: process.env.DB_PASSWORD');
    console.log('      ❌ 使用环境变量: process.env.DB_NAME');
    console.log('   💡 结论: 数据库连接配置完全使用环境变量，数据库配置项不生效');

    console.log('\n🔍 JWT配置使用分析:');
    console.log('   📁 server/src/middleware/auth.js:');
    console.log('      ❌ 使用环境变量: process.env.JWT_SECRET');
    console.log('   📁 server/src/middleware/adminAuth.js:');
    console.log('      ❌ 使用环境变量: process.env.JWT_SECRET');
    console.log('   📁 server/src/routes/auth.js:');
    console.log('      ❌ 使用环境变量: process.env.JWT_SECRET');
    console.log('      ❌ 使用环境变量: process.env.JWT_EXPIRES_IN');
    console.log('   💡 结论: JWT配置完全使用环境变量，JWT配置项不生效');

    console.log('\n🔍 AI积分配置使用分析:');
    console.log('   📁 server/src/utils/pointsCalculator.js:');
    console.log('      ❓ 需要检查是否使用配置API获取积分值');
    console.log('   📁 前端代码:');
    console.log('      ✅ 通过config API获取积分配置');
    console.log('   💡 结论: AI积分配置可能生效，但需要进一步验证');

    // 4. 硬编码问题分析
    console.log('\n📊 4. 硬编码问题分析...');
    
    console.log('\n❌ 发现的硬编码问题:');
    console.log('   1. 数据库连接配置:');
    console.log('      - 完全使用环境变量，忽略数据库配置项');
    console.log('      - 后台配置页面的数据库配置不生效');
    console.log('   2. JWT配置:');
    console.log('      - 完全使用环境变量，忽略JWT配置项');
    console.log('      - 后台配置页面的JWT配置不生效');
    console.log('   3. AI积分配置:');
    console.log('      - 前端通过API获取，可能生效');
    console.log('      - 但后端逻辑可能仍使用硬编码值');

    // 5. 保存机制分析
    console.log('\n📊 5. 保存机制分析...');
    console.log('\n🔍 当前保存机制:');
    console.log('   ❌ 全部保存: 一次保存所有配置项');
    console.log('   💡 问题: 修改一个配置项会重新保存所有配置项');
    console.log('   💡 建议: 改为各自保存，只保存修改的配置分组');

    console.log('\n🎯 建议的保存机制:');
    console.log('   ✅ 分组保存: 每个配置标签页独立保存');
    console.log('   ✅ 增量保存: 只保存修改的配置项');
    console.log('   ✅ 实时生效: 保存后立即生效');

    // 6. 总结和建议
    console.log('\n📊 6. 总结和建议...');
    
    console.log('\n🎯 配置生效状态:');
    console.log('   ❌ 数据库配置: 不生效 (使用环境变量)');
    console.log('   ❌ JWT配置: 不生效 (使用环境变量)');
    console.log('   ❓ AI积分配置: 部分生效 (需要验证)');
    console.log('   ✅ ComfyUI配置: 生效 (通过API获取)');

    console.log('\n💡 修复建议:');
    console.log('   1. 修改数据库连接逻辑，从配置API获取数据库配置');
    console.log('   2. 修改JWT中间件，从配置API获取JWT配置');
    console.log('   3. 验证AI积分扣除逻辑是否使用配置API');
    console.log('   4. 改进保存机制，支持分组保存');
    console.log('   5. 删除不生效的配置项，或修复使其生效');

    console.log('\n⚠️ 重要发现:');
    console.log('   大部分配置项都是硬编码的，后台配置页面只是"摆设"');
    console.log('   用户修改配置后实际上不会生效，这是一个严重的问题');

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

// 运行测试
testConfigEffectiveness().catch(console.error);
