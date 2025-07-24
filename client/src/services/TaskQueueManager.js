/**
 * 🔥 任务队列管理器 - 彻底解决ComfyUI客户端卡住问题
 *
 * 核心功能：
 * 1. 任务隔离：每个任务独立处理，避免相互影响
 * 2. 进度监控：实时跟踪任务进度，检测长时间无更新的任务
 * 3. 自动恢复：检测到卡住任务时自动重试或强制完成
 * 4. WebSocket消息完整处理：确保handling executing、executed、progress等所有关键消息
 */

import {
  submitWorkflow,
  waitForTaskCompletion,
  generatePromptId,
  TASK_STATUS,
  WINDOW_ID
} from './comfyui.js'

// 任务状态枚举
export const QUEUE_TASK_STATUS = {
  QUEUED: 'queued',           // 排队中
  PROCESSING: 'processing',   // 处理中
  COMPLETED: 'completed',     // 已完成
  FAILED: 'failed',          // 失败
  CANCELLED: 'cancelled',     // 已取消
  TIMEOUT: 'timeout'         // 超时
}

// 任务优先级枚举
export const TASK_PRIORITY = {
  LOW: 1,
  NORMAL: 2,
  HIGH: 3,
  URGENT: 4
}

class TaskQueueManager {
  constructor() {
    // 任务队列存储
    this.taskQueue = new Map()           // 等待队列
    this.processingTasks = new Map()     // 处理中队列
    this.completedTasks = new Map()      // 已完成队列
    this.failedTasks = new Map()         // 失败队列

    // 配置参数
    this.maxConcurrent = 3               // 最大并发数
    this.taskTimeout = 300000            // 5分钟超时
    this.retryAttempts = 2               // 重试次数
    this.progressTimeout = 60000         // 进度超时（1分钟无进度更新）
    this.cleanupInterval = 300000        // 清理间隔（5分钟）

    // 运行状态
    this.isProcessing = false
    this.isPaused = false
    this.processingInterval = null
    this.monitoringInterval = null
    this.cleanupInterval = null

    // 统计信息
    this.stats = {
      totalProcessed: 0,
      totalSucceeded: 0,
      totalFailed: 0,
      totalRetried: 0,
      averageProcessingTime: 0
    }

    // 启动队列处理器
    this.startQueueProcessor()
    this.startProgressMonitor()
    this.startCleanupScheduler()

    console.log('🚀 TaskQueueManager 初始化完成')
  }

  /**
   * 🔧 添加任务到队列
   * @param {Object} taskConfig - 任务配置
   * @param {Object} taskConfig.workflow - ComfyUI工作流
   * @param {Function} taskConfig.onProgress - 进度回调
   * @param {Function} taskConfig.onComplete - 完成回调
   * @param {Function} taskConfig.onError - 错误回调
   * @param {string} taskConfig.workflowType - 工作流类型
   * @param {number} taskConfig.priority - 任务优先级
   * @returns {string} 任务ID
   */
  enqueueTask(taskConfig) {
    const taskId = this.generateTaskId()
    const task = {
      id: taskId,
      ...taskConfig,
      status: QUEUE_TASK_STATUS.QUEUED,
      priority: taskConfig.priority || TASK_PRIORITY.NORMAL,
      queuedAt: Date.now(),
      attempts: 0,
      maxAttempts: this.retryAttempts,
      lastProgressUpdate: Date.now(),
      progressHistory: [],
      errors: []
    }

    this.taskQueue.set(taskId, task)
    console.log(`📥 任务入队: ${taskId} (队列长度: ${this.taskQueue.size})`)

    // 触发队列处理
    this.processQueue()

    return taskId
  }

  /**
   * 🔧 启动队列处理器
   */
  startQueueProcessor() {
    if (this.processingInterval) return

    this.processingInterval = setInterval(() => {
      if (!this.isPaused) {
        this.processQueue()
      }
    }, 1000) // 每秒检查一次

    this.isProcessing = true
    console.log('🚀 任务队列处理器已启动')
  }

