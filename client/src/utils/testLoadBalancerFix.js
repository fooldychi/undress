/**
 * 测试负载均衡修复 - 验证仅基于队列数量选择服务器
 */

import loadBalancer from '../services/loadBalancer.js'

/**
 * 测试负载均衡修复
 */
export async function testLoadBalancerFix() {
  console.log('🧪 测试负载均衡修复 - 验证仅基于队列数量选择服务器...')

  try {
    // 1. 初始化负载均衡器
    console.log('\n📋 步骤1: 初始化负载均衡器')
    await loadBalancer.initialize()
    console.log('✅ 初始化完成')

    // 2. 刷新服务器状态
    console.log('\n📋 步骤2: 刷新服务器状态')
    await loadBalancer.refreshHealthStatus()
    console.log('✅ 状态刷新完成')

    // 3. 显示当前服务器状态
    console.log('\n📋 步骤3: 当前服务器状态')
    const healthyServers = loadBalancer.serverList.filter(s => s.healthy === true)
    
    if (healthyServers.length === 0) {
      console.warn('⚠️ 没有健康的服务器可用于测试')
      return
    }

    console.log('📊 健康服务器列表:')
    healthyServers.forEach((server, index) => {
      console.log(`   ${index + 1}. ${server.type} - ${server.url}`)
      console.log(`      队列: ${server.queueInfo.total} (运行: ${server.queueInfo.running}, 等待: ${server.queueInfo.pending})`)
    })

    // 4. 测试服务器选择逻辑
    console.log('\n📋 步骤4: 测试服务器选择')
    
    // 找到队列最少的服务器
    const minQueue = Math.min(...healthyServers.map(s => s.queueInfo.total))
    const expectedServers = healthyServers.filter(s => s.queueInfo.total === minQueue)
    
    console.log(`📊 预期选择: 队列数量为 ${minQueue} 的服务器`)
    expectedServers.forEach(server => {
      console.log(`   - ${server.type}: ${server.url}`)
    })

    // 5. 实际选择服务器
    console.log('\n📋 步骤5: 实际选择结果')
    const selectedServer = await loadBalancer.getOptimalServer()
    console.log(`🎯 实际选择: ${selectedServer}`)

    // 6. 验证选择是否正确
    console.log('\n📋 步骤6: 验证选择结果')
    const selectedServerInfo = healthyServers.find(s => s.url === selectedServer)
    
    if (!selectedServerInfo) {
      console.error('❌ 错误: 选择的服务器不在健康服务器列表中')
      return
    }

    if (selectedServerInfo.queueInfo.total === minQueue) {
      console.log('✅ 验证通过: 选择了队列数量最少的服务器')
      console.log(`   选择的服务器类型: ${selectedServerInfo.type}`)
      console.log(`   队列数量: ${selectedServerInfo.queueInfo.total}`)
    } else {
      console.error('❌ 验证失败: 没有选择队列数量最少的服务器')
      console.error(`   选择的服务器队列: ${selectedServerInfo.queueInfo.total}`)
      console.error(`   最少队列数量: ${minQueue}`)
    }

    // 7. 多次测试确保一致性
    console.log('\n📋 步骤7: 多次选择测试')
    const selections = []
    for (let i = 0; i < 5; i++) {
      const server = await loadBalancer.getOptimalServer()
      selections.push(server)
      console.log(`   第${i + 1}次选择: ${server}`)
      
      // 短暂延迟
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    // 验证所有选择都是队列最少的服务器
    const allCorrect = selections.every(server => {
      const serverInfo = healthyServers.find(s => s.url === server)
      return serverInfo && serverInfo.queueInfo.total === minQueue
    })

    if (allCorrect) {
      console.log('✅ 多次测试验证通过: 所有选择都是队列最少的服务器')
    } else {
      console.error('❌ 多次测试验证失败: 存在不正确的选择')
    }

    console.log('\n🎉 负载均衡修复测试完成!')

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error)
  }
}

/**
 * 模拟不同队列情况的测试
 */
export async function testDifferentQueueScenarios() {
  console.log('🧪 测试不同队列情况下的服务器选择...')

  try {
    await loadBalancer.initialize()
    await loadBalancer.refreshHealthStatus()

    const healthyServers = loadBalancer.serverList.filter(s => s.healthy === true)
    
    if (healthyServers.length < 2) {
      console.warn('⚠️ 需要至少2个健康服务器进行测试')
      return
    }

    console.log('\n📊 当前服务器队列状况:')
    healthyServers.forEach((server, index) => {
      console.log(`   ${index + 1}. ${server.type} (${server.url}): 队列 ${server.queueInfo.total}`)
    })

    // 按队列数量排序
    const sortedByQueue = [...healthyServers].sort((a, b) => a.queueInfo.total - b.queueInfo.total)
    
    console.log('\n📈 按队列数量排序:')
    sortedByQueue.forEach((server, index) => {
      console.log(`   ${index + 1}. ${server.type}: 队列 ${server.queueInfo.total}`)
    })

    const selectedServer = await loadBalancer.getOptimalServer()
    const selectedInfo = healthyServers.find(s => s.url === selectedServer)

    console.log(`\n🎯 负载均衡器选择: ${selectedInfo.type} (队列: ${selectedInfo.queueInfo.total})`)
    console.log(`📊 最少队列数量: ${sortedByQueue[0].queueInfo.total}`)

    if (selectedInfo.queueInfo.total === sortedByQueue[0].queueInfo.total) {
      console.log('✅ 选择正确: 选择了队列最少的服务器')
    } else {
      console.error('❌ 选择错误: 没有选择队列最少的服务器')
    }

  } catch (error) {
    console.error('❌ 测试失败:', error)
  }
}

// 导出到全局作用域供浏览器控制台使用
if (typeof window !== 'undefined') {
  window.testLoadBalancerFix = testLoadBalancerFix
  window.testDifferentQueueScenarios = testDifferentQueueScenarios
}
