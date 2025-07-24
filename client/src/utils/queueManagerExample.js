/**
 * 🔥 任务队列管理系统使用示例和测试
 * 
 * 这个文件展示了如何使用新的任务队列管理系统来彻底解决ComfyUI客户端卡住问题
 */

import { 
  initializeTaskQueueManager, 
  processWorkflowWithQueue,
  getTaskQueueManager,
  DEFAULT_QUEUE_CONFIG 
} from '../services/queueManagerInit.js'

import { processWorkflow } from '../services/comfyui.js'

/**
 * 🔧 初始化队列管理系统
 */
export function initializeQueueSystem() {
  console.log('🚀 初始化任务队列管理系统...')
  
  // 使用自定义配置初始化
  const config = {
    ...DEFAULT_QUEUE_CONFIG,
    maxConcurrent: 2,        // 最大并发数设为2（避免服务器过载）
    taskTimeout: 600000,     // 10分钟超时（AI任务可能需要更长时间）
    retryAttempts: 3,        // 增加重试次数
    progressTimeout: 90000   // 1.5分钟进度超时
  }
  
  const queueManager = initializeTaskQueueManager(config)
  
  console.log('✅ 任务队列管理系统初始化完成')
  console.log('📊 配置信息:', config)
  
  return queueManager
}

/**
 * 🔧 测试一键褪衣功能（使用队列）
 */
export async function testUndressWithQueue(base64Image) {
  console.log('🧪 测试一键褪衣功能（队列版本）...')
  
  try {
    // 确保队列管理器已初始化
    if (!getTaskQueueManager()) {
      initializeQueueSystem()
    }
    
    // 模拟一键褪衣工作流
    const undressWorkflow = {
      // 这里应该是实际的ComfyUI工作流JSON
      type: 'undress',
      input_image: base64Image,
      // ... 其他工作流参数
    }
    
    // 使用队列处理工作流
    const taskController = await processWorkflow(undressWorkflow, {
      workflowType: 'undress',
      priority: 2, // 普通优先级
      onProgress: (message, percent) => {
        console.log(`📊 一键褪衣进度: ${message} (${percent}%)`)
        
        // 检测52.25%卡住问题
        if (percent === 52.25) {
          console.log('🚨 检测到52.25%进度，队列管理器将自动处理...')
        }
      },
      onComplete: (results) => {
        console.log('✅ 一键褪衣完成!', results)
      },
      onError: (error) => {
        console.error('❌ 一键褪衣失败:', error)
      }
    })
    
    console.log('📋 任务已提交，任务ID:', taskController.taskId)
    console.log('📍 队列位置:', taskController.getQueuePosition())
    
    return taskController
    
  } catch (error) {
    console.error('❌ 测试失败:', error)
    throw error
  }
}

/**
 * 🔧 测试极速换脸功能（使用队列）
 */
export async function testFaceSwapWithQueue(sourceImage, targetImage) {
  console.log('🧪 测试极速换脸功能（队列版本）...')
  
  try {
    // 确保队列管理器已初始化
    if (!getTaskQueueManager()) {
      initializeQueueSystem()
    }
    
    // 模拟极速换脸工作流
    const faceSwapWorkflow = {
      type: 'faceswap',
      source_image: sourceImage,
      target_image: targetImage,
      // ... 其他工作流参数
    }
    
    // 使用队列处理工作流（高优先级）
    const taskController = await processWorkflow(faceSwapWorkflow, {
      workflowType: 'faceswap',
      priority: 3, // 高优先级
      onProgress: (message, percent) => {
        console.log(`📊 极速换脸进度: ${message} (${percent}%)`)
      },
      onComplete: (results) => {
        console.log('✅ 极速换脸完成!', results)
      },
      onError: (error) => {
        console.error('❌ 极速换脸失败:', error)
      }
    })
    
    console.log('📋 任务已提交，任务ID:', taskController.taskId)
    console.log('📍 队列位置:', taskController.getQueuePosition())
    
    return taskController
    
  } catch (error) {
    console.error('❌ 测试失败:', error)
    throw error
  }
}

/**
 * 🔧 批量测试（模拟多任务并发）
 */
export async function testBatchProcessing() {
  console.log('🧪 测试批量处理功能...')
  
  try {
    // 确保队列管理器已初始化
    if (!getTaskQueueManager()) {
      initializeQueueSystem()
    }
    
    const tasks = []
    
    // 提交5个测试任务
    for (let i = 0; i < 5; i++) {
      const workflow = {
        type: 'test',
        task_number: i + 1,
        // 模拟不同的处理时间
        processing_time: Math.random() * 30000 + 10000 // 10-40秒
      }
      
      const taskController = await processWorkflow(workflow, {
        workflowType: 'test',
        priority: Math.floor(Math.random() * 4) + 1, // 随机优先级
        onProgress: (message, percent) => {
          console.log(`📊 任务${i + 1}进度: ${message} (${percent}%)`)
        },
        onComplete: (results) => {
          console.log(`✅ 任务${i + 1}完成!`, results)
        },
        onError: (error) => {
          console.error(`❌ 任务${i + 1}失败:`, error)
        }
      })
      
      tasks.push(taskController)
      console.log(`📋 任务${i + 1}已提交，ID: ${taskController.taskId}`)
    }
    
    console.log('📊 所有任务已提交，当前队列状态:')
    console.log(getTaskQueueManager().getQueueStatus())
    
    return tasks
    
  } catch (error) {
    console.error('❌ 批量测试失败:', error)
    throw error
  }
}

