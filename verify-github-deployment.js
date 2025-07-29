// GitHub Pages部署验证脚本
const https = require('https');
const http = require('http');

console.log('🚀 验证GitHub Pages部署状态...\n');

// 测试网站访问
function testWebsite(url, protocol = 'https') {
  return new Promise((resolve) => {
    const client = protocol === 'https' ? https : http;
    
    console.log(`🔍 测试 ${protocol.toUpperCase()} ${url}`);
    
    const req = client.get(url, (res) => {
      console.log(`   状态码: ${res.statusCode}`);
      console.log(`   Content-Type: ${res.headers['content-type']}`);
      
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        // 检查是否包含预期内容
        if (data.includes('Imagic') && data.includes('AI图像处理')) {
          console.log(`   ✅ 网站内容正常`);
        } else {
          console.log(`   ⚠️ 网站内容可能异常`);
        }
        
        // 检查CSP配置
        if (data.includes('connect-src') && data.includes('http://114.132.50.71:3007')) {
          console.log(`   ✅ CSP配置包含HTTP API地址`);
        } else {
          console.log(`   ❌ CSP配置可能有问题`);
        }
        
        resolve({ 
          success: true, 
          statusCode: res.statusCode,
          hasContent: data.includes('Imagic'),
          hasCSP: data.includes('http://114.132.50.71:3007')
        });
      });
    });
    
    req.on('error', (err) => {
      console.log(`   ❌ 错误: ${err.message}`);
      resolve({ success: false, error: err.message });
    });
    
    req.setTimeout(15000, () => {
      console.log(`   ⏰ 请求超时`);
      req.destroy();
      resolve({ success: false, error: 'timeout' });
    });
  });
}

// 测试API连接
function testAPI(url) {
  return new Promise((resolve) => {
    console.log(`🔍 测试API连接 ${url}`);
    
    const req = http.get(url, (res) => {
      console.log(`   状态码: ${res.statusCode}`);
      
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 500) {
          console.log(`   ✅ API服务器响应正常`);
        } else {
          console.log(`   ⚠️ API服务器状态异常`);
        }
        resolve({ success: true, statusCode: res.statusCode });
      });
    });
    
    req.on('error', (err) => {
      console.log(`   ❌ API连接失败: ${err.message}`);
      resolve({ success: false, error: err.message });
    });
    
    req.setTimeout(10000, () => {
      console.log(`   ⏰ API请求超时`);
      req.destroy();
      resolve({ success: false, error: 'timeout' });
    });
  });
}

async function runDeploymentVerification() {
  console.log('📋 GitHub Pages部署验证清单:\n');
  
  // 1. 测试HTTPS访问
  console.log('1. 测试HTTPS网站访问:');
  const httpsResult = await testWebsite('https://undress.icomfy.co');
  
  // 2. 测试HTTP访问
  console.log('\n2. 测试HTTP网站访问:');
  const httpResult = await testWebsite('http://undress.icomfy.co', 'http');
  
  // 3. 测试API连接
  console.log('\n3. 测试后端API连接:');
  const apiResult = await testAPI('http://114.132.50.71:3007/api/level-cards/types');
  
  // 4. 部署状态总结
  console.log('\n📊 部署状态总结:');
  console.log('=====================================');
  
  if (httpsResult.success && httpsResult.statusCode === 200) {
    console.log('✅ HTTPS网站访问正常');
  } else {
    console.log('❌ HTTPS网站访问异常');
  }
  
  if (httpResult.success && httpResult.statusCode === 200) {
    console.log('✅ HTTP网站访问正常');
  } else {
    console.log('❌ HTTP网站访问异常');
  }
  
  if (httpsResult.hasCSP) {
    console.log('✅ CSP配置包含HTTP API地址');
  } else {
    console.log('❌ CSP配置缺少HTTP API地址');
  }
  
  if (apiResult.success) {
    console.log('✅ 后端API服务器可访问');
  } else {
    console.log('❌ 后端API服务器不可访问');
  }
  
  console.log('\n🎯 下一步验证:');
  console.log('1. 在浏览器中访问: https://undress.icomfy.co');
  console.log('2. 打开开发者工具检查控制台');
  console.log('3. 确认没有SSL协议错误');
  console.log('4. 测试登录功能');
  console.log('5. 测试图像处理功能');
  
  console.log('\n📱 预期效果:');
  console.log('- 浏览器控制台显示: "🌐 强制HTTP API基础URL: http://114.132.50.71:3007"');
  console.log('- API请求使用HTTP协议');
  console.log('- 不再出现net::ERR_SSL_PROTOCOL_ERROR错误');
}

runDeploymentVerification().catch(console.error);
