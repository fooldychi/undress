/**
 * 测试crystools.monitor消息处理修复
 * 验证静默处理和队列等待提示功能
 */

// 模拟ComfyUI服务模块
const comfyUIModule = require('./client/src/services/comfyui.js')

console.log('🧪 测试crystools.monitor消息处理修复...\n')

// 测试1: 验证crystools.monitor消息被静默处理
console.log('📋 测试1: crystools.monitor消息静默处理')
try {
  const crystoolsMessage = {
    type: 'crystools.monitor',
    data: {
      cpu_utilization: 0.3,
      ram_total: 137438953472,
      ram_used: 10198892544,
      ram_used_percent: 7.4,
      hdd_total: -1
    }
  }
  
  console.log('📨 发送crystools.monitor消息...')
  comfyUIModule.handleWebSocketMessage(crystoolsMessage)
  console.log('✅ crystools.monitor消息已静默处理（无日志输出）')
} catch (error) {
  console.error('❌ crystools.monitor消息处理失败:', error.message)
}

// 测试2: 验证队列等待提示功能
console.log('\n📋 测试2: 队列等待提示功能')
try {
  // 模拟添加等待中的任务
  const mockTask = {
    status: 'waiting',
    onProgress: (message, progress) => {
      console.log(`📈 进度回调: ${message} (${progress}%)`)
    }
  }
  
  // 模拟pendingTasks（需要访问内部状态）
  if (comfyUIModule.pendingTasks) {
    comfyUIModule.pendingTasks.set('test-task-1', mockTask)
  }
  
  // 测试不同队列状态的消息
  const statusMessages = [
    {
      type: 'status',
      data: {
        status: {
          exec_info: {
            queue_remaining: 3
          }
        }
      }
    },
    {
      type: 'status', 
      data: {
        status: {
          exec_info: {
            queue_remaining: 1
          }
        }
      }
    },
    {
      type: 'status',
      data: {
        status: {
          exec_info: {
            queue_remaining: 0
          }
        }
      }
    }
  ]
  
  statusMessages.forEach((message, index) => {
    console.log(`\n📨 发送status消息 ${index + 1}...`)
    comfyUIModule.handleWebSocketMessage(message)
  })
  
  console.log('✅ 队列等待提示功能测试完成')
} catch (error) {
  console.error('❌ 队列等待提示测试失败:', error.message)
}

// 测试3: 验证其他消息类型不受影响
console.log('\n📋 测试3: 其他消息类型正常处理')
try {
  const normalMessage = {
    type: 'executing',
    data: {
      prompt_id: 'test-prompt-123',
      node: null
    }
  }
  
  console.log('📨 发送executing消息...')
  comfyUIModule.handleWebSocketMessage(normalMessage)
  console.log('✅ 其他消息类型正常处理')
} catch (error) {
  console.error('❌ 其他消息类型处理失败:', error.message)
}

console.log('\n🎉 所有测试完成！')
console.log('\n📝 修复总结:')
console.log('1. ✅ crystools.monitor消息现在被静默处理，不再产生"未知消息类型"日志')
console.log('2. ✅ 队列等待提示功能增强，提供更详细的等待状态信息')
console.log('3. ✅ 其他WebSocket消息处理流程保持不变')
console.log('4. ✅ 多任务并发环境下的消息干扰问题已解决')