/**
 * 🔧 测试卡住问题恢复机制
 */
export async function testStuckTaskRecovery() {
  console.log('🧪 测试卡住任务恢复机制...')
  
  try {
    // 确保队列管理器已初始化
    if (!getTaskQueueManager()) {
      initializeQueueSystem()
    }
    
    // 创建一个会"卡住"的模拟任务
    const stuckWorkflow = {
      type: 'stuck_test',
      will_stuck_at: 52.25, // 模拟在52.25%卡住
      stuck_duration: 120000 // 卡住2分钟
    }
    
    const taskController = await processWorkflow(stuckWorkflow, {
      workflowType: 'stuck_test',
      priority: 2,
      onProgress: (message, percent) => {
        console.log(`📊 卡住测试进度: ${message} (${percent}%)`)
        
        if (percent === 52.25) {
          console.log('🚨 任务在52.25%卡住，等待恢复机制触发...')
        }
      },
      onComplete: (results) => {
        console.log('✅ 卡住任务最终完成!', results)
      },
      onError: (error) => {
        console.error('❌ 卡住任务失败:', error)
      }
    })
    
    console.log('📋 卡住测试任务已提交，ID:', taskController.taskId)
    
    // 2分钟后检查恢复情况
    setTimeout(() => {
      console.log('🔍 检查任务恢复情况...')
      window.debugStuckTasks()
    }, 130000)
    
    return taskController
    
  } catch (error) {
    console.error('❌ 卡住测试失败:', error)
    throw error
  }
}

/**
 * 🔧 监控队列状态
 */
export function monitorQueueStatus() {
  console.log('📊 开始监控队列状态...')
  
  const queueManager = getTaskQueueManager()
  if (!queueManager) {
    console.log('❌ 队列管理器未初始化')
    return
  }
  
  // 每10秒输出一次状态
  const monitorInterval = setInterval(() => {
    const status = queueManager.getQueueStatus()
    const detailed = queueManager.getDetailedStatus()
    
    console.log('📊 队列状态监控:')
    console.log(`   排队: ${status.queued} | 处理中: ${status.processing} | 完成: ${status.completed} | 失败: ${status.failed}`)
    console.log(`   成功率: ${status.stats.totalProcessed > 0 ? Math.round(status.stats.totalSucceeded / status.stats.totalProcessed * 100) : 0}%`)
    console.log(`   平均处理时间: ${Math.round(status.stats.averageProcessingTime / 1000)}秒`)
    
    // 检查卡住的任务
    const now = Date.now()
    detailed.processingTasks.forEach(task => {
      const stuckTime = now - task.lastProgressUpdate
      if (stuckTime > 60000) { // 1分钟无进度更新
        console.log(`🚨 发现可能卡住的任务: ${task.id} (${Math.round(stuckTime / 1000)}秒无更新)`)
      }
    })
    
  }, 10000)
  
  // 返回停止监控的函数
  return () => {
    clearInterval(monitorInterval)
    console.log('⏹️ 队列状态监控已停止')
  }
}

/**
 * 🔧 完整的集成测试
 */
export async function runCompleteTest() {
  console.log('🧪 开始完整的队列管理系统测试...')
  
  try {
    // 1. 初始化系统
    console.log('\n1️⃣ 初始化队列管理系统')
    initializeQueueSystem()
    
    // 2. 开始监控
    console.log('\n2️⃣ 开始状态监控')
    const stopMonitoring = monitorQueueStatus()
    
    // 3. 测试批量处理
    console.log('\n3️⃣ 测试批量处理')
    await testBatchProcessing()
    
    // 4. 等待一段时间观察处理情况
    console.log('\n4️⃣ 等待30秒观察处理情况...')
    await new Promise(resolve => setTimeout(resolve, 30000))
    
    // 5. 测试卡住恢复
    console.log('\n5️⃣ 测试卡住任务恢复')
    await testStuckTaskRecovery()
    
    // 6. 等待恢复测试完成
    console.log('\n6️⃣ 等待恢复测试完成...')
    await new Promise(resolve => setTimeout(resolve, 150000))
    
    // 7. 输出最终统计
    console.log('\n7️⃣ 最终统计结果')
    window.getQueueStats()
    
    // 8. 停止监控
    stopMonitoring()
    
    console.log('✅ 完整测试完成!')
    
  } catch (error) {
    console.error('❌ 完整测试失败:', error)
    throw error
  }
}

// 导出所有测试函数
export default {
  initializeQueueSystem,
  testUndressWithQueue,
  testFaceSwapWithQueue,
  testBatchProcessing,
  testStuckTaskRecovery,
  monitorQueueStatus,
  runCompleteTest
}
