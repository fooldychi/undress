// 测试简化的负载均衡策略

// 简化的测试，直接模拟ComfyUIServerManager类
class ComfyUIServerManager {
  constructor() {
    this.servers = []
    this.serverLoads = new Map()
    this.lockedServer = null
    this.lastLockTime = 0
    this.isCheckingServers = false
    this.config = null
  }

  async initialize() {
    this.servers = [
      this.config.COMFYUI_SERVER_URL,
      ...this.config.BACKUP_SERVERS
    ]
    console.log('🔧 服务器管理器初始化完成')
  }

  async updateServerLoads() {
    // 模拟实现
    console.log('🔄 更新服务器负载信息...')
  }

  async checkServerHealth(serverUrl) {
    // 模拟实现
    return { healthy: true, status: 200, message: 'OK' }
  }

  async getServerQueueInfo(serverUrl) {
    // 模拟实现
    return { running: 0, pending: 0, total: 0, healthy: true, supportsQueueAPI: true }
  }

  async selectServerByMinQueue() {
    // 模拟实现
    return this.servers[0]
  }

  async fallbackToHealthyServer() {
    // 模拟实现
    return this.servers[0]
  }

  async getLockedAvailableServer() {
    // 模拟实现
    return this.servers[0]
  }

  async recordFailure() {
    // 模拟实现
    console.log('📝 记录服务器失败')
    return false
  }
}

// 模拟配置
const testConfig = {
  COMFYUI_SERVER_URL: 'https://main-server.com',
  BACKUP_SERVERS: ['https://backup1.com', 'https://backup2.com'],
  AUTO_SWITCH: true,
  HEALTH_CHECK_TIMEOUT: 5000,
  TIMEOUT: 30000
}

// 模拟服务器响应
const mockServerResponses = {
  'https://main-server.com': {
    healthy: true,
    queueInfo: { running: 2, pending: 3, total: 5 }
  },
  'https://backup1.com': {
    healthy: true,
    queueInfo: { running: 1, pending: 1, total: 2 }
  },
  'https://backup2.com': {
    healthy: true,
    queueInfo: { running: 0, pending: 1, total: 1 }
  }
}

// 创建测试服务器管理器
class TestServerManager extends ComfyUIServerManager {
  constructor() {
    super()
    this.config = testConfig
    this.servers = [
      testConfig.COMFYUI_SERVER_URL,
      ...testConfig.BACKUP_SERVERS
    ]
  }

  // 模拟健康检查
  async checkServerHealth(serverUrl) {
    const mock = mockServerResponses[serverUrl]
    if (mock) {
      console.log(`🔍 模拟健康检查: ${serverUrl} - ${mock.healthy ? '健康' : '不健康'}`)
      return { healthy: mock.healthy, status: 200, message: 'OK' }
    }
    return { healthy: false, status: 0, message: 'Server not found' }
  }

  // 模拟队列信息获取
  async getServerQueueInfo(serverUrl) {
    const mock = mockServerResponses[serverUrl]
    if (mock && mock.healthy) {
      console.log(`📊 模拟队列信息: ${serverUrl} - 总计: ${mock.queueInfo.total}`)
      return {
        ...mock.queueInfo,
        healthy: true,
        supportsQueueAPI: true
      }
    }
    return {
      running: 0,
      pending: 0,
      total: 0,
      healthy: false,
      supportsQueueAPI: false,
      error: 'Server unavailable'
    }
  }
}

// 测试函数
async function testSimplifiedLoadBalancing() {
  console.log('🧪 测试简化的负载均衡策略...\n')

  const serverManager = new TestServerManager()
  await serverManager.initialize()

  console.log('📋 测试场景: 3个服务器，队列数量分别为 5, 2, 1')
  console.log('预期结果: 应该选择队列数量最少的服务器 (backup2.com)\n')

  try {
    // 测试1: 选择队列最少的服务器
    console.log('🔍 测试1: 选择队列最少的服务器')
    const selectedServer = await serverManager.selectServerByMinQueue()
    console.log(`✅ 选择的服务器: ${selectedServer}`)

    if (selectedServer === 'https://backup2.com') {
      console.log('✅ 测试1通过: 正确选择了队列最少的服务器\n')
    } else {
      console.log('❌ 测试1失败: 没有选择队列最少的服务器\n')
    }

    // 测试2: 锁定策略
    console.log('🔍 测试2: 测试锁定策略')
    const lockedServer1 = await serverManager.getLockedAvailableServer()
    console.log(`🔒 第一次锁定: ${lockedServer1}`)

    const lockedServer2 = await serverManager.getLockedAvailableServer()
    console.log(`🔒 第二次锁定: ${lockedServer2}`)

    if (lockedServer1 === lockedServer2) {
      console.log('✅ 测试2通过: 锁定策略正常工作\n')
    } else {
      console.log('❌ 测试2失败: 锁定策略异常\n')
    }

    // 测试3: 服务器失败处理
    console.log('🔍 测试3: 测试服务器失败处理')

    // 模拟当前服务器失败
    mockServerResponses['https://backup2.com'].healthy = false

    // 清除锁定，强制重新选择
    serverManager.lockedServer = null

    const newSelectedServer = await serverManager.selectServerByMinQueue()
    console.log(`🔄 失败后选择的服务器: ${newSelectedServer}`)

    if (newSelectedServer === 'https://backup1.com') {
      console.log('✅ 测试3通过: 正确处理服务器失败并选择下一个最佳服务器\n')
    } else {
      console.log('❌ 测试3失败: 服务器失败处理异常\n')
    }

    // 测试4: 回退机制
    console.log('🔍 测试4: 测试回退机制（所有服务器都不支持队列API）')

    // 模拟所有服务器都不支持队列API
    Object.keys(mockServerResponses).forEach(url => {
      mockServerResponses[url].queueInfo = null
    })

    // 重置服务器状态
    mockServerResponses['https://main-server.com'].healthy = true
    mockServerResponses['https://backup1.com'].healthy = true
    mockServerResponses['https://backup2.com'].healthy = true

    // 重写队列信息获取方法以模拟不支持队列API
    serverManager.getServerQueueInfo = async function(serverUrl) {
      return {
        running: 0,
        pending: 0,
        total: 0,
        healthy: false,
        supportsQueueAPI: false,
        error: 'Queue API not supported'
      }
    }

    serverManager.lockedServer = null
    serverManager.serverLoads.clear()

    const fallbackServer = await serverManager.selectServerByMinQueue()
    console.log(`🔄 回退选择的服务器: ${fallbackServer}`)

    if (fallbackServer === 'https://main-server.com') {
      console.log('✅ 测试4通过: 回退机制正常工作，选择了主服务器\n')
    } else {
      console.log('❌ 测试4失败: 回退机制异常\n')
    }

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error)
  }

  console.log('🏁 简化负载均衡策略测试完成')
}

// 运行测试
if (require.main === module) {
  testSimplifiedLoadBalancing().catch(console.error)
}

module.exports = { testSimplifiedLoadBalancing }