  /**
   * 🔧 处理队列
   */
  async processQueue() {
    // 检查是否可以处理新任务
    if (this.processingTasks.size >= this.maxConcurrent || this.isPaused) {
      return
    }

    // 获取下一个待处理任务（按优先级排序）
    const nextTask = this.getNextTask()
    if (!nextTask) return

    // 移动到处理队列
    this.taskQueue.delete(nextTask.id)
    this.processingTasks.set(nextTask.id, {
      ...nextTask,
      status: QUEUE_TASK_STATUS.PROCESSING,
      startedAt: Date.now(),
      lastProgressUpdate: Date.now()
    })

    console.log(`🔄 开始处理任务: ${nextTask.id} (优先级: ${nextTask.priority})`)

    // 异步处理任务
    this.executeTask(nextTask.id)
  }

  /**
   * 🔧 执行单个任务
   * @param {string} taskId - 任务ID
   */
  async executeTask(taskId) {
    const task = this.processingTasks.get(taskId)
    if (!task) return

    try {
      // 设置超时检查
      const timeoutId = setTimeout(() => {
        this.handleTaskTimeout(taskId)
      }, this.taskTimeout)

      // 执行ComfyUI任务
      const result = await this.runComfyUITask(task)

      clearTimeout(timeoutId)

      // 任务成功完成
      this.handleTaskSuccess(taskId, result)

    } catch (error) {
      console.error(`❌ 任务执行失败: ${taskId}`, error)
      this.handleTaskFailure(taskId, error)
    }
  }

  /**
   * 🔧 执行ComfyUI任务 - 跨服务器隔离版本
   * @param {Object} task - 任务对象
   * @returns {Promise} 任务结果
   */
  async runComfyUITask(task) {
    return new Promise((resolve, reject) => {
      const { workflow, onProgress, onComplete, onError } = task

      // 🔥 获取任务绑定的服务器信息
      let taskServer = null

      // 包装进度回调 - 增加服务器隔离检查
      const progressWrapper = (message, percent) => {
        // 更新任务进度状态
        const processingTask = this.processingTasks.get(task.id)
        if (processingTask) {
          processingTask.lastProgressUpdate = Date.now()
          processingTask.progressHistory.push({
            message,
            percent,
            timestamp: Date.now(),
            server: taskServer // 记录服务器信息
          })

          // 限制进度历史记录数量
          if (processingTask.progressHistory.length > 50) {
            processingTask.progressHistory = processingTask.progressHistory.slice(-25)
          }

          // 🔥 检查52.25%卡住问题 - 跨服务器版本
          if (percent === 52.25) {
            console.warn(`🚨 [QUEUE] 检测到52.25%卡住问题: ${task.id} (服务器: ${taskServer})`)

            // 延迟检查任务是否真的卡住
            setTimeout(() => {
              this.checkTaskStuckAt5225(task.id, taskServer)
            }, 30000) // 30秒后检查
          }
        }

        // 调用原始进度回调
        if (onProgress) {
          try {
            onProgress(message, percent)
          } catch (error) {
            console.warn(`⚠️ 进度回调执行失败: ${task.id}`, error)
          }
        }
      }

      // 包装完成回调 - 增加服务器验证
      const completeWrapper = (results) => {
        // 🔥 验证结果来源服务器
        if (taskServer && results.executionServer && results.executionServer !== taskServer) {
          console.warn(`⚠️ [QUEUE] 任务 ${task.id} 服务器不一致: 预期 ${taskServer}, 实际 ${results.executionServer}`)
        }

        // 确保结果包含正确的服务器信息
        results.queueTaskId = task.id
        results.queueServer = taskServer

        resolve(results)
      }

      // 包装错误回调
      const errorWrapper = (error) => {
        console.error(`❌ [QUEUE] 任务 ${task.id} 失败 (服务器: ${taskServer}):`, error)
        reject(error)
      }

      // 生成promptId并提交工作流
      const promptId = generatePromptId()
      console.log(`🆔 [QUEUE] 生成promptId: ${promptId} for task: ${task.id}`)

      // 🔥 保存promptId到任务对象，用于跨服务器恢复
      const processingTask = this.processingTasks.get(task.id)
      if (processingTask) {
        processingTask.promptId = promptId
      }

      // 创建临时任务对象
      const tempTask = {
        workflowType: task.workflowType || 'default',
        createdAt: new Date().toISOString(),
        queueTaskId: task.id, // 🔥 关联队列任务ID
        onProgress: progressWrapper,
        onComplete: null,
        onError: null
      }

      // 提交工作流并等待完成
      submitWorkflow(workflow, promptId, tempTask)
        .then(submittedPromptId => {
          console.log(`✅ [QUEUE] 工作流提交成功: ${submittedPromptId} for task: ${task.id}`)

          // 🔥 获取任务绑定的服务器
          const { getWindowTask } = require('./comfyui.js')
          const comfyTask = getWindowTask(submittedPromptId)
          if (comfyTask && comfyTask.executionServer) {
            taskServer = comfyTask.executionServer
            console.log(`🔒 [QUEUE] 任务 ${task.id} 绑定服务器: ${taskServer}`)

            // 更新处理中任务的服务器信息
            if (processingTask) {
              processingTask.executionServer = taskServer
            }
          }

          // 等待任务完成
          return waitForTaskCompletion(submittedPromptId, progressWrapper, task.workflowType)
        })
        .then(result => {
          completeWrapper(result)
        })
        .catch(error => {
          errorWrapper(error)
        })
    })
  }

