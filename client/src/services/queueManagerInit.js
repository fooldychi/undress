/**
 * 🔥 任务队列管理器初始化
 * 
 * 这个文件负责：
 * 1. 初始化全局任务队列管理器
 * 2. 集成到现有的ComfyUI服务
 * 3. 提供调试工具和手动干预功能
 * 4. 确保与现有代码的兼容性
 */

import TaskQueueManager from './TaskQueueManager.js'

// 创建全局队列管理器实例
let queueManagerInstance = null

/**
 * 🔧 初始化任务队列管理器
 * @param {Object} config - 配置选项
 * @returns {TaskQueueManager} 队列管理器实例
 */
export function initializeTaskQueueManager(config = {}) {
  if (queueManagerInstance) {
    console.log('📋 任务队列管理器已存在，返回现有实例')
    return queueManagerInstance
  }

  console.log('🚀 初始化任务队列管理器...')
  
  // 创建队列管理器实例
  queueManagerInstance = new TaskQueueManager()
  
  // 应用自定义配置
  if (config.maxConcurrent) {
    queueManagerInstance.maxConcurrent = config.maxConcurrent
  }
  if (config.taskTimeout) {
    queueManagerInstance.taskTimeout = config.taskTimeout
  }
  if (config.retryAttempts) {
    queueManagerInstance.retryAttempts = config.retryAttempts
  }
  if (config.progressTimeout) {
    queueManagerInstance.progressTimeout = config.progressTimeout
  }

  // 挂载到全局对象
  window.taskQueueManager = queueManagerInstance
  
  // 设置调试工具
  setupDebugTools()
  
  // 设置错误恢复机制
  setupErrorRecovery()
  
  console.log('✅ 任务队列管理器初始化完成')
  return queueManagerInstance
}

/**
 * 🔧 获取队列管理器实例
 * @returns {TaskQueueManager|null} 队列管理器实例
 */
export function getTaskQueueManager() {
  return queueManagerInstance
}

/**
 * 🔧 设置调试工具
 */
function setupDebugTools() {
  // 调试工具：检查卡住的任务
  window.debugStuckTasks = function() {
    console.log('🔍 检查卡住的任务...')
    
    if (!queueManagerInstance) {
      console.log('❌ 队列管理器未初始化')
      return
    }

    const detailedStatus = queueManagerInstance.getDetailedStatus()
    const now = Date.now()
    
    console.log('📊 队列状态概览:')
    console.log(queueManagerInstance.getQueueStatus())
    
    console.log('\n🔄 正在处理的任务:')
    detailedStatus.processingTasks.forEach(task => {
      const stuckTime = now - task.lastProgressUpdate
      const isStuck = stuckTime > 60000 // 1分钟无进度更新
      
      console.log(`📋 任务 ${task.id}:`)
      console.log(`   类型: ${task.workflowType}`)
      console.log(`   处理时间: ${Math.round(task.processingTime / 1000)}秒`)
      console.log(`   最后进度更新: ${Math.round(stuckTime / 1000)}秒前`)
      console.log(`   状态: ${isStuck ? '🚨 可能卡住' : '✅ 正常'}`)
      
      if (task.progressHistory.length > 0) {
        const latest = task.progressHistory[task.progressHistory.length - 1]
        console.log(`   最新进度: ${latest.message} (${latest.percent}%)`)
      }
    })
  }

  // 手动修复工具：强制完成卡住的任务
  window.forceCompleteStuckTasks = async function() {
    console.log('🔧 强制完成卡住的任务...')
    
    if (!queueManagerInstance) {
      console.log('❌ 队列管理器未初始化')
      return
    }

    const detailedStatus = queueManagerInstance.getDetailedStatus()
    const now = Date.now()
    
    for (const task of detailedStatus.processingTasks) {
      const stuckTime = now - task.lastProgressUpdate
      
      // 超过2分钟无进度更新的任务
      if (stuckTime > 120000) {
        console.log(`🔧 发现卡住的任务，尝试恢复: ${task.id}`)
        
        try {
          await queueManagerInstance.attemptTaskRecovery(task.id)
          console.log(`✅ 任务恢复成功: ${task.id}`)
        } catch (error) {
          console.error(`❌ 任务恢复失败: ${task.id}`, error)
        }
      }
    }
  }

  // 队列统计工具
  window.getQueueStats = function() {
    if (!queueManagerInstance) {
      console.log('❌ 队列管理器未初始化')
      return null
    }

    const status = queueManagerInstance.getQueueStatus()
    const detailed = queueManagerInstance.getDetailedStatus()
    
    console.log('📊 详细队列统计:')
    console.log('=====================================')
    console.log(`总体状态: ${status.isPaused ? '暂停' : '运行中'}`)
    console.log(`最大并发: ${status.maxConcurrent}`)
    console.log(`排队任务: ${status.queued}`)
    console.log(`处理中任务: ${status.processing}`)
    console.log(`已完成任务: ${status.completed}`)
    console.log(`失败任务: ${status.failed}`)
    console.log('')
    console.log('性能统计:')
    console.log(`总处理数: ${status.stats.totalProcessed}`)
    console.log(`成功数: ${status.stats.totalSucceeded}`)
    console.log(`失败数: ${status.stats.totalFailed}`)
    console.log(`重试数: ${status.stats.totalRetried}`)
    console.log(`平均处理时间: ${Math.round(status.stats.averageProcessingTime / 1000)}秒`)
    
    if (status.stats.totalProcessed > 0) {
      const successRate = (status.stats.totalSucceeded / status.stats.totalProcessed * 100).toFixed(1)
      console.log(`成功率: ${successRate}%`)
    }
    
    return { status, detailed }
  }

  // 清理工具
  window.cleanupQueue = function() {
    if (!queueManagerInstance) {
      console.log('❌ 队列管理器未初始化')
      return
    }

    console.log('🧹 清理队列...')
    queueManagerInstance.cleanupCompletedTasks()
    queueManagerInstance.cleanupFailedTasks()
    console.log('✅ 队列清理完成')
  }

  // 重启队列管理器
  window.restartQueueManager = function() {
    if (!queueManagerInstance) {
      console.log('❌ 队列管理器未初始化')
      return
    }

    console.log('🔄 重启队列管理器...')
    
    // 停止当前实例
    queueManagerInstance.stop()
    
    // 重新初始化
    queueManagerInstance = null
    initializeTaskQueueManager()
    
    console.log('✅ 队列管理器重启完成')
  }

  console.log('🛠️ 调试工具已设置:')
  console.log('- window.debugStuckTasks() - 检查卡住的任务')
  console.log('- window.forceCompleteStuckTasks() - 强制完成卡住的任务')
  console.log('- window.getQueueStats() - 获取队列统计')
  console.log('- window.cleanupQueue() - 清理队列')
  console.log('- window.restartQueueManager() - 重启队列管理器')
}

