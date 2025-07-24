/**
 * 🔥 任务队列管理器自动初始化脚本
 * 
 * 这个文件会在应用启动时自动初始化队列管理系统，
 * 确保所有ComfyUI任务都通过队列处理，彻底解决卡住问题。
 */

import { initializeTaskQueueManager, DEFAULT_QUEUE_CONFIG } from './queueManagerInit.js'

// 自动初始化标志
let autoInitialized = false

/**
 * 🔧 自动初始化队列管理系统
 */
export function autoInitializeQueueManager() {
  if (autoInitialized) {
    console.log('📋 队列管理器已自动初始化')
    return window.taskQueueManager
  }

  console.log('🚀 自动初始化任务队列管理系统...')

  try {
    // 检测环境配置
    const config = detectOptimalConfig()
    
    // 初始化队列管理器
    const queueManager = initializeTaskQueueManager(config)
    
    // 设置自动恢复机制
    setupAutoRecovery()
    
    // 设置性能监控
    setupPerformanceMonitoring()
    
    // 标记为已初始化
    autoInitialized = true
    
    console.log('✅ 任务队列管理系统自动初始化完成')
    console.log('📊 使用配置:', config)
    
    return queueManager
    
  } catch (error) {
    console.error('❌ 队列管理器自动初始化失败:', error)
    return null
  }
}

/**
 * 🔧 检测最优配置
 */
function detectOptimalConfig() {
  const config = { ...DEFAULT_QUEUE_CONFIG }
  
  // 检测设备性能
  const deviceInfo = getDeviceInfo()
  
  // 根据设备性能调整并发数
  if (deviceInfo.cores <= 2) {
    config.maxConcurrent = 1
  } else if (deviceInfo.cores <= 4) {
    config.maxConcurrent = 2
  } else {
    config.maxConcurrent = 3
  }
  
  // 根据内存调整超时时间
  if (deviceInfo.memory < 4) {
    config.taskTimeout = 180000      // 3分钟
    config.progressTimeout = 45000   // 45秒
  } else if (deviceInfo.memory < 8) {
    config.taskTimeout = 300000      // 5分钟
    config.progressTimeout = 60000   // 1分钟
  } else {
    config.taskTimeout = 600000      // 10分钟
    config.progressTimeout = 90000   // 1.5分钟
  }
  
  // 根据网络状况调整重试次数
  const networkInfo = getNetworkInfo()
  if (networkInfo.effectiveType === 'slow-2g' || networkInfo.effectiveType === '2g') {
    config.retryAttempts = 5
  } else if (networkInfo.effectiveType === '3g') {
    config.retryAttempts = 3
  } else {
    config.retryAttempts = 2
  }
  
  console.log('🔍 设备信息:', deviceInfo)
  console.log('🌐 网络信息:', networkInfo)
  
  return config
}

/**
 * 🔧 获取设备信息
 */
function getDeviceInfo() {
  const info = {
    cores: navigator.hardwareConcurrency || 4,
    memory: navigator.deviceMemory || 4,
    platform: navigator.platform,
    userAgent: navigator.userAgent
  }
  
  // 检测是否为移动设备
  info.isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  
  // 移动设备降低性能要求
  if (info.isMobile) {
    info.cores = Math.min(info.cores, 2)
    info.memory = Math.min(info.memory, 2)
  }
  
  return info
}

/**
 * 🔧 获取网络信息
 */
function getNetworkInfo() {
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection
  
  if (connection) {
    return {
      effectiveType: connection.effectiveType,
      downlink: connection.downlink,
      rtt: connection.rtt,
      saveData: connection.saveData
    }
  }
  
  // 默认假设为良好网络
  return {
    effectiveType: '4g',
    downlink: 10,
    rtt: 100,
    saveData: false
  }
}

/**
 * 🔧 设置自动恢复机制
 */
