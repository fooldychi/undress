// ComfyUI 负载均衡器 - 基于任务队列的智能选择
import configService from './configService.js'

/**
 * ComfyUI 负载均衡器
 * 根据服务器任务队列情况选择最优服务器
 */
class ComfyUILoadBalancer {
  constructor() {
    this.servers = []
    this.serverLoads = new Map()
    this.lockedServer = null
    this.lastLockTime = 0
    this.lockDuration = 30000 // 30秒锁定时间
    this.healthCheckTimeout = 10000 // 10秒健康检查超时
    this.queueCheckTimeout = 5000 // 5秒队列检查超时
    this.lastUpdateTime = 0
    this.updateInterval = 15000 // 15秒更新间隔
  }

  /**
   * 初始化负载均衡器
   */
  async initialize() {
    try {
      console.log('🚀 初始化 ComfyUI 负载均衡器...')

      // 获取服务器配置
      const config = await configService.getConfig()

      // 构建服务器列表
      this.servers = []

      // 主服务器
      if (config['comfyui.server_url']) {
        this.servers.push({
          url: config['comfyui.server_url'],
          type: 'primary',
          priority: 1
        })
      }

      // 备用服务器
      if (config['comfyui.backup_servers']) {
        const backupServers = config['comfyui.backup_servers']
          .split('\n')
          .map(url => url.trim())
          .filter(url => url && url.startsWith('http'))

        backupServers.forEach((url, index) => {
          this.servers.push({
            url,
            type: 'backup',
            priority: index + 2
          })
        })
      }

      // 如果没有配置服务器，使用默认配置
      if (this.servers.length === 0) {
        console.warn('⚠️ 未找到配置的服务器，使用默认配置')
        // 从本地配置获取默认服务器
        const localConfig = JSON.parse(localStorage.getItem('comfyui_config') || '{}')
        const defaultUrl = localConfig.COMFYUI_SERVER_URL || 'https://your-comfyui-server.com'

        this.servers.push({
          url: defaultUrl,
          type: 'primary',
          priority: 1
        })
      }

      console.log(`✅ 发现 ${this.servers.length} 个 ComfyUI 服务器:`)
      this.servers.forEach((server, index) => {
        console.log(`   ${index + 1}. ${server.url} (${server.type})`)
      })

      // 初始化服务器负载信息
      await this.updateServerLoads()

      console.log('✅ ComfyUI 负载均衡器初始化完成')

    } catch (error) {
      console.error('❌ 负载均衡器初始化失败:', error)
      // 不抛出错误，允许应用继续运行
      console.log('🔄 使用降级模式，将使用单服务器配置')
    }
  }

  /**
   * 更新所有服务器的负载信息
   */
  async updateServerLoads() {
    const now = Date.now()

    // 如果距离上次更新时间不足间隔，跳过更新
    if (now - this.lastUpdateTime < this.updateInterval) {
      console.log('⏭️ 跳过负载更新，距离上次更新时间不足')
      return
    }

    console.log('🔄 更新服务器负载信息...')

    const updatePromises = this.servers.map(async (server) => {
      try {
        // 并行检查健康状态和队列信息
        const [healthResult, queueResult] = await Promise.allSettled([
          this.checkServerHealth(server.url),
          this.getServerQueueInfo(server.url)
        ])

        const health = healthResult.status === 'fulfilled' ? healthResult.value : { healthy: false }
        const queue = queueResult.status === 'fulfilled' ? queueResult.value : { total: 999, healthy: false }

        this.serverLoads.set(server.url, {
          ...server,
          healthy: health.healthy && queue.healthy,
          queue: queue,
          lastCheck: now,
          responseTime: health.responseTime || 0
        })

        console.log(`📊 ${server.url}: 健康=${health.healthy}, 队列=${queue.total || 0}`)

      } catch (error) {
        console.error(`❌ 更新服务器负载失败 ${server.url}:`, error)
        this.serverLoads.set(server.url, {
          ...server,
          healthy: false,
          queue: { total: 999, healthy: false },
          lastCheck: now,
          error: error.message
        })
      }
    })

    await Promise.allSettled(updatePromises)
    this.lastUpdateTime = now

    console.log('✅ 服务器负载信息更新完成')
  }

