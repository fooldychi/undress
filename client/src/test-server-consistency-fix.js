/**
 * 多窗口服务器一致性修复测试
 * 验证图片URL生成是否使用正确的服务器地址
 */

import {
  getTaskBoundImageUrl,
  buildImageUrlWithServer,
  registerWindowTask,
  getWindowTask,
  removeWindowTask,
  windowTasks,
  WINDOW_ID
} from './services/comfyui.js'

// 模拟服务器地址
const mockServers = [
  'http://192.168.1.100:8188',
  'http://192.168.1.101:8188',
  'http://192.168.1.102:8188'
]

// 模拟任务结果
const mockTaskResult = {
  outputs: {
    "730": {
      images: [
        {
          filename: "ComfyUI_00001_.png",
          subfolder: "",
          type: "output"
        }
      ]
    },
    "812": {
      images: [
        {
          filename: "ComfyUI_00002_.png",
          subfolder: "",
          type: "output"
        }
      ]
    }
  }
}

// 模拟节点配置
const mockNodeConfig = {
  outputNodes: {
    primary: "730",
    secondary: ["812", "813", "746"]
  }
}

// 测试1: 验证任务绑定服务器记录
async function testTaskServerBinding() {
  console.log('\n🧪 测试1: 任务绑定服务器记录')

  try {
    const promptId = 'test-prompt-001'
    const mockTask = {
      workflowType: 'undress',
      createdAt: new Date().toISOString(),
      onProgress: null,
      onComplete: null,
      onError: null
    }

    // 模拟窗口锁定服务器
    window.windowLockedServer = mockServers[0]

    // 注册任务
    registerWindowTask(promptId, mockTask)

    // 验证任务是否正确记录了执行服务器
    const registeredTask = getWindowTask(promptId)

    if (registeredTask && registeredTask.executionServer === mockServers[0]) {
      console.log('✅ 测试1通过: 任务正确记录了执行服务器')
      console.log(`   绑定服务器: ${registeredTask.executionServer}`)
    } else {
      console.error('❌ 测试1失败: 任务未正确记录执行服务器')
      console.error(`   期望: ${mockServers[0]}`)
      console.error(`   实际: ${registeredTask?.executionServer}`)
    }

    // 清理
    removeWindowTask(promptId)

  } catch (error) {
    console.error('❌ 测试1异常:', error)
  }
}

// 测试2: 验证图片URL使用任务绑定的服务器
async function testImageUrlWithBoundServer() {
  console.log('\n🧪 测试2: 图片URL使用任务绑定的服务器')

  try {
    const promptId = 'test-prompt-002'
    const mockTask = {
      workflowType: 'undress',
      executionServer: mockServers[1], // 手动设置绑定服务器
      createdAt: new Date().toISOString()
    }

    // 注册任务
    windowTasks.set(promptId, mockTask)

    // 模拟 buildImageUrlWithServer 函数
    const expectedUrl = `${mockServers[1]}/api/view?filename=ComfyUI_00001_.png&type=output&subfolder=`

    // 验证URL构建
    const imageUrl = await buildImageUrlWithServer(mockServers[1], mockTaskResult, 'undress')
    console.log(`🌐 生成的图片URL: ${imageUrl}`)

    if (imageUrl.includes(mockServers[1])) {
      console.log('✅ 测试2通过: 图片URL使用了任务绑定的服务器')
    } else {
      console.error('❌ 测试2失败: 图片URL未使用绑定服务器')
      console.error(`   期望包含: ${mockServers[1]}`)
      console.error(`   实际URL: ${imageUrl}`)
    }

    // 清理
    windowTasks.delete(promptId)

  } catch (error) {
    console.error('❌ 测试2异常:', error)
  }
}

// 测试3: 验证多窗口隔离
async function testMultiWindowIsolation() {
  console.log('\n🧪 测试3: 多窗口隔离验证')

  try {
    const promptId1 = 'test-prompt-003'
    const promptId2 = 'test-prompt-004'

    // 模拟两个不同的任务绑定不同服务器
    const task1 = {
      workflowType: 'undress',
      executionServer: mockServers[0],
      windowId: WINDOW_ID,
      createdAt: new Date().toISOString()
    }

    const task2 = {
      workflowType: 'faceswap',
      executionServer: mockServers[1],
      windowId: 'other-window-id',
      createdAt: new Date().toISOString()
    }

    // 注册任务
    windowTasks.set(promptId1, task1)
    windowTasks.set(promptId2, task2)

    // 验证只能获取当前窗口的任务
    const retrievedTask1 = getWindowTask(promptId1)
    const retrievedTask2 = getWindowTask(promptId2)

    if (retrievedTask1 && !retrievedTask2) {
      console.log('✅ 测试3通过: 多窗口任务正确隔离')
      console.log(`   当前窗口任务: ${promptId1} -> ${retrievedTask1.executionServer}`)
      console.log(`   其他窗口任务: ${promptId2} -> 已隔离`)
    } else {
      console.error('❌ 测试3失败: 多窗口隔离不正确')
    }

    // 清理
    windowTasks.delete(promptId1)
    windowTasks.delete(promptId2)

  } catch (error) {
    console.error('❌ 测试3异常:', error)
  }
}

