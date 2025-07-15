/**
 * 极简负载均衡器测试工具
 */

import loadBalancer from '../services/loadBalancer.js'

/**
 * 测试负载均衡器的基本功能
 */
export async function testSimpleLoadBalancer() {
  console.log('🧪 开始测试极简负载均衡器...')

  try {
    // 1. 测试初始化
    console.log('\n📋 测试1: 初始化负载均衡器')
    await loadBalancer.initialize()
    console.log('✅ 初始化成功')

    // 2. 测试加载服务器列表
    console.log('\n📋 测试2: 加载服务器列表')
    await loadBalancer.loadServerList()
    console.log(`✅ 服务器列表加载完成，共 ${loadBalancer.serverList.length} 个服务器:`)
    loadBalancer.serverList.forEach((server, index) => {
      console.log(`   ${index + 1}. ${server.url} (${server.type})`)
    })

    // 3. 测试健康检查
    console.log('\n📋 测试3: 执行健康检查')
    loadBalancer.setVerboseLogging(true) // 启用详细日志
    await loadBalancer.refreshHealthStatus()
    loadBalancer.setVerboseLogging(false) // 关闭详细日志
    console.log('✅ 健康检查完成')

    // 显示服务器状态和队列信息
    loadBalancer.serverList.forEach((server, index) => {
      const status = server.healthy === true ? '✅ 健康' :
                    server.healthy === false ? '❌ 异常' : '⏳ 未知'
      const queueText = server.queueInfo.total > 0
        ? `队列: ${server.queueInfo.running}运行/${server.queueInfo.pending}等待`
        : '队列: 空闲'
      console.log(`   ${index + 1}. ${server.url}: ${status} | ${queueText}`)
    })

    // 4. 测试获取最优服务器
    console.log('\n📋 测试4: 获取最优服务器')
    const optimalServer = await loadBalancer.getOptimalServer()
    console.log(`✅ 最优服务器: ${optimalServer}`)

    // 显示选择原因
    const healthyServers = loadBalancer.serverList.filter(s => s.healthy === true)
    if (healthyServers.length > 1) {
      console.log('📊 负载均衡选择依据:')
      healthyServers.forEach(server => {
        const isSelected = server.url === optimalServer
        const marker = isSelected ? '👉' : '  '
        console.log(`${marker} ${server.type}: 队列${server.queueInfo.total}`)
      })
    }

    // 5. 测试服务器选择
    console.log('\n📋 测试5: 选择最优服务器')
    for (let i = 0; i < 3; i++) {
      const selectedServer = await loadBalancer.getOptimalServer()
      console.log(`   第${i + 1}次选择: ${selectedServer}`)

      // 等待1秒
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    console.log('\n✅ 所有测试完成！')

  } catch (error) {
    console.error('❌ 测试失败:', error)
  }
}

/**
 * 测试多次服务器选择，验证负载均衡效果
 */
export async function testLoadBalancing(times = 10) {
  console.log(`🧪 开始测试负载均衡效果 (${times}次选择)...`)

  const selections = new Map()

  try {
    for (let i = 0; i < times; i++) {
      const server = await loadBalancer.getOptimalServer()
      const count = selections.get(server) || 0
      selections.set(server, count + 1)

      console.log(`第${i + 1}次选择: ${server}`)

      // 短暂延迟
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    console.log('\n📊 负载均衡结果统计:')
    for (const [server, count] of selections.entries()) {
      const percentage = ((count / times) * 100).toFixed(1)
      console.log(`   ${server}: ${count}次 (${percentage}%)`)
    }

  } catch (error) {
    console.error('❌ 负载均衡测试失败:', error)
  }
}

/**
 * 模拟用户生图请求的服务器选择
 */
export async function simulateUserRequests(userCount = 5) {
  console.log(`🧪 模拟 ${userCount} 个用户同时发起生图请求...`)

  const promises = []

  for (let i = 0; i < userCount; i++) {
    const promise = (async () => {
      const userId = `用户${i + 1}`
      console.log(`👤 ${userId} 开始选择服务器...`)

      try {
        const server = await loadBalancer.getOptimalServer()
        console.log(`👤 ${userId} 选择了服务器: ${server}`)
        return { userId, server, success: true }
      } catch (error) {
        console.error(`👤 ${userId} 选择服务器失败:`, error)
        return { userId, error: error.message, success: false }
      }
    })()

    promises.push(promise)
  }

  try {
    const results = await Promise.all(promises)

    console.log('\n📊 用户请求结果统计:')
    const serverCounts = new Map()
    let successCount = 0

    results.forEach(result => {
      if (result.success) {
        successCount++
        const count = serverCounts.get(result.server) || 0
        serverCounts.set(result.server, count + 1)
      }
    })

    console.log(`✅ 成功: ${successCount}/${userCount}`)
    console.log('📊 服务器分配:')
    for (const [server, count] of serverCounts.entries()) {
      console.log(`   ${server}: ${count}个用户`)
    }

  } catch (error) {
    console.error('❌ 用户请求模拟失败:', error)
  }
}

/**
 * 测试服务器故障恢复
 */
export async function testServerFailover() {
  console.log('🧪 测试服务器故障恢复...')

  try {
    // 1. 正常选择服务器
    console.log('\n📋 步骤1: 正常选择服务器')
    const normalServer = await loadBalancer.getOptimalServer()
    console.log(`✅ 正常情况下选择: ${normalServer}`)

    // 2. 获取服务器列表
    await loadBalancer.loadServerList()
    const servers = loadBalancer.serverList
    console.log(`📋 当前有 ${servers.length} 个配置的服务器`)

    // 3. 模拟第一个服务器故障
    if (servers.length > 1) {
      console.log('\n📋 步骤2: 模拟服务器故障')

      // 记录第一个服务器故障
      const firstServer = servers[0]
      await loadBalancer.recordFailure(firstServer.url, 'simulated')
      console.log(`⚠️ 模拟服务器故障: ${firstServer.url}`)

      // 重新选择服务器
      const fallbackServer = await loadBalancer.getOptimalServer()
      console.log(`✅ 故障转移后选择: ${fallbackServer}`)

      // 刷新健康状态以恢复
      console.log('🔄 刷新健康状态...')
      await loadBalancer.refreshHealthStatus()
    } else {
      console.log('⚠️ 只有一个服务器，无法测试故障转移')
    }

  } catch (error) {
    console.error('❌ 服务器故障恢复测试失败:', error)
  }
}

// 添加全局测试方法
if (typeof window !== 'undefined') {
  window.testSimpleLoadBalancer = testSimpleLoadBalancer
  window.testLoadBalancing = testLoadBalancing
  window.simulateUserRequests = simulateUserRequests
  window.testServerFailover = testServerFailover

  console.log('🔧 极简负载均衡器测试工具已加载')
  console.log('可用的测试方法:')
  console.log('  - window.testSimpleLoadBalancer() - 基本功能测试')
  console.log('  - window.testLoadBalancing(10) - 负载均衡效果测试')
  console.log('  - window.simulateUserRequests(5) - 模拟用户请求')
  console.log('  - window.testServerFailover() - 服务器故障恢复测试')
}

export default {
  testSimpleLoadBalancer,
  testLoadBalancing,
  simulateUserRequests,
  testServerFailover
}
