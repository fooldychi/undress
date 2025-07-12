// 配置测试工具
import configService from '../services/configService.js'
import loadBalancer from '../services/loadBalancer.js'
import { getCurrentConfig } from '../services/comfyui.js'
import { API_CONFIG } from '../services/api.js'

/**
 * 测试配置服务功能
 */
export async function testConfigService() {
  console.log('🧪 开始测试配置服务...')

  try {
    // 1. 测试获取服务端配置
    console.log('\n1️⃣ 测试获取服务端配置...')
    const serverConfig = await configService.getConfig(true) // 强制刷新
    console.log('✅ 服务端配置:', serverConfig)

    // 2. 测试同步ComfyUI配置
    console.log('\n2️⃣ 测试同步ComfyUI配置...')
    const syncResult = await configService.syncComfyUIConfig()
    console.log('✅ 同步结果:', syncResult)

    // 3. 检查本地ComfyUI配置
    console.log('\n3️⃣ 检查本地ComfyUI配置...')
    const localConfig = getCurrentConfig()
    console.log('✅ 本地配置:', localConfig)

    // 4. 检查API配置是否已更新
    console.log('\n4️⃣ 检查API配置...')
    console.log('✅ API配置:', {
      BASE_URL: API_CONFIG.BASE_URL,
      CLIENT_ID: API_CONFIG.CLIENT_ID,
      TIMEOUT: API_CONFIG.TIMEOUT
    })

    // 5. 测试AI积分配置
    console.log('\n5️⃣ 测试AI积分配置...')
    const pointsConfig = await configService.getAIPointsConfig()
    console.log('✅ AI积分配置:', pointsConfig)

    // 6. 测试前端配置
    console.log('\n6️⃣ 测试前端配置...')
    const frontendConfig = await configService.getFrontendConfig()
    console.log('✅ 前端配置:', frontendConfig)

    console.log('\n🎉 配置服务测试完成！')
    return true

  } catch (error) {
    console.error('❌ 配置服务测试失败:', error)
    return false
  }
}

/**
 * 比较配置差异
 */
export function compareConfigs(config1, config2, label1 = '配置1', label2 = '配置2') {
  console.log(`\n🔍 比较 ${label1} 和 ${label2}:`)

  const keys = new Set([...Object.keys(config1), ...Object.keys(config2)])

  for (const key of keys) {
    const val1 = config1[key]
    const val2 = config2[key]

    if (val1 !== val2) {
      console.log(`  🔄 ${key}:`)
      console.log(`    ${label1}: ${val1}`)
      console.log(`    ${label2}: ${val2}`)
    } else {
      console.log(`  ✅ ${key}: ${val1}`)
    }
  }
}

/**
 * 显示当前所有配置状态
 */
export async function showAllConfigs() {
  console.log('\n📋 当前所有配置状态:')

  try {
    // 服务端配置
    const serverConfig = await configService.getConfig()
    console.log('\n🌐 服务端配置:')
    Object.entries(serverConfig).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`)
    })

    // 本地ComfyUI配置
    const localConfig = getCurrentConfig()
    console.log('\n💾 本地ComfyUI配置:')
    Object.entries(localConfig).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`)
    })

    // API配置
    console.log('\n🔗 API配置:')
    console.log(`  BASE_URL: ${API_CONFIG.BASE_URL}`)
    console.log(`  CLIENT_ID: ${API_CONFIG.CLIENT_ID}`)
    console.log(`  TIMEOUT: ${API_CONFIG.TIMEOUT}`)

    // localStorage中的配置
    const savedConfig = localStorage.getItem('comfyui_config')
    if (savedConfig) {
      console.log('\n💿 localStorage配置:')
      const parsed = JSON.parse(savedConfig)
      Object.entries(parsed).forEach(([key, value]) => {
        console.log(`  ${key}: ${value}`)
      })
    } else {
      console.log('\n💿 localStorage: 无保存的配置')
    }

  } catch (error) {
    console.error('❌ 获取配置状态失败:', error)
  }
}