/**
 * 🔧 设置错误恢复机制
 */
function setupErrorRecovery() {
  // 监听未处理的Promise拒绝
  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason?.message?.includes('Maximum recursive updates exceeded')) {
      console.error('🔥 检测到递归更新错误，队列管理器尝试恢复...')
      
      if (queueManagerInstance) {
        // 检查并恢复卡住的任务
        setTimeout(() => {
          window.forceCompleteStuckTasks()
        }, 1000)
      }
      
      // 阻止错误继续传播
      event.preventDefault()
    }
  })

  // 监听页面可见性变化
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && queueManagerInstance) {
      // 页面重新可见时，检查任务状态
      console.log('👁️ 页面重新可见，检查任务状态...')
      setTimeout(() => {
        window.debugStuckTasks()
      }, 2000)
    }
  })

  // 定期健康检查
  setInterval(() => {
    if (queueManagerInstance) {
      const status = queueManagerInstance.getQueueStatus()
      
      // 如果有处理中的任务但队列管理器停止了，重启它
      if (status.processing > 0 && !queueManagerInstance.isProcessing) {
        console.warn('⚠️ 检测到队列管理器异常停止，尝试重启...')
        queueManagerInstance.startQueueProcessor()
      }
    }
  }, 60000) // 每分钟检查一次

  console.log('🛡️ 错误恢复机制已设置')
}

/**
 * 🔧 队列化的工作流处理函数（替代原有的processWorkflow）
 * @param {Object} workflow - ComfyUI工作流
 * @param {Object} callbacks - 回调函数
 * @returns {Object} 任务控制器
 */
export function processWorkflowWithQueue(workflow, callbacks = {}) {
  if (!queueManagerInstance) {
    throw new Error('任务队列管理器未初始化，请先调用 initializeTaskQueueManager()')
  }

  const { onProgress, onComplete, onError, workflowType = 'default', priority } = callbacks

  console.log(`🎯 任务提交到队列 (类型: ${workflowType})`)

  // 使用队列管理器处理任务
  const taskId = queueManagerInstance.enqueueTask({
    workflow,
    workflowType,
    priority,
    onProgress: (message, percent) => {
      console.log(`📊 队列任务进度: ${message} (${percent}%)`)
      if (onProgress) onProgress(message, percent)
    },
    onComplete: (results) => {
      console.log(`✅ 队列任务完成: ${taskId}`)
      if (onComplete) onComplete(results)
    },
    onError: (error) => {
      console.error(`❌ 队列任务失败: ${taskId}`, error)
      if (onError) onError(error)
    }
  })

  // 返回任务控制器
  return {
    taskId,
    cancel: () => {
      console.log(`🚫 取消队列任务: ${taskId}`)
      return queueManagerInstance.cancelTask(taskId)
    },
    getStatus: () => {
      return queueManagerInstance.getTaskStatus(taskId)
    },
    getQueuePosition: () => {
      const detailed = queueManagerInstance.getDetailedStatus()
      const queuedTasks = detailed.queuedTasks
      const position = queuedTasks.findIndex(task => task.id === taskId)
      return position >= 0 ? position + 1 : null
    }
  }
}

/**
 * 🔧 销毁队列管理器
 */
export function destroyTaskQueueManager() {
  if (queueManagerInstance) {
    console.log('🛑 销毁任务队列管理器...')
    queueManagerInstance.stop()
    queueManagerInstance = null
    delete window.taskQueueManager
    console.log('✅ 任务队列管理器已销毁')
  }
}

// 默认配置
export const DEFAULT_QUEUE_CONFIG = {
  maxConcurrent: 3,
  taskTimeout: 300000,      // 5分钟
  retryAttempts: 2,
  progressTimeout: 60000    // 1分钟
}

export default {
  initializeTaskQueueManager,
  getTaskQueueManager,
  processWorkflowWithQueue,
  destroyTaskQueueManager,
  DEFAULT_QUEUE_CONFIG
}
