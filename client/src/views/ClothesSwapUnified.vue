<template>
  <UnifiedImageProcessingTemplate
    function-id="clothes-swap"
    :title-icon="UndressWomanIcon"
    title-icon-color="var(--van-primary-color)"
    :process-button-icon="UndressWomanIcon"
    :is-processing="isLoading"
    :progress="progressPercent"
    :processing-info="{ promptId, processingTime }"
    :result-data="resultImage"
    :original-image-for-comparison="originalImageForComparison"
    @login="handleUserLogin"
    @logout="handleUserLogout"
    @process="processImage"
    @reset="resetProcess"
    @download="handleDownload"
    @upload-change="handleUploadChange"
    ref="templateRef"
  />
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { Toast } from 'vant'
import { UnifiedImageProcessingTemplate } from '../components/mobile'
import { UndressWomanIcon } from '../components/icons'
import { processUndressImage } from '../services/comfyui.js'
import { handleError } from '../services/globalErrorHandler.js'

console.log('ClothesSwapUnified组件已加载，ComfyUI服务已导入')

// 响应式数据
const templateRef = ref(null)
const selectedImage = ref(null)
const originalImageForComparison = ref(null)
const resultImage = ref(null)
const isLoading = ref(false)
const processingStatus = ref('')
const promptId = ref('')
const processingTime = ref('')
const progressPercent = ref(0)
const startTime = ref(null)

// 处理上传变化
const handleUploadChange = (panelId, data) => {
  console.log('上传变化:', panelId, data)

  if (panelId === 'main-image') {
    selectedImage.value = data
    resultImage.value = null // 清除之前的结果
  }
}

// 处理图片
const processImage = async () => {
  if (!selectedImage.value) {
    Toast.fail('请先上传人物照片')
    return
  }

  isLoading.value = true
  processingStatus.value = '正在加载服务...'
  progressPercent.value = 10
  startTime.value = Date.now()

  try {
    console.log('🚀 开始一键褪衣处理')

    processingStatus.value = '正在上传图片...'
    progressPercent.value = 30

    // 调用褪衣处理服务
    const result = await processUndressImage(selectedImage.value)

    if (result.success && result.resultImage) {
      resultImage.value = result.resultImage
      // 保存原图用于对比
      originalImageForComparison.value = result.originalImage || selectedImage.value
      promptId.value = result.promptId || ''

      // 计算处理时间
      const endTime = Date.now()
      const duration = Math.round((endTime - startTime.value) / 1000)
      processingTime.value = `${duration}秒`

      // 显示成功toast
      const pointsInfo = result.pointsConsumed ? `（消耗${result.pointsConsumed}点）` : ''
      Toast.success(`🎉 处理完成！${pointsInfo}可以拖拽中间线对比原图和处理结果`)
      console.log('✅ 褪衣处理完成')
    } else {
      throw new Error(result.error || '褪衣处理失败')
    }
  } catch (error) {
    console.error('❌ 褪衣处理失败:', error)

    // 使用全局错误处理器
    const isHandledGlobally = handleError(error, '褪衣处理')

    // 如果没有被全局处理，则显示普通错误提示
    if (!isHandledGlobally) {
      Toast.fail(`处理失败: ${error.message}`)
    }
  } finally {
    isLoading.value = false
    processingStatus.value = ''
    progressPercent.value = 0
  }
}

// 重置处理
const resetProcess = () => {
  selectedImage.value = null
  originalImageForComparison.value = null
  resultImage.value = null
  processingStatus.value = ''
  promptId.value = ''
  processingTime.value = ''

  // 重置模板内部状态
  if (templateRef.value) {
    const { uploadData } = templateRef.value
    if (uploadData['main-image']) {
      uploadData['main-image'] = null
    }
  }

  Toast.success('已重置，可以重新选择图片')
}

// 下载结果
const handleDownload = (imageUrl) => {
  if (!imageUrl) return

  const link = document.createElement('a')
  link.href = imageUrl
  link.download = `clothes_swap_result_${Date.now()}.png`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  Toast.success('图片下载已开始')
}

// 用户登录成功回调
const handleUserLogin = (data) => {
  console.log('用户登录成功:', data)
  // 可以在这里触发一些需要登录状态的操作
  // 比如刷新积分信息等
}

// 用户登出回调
const handleUserLogout = () => {
  console.log('用户已登出')
  // 可以在这里清理一些用户相关的状态
}

// 生命周期
onMounted(() => {
  console.log('ClothesSwapUnified组件已挂载，ComfyUI服务已准备就绪')
})

onUnmounted(() => {
  // 清理工作
  if (isLoading.value) {
    isLoading.value = false
  }
})
</script>

<style scoped>
/* 这里可以添加特定于一键褪衣功能的样式 */
/* 大部分样式已经在统一模板中处理 */

/* 如果需要自定义样式，可以在这里添加 */
:deep(.unified-image-upload-panel) {
  /* 自定义上传面板样式 */
}

:deep(.single-image-upload) {
  /* 自定义单图上传样式 */
}

/* 移动端优化 */
@media (max-width: 768px) {
  /* 移动端特定样式 */
}

/* 深色主题适配 */
@media (prefers-color-scheme: dark) {
  /* 深色主题样式 */
}
</style>

