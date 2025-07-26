// WebSocket 管理器 - 独立模块
// 负责所有 WebSocket 连接管理、消息处理、重连逻辑和窗口隔离机制

import loadBalancer from './loadBalancer.js'

// 🔧 窗口唯一标识符生成机制
function generateWindowId() {
  return `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
}

// 🔧 为当前窗口生成唯一的clientId - 增强唯一性防止冲突
function generateUniqueClientId() {
  const baseId = 'abc1373d4ad648a3a81d0587fbe5534b' // 基础clientId
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 11)
  const windowId = generateWindowId()

  // 🔧 增强唯一性：基础ID + 时间戳 + 随机数 + 窗口ID
  return `${baseId}_${timestamp}_${random}_${windowId}`
}

// 🔧 窗口级别的全局变量 - 确保每个窗口都有唯一标识
const WINDOW_CLIENT_ID = generateUniqueClientId()
const WINDOW_ID = generateWindowId()

console.log(`🪟 窗口标识: ${WINDOW_ID}`)
console.log(`🔑 窗口客户端ID: ${WINDOW_CLIENT_ID}`)

/**
 * WebSocket 管理器类
 * 负责 WebSocket 连接的完整生命周期管理
 */
class WebSocketManager {
  constructor() {
    // WebSocket 连接状态
    this.wsConnection = null
    this.isWsConnected = false
    this.currentWebSocketServer = null

    // 窗口隔离的任务队列
    this.windowTasks = new Map() // promptId -> task

    // 窗口级别的服务器锁定机制
    this.WINDOW_SERVER_LOCKS = new Map() // windowId -> { server, timestamp, tasks }

    // 动态解锁检查机制
    this.serverUnlockTimer = null

    // 防抖机制：避免频繁的进度回调触发递归更新
    this.progressCallbackDebounce = new Map()

    // 官方标准任务状态枚举
    this.TASK_STATUS = {
      WAITING: 'waiting',        // 任务在队列中等待
      EXECUTING: 'executing',    // 任务正在执行
      COMPLETED: 'completed',    // 任务已完成
      ERROR: 'error',           // 任务执行错误
      INTERRUPTED: 'interrupted' // 任务被中断
    }

    // 初始化窗口事件监听
    this._initializeWindowEvents()
    this._initializeGlobalProperties()
  }

  // 🔧 窗口关闭时的清理机制
  _initializeWindowEvents() {
    window.addEventListener('beforeunload', () => {
      console.log(`🚪 [${WINDOW_ID}] 窗口即将关闭，执行清理...`)

      // 清理当前窗口的服务器锁定
      const currentLock = this.getWindowServerLock()
      if (currentLock) {
        console.log(`🔓 [${WINDOW_ID}] 窗口关闭，清理服务器锁定: ${currentLock.server}`)
        this.clearWindowServerLock()
      }

      // 清理当前窗口的任务
      if (this.windowTasks.size > 0) {
        console.log(`🗑️ [${WINDOW_ID}] 窗口关闭，清理 ${this.windowTasks.size} 个任务`)
        this.windowTasks.clear()
      }

      // 关闭WebSocket连接
      if (this.wsConnection && this.wsConnection.readyState === WebSocket.OPEN) {
        console.log(`🔌 [${WINDOW_ID}] 窗口关闭，断开WebSocket连接`)
        this.wsConnection.close()
      }
    })

    // 🔧 页面可见性变化时的处理
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        console.log(`👁️ [${WINDOW_ID}] 窗口隐藏`)
      } else {
        console.log(`👁️ [${WINDOW_ID}] 窗口重新可见`)

        // 检查服务器锁定状态
        const currentLock = this.getWindowServerLock()
        if (currentLock) {
          console.log(`🔒 [${WINDOW_ID}] 窗口重新可见，服务器锁定状态: ${currentLock.server}`)
        }

        // 检查任务状态
        if (this.windowTasks.size > 0) {
          console.log(`📊 [${WINDOW_ID}] 窗口重新可见，当前任务数: ${this.windowTasks.size}`)
        }
      }
    })
  }

  // 🔧 初始化全局属性以保持向后兼容
  _initializeGlobalProperties() {
    // 🔧 兼容性：动态获取当前窗口的锁定服务器
    Object.defineProperty(window, 'windowLockedServer', {
      get: () => {
        const lock = this.getWindowServerLock()
        return lock ? lock.server : null
      },
      set: (value) => {
        if (value) {
          this.setWindowServerLock(value)
        } else {
          this.clearWindowServerLock()
        }
      }
    })

    Object.defineProperty(window, 'windowLockTimestamp', {
      get: () => {
        const lock = this.getWindowServerLock()
        return lock ? lock.timestamp : null
      }
    })

    // 🔧 保留原有的全局变量名但使用窗口级别的值（动态获取）
    Object.defineProperty(window, 'currentWebSocketServer', {
      get: () => {
        return window.windowLockedServer
      },
      set: (value) => {
        window.windowLockedServer = value
      }
    })

    Object.defineProperty(window, 'serverLockTimestamp', {
      get: () => {
        return window.windowLockTimestamp
      }
    })

    // 🔧 为了向后兼容，保留 pendingTasks 引用但指向窗口任务队列
    window.pendingTasks = this.windowTasks
  }

  // ==================== WebSocket 连接管理方法 ====================

  // 🔧 初始化 WebSocket 连接 - 重构版本（解决多服务器消息路由错乱）
  async initializeWebSocket(targetServer = null) {
    try {
      // 🔧 关键修复：支持指定目标服务器，确保任务-服务器绑定一致性
      let baseUrl
      const currentLock = this.getWindowServerLock()

      if (targetServer) {
        // 如果指定了目标服务器，直接使用
        baseUrl = targetServer
        console.log(`🎯 [${WINDOW_ID}] 使用指定的目标服务器: ${baseUrl}`)
      } else if (currentLock && currentLock.server) {
        // 如果当前窗口已锁定服务器，使用锁定的服务器
        baseUrl = currentLock.server
        console.log(`🔒 [${WINDOW_ID}] 使用窗口锁定的服务器: ${baseUrl}`)
      } else {
        // 否则从负载均衡器获取可用服务器
        try {
          baseUrl = await loadBalancer.getAvailableServer()
          if (!baseUrl) {
            throw new Error('负载均衡器返回空服务器')
          }
          console.log(`⚖️ [${WINDOW_ID}] 从负载均衡器获取服务器: ${baseUrl}`)
        } catch (lbError) {
          console.error('❌ 负载均衡器错误:', lbError.message)
          throw new Error(`无法获取可用的ComfyUI服务器: ${lbError.message}`)
        }
      }

      // 🔧 检查现有连接是否与目标服务器一致
      if (this.wsConnection && this.wsConnection.readyState === WebSocket.OPEN) {
        const currentWsServer = this.currentWebSocketServer || this.getWindowServerLock()?.server
        if (currentWsServer === baseUrl) {
          console.log(`✅ [${WINDOW_ID}] WebSocket已连接到正确服务器: ${baseUrl}`)
          return true
        } else {
          console.log(`🔄 [${WINDOW_ID}] WebSocket服务器不匹配，需要重连`)
          console.log(`   当前连接: ${currentWsServer}`)
          console.log(`   目标服务器: ${baseUrl}`)
          // 关闭现有连接，建立新连接
          this.wsConnection.close(1000, '切换到正确的服务器')
          this.wsConnection = null
          this.isWsConnected = false
        }
      }

      console.log(`🔌 [${WINDOW_ID}] 连接WebSocket: ${baseUrl}`)

      // 🔧 构建WebSocket URL - 使用增强的唯一clientId
      let wsUrl
      if (baseUrl.startsWith('https://')) {
        wsUrl = baseUrl.replace('https://', 'wss://') + '/ws?clientId=' + WINDOW_CLIENT_ID
      } else {
        wsUrl = baseUrl.replace('http://', 'ws://') + '/ws?clientId=' + WINDOW_CLIENT_ID
      }

      console.log(`🔗 [${WINDOW_ID}] WebSocket URL: ${wsUrl}`)
      console.log(`🔑 [${WINDOW_ID}] 使用增强clientId: ${WINDOW_CLIENT_ID}`)

      // 简单的HTTP连接测试
      try {
        const testResponse = await fetch(`${baseUrl}/api/queue`, {
          method: 'GET',
          signal: AbortSignal.timeout(5000)
        })
        if (!testResponse.ok) {
          throw new Error(`服务器响应错误: ${testResponse.status}`)
        }
      } catch (httpError) {
        throw new Error(`ComfyUI服务器不可达: ${httpError.message}`)
      }

      // 🔧 记录即将连接的服务器，用于后续验证
      this.currentWebSocketServer = baseUrl
      this.wsConnection = new WebSocket(wsUrl)

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('WebSocket 连接超时'))
        }, 10000)

        this.wsConnection.onopen = () => {
          this.isWsConnected = true
          clearTimeout(timeout)
          this._showNotification(`[${WINDOW_ID}] WebSocket连接成功`, 'success')
          this._logServerConsistency('WebSocket连接成功')
          resolve(true)
        }

        this.wsConnection.onerror = (error) => {
          this.isWsConnected = false
          clearTimeout(timeout)
          console.error('❌ WebSocket连接错误:', error)
          reject(new Error('WebSocket连接失败'))
        }

        this.wsConnection.onclose = (event) => {
          this.isWsConnected = false
          console.log(`🔌 [${WINDOW_ID}] WebSocket连接关闭: ${event.code} - ${event.reason}`)

          // 🔧 如果不是正常关闭，尝试重连
          if (event.code !== 1000 && event.code !== 1001) {
            console.log(`🔄 [${WINDOW_ID}] 非正常关闭，准备重连...`)
            setTimeout(() => {
              if (!this.isWsConnected) {
                console.log(`🔄 [${WINDOW_ID}] 执行WebSocket重连`)
                this.initializeWebSocket(baseUrl).catch(error => {
                  console.error('❌ WebSocket重连失败:', error)
                })
              }
            }, 3000)
          }
        }

        this.wsConnection.onmessage = (event) => {
          try {
            const message = event.data

            // 🔧 增强消息过滤：只处理当前窗口的消息
            if (typeof message === 'object' && message.windowId && message.windowId !== WINDOW_ID) {
              console.log(`🔍 [${WINDOW_ID}] 忽略其他窗口的消息: ${message.windowId}`)
              return
            }

            // 官方标准：只处理字符串消息
            if (typeof message === 'string') {
              try {
                const parsedMessage = JSON.parse(message)

                // 调用重构后的消息处理函数
                this.handleWebSocketMessage(parsedMessage)
              } catch (parseError) {
                console.error('❌ [OFFICIAL] JSON解析失败:', parseError.message)
              }
            }

          } catch (error) {
            console.error('❌ [OFFICIAL] WebSocket消息处理失败:', error)
          }
        }
      })
    } catch (error) {
      console.error('❌ 初始化 WebSocket 失败:', error)

      // 🔧 根据错误类型决定是否清除服务器锁定
      if (error.message.includes('负载均衡器') || error.message.includes('无法获取可用的ComfyUI服务器')) {
        // 如果是负载均衡器错误，清除服务器锁定
        this.currentWebSocketServer = null
        this.clearWindowServerLock()
        console.log('🔓 负载均衡器错误，清除服务器锁定')
      } else if (error.message.includes('ComfyUI服务器不可达') || error.message.includes('WebSocket 连接超时')) {
        // 如果是连接错误但服务器可能恢复，保持锁定以便重试
        console.log('🔒 连接错误但保持服务器锁定以便重试')
      } else {
        // 其他未知错误，清除锁定
        this.currentWebSocketServer = null
        this.clearWindowServerLock()
        console.log('🔓 未知错误，清除服务器锁定')
      }

      throw error
    }
  }

  // 🔧 获取当前窗口的服务器锁定信息
  getWindowServerLock() {
    return this.WINDOW_SERVER_LOCKS.get(WINDOW_ID) || null
  }

  // 🔧 设置当前窗口的服务器锁定信息
  setWindowServerLock(server, timestamp = Date.now()) {
    this.WINDOW_SERVER_LOCKS.set(WINDOW_ID, {
      server,
      timestamp,
      windowId: WINDOW_ID,
      clientId: WINDOW_CLIENT_ID
    })
    console.log(`🔒 [${WINDOW_ID}] 设置窗口服务器锁定: ${server}`)
  }

  // 🔧 清除当前窗口的服务器锁定信息
  clearWindowServerLock() {
    const lock = this.WINDOW_SERVER_LOCKS.get(WINDOW_ID)
    if (lock) {
      this.WINDOW_SERVER_LOCKS.delete(WINDOW_ID)
      console.log(`🔓 [${WINDOW_ID}] 清除窗口服务器锁定: ${lock.server}`)
    }
  }

  // 🔧 动态服务器锁定管理（基于任务状态的智能锁定）
  lockServerForWindow(serverUrl) {
    const timestamp = Date.now()
    this.setWindowServerLock(serverUrl, timestamp)

    console.log(`🔒 [${WINDOW_ID}] 锁定服务器: ${serverUrl}`)
    console.log(`🕐 [${WINDOW_ID}] 锁定时间: ${new Date(timestamp).toLocaleTimeString()}`)
    console.log(`🎯 [${WINDOW_ID}] 锁定模式: 任务驱动动态锁定（无固定超时）`)
    console.log(`🪟 [${WINDOW_ID}] 窗口隔离: 独立锁定，不影响其他窗口`)

    // 🔧 实现动态锁定机制：在任务完成前不解锁服务器
    this.scheduleServerUnlockCheck()
  }

  unlockServerForWindow() {
    const currentLock = this.getWindowServerLock()
    if (currentLock) {
      const lockDuration = Date.now() - currentLock.timestamp
      console.log(`🔓 [${WINDOW_ID}] 解锁服务器: ${currentLock.server}`)
      console.log(`⏱️ [${WINDOW_ID}] 锁定持续时间: ${Math.round(lockDuration / 1000)}秒`)
      console.log(`📊 [${WINDOW_ID}] 解锁时任务数: ${this.windowTasks.size}`)
      console.log(`🪟 [${WINDOW_ID}] 窗口隔离: 仅解锁当前窗口，不影响其他窗口`)

      this.clearWindowServerLock()

      // 清理解锁检查定时器
      this.clearServerUnlockTimer()
    }
  }

  // 🔧 强制解锁服务器（用于异常情况处理）
  forceUnlockServerForWindow() {
    const currentLock = this.getWindowServerLock()
    if (currentLock) {
      console.log(`🚨 [${WINDOW_ID}] 强制解锁服务器: ${currentLock.server}`)
      console.log(`⚠️ [${WINDOW_ID}] 当前仍有 ${this.windowTasks.size} 个待处理任务`)
      console.log(`🪟 [${WINDOW_ID}] 窗口隔离: 强制解锁仅影响当前窗口`)
      this.unlockServerForWindow()
      return true
    }
    return false
  }

  // 🔧 窗口级别的任务管理函数 - 完全隔离版本
  registerWindowTask(promptId, task) {
    let currentLock = this.getWindowServerLock()

    // 🔧 智能验证：如果服务器未锁定，自动锁定到当前API服务器
    if (!currentLock || !currentLock.server) {
      console.warn(`⚠️ [${WINDOW_ID}] 注册任务时服务器未锁定，尝试自动锁定...`)
      try {
        // 使用当前任务的执行服务器或默认API服务器
        const serverToLock = task.executionServer || this._getDefaultServerUrl()
        this.lockServerForWindow(serverToLock)
        currentLock = this.getWindowServerLock()
        console.log(`🔒 [${WINDOW_ID}] 自动锁定服务器: ${serverToLock}`)
      } catch (lockError) {
        console.error(`❌ [${WINDOW_ID}] 自动锁定失败: ${lockError.message}`)
        // 继续执行，但记录警告
        console.warn(`⚠️ [${WINDOW_ID}] 任务 ${promptId} 将在无锁定状态下注册`)
      }
    }

    // 🔧 智能绑定服务器：优先使用锁定服务器，否则使用任务自带的服务器
    if (currentLock && currentLock.server) {
      task.executionServer = currentLock.server
    } else if (!task.executionServer) {
      // 如果都没有，使用默认配置
      task.executionServer = this._getDefaultServerUrl()
      console.warn(`⚠️ [${WINDOW_ID}] 使用默认服务器绑定任务: ${task.executionServer}`)
    }

    task.windowId = WINDOW_ID
    task.clientId = WINDOW_CLIENT_ID
    task.registeredAt = Date.now()
    task.lockInfo = currentLock ? { ...currentLock } : null // 保存锁定信息快照

    this.windowTasks.set(promptId, task)

    console.log(`📝 [${WINDOW_ID}] 任务已注册: ${promptId}, 绑定服务器: ${task.executionServer}`)
    console.log(`📊 [${WINDOW_ID}] 当前窗口任务数: ${this.windowTasks.size}`)
    console.log(`🔒 [${WINDOW_ID}] 任务锁定信息:`, task.lockInfo)

    // 🔧 锁定续期：检测到新任务时自动续期锁定状态
    if (currentLock) {
      console.log(`🔄 [${WINDOW_ID}] 检测到新任务，续期服务器锁定状态`)
      // 重新调度解锁检查
      this.scheduleServerUnlockCheck()
    }
  }

  getWindowTask(promptId) {
    const task = this.windowTasks.get(promptId)
    if (task) {
      // 🔧 简化检测：如果任务存在就返回，不严格检查窗口归属
      // 这样可以避免因窗口ID不匹配导致的任务丢失
      if (task.windowId !== WINDOW_ID) {
        console.log(`🔍 [${WINDOW_ID}] 使用其他窗口的任务: ${promptId} (原窗口: ${task.windowId})`)
      }
      return task
    }

    return null
  }

  removeWindowTask(promptId) {
    const task = this.windowTasks.get(promptId)
    if (task && task.windowId === WINDOW_ID) {
      this.windowTasks.delete(promptId)
      console.log(`🗑️ [${WINDOW_ID}] 任务已移除: ${promptId}`)
      console.log(`📊 [${WINDOW_ID}] 剩余窗口任务数: ${this.windowTasks.size}`)

      // 🔧 任务移除后立即检查是否可以解锁服务器
      const currentLock = this.getWindowServerLock()
      if (this.windowTasks.size === 0 && currentLock) {
        console.log(`🔓 [${WINDOW_ID}] 最后一个任务完成，立即解锁服务器`)
        this.unlockServerForWindow()
      } else if (this.windowTasks.size > 0) {
        console.log(`🔒 [${WINDOW_ID}] 仍有任务运行，保持服务器锁定`)
      }

      return true
    }
    return false
  }

  // 🔧 新增：根据任务ID获取绑定的服务器地址
  getTaskBoundServer(promptId) {
    const task = this.getWindowTask(promptId)
    if (task && task.executionServer) {
      console.log(`🎯 [${WINDOW_ID}] 任务 ${promptId} 绑定服务器: ${task.executionServer}`)
      return task.executionServer
    }
    console.warn(`⚠️ [${WINDOW_ID}] 任务 ${promptId} 未找到绑定服务器`)
    return null
  }

  // 🔧 获取默认服务器URL的辅助方法
  _getDefaultServerUrl() {
    // 这里需要从配置中获取，暂时返回一个默认值
    // 在实际使用时会通过依赖注入或配置传入
    return 'http://localhost:8188'
  }

  // 🔧 窗口间通信机制（用于调试和监控）
  broadcastTaskStatus(promptId, status) {
    try {
      const message = {
        type: 'task_status',
        windowId: WINDOW_ID,
        clientId: WINDOW_CLIENT_ID,
        promptId: promptId,
        status: status,
        timestamp: Date.now()
      }

      localStorage.setItem(`comfyui_task_${promptId}`, JSON.stringify(message))
      console.log(`📡 [${WINDOW_ID}] 广播任务状态: ${promptId} -> ${status}`)
    } catch (error) {
      console.warn(`⚠️ [${WINDOW_ID}] 广播任务状态失败:`, error)
    }
  }

  // 🔧 原子性任务状态更新函数 - 窗口隔离版本
  updateTaskStatus(promptId, newStatus, additionalData = {}) {
    // 🔧 只处理属于当前窗口的任务
    const task = this.getWindowTask(promptId)
    if (!task) {
      console.warn(`⚠️ [${WINDOW_ID}] 尝试更新不存在或不属于当前窗口的任务状态: ${promptId}`)
      return false
    }

    const oldStatus = task.status
    task.status = newStatus
    task.lastStatusUpdate = Date.now()

    // 合并额外数据
    Object.assign(task, additionalData)

    console.log(`🔄 [${WINDOW_ID}] 任务状态变更: ${promptId} ${oldStatus} → ${newStatus}`)

    // 🔧 广播任务状态变更
    this.broadcastTaskStatus(promptId, newStatus)

    return true
  }

  // 🔧 动态解锁检查机制
  // 🔧 调度服务器解锁检查（定期检查任务状态）
  scheduleServerUnlockCheck() {
    // 清理之前的定时器
    this.clearServerUnlockTimer()

    // 设置定期检查（每30秒检查一次）
    this.serverUnlockTimer = setInterval(() => {
      this.checkServerUnlockCondition()
    }, 30000)

    console.log(`⏰ [${WINDOW_ID}] 已调度动态解锁检查（每30秒检查一次）`)
  }

  // 🔧 清理解锁检查定时器
  clearServerUnlockTimer() {
    if (this.serverUnlockTimer) {
      clearInterval(this.serverUnlockTimer)
      this.serverUnlockTimer = null
      console.log(`🧹 [${WINDOW_ID}] 已清理解锁检查定时器`)
    }
  }

  // 🔧 检查是否可以解锁服务器的函数（增强版本）
  checkServerUnlockCondition() {
    const currentLock = this.getWindowServerLock()
    if (!currentLock) {
      // 服务器未锁定，清理定时器
      this.clearServerUnlockTimer()
      return false
    }

    const taskCount = this.windowTasks.size
    const lockDuration = Date.now() - currentLock.timestamp

    console.log(`🔍 [${WINDOW_ID}] 解锁条件检查:`)
    console.log(`   - 待处理任务数: ${taskCount}`)
    console.log(`   - 锁定持续时间: ${Math.round(lockDuration / 1000)}秒`)
    console.log(`   - 锁定服务器: ${currentLock.server}`)

    if (taskCount === 0) {
      console.log(`🔓 [${WINDOW_ID}] 所有任务已完成，自动解锁服务器`)
      this.unlockServerForWindow()
      return true
    } else {
      console.log(`🔒 [${WINDOW_ID}] 仍有 ${taskCount} 个待处理任务，保持服务器锁定`)

      // 列出待处理任务
      const taskIds = Array.from(this.windowTasks.keys())
      console.log(`📋 [${WINDOW_ID}] 待处理任务: [${taskIds.join(', ')}]`)

      // 检查是否有长时间运行的任务
      const longRunningTasks = []
      this.windowTasks.forEach((task, promptId) => {
        const taskDuration = Date.now() - (task.registeredAt || currentLock.timestamp)
        if (taskDuration > 10 * 60 * 1000) { // 超过10分钟
          longRunningTasks.push({ promptId, duration: Math.round(taskDuration / 1000) })
        }
      })

      if (longRunningTasks.length > 0) {
        console.log(`⚠️ [${WINDOW_ID}] 检测到长时间运行的任务:`)
        longRunningTasks.forEach(({ promptId, duration }) => {
          console.log(`   - ${promptId}: ${duration}秒`)
        })
      }
    }

    return false
  }

  // 🔧 新增：确保WebSocket连接与任务执行服务器一致性
  async ensureWebSocketServerConsistency(taskServer) {
    try {
      console.log(`🔍 [${WINDOW_ID}] 检查WebSocket服务器一致性...`)
      console.log(`🎯 [${WINDOW_ID}] 任务执行服务器: ${taskServer}`)

      const currentLock = this.getWindowServerLock()
      const lockedServer = currentLock?.server
      const wsServer = this.currentWebSocketServer

      console.log(`🔒 [${WINDOW_ID}] 当前锁定服务器: ${lockedServer}`)
      console.log(`🔗 [${WINDOW_ID}] WebSocket连接服务器: ${wsServer}`)

      // 检查所有服务器是否一致
      const serversMatch = taskServer === lockedServer && taskServer === wsServer

      if (serversMatch && this.wsConnection && this.wsConnection.readyState === WebSocket.OPEN) {
        console.log(`✅ [${WINDOW_ID}] 服务器一致性验证通过`)
        return true
      }

      // 服务器不一致，需要重新建立连接
      console.log(`🔄 [${WINDOW_ID}] 服务器不一致，重新建立WebSocket连接`)
      console.log(`   任务服务器: ${taskServer}`)
      console.log(`   锁定服务器: ${lockedServer}`)
      console.log(`   WebSocket服务器: ${wsServer}`)

      // 关闭现有连接
      if (this.wsConnection) {
        this.wsConnection.close(1000, '服务器不一致，重新连接')
        this.wsConnection = null
        this.isWsConnected = false
      }

      // 重新初始化WebSocket连接到正确的服务器
      await this.initializeWebSocket(taskServer)

      console.log(`✅ [${WINDOW_ID}] WebSocket重新连接到正确服务器: ${taskServer}`)
      return true

    } catch (error) {
      console.error(`❌ [${WINDOW_ID}] WebSocket服务器一致性检查失败:`, error)
      throw error
    }
  }

  // 🔧 新增：确保WebSocket连接 - 重构版本（支持任务-服务器绑定一致性）
  async ensureWebSocketConnection(taskServer = null) {
    console.log(`🔌 [${WINDOW_ID}] 确保WebSocket连接`)

    if (taskServer) {
      console.log(`🎯 [${WINDOW_ID}] 指定任务服务器: ${taskServer}`)

      // 🔧 关键修复：如果指定了任务服务器，确保WebSocket连接到正确服务器
      await this.ensureWebSocketServerConsistency(taskServer)
      return true
    }

    // 如果已连接，检查服务器一致性
    if (this.wsConnection && this.wsConnection.readyState === WebSocket.OPEN && this.isWsConnected) {
      console.log(`✅ [${WINDOW_ID}] WebSocket已连接`)

      // 尝试锁定服务器，但失败不影响继续使用
      const currentLock = this.getWindowServerLock()
      if (!currentLock) {
        try {
          // 这里需要外部提供 getApiBaseUrl 函数
          console.log(`🔒 [${WINDOW_ID}] 需要补充锁定服务器，但缺少 getApiBaseUrl 函数`)
        } catch (error) {
          console.warn(`⚠️ [${WINDOW_ID}] 服务器锁定失败，但继续使用连接:`, error.message)
        }
      } else {
        console.log(`🔒 [${WINDOW_ID}] 服务器已锁定: ${currentLock.server}`)

        // 🔧 验证WebSocket连接与锁定服务器的一致性
        const wsServer = this.currentWebSocketServer
        if (wsServer && wsServer !== currentLock.server) {
          console.log(`🔄 [${WINDOW_ID}] WebSocket服务器与锁定服务器不一致，重新连接`)
          console.log(`   WebSocket服务器: ${wsServer}`)
          console.log(`   锁定服务器: ${currentLock.server}`)

          // 重新连接到锁定的服务器
          await this.initializeWebSocket(currentLock.server)
        }
      }
      return true
    }

    // 需要建立新连接
    console.log(`🔄 [${WINDOW_ID}] 建立新的WebSocket连接`)

    try {
      await this.initializeWebSocket()

      // 给连接一些时间稳定
      await new Promise(resolve => setTimeout(resolve, 500))

      if (!this.isWsConnected) {
        console.warn(`⚠️ [${WINDOW_ID}] WebSocket连接状态异常，但尝试继续`)
      }

      console.log(`✅ [${WINDOW_ID}] WebSocket连接完成`)
      return true

    } catch (error) {
      console.warn(`⚠️ [${WINDOW_ID}] WebSocket连接失败，但不阻止操作:`, error.message)
      // 🔧 关键改进：不抛出错误，允许降级使用
      return false
    }
  }

  // 🔧 新增：手动重置WebSocket服务器锁定的功能
  resetWebSocketServer(force = false) {
    const currentLock = this.getWindowServerLock()
    console.log('🔄 手动重置WebSocket服务器锁定')
    console.log('🔓 清除服务器锁定:', currentLock?.server || '无')

    if (!force && this.windowTasks.size > 0) {
      console.log(`⚠️ 有 ${this.windowTasks.size} 个待处理任务，建议等待完成后再重置`)
      console.log('💡 如需强制重置，请调用: resetWebSocketServer(true)')
      return false
    }

    // 清除服务器锁定
    this.unlockServerForWindow()

    // 关闭现有WebSocket连接
    if (this.wsConnection) {
      console.log('🔌 关闭现有WebSocket连接')
      this.wsConnection.close(1000, '手动重置服务器')
      this.wsConnection = null
      this.isWsConnected = false
    }

    // 清理所有待处理任务（如果强制重置）
    if (force && this.windowTasks.size > 0) {
      console.log(`🧹 强制清理 ${this.windowTasks.size} 个待处理任务`)
      const taskIds = Array.from(this.windowTasks.keys())
      for (const promptId of taskIds) {
        const task = this.windowTasks.get(promptId)
        if (task && task.onError) {
          task.onError('WebSocket服务器已强制重置')
        }
        this.windowTasks.delete(promptId)
      }
    }

    console.log('✅ WebSocket服务器重置完成')
    return true
  }

  // 🔧 新增：获取当前WebSocket服务器状态的函数（窗口隔离版本）
  getWebSocketServerStatus() {
    return {
      windowId: WINDOW_ID,
      clientId: WINDOW_CLIENT_ID,
      isConnected: this.isWsConnected,
      lockedServer: this.getWindowServerLock()?.server,
      lockTimestamp: this.getWindowServerLock()?.timestamp,
      lockDuration: this.getWindowServerLock()?.timestamp ? Date.now() - this.getWindowServerLock().timestamp : null,
      pendingTasksCount: this.windowTasks.size,
      connectionState: this.wsConnection?.readyState || 'CLOSED'
    }
  }

  // ==================== WebSocket 消息处理方法 ====================

  // 🔥 防抖机制：避免频繁的进度回调触发递归更新
  safeProgressCallback(promptId, task, message, percent) {
    if (!task.onProgress) return

    // 防抖：同一任务的进度回调间隔至少100ms
    const lastCallTime = this.progressCallbackDebounce.get(promptId) || 0
    const now = Date.now()

    if (now - lastCallTime < 100) {
      console.log(`🚫 [${WINDOW_ID}] 进度回调防抖: ${promptId} (${percent}%)`)
      return
    }

    this.progressCallbackDebounce.set(promptId, now)

    try {
      // 🔧 使用setTimeout(0)确保回调在下一个事件循环中执行（浏览器兼容）
      setTimeout(() => {
        task.onProgress(message, percent)
      }, 0)
    } catch (error) {
      console.error(`❌ [${WINDOW_ID}] 进度回调执行失败: ${promptId}`, error.message)
    }
  }

  // 🔥 主要的WebSocket消息处理函数 - 重构版本（窗口隔离版本）
  handleWebSocketMessage(message) {
    try {
      const { type, data } = message

      // 🔥 简化消息过滤：如果找到任务就处理，不严格限制窗口归属
      if (data && data.prompt_id) {
        const task = this.getWindowTask(data.prompt_id)
        if (!task) {
          // 任务不存在，可能是其他窗口的消息，静默忽略
          return
        }

        // 🔥 验证消息来源服务器一致性
        const currentLock = this.getWindowServerLock()
        if (currentLock && task.executionServer && task.executionServer !== currentLock.server) {
          console.warn(`⚠️ [${WINDOW_ID}] 跨服务器消息检测: 任务在 ${task.executionServer}, 当前锁定 ${currentLock.server}`)
          // 仍然处理消息，但记录警告以便调试
        }

        // 🔥 记录消息处理日志（用于跨服务器调试）
        console.log(`📨 [${WINDOW_ID}] 处理消息: ${type} (prompt_id: ${data.prompt_id}, 服务器: ${task.executionServer || '未知'})`)
      }

      // 🔥 记录所有消息类型用于调试
      if (type !== 'status') {
        console.log(`📨 [OFFICIAL] 收到消息: ${type}`, data)
      }

      // 根据官方WebSocket API文档处理所有标准消息类型
      switch (type) {
        case 'status':
          // 服务器状态和队列信息
          this.handleStatusMessage(data)
          break

        case 'execution_start':
          // 任务开始执行 - 官方标准状态检测
          this.handleExecutionStartMessage(data)
          break

        case 'executing':
          // 节点执行状态 - 官方标准完成检测
          this.handleExecutingMessage(data)
          break

        case 'progress':
          // 节点执行进度
          this.handleProgressMessage(data)
          break

        case 'executed':
          // 节点执行完成
          this.handleExecutedMessage(data)
          break

        case 'execution_cached':
          // 节点缓存命中
          this.handleExecutionCachedMessage(data)
          break

        case 'execution_error':
          // 执行错误
          this.handleExecutionErrorMessage(data)
          break

        case 'execution_interrupted':
          // 执行中断
          this.handleExecutionInterruptedMessage(data)
          break

        default:
          // 记录未知消息类型用于调试
          console.log(`🔍 [OFFICIAL] 未知消息类型: ${type}`, data)
      }

    } catch (error) {
      console.error('❌ [OFFICIAL] 消息处理失败:', error.message, message)
    }
  }

  // 🔥 处理服务器状态消息 - 重构版本（窗口隔离版本）
  handleStatusMessage(data) {
    if (!data || !data.status) {
      return
    }

    // 🔧 只记录队列变化，不处理具体任务（避免跨窗口干扰）
    const queueRunning = data.status.exec_info?.queue_remaining || 0
    if (queueRunning > 0) {
      console.log(`📊 [${WINDOW_ID}] 服务器队列状态: ${queueRunning} 个任务等待执行`)
    }

    // 🔧 触发状态更新事件供Vue组件监听
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('comfyui-queue-status', {
        detail: {
          queueRemaining: queueRunning,
          windowId: WINDOW_ID,
          timestamp: Date.now()
        }
      }))
    }
  }

  // 🔥 处理任务开始执行消息 - 重构版本（窗口隔离版本）
  handleExecutionStartMessage(data) {
    if (!data || !data.prompt_id) {
      return
    }

    const promptId = data.prompt_id

    // 🔧 只处理属于当前窗口的任务
    const task = this.getWindowTask(promptId)
    if (!task) {
      console.log(`🔍 [${WINDOW_ID}] 忽略其他窗口的执行开始消息: ${promptId}`)
      return
    }

    console.log(`🚀 [${WINDOW_ID}] 任务开始执行: ${promptId}`)

    // 原子性状态更新：waiting → executing
    this.updateTaskStatus(promptId, this.TASK_STATUS.EXECUTING, {
      executionStartTime: Date.now()
    })

    // 🔧 使用安全进度回调
    this.safeProgressCallback(promptId, task, '任务开始执行', 10)
  }

  // 🔥 处理节点执行进度消息 - 重构版本（窗口隔离版本）
  handleProgressMessage(data) {
    if (!data || !data.prompt_id || typeof data.value !== 'number' || typeof data.max !== 'number') {
      return
    }

    const promptId = data.prompt_id

    // 🔧 只处理属于当前窗口的任务
    const task = this.getWindowTask(promptId)
    if (!task || task.status !== this.TASK_STATUS.EXECUTING) {
      if (!task) {
        console.log(`🔍 [${WINDOW_ID}] 忽略其他窗口的进度消息: ${promptId}`)
      }
      return
    }

    // 计算进度百分比
    const percent = Math.round((data.value / data.max) * 100)
    const nodeInfo = data.node ? ` (节点: ${data.node})` : ''

    console.log(`📈 [${WINDOW_ID}] 任务进度: ${promptId} - ${percent}%${nodeInfo}`)

    // 🔧 使用安全进度回调
    this.safeProgressCallback(promptId, task, `执行进度: ${percent}%${nodeInfo}`, Math.min(percent + 10, 90))
  }

  // 🔥 处理节点执行完成消息 - 重构版本（窗口隔离版本）
  handleExecutedMessage(data) {
    if (!data || !data.prompt_id || !data.node) {
      return
    }

    const promptId = data.prompt_id

    // 🔧 只处理属于当前窗口的任务
    const task = this.getWindowTask(promptId)
    if (!task || task.status !== this.TASK_STATUS.EXECUTING) {
      if (!task) {
        console.log(`🔍 [${WINDOW_ID}] 忽略其他窗口的节点完成消息: ${promptId}`)
      }
      return
    }

    console.log(`✅ [${WINDOW_ID}] 节点完成: ${data.node} (任务: ${promptId})`)

    // 记录完成的节点
    if (!task.completedNodes) {
      task.completedNodes = []
    }
    task.completedNodes.push(data.node)

    // 🔧 使用安全进度回调
    this.safeProgressCallback(promptId, task, `节点 ${data.node} 完成`, 60)
  }

  // 🔥 处理节点执行状态消息 - 官方标准完成检测（窗口隔离版本）
  handleExecutingMessage(data) {
    if (!data || !data.prompt_id) {
      return
    }

    const promptId = data.prompt_id

    // 🔧 只处理属于当前窗口的任务
    const task = this.getWindowTask(promptId)
    if (!task) {
      console.log(`🔍 [${WINDOW_ID}] 忽略其他窗口的执行状态消息: ${promptId}`)
      return
    }

    // 官方标准双重条件检测：data.node === null && data.prompt_id === promptId
    if (data.node === null && data.prompt_id === promptId) {
      console.log(`🎯 [${WINDOW_ID}] 任务执行完成: ${promptId}`)

      // 原子性状态更新：executing → completed
      this.updateTaskStatus(promptId, this.TASK_STATUS.COMPLETED, {
        completionTime: Date.now()
      })

      // 立即处理任务完成
      this.handleTaskCompletion(promptId)
    } else if (data.node) {
      // 记录正在执行的节点
      console.log(`🔄 [${WINDOW_ID}] 正在执行节点: ${data.node} (任务: ${promptId})`)

      // 更新任务的当前执行节点
      if (task) {
        task.currentNode = data.node
        this.safeProgressCallback(promptId, task, `正在执行节点: ${data.node}`, 30)
      }
    }
  }

  // 🔥 处理任务完成的核心函数 - 修复版本（恢复结果获取逻辑）
  async handleTaskCompletion(promptId) {
    try {
      const task = this.getWindowTask(promptId)
      if (!task) {
        console.warn(`⚠️ [${WINDOW_ID}] 任务完成处理失败: 任务不存在 ${promptId}`)
        return
      }

      console.log(`🎉 [${WINDOW_ID}] 任务完成处理开始: ${promptId}`)

      // 🔧 使用安全进度回调
      this.safeProgressCallback(promptId, task, '任务执行完成', 100)

      // 🔧 获取任务历史和结果（恢复重构前的逻辑）
      let taskResult = null
      try {
        // 动态导入 comfyui.js 中的函数
        const comfyuiModule = await import('./comfyui.js')
        const { getTaskHistory, extractTaskResults } = comfyuiModule

        console.log(`📊 [${WINDOW_ID}] 开始获取任务结果: ${promptId}`)
        const history = await getTaskHistory()
        taskResult = await extractTaskResults(history, promptId)
        console.log(`✅ [${WINDOW_ID}] 任务结果获取成功: ${promptId}`, taskResult)
      } catch (error) {
        console.error(`❌ [${WINDOW_ID}] 任务结果获取失败: ${promptId}`, error)
        // 继续执行，但结果为null
        taskResult = null
      }

      // 立即清理任务
      this.removeWindowTask(promptId)

      // 🔧 检查是否可以解锁服务器
      this.checkServerUnlockCondition()

      // 调用成功回调，传递完整的任务结果（修复：使用onComplete而不是onSuccess）
      if (task.onComplete) {
        // 🔧 使用setTimeout(0)确保成功回调立即执行（浏览器兼容）
        setTimeout(() => {
          task.onComplete(taskResult) // ✅ 修复：传递完整的任务结果而不是只传递promptId
        }, 0)
      }

      console.log(`✅ [${WINDOW_ID}] 任务完成处理结束: ${promptId}`)

    } catch (error) {
      console.error(`❌ [${WINDOW_ID}] 任务完成处理失败: ${promptId}`, error.message)

      // 立即清理任务并调用错误回调
      this.removeWindowTask(promptId)

      // 🔧 检查是否可以解锁服务器
      this.checkServerUnlockCondition()

      const task = this.getWindowTask(promptId)
      if (task && task.onError) {
        // 🔧 使用setTimeout(0)确保错误回调立即执行（浏览器兼容）
        setTimeout(() => {
          task.onError(error.message)
        }, 0)
      }
    }
  }

  // 🔥 处理节点缓存命中消息
  handleExecutionCachedMessage(data) {
    if (!data || !data.prompt_id) {
      return
    }

    const promptId = data.prompt_id
    const task = this.getWindowTask(promptId)
    if (!task) {
      console.log(`🔍 [${WINDOW_ID}] 忽略其他窗口的缓存消息: ${promptId}`)
      return
    }

    console.log(`💾 [${WINDOW_ID}] 节点缓存命中: ${promptId}`)
    this.safeProgressCallback(promptId, task, '使用缓存结果', 80)
  }

  // 🔥 处理执行错误消息
  handleExecutionErrorMessage(data) {
    if (!data || !data.prompt_id) {
      return
    }

    const promptId = data.prompt_id
    const task = this.getWindowTask(promptId)
    if (!task) {
      console.log(`🔍 [${WINDOW_ID}] 忽略其他窗口的错误消息: ${promptId}`)
      return
    }

    console.error(`❌ [${WINDOW_ID}] 任务执行错误: ${promptId}`, data)

    // 更新任务状态为错误
    this.updateTaskStatus(promptId, this.TASK_STATUS.ERROR, {
      errorTime: Date.now(),
      errorData: data
    })

    // 清理任务并调用错误回调
    this.removeWindowTask(promptId)
    this.checkServerUnlockCondition()

    if (task.onError) {
      setTimeout(() => {
        task.onError(data.exception_message || '任务执行错误')
      }, 0)
    }
  }

  // 🔥 处理执行中断消息
  handleExecutionInterruptedMessage(data) {
    if (!data || !data.prompt_id) {
      return
    }

    const promptId = data.prompt_id
    const task = this.getWindowTask(promptId)
    if (!task) {
      console.log(`🔍 [${WINDOW_ID}] 忽略其他窗口的中断消息: ${promptId}`)
      return
    }

    console.warn(`⚠️ [${WINDOW_ID}] 任务执行中断: ${promptId}`)

    // 更新任务状态为中断
    this.updateTaskStatus(promptId, this.TASK_STATUS.INTERRUPTED, {
      interruptTime: Date.now()
    })

    // 清理任务并调用错误回调
    this.removeWindowTask(promptId)
    this.checkServerUnlockCondition()

    if (task.onError) {
      setTimeout(() => {
        task.onError('任务执行被中断')
      }, 0)
    }
  }

  // 🔧 辅助方法：显示通知
  _showNotification(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString()
    const typeEmoji = {
      'success': '✅',
      'error': '❌',
      'warning': '⚠️',
      'info': 'ℹ️'
    }

    console.log(`${typeEmoji[type] || 'ℹ️'} [${timestamp}] ${message}`)

    // 触发自定义事件供Vue组件监听
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('comfyui-status', {
        detail: { message, type, timestamp }
      }))
    }
  }

  // 🔧 辅助方法：记录服务器一致性信息
  _logServerConsistency(context) {
    const currentLock = this.getWindowServerLock()
    const wsServer = this.currentWebSocketServer

    console.log(`🔍 [${WINDOW_ID}] 服务器一致性检查 (${context}):`)
    console.log(`   - 锁定服务器: ${currentLock?.server || '无'}`)
    console.log(`   - WebSocket服务器: ${wsServer || '无'}`)
    console.log(`   - 连接状态: ${this.isWsConnected ? '已连接' : '未连接'}`)
  }
}

// 监听其他窗口的任务状态（用于调试）
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key && e.key.startsWith('comfyui_task_')) {
      try {
        const message = JSON.parse(e.newValue)
        if (message.windowId !== WINDOW_ID) {
          console.log(`📡 [${WINDOW_ID}] 收到其他窗口任务状态: ${message.promptId} -> ${message.status} (来自窗口: ${message.windowId})`)
        }
      } catch (error) {
        // 忽略解析错误
      }
    }
  })
}

// 创建全局实例
const webSocketManager = new WebSocketManager()

// 🔧 暴露核心管理函数到全局，用于故障恢复
if (typeof window !== 'undefined') {
  window.resetWebSocketServer = webSocketManager.resetWebSocketServer.bind(webSocketManager)
  window.getWebSocketServerStatus = webSocketManager.getWebSocketServerStatus.bind(webSocketManager)
  window.pendingTasks = webSocketManager.windowTasks // 🔧 暴露窗口级别的任务队列

  // 🔧 动态锁定管理函数
  window.forceUnlockServerForWindow = webSocketManager.forceUnlockServerForWindow.bind(webSocketManager)

  console.log(`🔧 [${WINDOW_ID}] 核心管理函数已暴露到全局`)
}

// 导出实例和相关常量
export default webSocketManager
export { WINDOW_ID, WINDOW_CLIENT_ID }
