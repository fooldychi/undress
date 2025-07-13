<template>
  <UnifiedImageProcessingTemplate
    function-id="text-to-image"
    title-icon-name="photo-o"
    title-icon-color="var(--van-success-color)"
    :is-processing="isLoading"
    :progress="progressPercent"
    :processing-info="{ promptId, processingTime }"
    :result-data="resultImage"
    @login="handleUserLogin"
    @logout="handleUserLogout"
    @process="generateImage"
    @reset="resetProcess"
    @download="handleDownload"
    @input-change="handleInputChange"
    ref="templateRef"
  />
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Toast } from 'vant'
import { UnifiedImageProcessingTemplate } from '../components/mobile'
import { processTextToImage } from '../services/comfyui.js'

console.log('TextToImageUnified组件已加载，ComfyUI服务已导入')

// 响应式数据
const templateRef = ref(null)
const prompt = ref('')
const resultImage = ref(null)
const isLoading = ref(false)
const processingStatus = ref('')
const promptId = ref('')
const processingTime = ref('')
const progressPercent = ref(0)
const startTime = ref(null)

// 计算属性
const canProcess = computed(() => {
  return prompt.value.trim().length > 0
})

// 处理输入变化
const handleInputChange = (panelId, data) => {
  console.log('输入变化:', panelId, data)

  if (panelId === 'text-prompt') {
    prompt.value = data
    resultImage.value = null // 清除之前的结果
  }
}

// 生成图像
const generateImage = async () => {
  if (!canProcess.value) {
    Toast.fail('请先输入图像描述')
    return
  }

  isLoading.value = true
  processingStatus.value = '正在加载服务...'
  progressPercent.value = 10
  startTime.value = Date.now()

  try {
    console.log('🚀 开始文生图处理')

    processingStatus.value = '正在生成图像...'
    progressPercent.value = 30

    // 调用文生图处理服务
    const result = await processTextToImage({
      prompt: prompt.value.trim(),
      size: '512x512',
      style: 'realistic',
      onProgress: (status, percent) => {
        processingStatus.value = status
        progressPercent.value = Math.max(progressPercent.value, percent)
      }
    })

    if (result.success && result.imageUrl) {
      resultImage.value = result.imageUrl
      promptId.value = result.promptId || ''

      // 计算处理时间
      const endTime = Date.now()
      const duration = Math.round((endTime - startTime.value) / 1000)
      processingTime.value = `${duration}秒`

      // 显示成功toast
      const pointsInfo = result.pointsConsumed ? `（消耗${result.pointsConsumed}点）` : ''
      Toast.success(`🎉 图像生成完成！${pointsInfo}`)
      console.log('✅ 文生图处理完成')
    } else {
      throw new Error(result.error || '图像生成失败')
    }
  } catch (error) {
    console.error('❌ 文生图处理失败:', error)
    Toast.fail(`生成失败: ${error.message}`)
  } finally {
    isLoading.value = false
    processingStatus.value = ''
    progressPercent.value = 0
  }
}

// 重置处理
const resetProcess = () => {
  prompt.value = ''
  resultImage.value = null
  processingStatus.value = ''
  promptId.value = ''
  processingTime.value = ''

  // 重置模板内部状态
  if (templateRef.value) {
    const { inputData } = templateRef.value
    if (inputData['text-prompt']) {
      inputData['text-prompt'] = ''
    }
  }

  Toast.success('已重置，可以重新输入描述')
}

// 下载结果
const handleDownload = (imageUrl) => {
  if (!imageUrl) return

  const link = document.createElement('a')
  link.href = imageUrl
  link.download = `text_to_image_result_${Date.now()}.png`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  Toast.success('图片下载已开始')
}

// 用户登录成功回调
const handleUserLogin = (data) => {
  console.log('用户登录成功:', data)
  // 可以在这里触发一些需要登录状态的操作
}

// 用户登出回调
const handleUserLogout = () => {
  console.log('用户已登出')
  // 可以在这里清理一些用户相关的状态
}

// 生命周期
onMounted(() => {
  console.log('TextToImageUnified组件已挂载，ComfyUI服务已准备就绪')
})

onUnmounted(() => {
  // 清理工作
  if (isLoading.value) {
    isLoading.value = false
  }
})
</script>

<style scoped>
/* 这里可以添加特定于文生图功能的样式 */
/* 大部分样式已经在统一模板中处理 */

/* 如果需要自定义样式，可以在这里添加 */
:deep(.input-panel) {
  /* 自定义输入面板样式 */
}

:deep(.text-input) {
  /* 自定义文本输入样式 */
}

:deep(.simple-result) {
  /* 自定义结果显示样式 */
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

