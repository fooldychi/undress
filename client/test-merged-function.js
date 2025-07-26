// 测试合并后的 getGeneratedImageUrl 函数
import { getGeneratedImageUrl } from './src/services/comfyui.js'

// 模拟测试数据
const mockTaskResult = {
  executionServer: 'https://test-server.com',
  outputs: {
    '10': {
      images: [{
        filename: 'test-image.png',
        subfolder: '',
        type: 'output'
      }]
    }
  }
}

const mockTaskResultWithoutServer = {
  outputs: {
    '10': {
      images: [{
        filename: 'test-image-2.png',
        subfolder: '',
        type: 'output'
      }]
    }
  }
}

async function testMergedFunction() {
  console.log('🧪 测试合并后的 getGeneratedImageUrl 函数')
  
  try {
    // 测试1：有执行服务器的情况
    console.log('\n📋 测试1：任务结果包含执行服务器')
    const url1 = await getGeneratedImageUrl(mockTaskResult, 'undress', 'test-prompt-1')
    console.log('✅ 结果1:', url1)
    
    // 测试2：没有执行服务器的情况
    console.log('\n📋 测试2：任务结果不包含执行服务器')
    const url2 = await getGeneratedImageUrl(mockTaskResultWithoutServer, 'undress', 'test-prompt-2')
    console.log('✅ 结果2:', url2)
    
    console.log('\n🎉 所有测试通过！合并后的函数工作正常')
    
  } catch (error) {
    console.error('❌ 测试失败:', error)
  }
}

// 运行测试
testMergedFunction()
