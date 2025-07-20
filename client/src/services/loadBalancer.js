import comfyUIConfig from '../config/comfyui.config.js'
import logger from '../utils/logger.js'
import { showGlobalError } from './globalErrorHandler.js'

/**
 * ComfyUI 负载均衡器
 * 使用统一的官方端点配置进行健康检测和服务器选择
 */
class LoadBalancer {
  constructor() {
    this.connectionTimeout = comfyUIConfig.HEALTH_CHECK.TIMEOUT
    this.healthCheckResults = new Map() // 缓存健康检查结果
    this.serverList = [] // 服务器列表
    this.lastHealthCheck = 0 // 上次健康检查时间
    this.healthCheckInterval = 30000 // 30秒检查一次
    this.verboseLogging = false // 详细日志开关
    this.noServerErrorShown = false // 防止重复显示无服务器错误
  }

  /**
   * 初始化负载均衡器
   */
  async initialize() {
    console.log('🔧 初始化ComfyUI负载均衡器...')

    // 获取服务器列表
    await this.loadServerList()

    return true
  }

  /**
   * 加载服务器列表
   */
  async loadServerList() {
    try {
      // 动态导入配置服务以避免循环依赖
      const { default: configService } = await import('./configService.js')
      const config = await configService.getConfig()

      this.serverList = []

      // 主服务器
      if (config['comfyui.server_url']) {
        this.serverList.push({
          url: config['comfyui.server_url'].replace(/\/$/, ''),
          type: 'primary',
          healthy: null,
          lastCheck: 0,
          queueInfo: { running: 0, pending: 0, total: 0 },
          systemInfo: null
        })
      }

      // 备用服务器
      if (config['comfyui.backup_servers']) {
        const backupServers = config['comfyui.backup_servers']
          .split(/[,\n]/)
          .map(url => url.trim().replace(/\/$/, ''))
          .filter(url => url && url.startsWith('http'))

        backupServers.forEach(url => {
          this.serverList.push({
            url,
            type: 'backup',
            healthy: null,
            lastCheck: 0,
            queueInfo: { running: 0, pending: 0, total: 0 },
            systemInfo: null
          })
        })
      }

      console.log(`📊 加载了 ${this.serverList.length} 个服务器`)

    } catch (error) {
      console.error('❌ 加载服务器列表失败:', error)
      // 使用默认服务器
      this.serverList = [{
        url: comfyUIConfig.BASE_URL.replace(/\/$/, ''),
        type: 'default',
        healthy: null,
        lastCheck: 0,
        queueInfo: { running: 0, pending: 0, total: 0 },
        systemInfo: null
      }]
      console.log('📊 使用默认服务器:', this.serverList[0].url)
    }
  }

  /**
   * 获取所有配置的服务器列表
   */
  async getServerList() {
    const servers = []

    // 主服务器
    const primaryServer = window.getConfig?.('comfyui.server_url')
    if (primaryServer && primaryServer.trim()) {
      servers.push(primaryServer.trim())
    }

    // 备用服务器（换行符分隔）
    const backupServersConfig = window.getConfig?.('comfyui.backup_servers')
    if (backupServersConfig && backupServersConfig.trim()) {
      const backupServers = backupServersConfig
        .split('\n')
        .map(url => url.trim())
        .filter(url => url && url.startsWith('http'))

      servers.push(...backupServers)
    }

    logger.debug(`配置的服务器列表 (${servers.length}个):`, servers)
    return servers
  }

  /**
   * 启用/禁用详细日志
   */
  setVerboseLogging(enabled) {
    this.verboseLogging = enabled
    logger.info(`详细日志已${enabled ? '启用' : '禁用'}`)
  }

  /**
   * 初始化服务器连接（兼容旧接口）
   */
  async initializeServerConnection() {
    console.log('🔗 初始化服务器连接...')
    await this.loadServerList()
    await this.refreshHealthStatus()
  }

  /**
   * 获取最优服务器 - 基于队列数量的负载均衡
   */
  async getOptimalServer() {

    // 检查是否需要刷新健康状态
    const now = Date.now()
    if (now - this.lastHealthCheck > this.healthCheckInterval) {
      await this.refreshHealthStatus()
      this.lastHealthCheck = now
    }

    // 获取所有健康的服务器
    const healthyServers = this.serverList.filter(s => s.healthy === true)

    if (healthyServers.length === 0) {
      console.warn('⚠️ 没有可用的健康服务器，使用第一个服务器')

      // 触发全局错误处理
      this.handleNoAvailableServers(this.serverList.length)

      return this.serverList.length > 0 ? this.serverList[0].url : comfyUIConfig.BASE_URL
    }

    // 仅按队列数量排序选择最优服务器（不考虑优先级）
    const sortedServers = healthyServers.sort((a, b) => {
      // 选择队列最少的服务器
      return a.queueInfo.total - b.queueInfo.total
    })

    const selectedServer = sortedServers[0]

    console.log(`🎯 选择服务器: ${selectedServer.url} (队列: ${selectedServer.queueInfo.total})`)

    return selectedServer.url
  }