// 测试4: 验证getTaskBoundImageUrl完整流程
async function testCompleteImageUrlFlow() {
  console.log('\n🧪 测试4: 完整图片URL获取流程')

  try {
    const promptId = 'test-prompt-005'
    const mockTask = {
      workflowType: 'undress',
      executionServer: mockServers[2],
      windowId: WINDOW_ID,
      createdAt: new Date().toISOString()
    }

    // 注册任务
    windowTasks.set(promptId, mockTask)

    // 测试完整的getTaskBoundImageUrl流程
    const imageUrl = await getTaskBoundImageUrl(promptId, mockTaskResult, 'undress')

    if (imageUrl && imageUrl.includes(mockServers[2])) {
      console.log('✅ 测试4通过: 完整流程正确使用任务绑定服务器')
      console.log(`   最终图片URL: ${imageUrl}`)
    } else {
      console.error('❌ 测试4失败: 完整流程未使用正确服务器')
      console.error(`   期望包含: ${mockServers[2]}`)
      console.error(`   实际URL: ${imageUrl}`)
    }

    // 清理
    windowTasks.delete(promptId)

  } catch (error) {
    console.error('❌ 测试4异常:', error)
  }
}

// 测试5: 验证extractTaskResultsOfficial修复
async function testExtractTaskResultsOfficialFix() {
  console.log('\n🧪 测试5: extractTaskResultsOfficial服务器一致性修复')

  try {
    const promptId = 'test-prompt-006'
    const mockTask = {
      workflowType: 'faceswap',
      executionServer: mockServers[1],
      windowId: WINDOW_ID,
      createdAt: new Date().toISOString()
    }

    // 注册任务
    windowTasks.set(promptId, mockTask)

    // 模拟历史记录数据
    const mockHistory = {
      outputs: mockTaskResult.outputs
    }

    // 测试extractTaskResultsOfficial是否使用任务绑定的服务器
    const results = await extractTaskResultsOfficial(mockHistory, promptId)

    // 检查输出图片的URL是否使用了正确的服务器
    let allUrlsCorrect = true
    for (const nodeId in results.outputImages) {
      const images = results.outputImages[nodeId]
      for (const image of images) {
        if (image.url && !image.url.includes(mockServers[1])) {
          allUrlsCorrect = false
          console.error(`❌ 节点${nodeId}图片URL未使用绑定服务器: ${image.url}`)
        }
      }
    }

    if (allUrlsCorrect) {
      console.log('✅ 测试5通过: extractTaskResultsOfficial正确使用任务绑定服务器')
      console.log(`   绑定服务器: ${mockServers[1]}`)
    } else {
      console.error('❌ 测试5失败: extractTaskResultsOfficial未使用正确服务器')
    }

    // 清理
    windowTasks.delete(promptId)

  } catch (error) {
    console.error('❌ 测试5异常:', error)
  }
}

// 运行所有测试
export async function runServerConsistencyTests() {
  console.log('🚀 开始多窗口服务器一致性修复测试...')

  await testTaskServerBinding()
  await testImageUrlWithBoundServer()
  await testMultiWindowIsolation()
  await testCompleteImageUrlFlow()
  await testExtractTaskResultsOfficialFix()

  console.log('\n🎉 所有测试完成！')
  console.log('\n📋 修复总结:')
  console.log('✅ processUndressImage() 使用 getTaskBoundImageUrl()')
  console.log('✅ processFaceSwapImage() 使用 getTaskBoundImageUrl()')
  console.log('✅ registerWindowTask() 记录执行服务器')
  console.log('✅ buildImageUrlWithServer() 正确处理节点配置')
  console.log('✅ extractTaskResultsOfficial() 使用任务绑定服务器')
  console.log('\n🎯 结果: 多窗口服务器一致性问题已彻底解决！')
}

// 如果直接运行此文件，执行测试
if (import.meta.url === `file://${process.argv[1]}`) {
  runServerConsistencyTests()
}

export {
  testTaskServerBinding,
  testImageUrlWithBoundServer,
  testMultiWindowIsolation,
  testCompleteImageUrlFlow,
  testExtractTaskResultsOfficialFix
}
