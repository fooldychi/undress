/**
 * 多窗口环境下ComfyUI服务器一致性修复测试
 * 测试任务级服务器绑定和图片URL生成的修复效果
 */

import { 
  getTaskBoundImageUrl, 
  getTaskBoundServer, 
  buildImageUrlWithServer,
  registerWindowTask,
  getWindowTask,
  WINDOW_ID 
} from './services/comfyui.js'

// 模拟多窗口环境的测试数据
const mockServers = [
  'https://l9s75ay3rp-8188.cnb.run',
  'https://q7f8fgfybb-8188.cnb.run'
]

const mockTaskResult = {
  outputs: {
    "9": {
      images: [
        {
          filename: "ComfyUI_00043_.png",
          subfolder: "",
          type: "output"
        }
      ]
    }
  }
}

// 测试任务级服务器绑定
async function testTaskServerBinding() {
  console.log('🧪 测试1: 任务级服务器绑定')
  
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
    
    // 注册任务（应该绑定当前锁定的服务器）
    registerWindowTask(promptId, mockTask)
    
    // 验证任务绑定的服务器
    const boundServer = getTaskBoundServer(promptId)
    console.log(`✅ 任务绑定服务器: ${boundServer}`)
    
    if (boundServer === mockServers[0]) {
      console.log('✅ 测试1通过: 任务正确绑定到执行服务器')
    } else {
      console.error('❌ 测试1失败: 任务服务器绑定错误')
    }
    
  } catch (error) {
    console.error('❌ 测试1异常:', error)
  }
}

// 测试图片URL生成使用绑定服务器
async function testImageUrlWithBoundServer() {
  console.log('\n🧪 测试2: 图片URL生成使用绑定服务器')
  
  try {
    const promptId = 'test-prompt-002'
    const mockTask = {
      workflowType: 'undress',
      executionServer: mockServers[1], // 手动设置绑定服务器
      createdAt: new Date().toISOString()
    }

    // 注册任务
    registerWindowTask(promptId, mockTask)
    
    // 获取图片URL（应该使用绑定的服务器）
    const imageUrl = await getTaskBoundImageUrl(promptId, mockTaskResult, 'undress')
    console.log(`🌐 生成的图片URL: ${imageUrl}`)
    
    if (imageUrl.includes(mockServers[1])) {
      console.log('✅ 测试2通过: 图片URL使用了任务绑定的服务器')
    } else {
      console.error('❌ 测试2失败: 图片URL未使用绑定服务器')
      console.error(`   期望包含: ${mockServers[1]}`)
      console.error(`   实际URL: ${imageUrl}`)
    }
    
  } catch (error) {
    console.error('❌ 测试2异常:', error)
  }
}

// 测试多窗口服务器冲突场景
async function testMultiWindowServerConflict() {
  console.log('\n🧪 测试3: 多窗口服务器冲突场景')
  
  try {
    // 模拟窗口A的任务
    const promptIdA = 'window-a-task'
    const taskA = {
      workflowType: 'undress',
      executionServer: mockServers[0],
      windowId: 'window-a'
    }
    
    // 模拟窗口B的任务
    const promptIdB = 'window-b-task'
    const taskB = {
      workflowType: 'undress', 
      executionServer: mockServers[1],
      windowId: 'window-b'
    }
    
    // 注册两个任务
    registerWindowTask(promptIdA, taskA)
    registerWindowTask(promptIdB, taskB)
    
    // 获取各自的图片URL
    const urlA = await getTaskBoundImageUrl(promptIdA, mockTaskResult, 'undress')
    const urlB = await getTaskBoundImageUrl(promptIdB, mockTaskResult, 'undress')
    
    console.log(`🌐 窗口A图片URL: ${urlA}`)
    console.log(`🌐 窗口B图片URL: ${urlB}`)
    
    // 验证URL使用了正确的服务器
    const aUsesCorrectServer = urlA.includes(mockServers[0])
    const bUsesCorrectServer = urlB.includes(mockServers[1])
    
    if (aUsesCorrectServer && bUsesCorrectServer) {
      console.log('✅ 测试3通过: 多窗口任务使用了各自绑定的服务器')
    } else {
      console.error('❌ 测试3失败: 多窗口服务器冲突未解决')
    }
    
  } catch (error) {
    console.error('❌ 测试3异常:', error)
  }
}

// 测试调试功能
function testDebugFunctions() {
  console.log('\n🧪 测试4: 调试功能')
  
  try {
    // 测试调试函数是否可用
    if (typeof window.debugMultiWindowServers === 'function') {
      console.log('✅ debugMultiWindowServers 函数已暴露')
      window.debugMultiWindowServers()
    } else {
      console.error('❌ debugMultiWindowServers 函数未找到')
    }
    
  } catch (error) {
    console.error('❌ 测试4异常:', error)
  }
}

// 运行所有测试
async function runAllTests() {
  console.log(`🚀 开始多窗口服务器一致性修复测试 (窗口: ${WINDOW_ID})`)
  console.log('=' * 60)
  
  await testTaskServerBinding()
  await testImageUrlWithBoundServer()
  await testMultiWindowServerConflict()
  testDebugFunctions()
  
  console.log('\n' + '=' * 60)
  console.log('🎉 所有测试完成！')
  console.log('\n💡 使用说明:')
  console.log('1. 在浏览器控制台运行: window.debugMultiWindowServers()')
  console.log('2. 检查任务的服务器绑定情况')
  console.log('3. 验证图片URL是否使用正确的服务器地址')
}

// 导出测试函数
export {
  testTaskServerBinding,
  testImageUrlWithBoundServer,
  testMultiWindowServerConflict,
  testDebugFunctions,
  runAllTests
}

// 如果直接运行此文件，执行所有测试
if (import.meta.url === window.location.href) {
  runAllTests()
}