  /**
   * 刷新所有服务器的健康状态
   */
  async refreshHealthStatus() {
    if (this.verboseLogging) {
      console.log('🔄 刷新服务器健康状态...')
    }

    const promises = this.serverList.map(async (server) => {
      try {
        const result = await this.testComfyUIEndpoints(server.url)
        server.healthy = result.success
        server.lastCheck = Date.now()

        // 更新队列和系统信息
        if (result.success && result.data) {
          if (result.endpoint.includes('queue')) {
            server.queueInfo = comfyUIConfig.parseQueueInfo(result.data)
          } else if (result.endpoint.includes('system_stats')) {
            server.systemInfo = comfyUIConfig.parseSystemInfo(result.data)
          }
        }

      } catch (error) {
        server.healthy = false
        server.lastCheck = Date.now()
        server.queueInfo = { running: 0, pending: 0, total: 0 }
        logger.health(`服务器检查失败: ${server.url}`, error.message)
      }
    })

    await Promise.all(promises)

    // 显示简化的服务器状态
    this.logServerStatus()
  }

  /**
   * 显示服务器状态日志
   */
  logServerStatus() {
    const healthyServers = this.serverList.filter(s => s.healthy === true)
    const totalServers = this.serverList.length

    if (healthyServers.length === 0) {
      console.warn(`⚠️ 服务器状态: 0/${totalServers} 可用`)

      // 业务层面错误：立即触发错误处理
      if (totalServers > 0) {
        this.handleNoAvailableServers(totalServers)
      }
      return
    }

    console.log(`✅ 服务器状态: ${healthyServers.length}/${totalServers} 可用`)

    // 显示可用服务器的队列信息
    healthyServers.forEach(server => {
      const queueText = server.queueInfo.total > 0
        ? `队列: ${server.queueInfo.running}运行/${server.queueInfo.pending}等待`
        : '队列: 空闲'

      console.log(`  📊 ${server.type}: ${queueText}`)
    })
  }

  /**
   * 处理没有可用服务器的情况
   *
   * 🎯 错误处理策略区分：
   * - 业务层面错误（所有服务器不可用）→ 立即显示用户友好的错误弹窗
   * - 技术层面错误（WebSocket连接、服务器锁定）→ 仅记录日志，不弹窗
   */
  handleNoAvailableServers(totalServers) {
    // 避免重复触发错误提示
    if (this.noServerErrorShown) {
      return
    }

    this.noServerErrorShown = true

    console.log('🚨 业务层面错误：所有服务器都不可用，立即显示用户提示')

    // 立即显示错误提示（业务层面的问题需要用户知晓）
    setTimeout(() => {
      const error = new Error(`ComfyUI服务器集群不可用: 所有 ${totalServers} 个服务器都无法连接`)

      try {
        showGlobalError(error, {
          title: '服务器不可用',
          message: '服务器不可用，请稍后重试',
          showRetry: true
        })

        console.error('🚨 已显示全局错误提示: 没有可用的 ComfyUI 服务器')
      } catch (globalErrorError) {
        console.error('❌ 无法显示全局错误提示:', globalErrorError)

        // 降级处理：显示浏览器原生警告
        if (typeof window !== 'undefined') {
          setTimeout(() => {
            alert('服务器不可用\n\n请稍后重试。')
          }, 1000)
        }
      }
    }, 1000) // 短暂延迟1秒，确保页面已加载

    // 2分钟后重置标志，允许再次显示错误
    setTimeout(() => {
      this.noServerErrorShown = false
      console.log('🔄 重置服务器错误提示标志')
    }, 120000) // 2分钟后重置
  }

  /**
   * 获取服务器状态摘要
   */
  getServerStatusSummary() {
    const healthyServers = this.serverList.filter(s => s.healthy === true)
    const totalQueue = healthyServers.reduce((sum, server) => sum + server.queueInfo.total, 0)

    return {
      total: this.serverList.length,
      healthy: healthyServers.length,
      totalQueue,
      servers: healthyServers.map(server => ({
        url: server.url,
        type: server.type,
        queueInfo: server.queueInfo,
        systemInfo: server.systemInfo
      }))
    }
  }

