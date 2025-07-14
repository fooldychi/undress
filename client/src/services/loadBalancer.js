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
    this.lockDuration = 15000 // 缩短锁定时间到15秒
    this.healthCheckTimeout = 10000 // 10秒健康检查超时
    this.queueCheckTimeout = 6000 // 6秒队列检查超时
    this.lastUpdateTime = 0
    this.updateInterval = 8000 // 8秒更新间隔（更频繁的更新）
    this.forceUpdateThreshold = 20000 // 20秒强制更新阈值
    this.failureThreshold = 2 // 连续失败2次后标记为不健康
    this.serverFailures = new Map() // 记录服务器失败次数
    this.healthMonitorInterval = null // 健康监控定时器
    this.healthMonitorFrequency = 30000 // 30秒检查一次健康状态

    // WebSocket专用锁定机制
    this.webSocketLockedServer = null
    this.webSocketLockTime = 0
    this.webSocketLockDuration = 300000 // WebSocket锁定5分钟，因为是长连接
  }

  /**
   * 初始化负载均衡器
   */
  async initialize() {
    try {
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
        // 从本地配置获取默认服务器
        const localConfig = JSON.parse(localStorage.getItem('comfyui_config') || '{}')
        const defaultUrl = localConfig.COMFYUI_SERVER_URL || 'https://your-comfyui-server.com'

        this.servers.push({
          url: defaultUrl,
          type: 'primary',
          priority: 1
        })
      }

      // 初始化服务器负载信息
      await this.updateServerLoads()

      // 启动健康监控
      this.startHealthMonitoring()

    } catch (error) {
      console.error('负载均衡器初始化失败:', error)
      // 不抛出错误，允许应用继续运行
    }
  }

  /**
   * 更新所有服务器的负载信息
   */
  async updateServerLoads(forceUpdate = false) {
    const now = Date.now()

    // 如果距离上次更新时间不足间隔，跳过更新（除非强制更新或超过强制更新阈值）
    if (!forceUpdate && now - this.lastUpdateTime < this.updateInterval && now - this.lastUpdateTime < this.forceUpdateThreshold) {
      return
    }

    // 如果超过强制更新阈值，强制更新
    if (now - this.lastUpdateTime > this.forceUpdateThreshold) {
      forceUpdate = true
    }

    const updatePromises = this.servers.map(async (server) => {
      try {
        // 并行检查健康状态和队列信息
        const [healthResult, queueResult] = await Promise.allSettled([
          this.checkServerHealth(server.url),
          this.getServerQueueInfo(server.url)
        ])

        const health = healthResult.status === 'fulfilled' ? healthResult.value : { healthy: false }
        const queue = queueResult.status === 'fulfilled' ? queueResult.value : { total: 999, healthy: false }

        // 更智能的健康状态判断
        const isHealthy = this.determineServerHealth(health, queue, server)

        // 如果服务器恢复健康，重置失败计数
        if (isHealthy && this.serverFailures.has(server.url)) {
          this.resetFailureCount(server.url)
        }

        this.serverLoads.set(server.url, {
          ...server,
          healthy: isHealthy,
          queue: queue,
          lastCheck: now,
          responseTime: health.responseTime || 0,
          healthDetails: { health, queue },
          failureCount: this.serverFailures.get(server.url) || 0
        })

      } catch (error) {
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
   * 更智能的服务器健康状态判断
   */
  determineServerHealth(health, queue, server) {
    // 如果健康检查完全失败，标记为不健康
    if (!health.healthy) {
      return false
    }

    // 如果队列检查失败但健康检查通过，仍然认为服务器可用
    // 这样可以避免因为队列API不可用而错误地标记服务器为不健康
    if (!queue.healthy) {
      console.log(`⚠️ 服务器 ${server.url} 队列检查失败，但健康检查通过，仍标记为可用`)
      return true
    }

    // 如果队列过长（超过10个任务），降低优先级但不标记为不健康
    if (queue.total > 10) {
      console.log(`⚠️ 服务器 ${server.url} 队列较长 (${queue.total})，但仍可用`)
      return true
    }

    return true
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

      // 优先检查WebSocket锁定的服务器
      if (this.isWebSocketServerLocked()) {
        const webSocketServer = this.getWebSocketLockedServer()
        if (webSocketServer) {
          console.log(`🔒🌐 使用WebSocket锁定的服务器: ${webSocketServer}`)
          return webSocketServer
        }
      }

      // 检查是否有普通锁定的服务器
      if (this.isServerLocked()) {
        const lockedServer = this.getLockedServer()
        if (lockedServer) {
          console.log(`🔒 使用锁定的服务器: ${lockedServer}`)
          return lockedServer
        }
      }

      // 更新服务器负载信息（如果没有健康服务器，强制更新）
      await this.updateServerLoads()

      // 获取所有健康的服务器
      let healthyServers = Array.from(this.serverLoads.values())
        .filter(server => {
          // 过滤掉健康状态为false的服务器
          if (!server.healthy) return false

          // 过滤掉失败次数过多的服务器
          const failures = this.serverFailures.get(server.url) || 0
          if (failures >= this.failureThreshold) {
            return false
          }

          return true
        })
        .sort((a, b) => {
          // 首先按失败次数排序（失败次数少的优先）
          const failureA = this.serverFailures.get(a.url) || 0
          const failureB = this.serverFailures.get(b.url) || 0
          if (failureA !== failureB) return failureA - failureB

          // 然后按队列数量排序
          const queueDiff = (a.queue.total || 0) - (b.queue.total || 0)
          if (queueDiff !== 0) return queueDiff

          // 最后按优先级排序
          return a.priority - b.priority
        })

      // 如果没有健康服务器，强制更新一次再试
      if (healthyServers.length === 0) {
        console.warn('⚠️ 没有健康的服务器可用，强制更新后重试...')
        await this.updateServerLoads(true) // 强制更新

        healthyServers = Array.from(this.serverLoads.values())
          .filter(server => server.healthy)
          .sort((a, b) => {
            const queueDiff = (a.queue.total || 0) - (b.queue.total || 0)
            if (queueDiff !== 0) return queueDiff
            return a.priority - b.priority
          })
      }

      if (healthyServers.length === 0) {
        console.warn('⚠️ 强制更新后仍没有健康的服务器可用')
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

    // 尝试选择响应时间最快的服务器（即使队列较长）
    const serversWithResponse = Array.from(this.serverLoads.values())
      .filter(server => server.responseTime > 0) // 至少有响应
      .sort((a, b) => {
        // 按响应时间排序
        return a.responseTime - b.responseTime
      })

    if (serversWithResponse.length > 0) {
      const fastestServer = serversWithResponse[0]
      console.log(`🆘 选择响应最快的服务器: ${fastestServer.url} (响应时间: ${fastestServer.responseTime}ms, 队列: ${fastestServer.queue.total || 0})`)
      return fastestServer.url
    }

    // 如果没有响应数据，按优先级返回第一个服务器
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
        return defaultServer
      }
    } catch (error) {
      // 忽略配置服务错误
    }

    // 从本地存储获取
    try {
      const localConfig = JSON.parse(localStorage.getItem('comfyui_config') || '{}')
      if (localConfig.COMFYUI_SERVER_URL) {
        return localConfig.COMFYUI_SERVER_URL
      }
    } catch (error) {
      // 忽略本地存储错误
    }

    // 最后的备用方案
    const fallbackUrl = 'https://your-comfyui-server.com'
    return fallbackUrl
  }

  /**
   * 锁定服务器（普通HTTP请求）
   */
  lockServer(serverUrl) {
    this.lockedServer = serverUrl
    this.lastLockTime = Date.now()
  }

  /**
   * 锁定服务器用于WebSocket连接
   */
  lockServerForWebSocket(serverUrl) {
    this.webSocketLockedServer = serverUrl
    this.webSocketLockTime = Date.now()
    console.log(`🔒🌐 锁定服务器用于WebSocket: ${serverUrl}, 持续 ${this.webSocketLockDuration / 1000} 秒`)

    // 同时设置普通锁定，确保一致性
    this.lockServer(serverUrl)
  }

  /**
   * 释放WebSocket服务器锁定
   */
  unlockWebSocketServer() {
    if (this.webSocketLockedServer) {
      console.log(`🔓🌐 释放WebSocket服务器锁定: ${this.webSocketLockedServer}`)
      this.webSocketLockedServer = null
      this.webSocketLockTime = 0
    }
  }

  /**
   * 检查WebSocket服务器是否被锁定
   */
  isWebSocketServerLocked() {
    if (!this.webSocketLockedServer) return false

    const now = Date.now()
    const isLocked = (now - this.webSocketLockTime) < this.webSocketLockDuration

    if (!isLocked) {
      console.log('🔓🌐 WebSocket服务器锁定已过期')
      this.webSocketLockedServer = null
      this.webSocketLockTime = 0
    }

    return isLocked
  }

  /**
   * 获取WebSocket锁定的服务器
   */
  getWebSocketLockedServer() {
    if (this.isWebSocketServerLocked()) {
      return this.webSocketLockedServer
    }
    return null
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
  async recordFailure(serverUrl, errorType = 'unknown') {
    // 增加失败计数
    const currentFailures = this.serverFailures.get(serverUrl) || 0
    const newFailures = currentFailures + 1
    this.serverFailures.set(serverUrl, newFailures)

    // 如果失败的是当前锁定的服务器，立即解除锁定
    if (this.lockedServer === serverUrl) {
      this.lockedServer = null
      this.lastLockTime = 0
    }

    // 标记服务器为不健康
    if (this.serverLoads.has(serverUrl)) {
      const serverInfo = this.serverLoads.get(serverUrl)
      serverInfo.healthy = false
      serverInfo.lastFailure = Date.now()
      serverInfo.failureCount = newFailures
      serverInfo.lastErrorType = errorType
      this.serverLoads.set(serverUrl, serverInfo)
    }

    // 记录失败但不自动切换，由用户手动决定

    // 强制更新服务器负载信息
    this.lastUpdateTime = 0
  }



  /**
   * 重置服务器失败计数
   */
  resetFailureCount(serverUrl) {
    if (this.serverFailures.has(serverUrl)) {
      console.log(`🔄 重置服务器失败计数: ${serverUrl}`)
      this.serverFailures.delete(serverUrl)

      // 同时更新服务器负载信息
      if (this.serverLoads.has(serverUrl)) {
        const serverInfo = this.serverLoads.get(serverUrl)
        serverInfo.failureCount = 0
        delete serverInfo.lastErrorType
        this.serverLoads.set(serverUrl, serverInfo)
      }
    }
  }

  /**
   * 获取最优服务器（主要接口）
   */
  async getOptimalServer() {
    return await this.selectServerByMinQueue()
  }

  /**
   * 手动触发服务器切换
   */
  async switchToNextServer() {
    console.log('🔄 手动触发服务器切换...')

    // 如果当前有锁定的服务器，将其标记为失败
    if (this.lockedServer) {
      console.log(`📝 标记当前服务器为失败: ${this.lockedServer}`)
      await this.recordFailure(this.lockedServer, 'manual_switch')
    }

    // 强制重新评估并选择新服务器
    await this.forceReassessment()
    const newServer = await this.selectServerByMinQueue()

    console.log(`✅ 手动切换完成，新服务器: ${newServer}`)
    return newServer
  }

  /**
   * 获取下一个可用服务器（不锁定）
   */
  async getNextAvailableServer(excludeUrls = []) {
    await this.updateServerLoads()

    const availableServers = Array.from(this.serverLoads.values())
      .filter(server => {
        if (!server.healthy) return false
        if (excludeUrls.includes(server.url)) return false

        const failures = this.serverFailures.get(server.url) || 0
        return failures < this.failureThreshold
      })
      .sort((a, b) => {
        const failureA = this.serverFailures.get(a.url) || 0
        const failureB = this.serverFailures.get(b.url) || 0
        if (failureA !== failureB) return failureA - failureB

        const queueDiff = (a.queue.total || 0) - (b.queue.total || 0)
        if (queueDiff !== 0) return queueDiff

        return a.priority - b.priority
      })

    return availableServers.length > 0 ? availableServers[0].url : null
  }

  /**
   * 强制重新评估所有服务器
   */
  async forceReassessment() {
    console.log('🔄 强制重新评估所有服务器...')

    // 清除锁定状态
    this.lockedServer = null
    this.lastLockTime = 0

    // 重置所有服务器的失败计数（给它们一个重新开始的机会）
    console.log('🔄 重置所有服务器失败计数')
    this.serverFailures.clear()

    // 强制更新负载信息
    await this.updateServerLoads(true)

    // 显示当前状态
    this.logServerStatus()

    console.log('✅ 服务器重新评估完成')
  }

  /**
   * 显示服务器状态
   */
  logServerStatus() {
    console.log('📊 当前所有服务器状态:')
    for (const [url, info] of this.serverLoads.entries()) {
      const status = info.healthy ? '✅' : '❌'
      const queueInfo = info.queue ?
        `队列:${info.queue.total || 0}(运行:${info.queue.running || 0},等待:${info.queue.pending || 0})` :
        '队列:未知'
      const locked = url === this.lockedServer ? '🔒' : ''
      const priority = `优先级:${info.priority}`
      const responseTime = info.responseTime ? `响应:${info.responseTime}ms` : '响应:未知'
      const lastCheck = info.lastCheck ? `检查:${Math.round((Date.now() - info.lastCheck) / 1000)}s前` : '检查:从未'
      const failures = this.serverFailures.get(url) || 0
      const failureInfo = failures > 0 ? `失败:${failures}次` : ''
      const errorType = info.lastErrorType ? `错误:${info.lastErrorType}` : ''
      console.log(`   ${status} ${url} ${queueInfo} ${priority} ${responseTime} ${lastCheck} ${failureInfo} ${errorType} ${locked}`)
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

  /**
   * 启动健康监控
   */
  startHealthMonitoring() {
    if (this.healthMonitorInterval) {
      clearInterval(this.healthMonitorInterval)
    }

    console.log(`🏥 启动健康监控，检查频率: ${this.healthMonitorFrequency / 1000}秒`)

    this.healthMonitorInterval = setInterval(async () => {
      try {
        await this.performHealthMonitoring()
      } catch (error) {
        console.error('❌ 健康监控出错:', error)
      }
    }, this.healthMonitorFrequency)
  }

  /**
   * 停止健康监控
   */
  stopHealthMonitoring() {
    if (this.healthMonitorInterval) {
      console.log('🛑 停止健康监控')
      clearInterval(this.healthMonitorInterval)
      this.healthMonitorInterval = null
    }
  }

  /**
   * 执行健康监控
   */
  async performHealthMonitoring() {
    // 更新服务器负载信息
    await this.updateServerLoads()

    // 检查当前锁定的服务器是否仍然健康
    if (this.lockedServer) {
      const lockedServerInfo = this.serverLoads.get(this.lockedServer)
      if (lockedServerInfo && !lockedServerInfo.healthy) {
        this.lockedServer = null
        this.lastLockTime = 0
      }
    }

    // 检查是否有服务器从故障中恢复
    const healthyServers = Array.from(this.serverLoads.values())
      .filter(server => server.healthy)

    // 只在没有健康服务器时输出警告
    if (healthyServers.length === 0) {
      console.warn('警告：没有发现健康的ComfyUI服务器')
    }
  }

  /**
   * 销毁负载均衡器
   */
  destroy() {
    this.stopHealthMonitoring()
    this.servers = []
    this.serverLoads.clear()
    this.serverFailures.clear()
    this.lockedServer = null
  }
}

// 创建单例实例
const loadBalancer = new ComfyUILoadBalancer()

export default loadBalancer