  /**
   * 检查服务器健康状态
   */
  async checkServerHealth(serverUrl) {
    try {
      const startTime = Date.now()

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), this.healthCheckTimeout)

      const response = await fetch(`${serverUrl}/system_stats`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json'
        }
      })

      clearTimeout(timeoutId)
      const responseTime = Date.now() - startTime

      if (response.ok) {
        return { healthy: true, responseTime, status: response.status }
      } else {
        return { healthy: false, responseTime, status: response.status }
      }

    } catch (error) {
      console.warn(`⚠️ 健康检查失败 ${serverUrl}:`, error.message)
      return { healthy: false, error: error.message }
    }
  }

  /**
   * 获取服务器队列信息
   */
  async getServerQueueInfo(serverUrl) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), this.queueCheckTimeout)

      const response = await fetch(`${serverUrl}/queue`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json'
        }
      })

      clearTimeout(timeoutId)

      if (response.ok) {
        const queueData = await response.json()

        // ComfyUI 队列 API 返回格式: { queue_running: [...], queue_pending: [...] }
        const running = queueData.queue_running ? queueData.queue_running.length : 0
        const pending = queueData.queue_pending ? queueData.queue_pending.length : 0
        const total = running + pending

        return {
          running,
          pending,
          total,
          healthy: true,
          supportsQueueAPI: true
        }
      } else {
        // 如果队列 API 不可用，尝试使用系统状态作为备用
        return await this.getServerQueueInfoFallback(serverUrl)
      }

    } catch (error) {
      console.warn(`⚠️ 队列信息获取失败 ${serverUrl}:`, error.message)
      return await this.getServerQueueInfoFallback(serverUrl)
    }
  }

  /**
   * 备用队列信息获取方法
   */
  async getServerQueueInfoFallback(serverUrl) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), this.queueCheckTimeout)

      const response = await fetch(`${serverUrl}/system_stats`, {
        method: 'GET',
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (response.ok) {
        // 如果无法获取精确队列信息，假设服务器可用但队列未知
        return {
          running: 0,
          pending: 0,
          total: 0,
          healthy: true,
          supportsQueueAPI: false
        }
      }
    } catch (error) {
      // 忽略错误
    }

    return {
      running: 0,
      pending: 0,
      total: 999, // 高值表示不可用
      healthy: false,
      supportsQueueAPI: false
    }
  }

  /**
   * 根据最小队列选择服务器
   */
  async selectServerByMinQueue() {
    try {
      console.log('🎯 开始选择最优服务器...')

      // 检查是否有锁定的服务器
      if (this.isServerLocked()) {
        const lockedServer = this.getLockedServer()
        if (lockedServer) {
          console.log(`🔒 使用锁定的服务器: ${lockedServer}`)
          return lockedServer
        }
      }

      // 更新服务器负载信息
      await this.updateServerLoads()

      // 获取所有健康的服务器
      const healthyServers = Array.from(this.serverLoads.values())
        .filter(server => server.healthy)
        .sort((a, b) => {
          // 首先按队列数量排序
          const queueDiff = (a.queue.total || 0) - (b.queue.total || 0)
          if (queueDiff !== 0) return queueDiff

          // 队列相同时按优先级排序
          return a.priority - b.priority
        })

      if (healthyServers.length === 0) {
        console.warn('⚠️ 没有健康的服务器可用')
        return await this.fallbackToAnyServer()
      }

      const selectedServer = healthyServers[0]
      console.log(`✅ 选择服务器: ${selectedServer.url} (队列: ${selectedServer.queue.total || 0})`)

      // 锁定选中的服务器
      this.lockServer(selectedServer.url)

      return selectedServer.url

    } catch (error) {
      console.error('❌ 服务器选择失败:', error)
      return await this.fallbackToAnyServer()
    }
  }

  /**
   * 备用服务器选择
   */
  async fallbackToAnyServer() {
    console.log('🔄 使用备用服务器选择策略...')

    // 按优先级返回第一个服务器
    if (this.servers.length > 0) {
      const fallbackServer = this.servers[0].url
      console.log(`🆘 备用服务器: ${fallbackServer}`)
      return fallbackServer
    }

    // 如果没有配置的服务器，尝试多种方式获取默认值
    try {
      const config = await configService.getConfig()
      const defaultServer = config['comfyui.server_url']

      if (defaultServer && defaultServer !== 'https://your-comfyui-server.com') {
        console.log(`🆘 配置服务默认服务器: ${defaultServer}`)
        return defaultServer
      }
    } catch (error) {
      console.warn('⚠️ 无法从配置服务获取默认服务器:', error)
    }

    // 从本地存储获取
    try {
      const localConfig = JSON.parse(localStorage.getItem('comfyui_config') || '{}')
      if (localConfig.COMFYUI_SERVER_URL) {
        console.log(`🆘 本地配置服务器: ${localConfig.COMFYUI_SERVER_URL}`)
        return localConfig.COMFYUI_SERVER_URL
      }
    } catch (error) {
      console.warn('⚠️ 无法从本地存储获取服务器配置:', error)
    }

    // 最后的备用方案
    const fallbackUrl = 'https://your-comfyui-server.com'
    console.log(`🆘 使用最后备用服务器: ${fallbackUrl}`)
    return fallbackUrl
  }

  /**
   * 锁定服务器
   */
  lockServer(serverUrl) {
    this.lockedServer = serverUrl
    this.lastLockTime = Date.now()
    console.log(`🔒 锁定服务器: ${serverUrl}, 持续 ${this.lockDuration / 1000} 秒`)

    // 显示当前所有服务器状态
    this.logServerStatus()
  }

  /**
   * 检查服务器是否被锁定
   */
  isServerLocked() {
    if (!this.lockedServer) return false

    const now = Date.now()
    const isLocked = (now - this.lastLockTime) < this.lockDuration

    if (!isLocked) {
      console.log('🔓 服务器锁定已过期')
      this.lockedServer = null
      this.lastLockTime = 0
    }

    return isLocked
  }

  /**
   * 获取锁定的服务器
   */
  getLockedServer() {
    if (this.isServerLocked()) {
      return this.lockedServer
    }
    return null
  }

  /**
   * 记录服务器失败
   */
  async recordFailure(serverUrl) {
    console.log(`📝 记录服务器失败: ${serverUrl}`)

    // 如果失败的是当前锁定的服务器，解除锁定
    if (this.lockedServer === serverUrl) {
      console.log('🔓 解除失败服务器的锁定')
      this.lockedServer = null
      this.lastLockTime = 0
    }

    // 标记服务器为不健康
    if (this.serverLoads.has(serverUrl)) {
      const serverInfo = this.serverLoads.get(serverUrl)
      serverInfo.healthy = false
      serverInfo.lastFailure = Date.now()
      this.serverLoads.set(serverUrl, serverInfo)
    }

    // 强制更新服务器负载信息
    this.lastUpdateTime = 0
  }

  /**
   * 获取最优服务器（主要接口）
   */
  async getOptimalServer() {
    return await this.selectServerByMinQueue()
  }

  /**
   * 显示服务器状态
   */
  logServerStatus() {
    console.log('📊 当前所有服务器状态:')
    for (const [url, info] of this.serverLoads.entries()) {
      const status = info.healthy ? '✅' : '❌'
      const queue = info.healthy ? `队列:${info.queue.total || 0}` : '不健康'
      const locked = url === this.lockedServer ? '🔒' : ''
      const priority = `优先级:${info.priority}`
      console.log(`   ${status} ${url} ${queue} ${priority} ${locked}`)
    }
  }

  /**
   * 获取服务器统计信息
   */
  getServerStats() {
    const stats = {
      total: this.servers.length,
      healthy: 0,
      locked: this.lockedServer,
      servers: []
    }

    for (const [url, info] of this.serverLoads.entries()) {
      if (info.healthy) stats.healthy++

      stats.servers.push({
        url,
        healthy: info.healthy,
        queue: info.queue.total || 0,
        priority: info.priority,
        type: info.type,
        locked: url === this.lockedServer
      })
    }

    return stats
  }
}

// 创建单例实例
const loadBalancer = new ComfyUILoadBalancer()

export default loadBalancer
