// 简单测试备用服务器功能
const https = require('https')
const http = require('http')

// 测试服务器健康检查
async function testServerHealth(serverUrl) {
  return new Promise((resolve) => {
    const url = new URL(serverUrl + '/system_stats')
    const client = url.protocol === 'https:' ? https : http
    
    console.log(`🔍 测试服务器: ${serverUrl}`)
    
    const req = client.get(url, { timeout: 5000 }, (res) => {
      console.log(`📡 响应状态: ${res.statusCode}`)
      if (res.statusCode === 200) {
        console.log(`✅ 服务器健康: ${serverUrl}`)
        resolve({ healthy: true, status: res.statusCode })
      } else {
        console.log(`⚠️ 服务器响应异常: ${serverUrl} - ${res.statusCode}`)
        resolve({ healthy: false, status: res.statusCode })
      }
    })
    
    req.on('error', (error) => {
      console.log(`❌ 服务器不可用: ${serverUrl} - ${error.message}`)
      resolve({ healthy: false, error: error.message })
    })
    
    req.on('timeout', () => {
      console.log(`⏰ 服务器超时: ${serverUrl}`)
      req.destroy()
      resolve({ healthy: false, error: 'timeout' })
    })
    
    req.setTimeout(5000)
  })
}

// 测试服务器列表
async function testServerList() {
  console.log('🧪 测试ComfyUI服务器列表...\n')
  
  const servers = [
    'https://argb64384k-8188.cnb.run',  // 主服务器
    'https://backup1.your-domain.com',      // 备用服务器1（无效）
    'https://backup2.comfyui.com',      // 备用服务器2（无效）
    'https://httpbin.org'               // 测试服务器（有效，但不是ComfyUI）
  ]
  
  console.log('📋 服务器列表:')
  servers.forEach((server, index) => {
    console.log(`   ${index + 1}. ${server}`)
  })
  
  console.log('\n📋 开始健康检查...')
  
  for (let i = 0; i < servers.length; i++) {
    const server = servers[i]
    console.log(`\n--- 测试服务器 ${i + 1} ---`)
    
    const result = await testServerHealth(server)
    
    if (result.healthy) {
      console.log(`✅ 服务器 ${i + 1} 可用`)
      break  // 找到可用服务器就停止
    } else {
      console.log(`❌ 服务器 ${i + 1} 不可用`)
      if (i < servers.length - 1) {
        console.log(`🔄 切换到下一个服务器...`)
      } else {
        console.log(`❌ 所有服务器都不可用`)
      }
    }
  }
  
  console.log('\n🎉 测试完成！')
}

// 运行测试
testServerList().catch(console.error)
