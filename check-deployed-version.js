// 检查已部署版本的内容
const https = require('https');

function checkDeployedContent(url) {
  return new Promise((resolve) => {
    console.log(`🔍 检查部署内容: ${url}`);
    
    const req = https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`状态码: ${res.statusCode}`);
        
        // 检查CSP配置
        if (data.includes('connect-src') && data.includes('http://114.132.50.71:3007')) {
          console.log('✅ 包含HTTP API的CSP配置');
        } else if (data.includes('connect-src')) {
          console.log('⚠️ 包含CSP配置但可能不是最新版本');
          // 提取CSP内容
          const cspMatch = data.match(/Content-Security-Policy[^>]*content="([^"]+)"/);
          if (cspMatch) {
            console.log(`当前CSP: ${cspMatch[1].substring(0, 100)}...`);
          }
        } else {
          console.log('❌ 没有找到CSP配置');
        }
        
        // 检查是否包含最新的构建文件
        const jsMatch = data.match(/assets\/index-([^.]+)\.js/);
        if (jsMatch) {
          console.log(`JS文件哈希: ${jsMatch[1]}`);
        }
        
        // 检查是否是最新版本
        if (data.includes('index-wW7uOK9m.js')) {
          console.log('✅ 部署的是最新构建版本');
        } else {
          console.log('⚠️ 可能不是最新构建版本');
        }
        
        resolve(data);
      });
    });
    
    req.on('error', (err) => {
      console.log(`❌ 请求失败: ${err.message}`);
      resolve(null);
    });
  });
}

async function main() {
  console.log('🧪 检查GitHub Pages部署版本\n');
  
  // 检查HTTPS版本
  await checkDeployedContent('https://undress.icomfy.co');
  
  console.log('\n📋 部署状态分析:');
  console.log('如果看到"包含HTTP API的CSP配置"和"部署的是最新构建版本"，');
  console.log('说明部署成功，可以正常使用HTTP API。');
  
  console.log('\n🔗 测试链接:');
  console.log('- HTTP: http://undress.icomfy.co');
  console.log('- HTTPS: https://undress.icomfy.co');
}

main().catch(console.error);