  /**
   * 显示当前负载均衡状态（页面加载时调用）
   */
  async showLoadBalancingStatus() {
    console.log('🎯 负载均衡状态检查...')

    // 刷新服务器状态
    await this.refreshHealthStatus()

    // 获取最优服务器
    const optimalServer = await this.getOptimalServer()

    console.log('📊 负载均衡结果:')
    console.log(`🎯 当前最优服务器: ${optimalServer}`)

    // 显示所有服务器状态
    this.logServerStatus()
  }

  /**
   * 记录服务器失败
   */
  async recordFailure(serverUrl, errorType = 'unknown') {
    console.log(`📝 记录服务器失败: ${serverUrl} (${errorType})`)

    // 找到对应的服务器并标记为不健康
    const server = this.serverList.find(s => s.url === serverUrl)
    if (server) {
      server.healthy = false
      server.lastCheck = Date.now()
    }
  }

  /**
   * 简化的端点测试 - 用于CORS问题的备用方案
   */
  async testSimpleEndpoint(url) {
    try {
      console.log(`🔍 简化测试: ${url}`)

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000) // 5秒超时

      await fetch(url, {
        method: 'GET',
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      // no-cors模式下，如果没有抛出错误就说明连接成功
      console.log(`✅ 简化测试连接成功: ${url}`)

      return {
        success: true,
        endpoint: url.split('/').pop(),
        fullUrl: url,
        status: 'unknown', // no-cors模式下无法获取状态码
        note: '简化模式连接成功',
        validated: false // 无法验证响应内容
      }

    } catch (error) {
      console.log(`❌ 简化测试失败: ${url} - ${error.message}`)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * 测试服务器基础连接 - 使用多种方法确保准确性
   */
  async testBasicConnection(serverUrl) {
    const cleanUrl = serverUrl.replace(/\/$/, '')
    console.log(`🔍 测试基础连接: ${cleanUrl}`)

    // 方法1: 尝试根路径
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), this.connectionTimeout)

      const startTime = Date.now()
      const response = await fetch(cleanUrl, {
        method: 'HEAD',
        signal: controller.signal
      })

      clearTimeout(timeoutId)
      const responseTime = Date.now() - startTime

      if (response.ok || response.status === 404) { // 404也算连接成功
        console.log(`✅ 基础连接成功: ${cleanUrl} (${responseTime}ms, 状态: ${response.status})`)
        return {
          success: true,
          responseTime,
          status: response.status,
          method: 'HEAD /'
        }
      }
    } catch (error) {
      console.log(`⚠️ HEAD请求失败: ${error.message}`)
    }

    // 方法2: 尝试GET请求根路径
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), this.connectionTimeout)

      const startTime = Date.now()
      const response = await fetch(cleanUrl, {
        method: 'GET',
        signal: controller.signal
      })

      clearTimeout(timeoutId)
      const responseTime = Date.now() - startTime

      console.log(`✅ GET连接成功: ${cleanUrl} (${responseTime}ms, 状态: ${response.status})`)
      return {
        success: true,
        responseTime,
        status: response.status,
        method: 'GET /'
      }
    } catch (error) {
      console.log(`❌ 连接完全失败: ${cleanUrl} - ${error.message}`)
      return {
        success: false,
        error: error.message,
        method: 'ALL_FAILED'
      }
    }
  }

  /**
   * 测试ComfyUI API端点 - 使用统一的官方端点配置
   */
  async testComfyUIEndpoints(serverUrl) {
    const cleanUrl = serverUrl.replace(/\/$/, '')
    const endpoints = comfyUIConfig.getHealthCheckEndpoints()

    if (this.verboseLogging) {
      console.log(`🔍 测试ComfyUI端点: ${cleanUrl}`)
    }

    for (const endpoint of endpoints) {
      try {
        const fullUrl = `${cleanUrl}${endpoint}`
        logger.debug(`测试端点: ${endpoint}`)

        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), this.connectionTimeout)

        const response = await fetch(fullUrl, {
          method: 'GET',
          signal: controller.signal
        })

        clearTimeout(timeoutId)

        if (response.ok) {
          // 尝试解析JSON响应
          try {
            const data = await response.json()

            // 使用统一的响应验证
            const isValidResponse = comfyUIConfig.validateResponse(endpoint, data)

            if (isValidResponse) {
              logger.debug(`ComfyUI端点可用: ${endpoint}`, Object.keys(data))

              return {
                success: true,
                endpoint,
                fullUrl,
                status: response.status,
                hasQueueData: !!(data.queue_running !== undefined || data.queue_pending !== undefined),
                apiPrefix: endpoint.startsWith('/api/') ? '/api' : '',
                data: data,
                validated: true
              }
            } else {
              logger.debug(`端点响应但验证失败: ${endpoint}`)
              continue
            }
          } catch (jsonError) {
            logger.debug(`端点响应但JSON解析失败: ${endpoint}`)
            continue
          }
        } else {
          logger.debug(`端点响应错误: ${endpoint} (状态: ${response.status})`)
        }
      } catch (error) {
        // 静默处理CORS和网络错误
        logger.cors(`端点测试失败: ${endpoint}`, error.message)

        // 如果是网络错误，尝试简化的请求
        if (error.message.includes('Failed to fetch') || error.message.includes('ERR_FAILED')) {
          logger.debug(`尝试简化请求: ${endpoint}`)
          try {
            const simpleResponse = await this.testSimpleEndpoint(fullUrl)
            if (simpleResponse.success) {
              logger.debug(`简化请求成功: ${endpoint}`)
              return simpleResponse
            }
          } catch (simpleError) {
            logger.debug(`简化请求也失败: ${simpleError.message}`)
          }
        }

        continue
      }
    }

    return {
      success: false,
      error: '所有ComfyUI端点都不可用'
    }
  }

  /**
   * 执行完整的服务器健康检查
   */
  async performHealthCheck(serverUrl) {
    logger.health(`开始健康检查: ${serverUrl}`)

    const healthResult = {
      url: serverUrl,
      timestamp: new Date().toISOString(),
      basicConnection: null,
      comfyuiEndpoints: null,
      overall: false,
      errors: []
    }

    try {
      // 1. 基础连接测试
      console.log('1️⃣ 测试基础连接...')
      healthResult.basicConnection = await this.testBasicConnection(serverUrl)

      if (!healthResult.basicConnection.success) {
        healthResult.errors.push('基础连接失败')
        console.log('❌ 基础连接失败，跳过后续测试')
        return healthResult
      }

      // 2. ComfyUI端点测试
      console.log('2️⃣ 测试ComfyUI端点...')
      healthResult.comfyuiEndpoints = await this.testComfyUIEndpoints(serverUrl)

      if (!healthResult.comfyuiEndpoints.success) {
        healthResult.errors.push('ComfyUI端点不可用')
      }

      // 3. 综合评估
      healthResult.overall = healthResult.basicConnection.success && healthResult.comfyuiEndpoints.success

      console.log(`\n📊 健康检查结果: ${healthResult.overall ? '✅ 健康' : '❌ 不健康'}`)
      if (healthResult.errors.length > 0) {
        console.log(`⚠️ 问题: ${healthResult.errors.join(', ')}`)
      }
      console.log('=' .repeat(50))

      // 缓存结果
      this.healthCheckResults.set(serverUrl, healthResult)

      return healthResult

    } catch (error) {
      console.error(`❌ 健康检查异常: ${error.message}`)
      healthResult.errors.push(`检查异常: ${error.message}`)
      return healthResult
    }
  }

  /**
   * 检查所有配置的服务器健康状态
   */
  async checkAllServers() {
    console.log('\n🚀 开始检查所有服务器健康状态...')

    const servers = await this.getServerList()
    if (servers.length === 0) {
      console.log('❌ 没有配置任何服务器')
      return []
    }

    console.log(`📋 发现 ${servers.length} 个配置的服务器`)

    const results = []
    for (const serverUrl of servers) {
      const healthResult = await this.performHealthCheck(serverUrl)
      results.push(healthResult)
    }

    // 汇总结果
    const healthyServers = results.filter(r => r.overall)
    const unhealthyServers = results.filter(r => !r.overall)

    // 简化的健康检查汇总
    logger.status(`健康检查完成: ${healthyServers.length}个健康, ${unhealthyServers.length}个不健康`)

    if (healthyServers.length > 0) {
      logger.debug('健康的服务器:', healthyServers.map(s => s.url))
    }

    if (unhealthyServers.length > 0) {
      logger.warn('不健康的服务器:', unhealthyServers.map(s => s.url))
    }

    return results
  }

  /**
   * 获取第一个健康的服务器（简化版本）
   */
  async getFirstHealthyServer() {
    console.log('🎯 获取第一个健康的服务器...')

    const results = await this.checkAllServers()
    const healthyServers = results.filter(r => r.overall)

    if (healthyServers.length === 0) {
      // 触发全局错误处理
      this.handleNoAvailableServers(results.length)

      throw new Error('没有找到健康的服务器')
    }

    const selectedServer = healthyServers[0]
    console.log(`✅ 选择服务器: ${selectedServer.url}`)

    return selectedServer.url
  }


}

// 创建单例实例
const loadBalancer = new LoadBalancer()

export default loadBalancer
