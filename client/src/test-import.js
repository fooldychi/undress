// 测试组件导入
console.log('开始测试组件导入...')

try {
  // 测试配置文件导入
  console.log('测试配置文件导入...')
  import('./config/imageProcessingConfigs.js').then(() => {
    console.log('✅ 配置文件导入成功')
  }).catch(err => {
    console.error('❌ 配置文件导入失败:', err)
  })

  // 测试组件导入
  console.log('测试组件导入...')
  import('./components/common/UnifiedImageUploadPanel.vue').then(() => {
    console.log('✅ UnifiedImageUploadPanel 导入成功')
  }).catch(err => {
    console.error('❌ UnifiedImageUploadPanel 导入失败:', err)
  })

  import('./components/templates/UnifiedImageProcessingTemplate.vue').then(() => {
    console.log('✅ UnifiedImageProcessingTemplate 导入成功')
  }).catch(err => {
    console.error('❌ UnifiedImageProcessingTemplate 导入失败:', err)
  })

  // 测试页面导入
  console.log('测试页面导入...')
  import('./views/ClothesSwap.vue').then(() => {
    console.log('✅ ClothesSwap 导入成功')
  }).catch(err => {
    console.error('❌ ClothesSwap 导入失败:', err)
  })

  console.log('所有导入测试已启动')

} catch (error) {
  console.error('❌ 测试过程中发生错误:', error)
}
