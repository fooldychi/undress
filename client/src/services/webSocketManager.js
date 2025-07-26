// 极简版 WebSocket 管理器 - 基于官方 websockets_api_example.py
// 支持多用户多窗口、服务器选择、任务锁定机制



// 生成唯一标识符
function generateId() {
  return `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
}

// 窗口唯一标识
const WINDOW_ID = generateId()
const CLIENT_ID = generateId()

console.log(`🪟 窗口ID: ${WINDOW_ID}`)
console.log(`🔑 客户端ID: ${CLIENT_ID}`)

/**
 * 极简版 WebSocket 管理器
 * 基于官方 websockets_api_example.py 的核心逻辑
 */
class SimpleWebSocketManager {
  constructor() {
    // WebSocket 连接
    this.ws = null
    this.isConnected = false
    this.currentServer = null

    // 任务管理 - 只保留当前窗口的任务
    this.tasks = new Map() // promptId -> { onComplete, onError, onProgress, server }

    // 服务器锁定 - 简化为窗口级别
    this.lockedServer = null
    this.lockTimestamp = null

    // 初始化窗口事件
    this._initWindowEvents()
  }

  // 窗口关闭清理
  _initWindowEvents() {
    window.addEventListener('beforeunload', () => {
      console.log(`🚪 [${WINDOW_ID}] 窗口关闭，清理资源`)
      this._cleanup()
    })
  }

  // 清理资源
  _cleanup() {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.tasks.clear()
    this.lockedServer = null
    this.isConnected = false
  }

  // 连接到指定服务器
  async connectToServer(serverUrl) {
    if (this.ws && this.isConnected && this.currentServer === serverUrl) {
      console.log(`✅ [${WINDOW_ID}] 已连接到服务器: ${serverUrl}`)
      return true
    }

    // 关闭现有连接
    if (this.ws) {
      this.ws.close()
    }

    try {
      const wsUrl = `${serverUrl.replace('http', 'ws')}/ws?clientId=${CLIENT_ID}`
      console.log(`🔌 [${WINDOW_ID}] 连接到: ${wsUrl}`)

      this.ws = new WebSocket(wsUrl)
      this.currentServer = serverUrl

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          if (this.ws) {
            this.ws.close()
          }
          this.isConnected = false
          reject(new Error(`WebSocket连接超时: ${serverUrl}`))
        }, 10000)

        this.ws.onopen = () => {
          this.isConnected = true
          clearTimeout(timeout)
          console.log(`✅ [${WINDOW_ID}] WebSocket连接成功`)
          resolve(true)
        }

        this.ws.onerror = (error) => {
          this.isConnected = false
          clearTimeout(timeout)
          console.error(`❌ [${WINDOW_ID}] WebSocket连接错误:`, error)
          // 改进：提供清晰的错误信息而不是原始Event对象
          reject(new Error(`WebSocket连接失败: ${serverUrl} - 服务器可能不可用或网络异常`))
        }

        this.ws.onclose = (event) => {
          this.isConnected = false
          console.log(`🔌 [${WINDOW_ID}] WebSocket连接关闭: ${event.code} ${event.reason}`)

          // 如果是异常关闭且有等待的任务，通知它们
          if (event.code !== 1000 && this.tasks.size > 0) {
            this._handleConnectionLoss(`连接异常关闭: ${event.code} ${event.reason}`)
          }
        }

        // 核心消息处理 - 基于官方样例
        this.ws.onmessage = (event) => {
          try {
            // 忽略 Blob 类型消息（图片预览等二进制数据）
            if (event.data instanceof Blob) {
              return
            }

            const message = JSON.parse(event.data)
            this._handleMessage(message)
          } catch (error) {
            console.error(`❌ [${WINDOW_ID}] 消息解析失败:`, error)
          }
        }
      })
    } catch (error) {
      this.isConnected = false
      throw new Error(`WebSocket初始化失败: ${error.message}`)
    }
  }

  // 消息处理 - 基于官方 websockets_api_example.py 第37-40行
  _handleMessage(message) {
    const { type, data } = message

    // 只处理 executing 消息，检测任务完成
    if (type === 'executing' && data) {
      const { node, prompt_id } = data

      // 任务完成检测：node 为 null 表示执行完成
      if (node === null && prompt_id) {
        this._handleTaskCompletion(prompt_id)
      } else if (node && prompt_id) {
        // 任务执行中，更新工作流节点进度
        this._handleWorkflowNodeProgress(prompt_id, node)
      }
    }

    // 处理其他消息类型
    if (type === 'progress' && data && data.prompt_id) {
      this._handleTaskProgress(data.prompt_id, '处理中...', data.value || 0)
    }

    if (type === 'execution_error' && data && data.prompt_id) {
      this._handleTaskError(data.prompt_id, data.exception_message || '执行错误')
    }
  }

  // 任务进度处理
  _handleTaskProgress(promptId, message, progress) {
    const task = this.tasks.get(promptId)
    if (task && task.onProgress) {
      // 使用 setTimeout 避免递归更新
      setTimeout(() => {
        task.onProgress(message, progress)
      }, 0)
    }
  }

  // 工作流节点进度处理
  _handleWorkflowNodeProgress(promptId, nodeId) {
    const task = this.tasks.get(promptId)
    if (task && task.onWorkflowProgress) {
      // 使用 setTimeout 避免递归更新
      setTimeout(() => {
        task.onWorkflowProgress(nodeId)
      }, 0)
    } else if (task && task.onProgress) {
      // 兼容旧的进度回调
      setTimeout(() => {
        task.onProgress(`执行节点: ${nodeId}`, 50)
      }, 0)
    }
  }

  // 任务完成处理 - 基于官方样例第47-56行
  async _handleTaskCompletion(promptId) {
    const task = this.tasks.get(promptId)
    if (!task) {
      console.warn(`⚠️ [${WINDOW_ID}] 任务不存在: ${promptId}`)
      return
    }

    try {
      // 获取任务历史 - 基于官方样例第47行
      const history = await this._getHistory(promptId)

      // 提取结果 - 基于官方样例第48-56行
      const result = this._extractResults(history, promptId)

      // 保存任务执行服务器信息
      if (result && task && task.server) {
        result.executionServer = task.server
        result.promptId = promptId
        result.taskStartTime = task.startTime
      } else {
        // 尝试从当前锁定服务器获取
        const currentLock = this.getWindowServerLock()
        if (currentLock && currentLock.server) {
          result.executionServer = currentLock.server
          result.promptId = promptId
        }
      }

      // 调用完成回调
      if (task.onComplete) {
        task.onComplete(result)
      }
    } catch (error) {
      console.error(`❌ [${WINDOW_ID}] 任务结果获取失败: ${promptId}`, error)
      if (task.onError) {
        task.onError(error)
      }
    } finally {
      // 清理任务
      this.tasks.delete(promptId)

      // 检查是否需要解锁服务器
      this._checkUnlock()
    }
  }

  // 任务错误处理
  _handleTaskError(promptId, errorMessage) {
    const task = this.tasks.get(promptId)
    if (task && task.onError) {
      task.onError(new Error(errorMessage))
    }
    this.tasks.delete(promptId)
    this._checkUnlock()
  }

  // 新增：处理连接丢失
  _handleConnectionLoss(reason) {
    console.error(`❌ [${WINDOW_ID}] 连接丢失: ${reason}`)

    // 通知所有等待的任务连接失败
    for (const [, task] of this.tasks.entries()) {
      if (task.onError) {
        task.onError(new Error(`连接中断: ${reason}`))
      }
    }

    // 清理所有任务
    this.tasks.clear()
    this._checkUnlock()
  }

  // 获取任务历史 - 基于官方样例第25-27行
  async _getHistory(promptId) {
    const response = await fetch(`${this.currentServer}/api/history/${promptId}`)
    if (!response.ok) {
      throw new Error(`获取历史失败: ${response.status}`)
    }
    return await response.json()
  }

  // 提取结果 - 基于官方样例第47-56行
  _extractResults(history, promptId) {
    const taskData = history[promptId]
    if (!taskData || !taskData.outputs) {
      return { outputs: {} }
    }

    // 保留完整的输出数据结构
    const results = {
      outputs: taskData.outputs,
      promptId: promptId,
      status: taskData.status,
      meta: taskData.meta || {}
    }

    return results
  }



  // 锁定服务器
  _lockServer(serverUrl) {
    if (!this.lockedServer) {
      this.lockedServer = serverUrl
      this.lockTimestamp = Date.now()
    }
  }

  // 检查解锁条件
  _checkUnlock() {
    if (this.tasks.size === 0 && this.lockedServer) {
      this.lockedServer = null
      this.lockTimestamp = null
    }
  }

  // 提交任务 - 基于官方样例第13-17行
  async submitTask(workflow, promptId, callbacks = {}) {
    try {
      // 选择服务器
      let serverUrl = this.lockedServer
      if (!serverUrl) {
        // 导入 getApiBaseUrl 函数
        const { getApiBaseUrl } = await import('./comfyui.js')
        serverUrl = await getApiBaseUrl()
      }

      // 连接到服务器
      await this.connectToServer(serverUrl)

      // 锁定服务器
      this._lockServer(serverUrl)

      // 注册任务
      this.tasks.set(promptId, {
        ...callbacks,
        server: serverUrl,
        startTime: Date.now()
      })

      // 提交工作流 - 基于官方样例第14-17行
      const requestBody = {
        prompt: workflow,
        client_id: CLIENT_ID,
        prompt_id: promptId
      }

      const response = await fetch(`${serverUrl}/api/prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        throw new Error(`提交失败: ${response.status}`)
      }

      console.log(`✅ [${WINDOW_ID}] 任务提交成功: ${promptId}`)
      return promptId

    } catch (error) {
      // 清理失败的任务
      this.tasks.delete(promptId)
      this._checkUnlock()
      throw error
    }
  }

  // 等待任务完成 - 基于官方样例第33-40行的 while True 逻辑
  async waitForCompletion(promptId, callbacks = {}) {
    return new Promise((resolve, reject) => {
      const task = this.tasks.get(promptId)
      if (!task) {
        reject(new Error(`任务不存在: ${promptId}`))
        return
      }

      // 更新回调
      task.onComplete = resolve
      task.onError = reject
      task.onProgress = callbacks.onProgress || (() => {})
      task.onWorkflowProgress = callbacks.onWorkflowProgress || null

      console.log(`⏳ [${WINDOW_ID}] 等待任务完成: ${promptId}`)

      // 如果WebSocket未连接，启动HTTP轮询备用机制
      if (!this.isConnected) {
        console.log(`🔄 [${WINDOW_ID}] WebSocket未连接，启动HTTP轮询备用机制`)
        this._startHttpPollingBackup(promptId, callbacks)
      }
    })
  }

  // HTTP轮询备用机制
  async _startHttpPollingBackup(promptId, callbacks) {
    const maxAttempts = 120 // 最多轮询2分钟
    const pollInterval = 1000 // 每秒轮询一次

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        // 检查任务是否已被WebSocket处理完成
        if (!this.tasks.has(promptId)) {
          console.log(`✅ [${WINDOW_ID}] 任务已通过WebSocket完成: ${promptId}`)
          return
        }

        // HTTP轮询检查任务状态
        const historyResponse = await fetch(`${this.currentServer}/api/history/${promptId}`)
        if (historyResponse.ok) {
          const history = await historyResponse.json()

          // 任务完成
          if (history[promptId]) {
            console.log(`✅ [${WINDOW_ID}] HTTP轮询检测到任务完成: ${promptId}`)
            await this._handleTaskCompletion(promptId)
            return
          }
        }

        // 更新进度
        if (callbacks.onProgress) {
          const progress = Math.min((attempt / maxAttempts) * 100, 95)
          callbacks.onProgress('处理中...', progress)
        }

        // 等待下次轮询
        await new Promise(resolve => setTimeout(resolve, pollInterval))

      } catch (error) {
        console.warn(`⚠️ [${WINDOW_ID}] HTTP轮询失败 (${attempt + 1}/${maxAttempts}):`, error.message)

        // 继续重试
        await new Promise(resolve => setTimeout(resolve, pollInterval * 2))
      }
    }

    // 轮询超时
    const task = this.tasks.get(promptId)
    if (task && task.onError) {
      task.onError(new Error('任务处理超时'))
    }
    this.tasks.delete(promptId)
    this._checkUnlock()
  }

  // 获取状态信息
  getStatus() {
    return {
      windowId: WINDOW_ID,
      clientId: CLIENT_ID,
      connected: this.isConnected,
      server: this.currentServer,
      lockedServer: this.lockedServer,
      taskCount: this.tasks.size
    }
  }

  // ==================== 兼容性方法 ====================

  // 兼容原有接口
  async initializeWebSocket(targetServer = null) {
    // 导入 getApiBaseUrl 函数
    const { getApiBaseUrl } = await import('./comfyui.js')
    const serverUrl = targetServer || this.lockedServer || await getApiBaseUrl()
    return await this.connectToServer(serverUrl)
  }

  async ensureWebSocketConnection(taskServer = null) {
    try {
      const serverUrl = taskServer || this.currentServer
      if (serverUrl && this.isConnected && this.currentServer === serverUrl) {
        return true
      }

      // 导入 getApiBaseUrl 函数
      const { getApiBaseUrl } = await import('./comfyui.js')
      const targetServer = serverUrl || await getApiBaseUrl()

      console.log(`🔄 [${WINDOW_ID}] 确保WebSocket连接到: ${targetServer}`)
      return await this.connectToServer(targetServer)

    } catch (error) {
      console.warn(`⚠️ [${WINDOW_ID}] WebSocket连接失败，但不阻止任务继续:`, error.message)
      // 连接失败不抛出错误，让任务继续执行
      return false
    }
  }

  // 任务管理兼容方法
  registerWindowTask(promptId, task) {
    this.tasks.set(promptId, task)
    console.log(`📝 [${WINDOW_ID}] 任务已注册: ${promptId}`)
  }

  getWindowTask(promptId) {
    return this.tasks.get(promptId)
  }

  removeWindowTask(promptId) {
    const removed = this.tasks.delete(promptId)
    if (removed) {
      console.log(`🗑️ [${WINDOW_ID}] 任务已移除: ${promptId}`)
      this._checkUnlock()
    }
    return removed
  }

  // 服务器锁定兼容方法
  lockServerForWindow(serverUrl) {
    this._lockServer(serverUrl)
  }

  unlockServerForWindow() {
    console.log(`🔓 [${WINDOW_ID}] 手动解锁服务器: ${this.lockedServer}`)
    this.lockedServer = null
    this.lockTimestamp = null
  }

  getWindowServerLock() {
    if (this.lockedServer) {
      return {
        server: this.lockedServer,
        timestamp: this.lockTimestamp,
        windowId: WINDOW_ID
      }
    }
    return null
  }

  // 任务完成处理 - 供外部调用
  async handleTaskCompletion(promptId) {
    await this._handleTaskCompletion(promptId)
  }

  // 进度回调安全包装
  safeProgressCallback(task, message, progress) {
    if (task && task.onProgress) {
      try {
        task.onProgress(message, progress)
      } catch (error) {
        console.error(`❌ [${WINDOW_ID}] 进度回调错误:`, error)
      }
    }
  }

  // 获取任务绑定的服务器
  getTaskBoundServer(promptId) {
    const task = this.tasks.get(promptId)
    return task ? task.server : null
  }

  // 检查服务器解锁条件
  checkServerUnlockCondition() {
    this._checkUnlock()
  }

  // 窗口任务属性（兼容性）
  get windowTasks() {
    return this.tasks
  }

  // 任务状态枚举（兼容性）
  get TASK_STATUS() {
    return {
      WAITING: 'waiting',
      EXECUTING: 'executing',
      COMPLETED: 'completed',
      ERROR: 'error',
      INTERRUPTED: 'interrupted'
    }
  }

  // 兼容性属性
  get wsConnection() {
    return this.ws
  }

  get isWsConnected() {
    return this.isConnected
  }

  get currentWebSocketServer() {
    return this.currentServer
  }
}

// 创建全局实例
const webSocketManager = new SimpleWebSocketManager()

// 全局兼容性设置
if (typeof window !== 'undefined') {
  // 保持原有的全局变量兼容性
  window.pendingTasks = webSocketManager.tasks

  // 兼容原有的全局函数
  window.getWindowTask = webSocketManager.getWindowTask.bind(webSocketManager)
  window.removeWindowTask = webSocketManager.removeWindowTask.bind(webSocketManager)

  console.log(`🔧 [${WINDOW_ID}] 兼容性接口已设置`)
}

// 导出
export default webSocketManager
export { WINDOW_ID, CLIENT_ID, CLIENT_ID as WINDOW_CLIENT_ID }