  /**
   * 🔧 处理任务成功
   * @param {string} taskId - 任务ID
   * @param {Object} result - 任务结果
   */
  handleTaskSuccess(taskId, result) {
    const task = this.processingTasks.get(taskId)
    if (!task) return

    const processingTime = Date.now() - task.startedAt
    console.log(`✅ 任务完成: ${taskId} (耗时: ${Math.round(processingTime / 1000)}秒)`)

    // 更新统计信息
    this.updateStats('success', processingTime)

    // 移动到完成队列
    this.processingTasks.delete(taskId)
    this.completedTasks.set(taskId, {
      ...task,
      status: QUEUE_TASK_STATUS.COMPLETED,
      completedAt: Date.now(),
      processingTime,
      result
    })

    // 调用原始完成回调
    if (task.onComplete) {
      try {
        task.onComplete(result)
      } catch (error) {
        console.warn(`⚠️ 完成回调执行失败: ${taskId}`, error)
      }
    }

    // 清理旧的完成任务
    this.cleanupCompletedTasks()

    // 继续处理队列
    this.processQueue()
  }

  /**
   * 🔧 处理任务失败
   * @param {string} taskId - 任务ID
   * @param {Error} error - 错误对象
   */
  handleTaskFailure(taskId, error) {
    const task = this.processingTasks.get(taskId)
    if (!task) return

    task.attempts++
    task.errors.push({
      error: error.message,
      timestamp: Date.now(),
      attempt: task.attempts
    })

    // 检查是否需要重试
    if (task.attempts < task.maxAttempts) {
      console.log(`🔄 任务重试 (${task.attempts}/${task.maxAttempts}): ${taskId}`)

      // 更新统计信息
      this.updateStats('retry')

      // 重新入队（降低优先级）
      this.processingTasks.delete(taskId)
      this.taskQueue.set(taskId, {
        ...task,
        status: QUEUE_TASK_STATUS.QUEUED,
        priority: Math.max(1, task.priority - 1), // 降低优先级
        lastError: error
      })

      // 延迟重试
      setTimeout(() => {
        this.processQueue()
      }, 5000 * task.attempts) // 递增延迟

    } else {
      console.error(`❌ 任务最终失败: ${taskId}`)

      // 更新统计信息
      this.updateStats('failure')

      // 移动到失败队列
      this.processingTasks.delete(taskId)
      this.failedTasks.set(taskId, {
        ...task,
        status: QUEUE_TASK_STATUS.FAILED,
        failedAt: Date.now(),
        finalError: error
      })

      // 调用错误回调
      if (task.onError) {
        try {
          task.onError(error)
        } catch (callbackError) {
          console.warn(`⚠️ 错误回调执行失败: ${taskId}`, callbackError)
        }
      }
    }
  }

  /**
   * 🔧 处理任务超时
   * @param {string} taskId - 任务ID
   */
  handleTaskTimeout(taskId) {
    console.warn(`⏰ 任务超时: ${taskId}`)
    this.handleTaskFailure(taskId, new Error('任务执行超时'))
  }

  /**
   * 🔧 启动进度监控器
   */
  startProgressMonitor() {
    if (this.monitoringInterval) return

    this.monitoringInterval = setInterval(() => {
      this.checkStuckTasks()
    }, 30000) // 每30秒检查一次

    console.log('📊 进度监控器已启动')
  }