function setupAutoRecovery() {
  console.log('🛡️ 设置自动恢复机制...')
  
  // 页面可见性变化时检查任务状态
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && window.taskQueueManager) {
      console.log('👁️ 页面重新可见，检查任务状态...')
      setTimeout(() => {
        if (window.debugStuckTasks) {
          window.debugStuckTasks()
        }
      }, 2000)
    }
  })
  
  // 网络状态变化时重新连接
  window.addEventListener('online', () => {
    console.log('🌐 网络重新连接，检查队列状态...')
    if (window.taskQueueManager) {
      // 恢复队列处理
      window.taskQueueManager.resume()
    }
  })
  
  window.addEventListener('offline', () => {
    console.log('🌐 网络断开，暂停队列处理...')
    if (window.taskQueueManager) {
      // 暂停队列处理
      window.taskQueueManager.pause()
    }
  })
  
  // 定期健康检查（每2分钟）
  setInterval(() => {
    if (window.taskQueueManager) {
      const status = window.taskQueueManager.getQueueStatus()
      
      // 检查是否有长时间处理的任务
      if (status.processing > 0) {
        const detailed = window.taskQueueManager.getDetailedStatus()
        const now = Date.now()
        
        detailed.processingTasks.forEach(task => {
          const processingTime = now - task.startedAt
          const stuckTime = now - task.lastProgressUpdate
          
          // 如果任务处理超过10分钟且2分钟无进度更新
          if (processingTime > 600000 && stuckTime > 120000) {
            console.warn(`🚨 检测到长时间卡住的任务: ${task.id}`)
            
            // 尝试恢复
            if (window.taskQueueManager.attemptTaskRecovery) {
              window.taskQueueManager.attemptTaskRecovery(task.id)
            }
          }
        })
      }
    }
  }, 120000) // 2分钟检查一次
  
  console.log('✅ 自动恢复机制设置完成')
}

/**
 * 🔧 设置性能监控
 */
function setupPerformanceMonitoring() {
  console.log('📊 设置性能监控...')
  
  let lastStats = null
  
  // 每30秒记录性能统计
  setInterval(() => {
    if (window.taskQueueManager) {
      const status = window.taskQueueManager.getQueueStatus()
      const currentStats = status.stats
      
      if (lastStats) {
        // 计算增量统计
        const deltaProcessed = currentStats.totalProcessed - lastStats.totalProcessed
        const deltaSucceeded = currentStats.totalSucceeded - lastStats.totalSucceeded
        const deltaFailed = currentStats.totalFailed - lastStats.totalFailed
        
        if (deltaProcessed > 0) {
          const successRate = (deltaSucceeded / deltaProcessed * 100).toFixed(1)
          console.log(`📈 过去30秒统计: 处理${deltaProcessed}个任务, 成功率${successRate}%`)
          
          // 如果成功率过低，发出警告
          if (successRate < 80 && deltaProcessed >= 3) {
            console.warn(`⚠️ 任务成功率较低: ${successRate}%，建议检查服务器状态`)
          }
        }
      }
      
      lastStats = { ...currentStats }
    }
  }, 30000) // 30秒统计一次
  
  console.log('✅ 性能监控设置完成')
}

/**
 * 🔧 检查是否需要自动初始化
 */
export function checkAutoInitialization() {
  // 检查是否已有队列管理器
  if (window.taskQueueManager) {
    console.log('📋 检测到现有队列管理器')
    autoInitialized = true
    return window.taskQueueManager
  }
  
  // 检查是否在支持的环境中
  if (typeof window === 'undefined') {
    console.log('⚠️ 非浏览器环境，跳过队列管理器初始化')
    return null
  }
  
  // 自动初始化
  return autoInitializeQueueManager()
}

/**
 * 🔧 强制重新初始化
 */
export function forceReinitialize() {
  console.log('🔄 强制重新初始化队列管理器...')
  
  // 停止现有实例
  if (window.taskQueueManager) {
    window.taskQueueManager.stop()
    delete window.taskQueueManager
  }
  
  // 重置标志
  autoInitialized = false
  
  // 重新初始化
  return autoInitializeQueueManager()
}

/**
 * 🔧 获取初始化状态
 */
export function getInitializationStatus() {
  return {
    autoInitialized,
    hasQueueManager: !!window.taskQueueManager,
    isProcessing: window.taskQueueManager ? !window.taskQueueManager.isPaused : false
  }
}

// 在模块加载时自动检查初始化
if (typeof window !== 'undefined') {
  // 延迟初始化，确保DOM加载完成
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(checkAutoInitialization, 1000)
    })
  } else {
    setTimeout(checkAutoInitialization, 1000)
  }
}

export default {
  autoInitializeQueueManager,
  checkAutoInitialization,
  forceReinitialize,
  getInitializationStatus
}
