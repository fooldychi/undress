<template>
  <UnifiedImageProcessingTemplate
    function-id="face-swap"
    :title-icon="FaceSwapIcon"
    title-icon-color="var(--van-warning-color)"
    :process-button-icon="Users"
    :is-processing="isLoading"
    :progress="progressPercent"
    :processing-info="{ promptId, processingTime }"
    :result-data="resultImage"
    :original-image-for-comparison="originalImageForComparison"
    @login="handleUserLogin"
    @logout="handleUserLogout"
    @process="processImages"
    @reset="resetProcess"
    @download="handleDownload"
    @upload-change="handleUploadChange"
    ref="templateRef"
  />
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Toast } from 'vant'
import { Users } from 'lucide-vue-next'
import { UnifiedImageProcessingTemplate } from '../components/mobile'
import { FaceSwapIcon } from '../components/icons'
import { processFaceSwapImage } from '../services/comfyui.js'
import { handleError } from '../services/globalErrorHandler.js'

console.log('FaceSwapUnified组件已加载，ComfyUI服务已导入')

// 响应式数据
const templateRef = ref(null)
const facePhotos = ref([])
const targetImage = ref(null)
const originalImageForComparison = ref(null)
const resultImage = ref(null)
const isLoading = ref(false)
const processingStatus = ref('')
const promptId = ref('')
const processingTime = ref('')
const progressPercent = ref(0)
const startTime = ref(null)

// 计算属性
const canProcess = computed(() => {
  return facePhotos.value.length > 0 && targetImage.value !== null
})

// 处理上传变化
const handleUploadChange = (panelId, data) => {
  console.log('上传变化:', panelId, data)

  if (panelId === 'face-photos') {
    // 处理多图上传数据
    facePhotos.value = Array.isArray(data) ? data.map(item => item.url || item) : []
    resultImage.value = null // 清除之前的结果

    // 自动补齐到4张（如果需要的话）
    while (facePhotos.value.length < 4 && facePhotos.value.length > 0) {
      facePhotos.value.push(facePhotos.value[facePhotos.value.length - 1])
    }

    if (data.length > 0) {
      Toast.success(`已选择 ${data.length} 张照片${data.length < 4 ? '，自动补齐至4张' : ''}`)
    }
  } else if (panelId === 'target-image') {
    targetImage.value = data
    resultImage.value = null // 清除之前的结果
  }
}

// 处理图片
const processImages = async () => {
  if (!canProcess.value) {
    Toast.fail('请先上传人脸照片和目标图片')
    return
  }

  isLoading.value = true
  processingStatus.value = '正在加载服务...'
  progressPercent.value = 10
  startTime.value = Date.now()

  try {
    console.log('🚀 开始极速换脸处理')

    processingStatus.value = '正在上传图片...'
    progressPercent.value = 30

    // 调用换脸处理服务
    const result = await processFaceSwapImage({
      facePhotos: facePhotos.value,
      targetImage: targetImage.value,
      onProgress: (status, percent) => {
        processingStatus.value = status
        progressPercent.value = Math.max(progressPercent.value, percent)
      }
    })

    if (result.success && result.imageUrl) {
      resultImage.value = result.imageUrl
      // 保存目标图像用于对比（使用服务器返回的或原始的目标图像）
      originalImageForComparison.value = result.targetImageUrl || targetImage.value
      promptId.value = result.promptId || ''

      // 计算处理时间
      const endTime = Date.now()
      const duration = Math.round((endTime - startTime.value) / 1000)
      processingTime.value = `${duration}秒`

      // 显示成功toast
      const pointsInfo = result.pointsConsumed ? `（消耗${result.pointsConsumed}点）` : ''
      Toast.success(`🎉 换脸完成！${pointsInfo}可以拖拽中间线对比目标图像和换脸结果`)
      console.log('✅ 换脸处理完成')
    } else {
      throw new Error(result.error || '换脸处理失败')
    }
  } catch (error) {
    console.error('❌ 换脸处理失败:', error)

    // 使用全局错误处理器
    const isHandledGlobally = handleError(error, '换脸处理')

    // 如果没有被全局处理，则显示普通错误提示
    if (!isHandledGlobally) {
      Toast.fail(`换脸失败: ${error.message}`)
    }
  } finally {
    isLoading.value = false
    processingStatus.value = ''
    progressPercent.value = 0
  }
}

// 重置处理
const resetProcess = () => {
  facePhotos.value = []
  targetImage.value = null
  originalImageForComparison.value = null
  resultImage.value = null
  processingStatus.value = ''
  promptId.value = ''
  processingTime.value = ''

  // 重置模板内部状态
  if (templateRef.value) {
    const { uploadData } = templateRef.value
    if (uploadData['face-photos']) {
      uploadData['face-photos'] = []
    }
    if (uploadData['target-image']) {
      uploadData['target-image'] = null
    }
  }

  Toast.success('已重置，可以重新选择图片')
}

// 下载结果
const handleDownload = (imageUrl) => {
  if (!imageUrl) return

  const link = document.createElement('a')
  link.href = imageUrl
  link.download = `faceswap_result_${Date.now()}.png`
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
  console.log('FaceSwapUnified组件已挂载，ComfyUI服务已准备就绪')
})

onUnmounted(() => {
  // 清理工作
  if (isLoading.value) {
    isLoading.value = false
  }
})
</script>

<style scoped>
/* 这里可以添加特定于换脸功能的样式 */
/* 大部分样式已经在统一模板中处理 */

/* 如果需要自定义样式，可以在这里添加 */
:deep(.unified-image-upload-panel) {
  /* 自定义上传面板样式 */
}

:deep(.multi-image-upload) {
  /* 自定义多图上传样式 */
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

