// HTTP配置验证脚本
const fs = require('fs');
const path = require('path');

console.log('🔍 验证HTTP协议配置...\n');

// 1. 检查环境变量配置
console.log('1. 检查环境变量配置:');
const envPath = path.join(__dirname, 'client', '.env.production');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  console.log('✅ .env.production 内容:');
  console.log(envContent);
  
  if (envContent.includes('VITE_API_BASE_URL=http://114.132.50.71:3007')) {
    console.log('✅ API基础URL配置正确');
  } else {
    console.log('❌ API基础URL配置错误');
  }
  
  if (envContent.includes('VITE_FORCE_HTTP=true')) {
    console.log('✅ 强制HTTP配置正确');
  } else {
    console.log('❌ 强制HTTP配置缺失');
  }
} else {
  console.log('❌ .env.production 文件不存在');
}

console.log('\n2. 检查API配置文件:');
const apiConfigPath = path.join(__dirname, 'client', 'src', 'utils', 'apiConfig.js');
if (fs.existsSync(apiConfigPath)) {
  const apiConfigContent = fs.readFileSync(apiConfigPath, 'utf8');
  
  if (apiConfigContent.includes('强制转换 HTTPS 为 HTTP')) {
    console.log('✅ API配置包含HTTPS转HTTP逻辑');
  } else {
    console.log('❌ API配置缺少HTTPS转HTTP逻辑');
  }
  
  if (apiConfigContent.includes('Upgrade-Insecure-Requests')) {
    console.log('✅ API配置包含防升级请求头');
  } else {
    console.log('❌ API配置缺少防升级请求头');
  }
} else {
  console.log('❌ apiConfig.js 文件不存在');
}

console.log('\n3. 检查HTML CSP配置:');
const htmlPath = path.join(__dirname, 'client', 'index.html');
if (fs.existsSync(htmlPath)) {
  const htmlContent = fs.readFileSync(htmlPath, 'utf8');
  
  if (htmlContent.includes('connect-src') && htmlContent.includes('http://114.132.50.71:3007')) {
    console.log('✅ HTML CSP配置允许HTTP API连接');
  } else {
    console.log('❌ HTML CSP配置不正确');
  }
} else {
  console.log('❌ index.html 文件不存在');
}

console.log('\n4. 检查服务端CORS配置:');
const serverAppPath = path.join(__dirname, 'server', 'src', 'app.js');
if (fs.existsSync(serverAppPath)) {
  const serverContent = fs.readFileSync(serverAppPath, 'utf8');
  
  if (serverContent.includes('http://undress.icomfy.co')) {
    console.log('✅ 服务端CORS允许HTTP域名');
  } else {
    console.log('❌ 服务端CORS缺少HTTP域名配置');
  }
} else {
  console.log('❌ server/src/app.js 文件不存在');
}

console.log('\n🎯 配置验证完成！');
console.log('\n📋 部署步骤:');
console.log('1. 运行: deploy-http.bat');
console.log('2. 等待GitHub Pages更新');
console.log('3. 访问: http://undress.icomfy.co');
console.log('4. 检查浏览器控制台确认无SSL错误');
