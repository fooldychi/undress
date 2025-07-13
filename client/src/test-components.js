// 测试组件导入
try {
  console.log('开始测试组件导入...')
  
  // 测试配置文件
  import { getImageProcessingConfig } from './config/imageProcessingConfigs.js'
  console.log('✅ 配置文件导入成功')
  
  // 测试基础组件
  import SingleImageUpload from './components/common/SingleImageUpload.vue'
  console.log('✅ SingleImageUpload 导入成功')
  
  import MultiImageUpload from './components/common/MultiImageUpload.vue'
  console.log('✅ MultiImageUpload 导入成功')
  
  import UnifiedImageUploadPanel from './components/common/UnifiedImageUploadPanel.vue'
  console.log('✅ UnifiedImageUploadPanel 导入成功')
  
  // 测试模板组件
  import UnifiedImageProcessingTemplate from './components/templates/UnifiedImageProcessingTemplate.vue'
  console.log('✅ UnifiedImageProcessingTemplate 导入成功')
  
  console.log('🎉 所有组件导入测试通过！')
  
} catch (error) {
  console.error('❌ 组件导入失败:', error)
}
