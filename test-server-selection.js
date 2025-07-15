// 测试服务器选择功能
import loadBalancer from './client/src/services/loadBalancer.js'

async function testServerSelection() {
  console.log('🧪 开始测试服务器选择功能...\n')
  
  try {
    // 1. 初始化负载均衡器
    console.log('1️⃣ 初始化负载均衡器...')
    await loadBalancer.initialize()
    console.log('✅ 负载均衡器初始化完成\n')
    
    // 2. 测试服务器连接初始化
    console.log('2️⃣ 测试服务器连接初始化...')
    const recommendedServer = await loadBalancer.initializeServerConnection()
    
    if (recommendedServer) {
      console.log(`✅ 推荐服务器: ${recommendedServer}\n`)
    } else {
      console.log('⚠️ 没有可用的服务器\n')
    }
    
    // 3. 测试获取最优服务器
    console.log('3️⃣ 测试获取最优服务器...')
    const optimalServer = await loadBalancer.getOptimalServer()
    console.log(`✅ 最优服务器: ${optimalServer}\n`)
    
    console.log('🎉 测试完成!')
    
  } catch (error) {
    console.error('❌ 测试失败:', error)
  }
}

// 运行测试
testServerSelection()