  /**
   * 🔧 检查卡住的任务
   */
  checkStuckTasks() {
    const now = Date.now()

    this.processingTasks.forEach((task, taskId) => {
      const timeSinceLastProgress = now - task.lastProgressUpdate

      // 检查进度超时
      if (timeSinceLastProgress > this.progressTimeout) {
        console.warn(`🚨 检测到卡住的任务: ${taskId} (${Math.round(timeSinceLastProgress / 1000)}秒无进度更新)`)

        // 尝试恢复任务
        this.attemptTaskRecovery(taskId)
      }
    })
  }

  /**
   * 🔧 尝试任务恢复 - 跨服务器版本
   * @param {string} taskId - 任务ID
   */
  async attemptTaskRecovery(taskId) {
    const task = this.processingTasks.get(taskId)
    if (!task) return

    console.log(`🔧 尝试恢复卡住的任务: ${taskId} (服务器: ${task.executionServer})`)

    try {
      // 🔥 方法1: 检查特定服务器上的任务状态
      const { getTaskHistory, handleTaskCompletion, getApiBaseUrl } = await import('./comfyui.js')

      // 获取与任务关联的promptId
      const promptId = task.promptId || taskId

      // 🔥 确保使用任务绑定的服务器获取历史记录
      let history
      if (task.executionServer) {
        // 直接从任务绑定的服务器获取历史记录
        const url = `${task.executionServer}/history/${promptId}`
        console.log(`🔍 [QUEUE] 从绑定服务器获取历史记录: ${url}`)

        const response = await fetch(url)
        if (response.ok) {
          const fullHistory = await response.json()
          history = { [promptId]: fullHistory[promptId] }
        } else {
          throw new Error(`服务器 ${task.executionServer} 历史记录获取失败: ${response.status}`)
        }
      } else {
        // 回退到默认方法
        history = await getTaskHistory(promptId)
      }

      if (history[promptId] && history[promptId].outputs) {
        console.log(`✅ 发现任务实际已完成，触发完成处理: ${taskId} (服务器: ${task.executionServer})`)

        // 手动触发完成
        await handleTaskCompletion(promptId)

        // 如果成功，更新任务状态
        this.handleTaskSuccess(taskId, history[promptId])
        return
      }
    } catch (error) {
      console.warn(`⚠️ 任务恢复失败: ${taskId} (服务器: ${task.executionServer})`, error)
    }

    // 方法2: 如果恢复失败，标记为超时并重试
    this.handleTaskFailure(taskId, new Error(`任务进度超时，自动重试 (服务器: ${task.executionServer})`))
  }

  /**
   * 🔥 检查52.25%卡住问题 - 跨服务器版本
   * @param {string} taskId - 任务ID
   * @param {string} server - 服务器地址
   */
  async checkTaskStuckAt5225(taskId, server) {
    const task = this.processingTasks.get(taskId)
    if (!task) return

    // 检查任务是否仍然卡在52.25%
    const latestProgress = task.progressHistory[task.progressHistory.length - 1]
    if (latestProgress && latestProgress.percent === 52.25) {
      const stuckTime = Date.now() - latestProgress.timestamp

      if (stuckTime > 30000) { // 卡住超过30秒
        console.error(`🚨 [QUEUE] 任务 ${taskId} 确认卡在52.25% (服务器: ${server}, 卡住时间: ${Math.round(stuckTime/1000)}秒)`)

        // 尝试跨服务器恢复
        await this.attemptCrossServerRecovery(taskId, server)
      }
    }
  }

