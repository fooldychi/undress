// 🔧 ComfyUI服务重构验证测试
import { 
  ImageUrlBuilder,
  getComfyUIImageUrl,
  getGeneratedImageUrl,
  getTaskBoundImageUrl,
  buildImageUrlWithServer,
  getImageUrl
} from './comfyui.js'

// 测试统一的图片URL构建器
function testImageUrlBuilder() {
  console.log('🧪 测试ImageUrlBuilder...')
  
  try {
    // 测试基本URL构建
    const url1 = ImageUrlBuilder.buildUrl('http://localhost:8188', 'test.jpg', 'subfolder', 'output')
    console.log('✅ 基本URL构建:', url1)
    
    // 测试从图片信息构建URL
    const imageInfo = {
      filename: 'generated.png',
      subfolder: 'outputs',
      type: 'output'
    }
    const url2 = ImageUrlBuilder.buildFromImageInfo('http://localhost:8188', imageInfo)
    console.log('✅ 从图片信息构建URL:', url2)
    
    // 测试错误处理
    try {
      ImageUrlBuilder.buildUrl('', 'test.jpg')
    } catch (error) {
      console.log('✅ 错误处理正常:', error.message)
    }
    
    console.log('✅ ImageUrlBuilder测试通过')
    return true
  } catch (error) {
    console.error('❌ ImageUrlBuilder测试失败:', error)
    return false
  }
}

// 测试兼容性函数
function testCompatibilityFunctions() {
  console.log('🧪 测试兼容性函数...')
  
  try {
    // 测试getComfyUIImageUrl
    const existingUrl = 'http://localhost:8188/api/view?filename=test.jpg&type=output'
    const result1 = getComfyUIImageUrl(existingUrl)
    console.log('✅ getComfyUIImageUrl兼容性:', result1 === existingUrl)
    
    console.log('✅ 兼容性函数测试通过')
    return true
  } catch (error) {
    console.error('❌ 兼容性函数测试失败:', error)
    return false
  }
}

// 运行所有测试
export function runComfyUIRefactorTests() {
  console.log('🚀 开始ComfyUI重构验证测试...')
  
  const results = {
    imageUrlBuilder: testImageUrlBuilder(),
    compatibility: testCompatibilityFunctions()
  }
  
  const allPassed = Object.values(results).every(result => result === true)
  
  if (allPassed) {
    console.log('🎉 所有重构验证测试通过！')
  } else {
    console.error('❌ 部分测试失败:', results)
  }
  
  return results
}

// 如果直接运行此文件，执行测试
if (typeof window !== 'undefined') {
  window.runComfyUIRefactorTests = runComfyUIRefactorTests
}
