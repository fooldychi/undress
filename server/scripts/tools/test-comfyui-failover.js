// 测试ComfyUI请求失败转移功能
const fetch = require('node-fetch')

// 模拟ComfyUI配置
const mockConfig = {
  COMFYUI_SERVER_URL: 'https://invalid-server-1.com',  // 故意设置无效服务器
  BACKUP_SERVERS: ['https://invalid-server-2.com', 'https://httpbin.org'],  // 最后一个是有效的测试服务器
  AUTO_SWITCH: true,
  HEALTH_CHECK_TIMEOUT: 5000,
  RETRY_ATTEMPTS: 3,
  SWITCH_THRESHOLD: 1,
  TIMEOUT: 10000
}

// 简化的服务器管理器
class TestServerManager {
  constructor() {
    this.currentServerIndex = 0
    this.servers = []
    this.failureCount = {}
    this.config = mockConfig
  }

  initialize() {
    this.servers = [this.config.COMFYUI_SERVER_URL, ...this.config.BACKUP_SERVERS]
    this.servers.forEach((server, index) => {
      this.failureCount[index] = 0
    })
    console.log('🔧 服务器管理器初始化完成')
    console.log(`📡 主服务器: ${this.servers[0]}`)
    console.log(`🔄 备用服务器: ${this.servers.slice(1).join(', ')}`)
  }

  getCurrentServerUrl() {
    return this.servers[this.currentServerIndex]
  }

  getCurrentServerInfo() {
    return {
      url: this.getCurrentServerUrl(),
      index: this.currentServerIndex,
      isMainServer: this.currentServerIndex === 0,
      failureCount: this.failureCount[this.currentServerIndex] || 0,
      totalServers: this.servers.length
    }
  }

  async checkServerHealth(serverUrl) {
    try {
      console.log(`🔍 检查服务器健康状态: ${serverUrl}`)
      
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), this.config.HEALTH_CHECK_TIMEOUT)

      // 对于测试，我们使用一个简单的GET请求
      const testUrl = serverUrl.includes('httpbin.org') ? `${serverUrl}/get` : `${serverUrl}/system_stats`
      
      const response = await fetch(testUrl, {
        method: 'GET',
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (response.ok) {
        console.log(`✅ 服务器健康: ${serverUrl}`)
        return { healthy: true, status: response.status, message: 'OK' }
      } else {
        console.log(`⚠️ 服务器响应异常: ${serverUrl} - ${response.status}`)
        return { healthy: false, status: response.status, message: `HTTP ${response.status}` }
      }
    } catch (error) {
      console.log(`❌ 服务器不可用: ${serverUrl} - ${error.message}`)
      return { healthy: false, status: 0, message: error.message }
    }
  }

  async recordFailure() {
    const index = this.currentServerIndex
    this.failureCount[index] = (this.failureCount[index] || 0) + 1
    
    console.log(`📊 服务器失败记录: ${this.servers[index]} - 失败次数: ${this.failureCount[index]}`)
    
    if (this.config.AUTO_SWITCH) {
      console.log(`🔄 服务器失败，开始切换到备用服务器...`)
      const switched = await this.switchToNextServer()
      if (switched) {
        console.log(`✅ 已切换到备用服务器: ${this.getCurrentServerUrl()}`)
      } else {
        console.log(`❌ 没有可用的备用服务器`)
      }
      return switched
    }
    
    return false
  }

  async switchToNextServer() {
    if (this.servers.length <= 1) {
      console.log('⚠️ 没有备用服务器可切换')
      return false
    }

    const originalIndex = this.currentServerIndex
    let attempts = 0
    const maxAttempts = this.servers.length

    while (attempts < maxAttempts) {
      this.currentServerIndex = (this.currentServerIndex + 1) % this.servers.length
      attempts++

      const newServerUrl = this.getCurrentServerUrl()
      console.log(`🔄 尝试切换到服务器 ${this.currentServerIndex + 1}: ${newServerUrl}`)

      const healthCheck = await this.checkServerHealth(newServerUrl)
      
      if (healthCheck.healthy) {
        console.log(`✅ 成功切换到服务器: ${newServerUrl}`)
        this.failureCount[this.currentServerIndex] = 0
        return true
      } else {
        console.log(`❌ 服务器不健康，继续寻找: ${newServerUrl}`)
        this.failureCount[this.currentServerIndex] = (this.failureCount[this.currentServerIndex] || 0) + 1
      }
    }

    this.currentServerIndex = originalIndex
    console.log('❌ 所有服务器都不可用，回到原始服务器')
    return false
  }
}

// 模拟ComfyUI请求函数
async function makeComfyUIRequest(url, options = {}, retryCount = 0, serverManager) {
  const maxRetries = serverManager.config.RETRY_ATTEMPTS || 3
  
  try {
    console.log(`🌐 ComfyUI请求: ${url} (尝试 ${retryCount + 1}/${maxRetries + 1})`)
    
    const response = await fetch(url, {
      timeout: serverManager.config.TIMEOUT || 10000,
      ...options
    })

    if (response.ok) {
      console.log(`✅ 请求成功: ${response.status}`)
      return response
    } else {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
  } catch (error) {
    console.error(`❌ ComfyUI请求失败: ${error.message}`)
    
    // 记录失败并尝试切换服务器
    const switched = await serverManager.recordFailure()
    
    // 如果还有重试次数，尝试重试
    if (retryCount < maxRetries) {
      if (switched) {
        console.log(`🔄 已切换服务器，立即重试...`)
      } else {
        console.log(`🔄 2000ms后重试...`)
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
      
      // 重新获取API基础URL（可能已经切换服务器）
      const newBaseUrl = serverManager.getCurrentServerUrl()
      const newUrl = url.replace(/^https?:\/\/[^\/]+/, newBaseUrl)
      
      return makeComfyUIRequest(newUrl, options, retryCount + 1, serverManager)
    }
    
    throw error
  }
}

// 测试函数
async function testComfyUIFailover() {
  console.log('🧪 测试ComfyUI故障转移功能...\n')
  
  try {
    // 初始化服务器管理器
    const serverManager = new TestServerManager()
    serverManager.initialize()
    
    console.log('\n📋 初始服务器状态:')
    const initialInfo = serverManager.getCurrentServerInfo()
    console.log(`   当前服务器: ${initialInfo.url}`)
    console.log(`   服务器索引: ${initialInfo.index}`)
    console.log(`   是否主服务器: ${initialInfo.isMainServer}`)
    
    // 模拟ComfyUI请求（使用无效的主服务器）
    console.log('\n📋 开始模拟ComfyUI请求...')
    const testUrl = `${serverManager.getCurrentServerUrl()}/system_stats`
    
    try {
      const response = await makeComfyUIRequest(testUrl, { method: 'GET' }, 0, serverManager)
      console.log('✅ 请求最终成功')
      
      const finalInfo = serverManager.getCurrentServerInfo()
      console.log('\n📋 最终服务器状态:')
      console.log(`   当前服务器: ${finalInfo.url}`)
      console.log(`   服务器索引: ${finalInfo.index}`)
      console.log(`   是否主服务器: ${finalInfo.isMainServer}`)
      
    } catch (error) {
      console.error('❌ 所有服务器都失败了:', error.message)
    }
    
    console.log('\n🎉 故障转移测试完成！')
    
  } catch (error) {
    console.error('❌ 测试失败:', error)
  }
}

// 运行测试
testComfyUIFailover()