/**
 * 测试负载均衡器功能
 */
export async function testLoadBalancer() {
  console.log('🧪 开始测试负载均衡器...')

  try {
    // 1. 测试负载均衡器初始化
    console.log('\n1️⃣ 测试负载均衡器初始化...')
    await loadBalancer.initialize()
    console.log('✅ 负载均衡器初始化成功')

    // 2. 获取服务器统计信息
    console.log('\n2️⃣ 获取服务器统计信息...')
    const stats = loadBalancer.getServerStats()
    console.log('✅ 服务器统计:', stats)

    // 3. 测试服务器选择
    console.log('\n3️⃣ 测试服务器选择...')
    for (let i = 0; i < 3; i++) {
      const selectedServer = await loadBalancer.getOptimalServer()
      console.log(`   第${i + 1}次选择: ${selectedServer}`)
    }

    // 4. 测试服务器健康检查
    console.log('\n4️⃣ 测试服务器健康检查...')
    for (const server of stats.servers) {
      const health = await loadBalancer.checkServerHealth(server.url)
      console.log(`   ${server.url}: ${health.healthy ? '✅ 健康' : '❌ 不健康'}`)
    }

    // 5. 测试队列信息获取
    console.log('\n5️⃣ 测试队列信息获取...')
    for (const server of stats.servers) {
      const queue = await loadBalancer.getServerQueueInfo(server.url)
      console.log(`   ${server.url}: 队列=${queue.total}, 支持API=${queue.supportsQueueAPI}`)
    }

    console.log('\n🎉 负载均衡器测试完成！')
    return true

  } catch (error) {
    console.error('❌ 负载均衡器测试失败:', error)
    return false
  }
}

/**
 * 模拟服务器故障测试
 */
export async function testServerFailover() {
  console.log('🧪 开始测试服务器故障转移...')

  try {
    const stats = loadBalancer.getServerStats()

    if (stats.servers.length < 2) {
      console.warn('⚠️ 需要至少2个服务器才能测试故障转移')
      return false
    }

    // 1. 获取当前选择的服务器
    console.log('\n1️⃣ 获取当前服务器...')
    const currentServer = await loadBalancer.getOptimalServer()
    console.log(`当前服务器: ${currentServer}`)

    // 2. 模拟服务器故障
    console.log('\n2️⃣ 模拟服务器故障...')
    await loadBalancer.recordFailure(currentServer)
    console.log(`已记录服务器故障: ${currentServer}`)

    // 3. 重新选择服务器
    console.log('\n3️⃣ 重新选择服务器...')
    const newServer = await loadBalancer.getOptimalServer()
    console.log(`新选择的服务器: ${newServer}`)

    if (newServer !== currentServer) {
      console.log('✅ 故障转移测试成功')
      return true
    } else {
      console.log('❌ 故障转移测试失败 - 仍然选择了相同的服务器')
      return false
    }

  } catch (error) {
    console.error('❌ 故障转移测试失败:', error)
    return false
  }
}

// 在开发环境下自动暴露到全局
if (import.meta.env.DEV) {
  window.testConfigService = testConfigService
  window.testLoadBalancer = testLoadBalancer
  window.testServerFailover = testServerFailover
  window.compareConfigs = compareConfigs
  window.showAllConfigs = showAllConfigs
  window.configService = configService
  window.loadBalancer = loadBalancer

  console.log('🛠️ 配置测试工具已加载到全局:')
  console.log('  - window.testConfigService() - 测试配置服务')
  console.log('  - window.testLoadBalancer() - 测试负载均衡器')
  console.log('  - window.testServerFailover() - 测试故障转移')
  console.log('  - window.showAllConfigs() - 显示所有配置')
  console.log('  - window.compareConfigs(c1, c2) - 比较配置')
  console.log('  - window.configService - 配置服务实例')
  console.log('  - window.loadBalancer - 负载均衡器实例')
}