  /**
   * 🔥 跨服务器恢复机制
   * @param {string} taskId - 任务ID
   * @param {string} server - 服务器地址
   */
  async attemptCrossServerRecovery(taskId, server) {
    const task = this.processingTasks.get(taskId)
    if (!task || !task.promptId) return

    console.log(`🔧 [QUEUE] 开始跨服务器恢复: ${taskId} (服务器: ${server})`)

    try {
      // 1. 直接检查绑定服务器的任务状态
      const url = `${server}/history/${task.promptId}`
      console.log(`🔍 [QUEUE] 检查服务器任务状态: ${url}`)

      const response = await fetch(url)
      if (response.ok) {
        const history = await response.json()

        if (history[task.promptId] && history[task.promptId].outputs) {
          console.log(`✅ [QUEUE] 发现任务在服务器 ${server} 上已完成: ${taskId}`)

          // 构造结果对象
          const results = {
            promptId: task.promptId,
            history: history[task.promptId],
            executionServer: server,
            queueTaskId: taskId,
            recoveredFromStuck: true
          }

          // 提取图片URL等结果
          if (history[task.promptId].outputs) {
            const outputs = history[task.promptId].outputs
            const imageUrls = []

            Object.values(outputs).forEach(output => {
              if (output.images) {
                output.images.forEach(img => {
                  const imageUrl = `${server}/view?filename=${img.filename}&subfolder=${img.subfolder}&type=${img.type}`
                  imageUrls.push(imageUrl)
                })
              }
            })

            results.imageUrls = imageUrls
            results.images = imageUrls // 兼容性
          }

          // 标记任务完成
          this.handleTaskSuccess(taskId, results)
          return
        }
      }

      // 2. 如果任务确实未完成，尝试重新提交
      console.warn(`⚠️ [QUEUE] 任务 ${taskId} 在服务器 ${server} 上确实未完成，标记为失败`)
      this.handleTaskFailure(taskId, new Error(`任务在服务器 ${server} 上卡住在52.25%`))

    } catch (error) {
      console.error(`❌ [QUEUE] 跨服务器恢复失败: ${taskId}`, error)
      this.handleTaskFailure(taskId, error)
    }
  }

  /**
   * 🔧 获取下一个任务（按优先级排序）
   * @returns {Object|null} 下一个任务
   */
  getNextTask() {
    const queuedTasks = Array.from(this.taskQueue.values())
      .filter(task => task.status === QUEUE_TASK_STATUS.QUEUED)
      .sort((a, b) => {
        // 首先按优先级排序（高优先级优先）
        if (a.priority !== b.priority) {
          return b.priority - a.priority
        }
        // 然后按入队时间排序（先入先出）
        return a.queuedAt - b.queuedAt
      })

    return queuedTasks[0] || null
  }

