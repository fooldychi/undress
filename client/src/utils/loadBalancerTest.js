// 负载均衡器测试工具
import loadBalancer from '../services/loadBalancer.js'

/**
 * 测试负载均衡器功能
 */
export async function testLoadBalancer() {
  console.log('🧪 开始测试负载均衡器...')
  
  try {
    // 1. 显示当前服务器状态
    console.log('\n📊 当前服务器状态:')
    loadBalancer.logServerStatus()
    
    // 2. 获取服务器统计信息
    const stats = loadBalancer.getServerStats()
    console.log('\n📈 服务器统计:', stats)
    
    // 3. 测试服务器选择
    console.log('\n🎯 测试服务器选择:')
    for (let i = 0; i < 3; i++) {
      const server = await loadBalancer.getOptimalServer()
      console.log(`   第${i + 1}次选择: ${server}`)
      
      // 等待一秒
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    
    // 4. 强制重新评估
    console.log('\n🔄 测试强制重新评估:')
    await loadBalancer.forceReassessment()
    
    // 5. 再次选择服务器
    console.log('\n🎯 重新评估后的服务器选择:')
    const serverAfterReassessment = await loadBalancer.getOptimalServer()
    console.log(`   重新评估后选择: ${serverAfterReassessment}`)
    
    console.log('\n✅ 负载均衡器测试完成')
    
  } catch (error) {
    console.error('❌ 负载均衡器测试失败:', error)
  }
}

/**
 * 模拟服务器失败
 */
export async function simulateServerFailure(serverUrl) {
  console.log(`🔥 模拟服务器失败: ${serverUrl}`)
  
  try {
    await loadBalancer.recordFailure(serverUrl)
    console.log('✅ 服务器失败记录完成')
    
    // 显示更新后的状态
    loadBalancer.logServerStatus()
    
  } catch (error) {
    console.error('❌ 模拟服务器失败时出错:', error)
  }
}

/**
 * 在浏览器控制台中暴露测试函数
 */
export function exposeTestFunctions() {
  if (typeof window !== 'undefined') {
    window.testLoadBalancer = testLoadBalancer
    window.simulateServerFailure = simulateServerFailure
    window.loadBalancer = loadBalancer
    
    console.log('🔧 负载均衡器测试函数已暴露到全局:')
    console.log('   - testLoadBalancer(): 测试负载均衡器')
    console.log('   - simulateServerFailure(url): 模拟服务器失败')
    console.log('   - loadBalancer: 负载均衡器实例')
  }
}