  /**
   * 🔧 生成任务ID
   * @returns {string} 任务ID
   */
  generateTaskId() {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * 🔧 启动清理调度器
   */
  startCleanupScheduler() {
    if (this.cleanupTimer) return

    this.cleanupTimer = setInterval(() => {
      this.cleanupCompletedTasks()
      this.cleanupFailedTasks()
    }, this.cleanupInterval)

    console.log('🧹 清理调度器已启动')
  }

  /**
   * 🔧 清理已完成任务
   */
  cleanupCompletedTasks() {
    const maxCompleted = 50
    if (this.completedTasks.size > maxCompleted) {
      const completed = Array.from(this.completedTasks.entries())
        .sort((a, b) => a[1].completedAt - b[1].completedAt)

      // 删除最旧的任务
      const toDelete = completed.slice(0, completed.length - maxCompleted)
      toDelete.forEach(([taskId]) => {
        this.completedTasks.delete(taskId)
      })

      console.log(`🧹 清理了 ${toDelete.length} 个已完成任务`)
    }
  }

  /**
   * 🔧 清理失败任务
   */
  cleanupFailedTasks() {
    const maxFailed = 20
    if (this.failedTasks.size > maxFailed) {
      const failed = Array.from(this.failedTasks.entries())
        .sort((a, b) => a[1].failedAt - b[1].failedAt)

      // 删除最旧的任务
      const toDelete = failed.slice(0, failed.length - maxFailed)
      toDelete.forEach(([taskId]) => {
        this.failedTasks.delete(taskId)
      })

      console.log(`🧹 清理了 ${toDelete.length} 个失败任务`)
    }
  }

  /**
   * 🔧 更新统计信息
   * @param {string} type - 统计类型
   * @param {number} processingTime - 处理时间（可选）
   */
  updateStats(type, processingTime = 0) {
    this.stats.totalProcessed++

    switch (type) {
      case 'success':
        this.stats.totalSucceeded++
        if (processingTime > 0) {
          // 计算平均处理时间
          const totalTime = this.stats.averageProcessingTime * (this.stats.totalSucceeded - 1) + processingTime
          this.stats.averageProcessingTime = totalTime / this.stats.totalSucceeded
        }
        break
      case 'failure':
        this.stats.totalFailed++
        break
      case 'retry':
        this.stats.totalRetried++
        break
    }
  }

  /**
   * 🔧 获取队列状态
   * @returns {Object} 队列状态
   */
  getQueueStatus() {
    return {
      queued: this.taskQueue.size,
      processing: this.processingTasks.size,
      completed: this.completedTasks.size,
      failed: this.failedTasks.size,
      maxConcurrent: this.maxConcurrent,
      isPaused: this.isPaused,
      stats: { ...this.stats }
    }
  }

  /**
   * 🔧 获取任务状态
   * @param {string} taskId - 任务ID
   * @returns {Object|null} 任务状态
   */
  getTaskStatus(taskId) {
    // 检查各个队列
    if (this.taskQueue.has(taskId)) {
      return { ...this.taskQueue.get(taskId), queue: 'waiting' }
    }
    if (this.processingTasks.has(taskId)) {
      return { ...this.processingTasks.get(taskId), queue: 'processing' }
    }
    if (this.completedTasks.has(taskId)) {
      return { ...this.completedTasks.get(taskId), queue: 'completed' }
    }
    if (this.failedTasks.has(taskId)) {
      return { ...this.failedTasks.get(taskId), queue: 'failed' }
    }

    return null
  }

  /**
   * 🔧 取消任务
   * @param {string} taskId - 任务ID
   * @returns {boolean} 是否成功取消
   */
  cancelTask(taskId) {
    // 只能取消排队中的任务
    if (this.taskQueue.has(taskId)) {
      const task = this.taskQueue.get(taskId)
      this.taskQueue.delete(taskId)

      // 移动到失败队列（标记为取消）
      this.failedTasks.set(taskId, {
        ...task,
        status: QUEUE_TASK_STATUS.CANCELLED,
        cancelledAt: Date.now()
      })

      console.log(`🚫 任务已取消: ${taskId}`)
      return true
    }

    console.warn(`⚠️ 无法取消任务: ${taskId} (任务可能已在处理中)`)
    return false
  }

  /**
   * 🔧 暂停队列
   */
  pause() {
    this.isPaused = true
    console.log('⏸️ 队列已暂停')
  }

  /**
   * 🔧 恢复队列
   */
  resume() {
    this.isPaused = false
    console.log('▶️ 队列已恢复')
    this.processQueue()
  }

  /**
   * 🔧 清空队列
   */
  clearQueue() {
    const queuedCount = this.taskQueue.size

    // 将所有排队任务移动到失败队列
    this.taskQueue.forEach((task, taskId) => {
      this.failedTasks.set(taskId, {
        ...task,
        status: QUEUE_TASK_STATUS.CANCELLED,
        cancelledAt: Date.now()
      })
    })

    this.taskQueue.clear()
    console.log(`🧹 已清空队列，取消了 ${queuedCount} 个任务`)
  }

  /**
   * 🔧 停止队列管理器
   */
  stop() {
    // 停止所有定时器
    if (this.processingInterval) {
      clearInterval(this.processingInterval)
      this.processingInterval = null
    }

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = null
    }

    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }

    this.isProcessing = false
    console.log('⏹️ 任务队列管理器已停止')
  }

  /**
   * 🔧 获取详细状态报告
   * @returns {Object} 详细状态
   */
  getDetailedStatus() {
    const now = Date.now()

    return {
      overview: this.getQueueStatus(),
      queuedTasks: Array.from(this.taskQueue.values()).map(task => ({
        id: task.id,
        workflowType: task.workflowType,
        priority: task.priority,
        queuedAt: task.queuedAt,
        waitingTime: now - task.queuedAt
      })),
      processingTasks: Array.from(this.processingTasks.values()).map(task => ({
        id: task.id,
        workflowType: task.workflowType,
        startedAt: task.startedAt,
        processingTime: now - task.startedAt,
        lastProgressUpdate: task.lastProgressUpdate,
        timeSinceLastProgress: now - task.lastProgressUpdate,
        progressHistory: task.progressHistory.slice(-5) // 最近5个进度记录
      })),
      recentCompleted: Array.from(this.completedTasks.values())
        .sort((a, b) => b.completedAt - a.completedAt)
        .slice(0, 10)
        .map(task => ({
          id: task.id,
          workflowType: task.workflowType,
          processingTime: task.processingTime,
          completedAt: task.completedAt
        })),
      recentFailed: Array.from(this.failedTasks.values())
        .sort((a, b) => b.failedAt - a.failedAt)
        .slice(0, 10)
        .map(task => ({
          id: task.id,
          workflowType: task.workflowType,
          attempts: task.attempts,
          errors: task.errors,
          failedAt: task.failedAt
        }))
    }
  }
}

export default TaskQueueManager
