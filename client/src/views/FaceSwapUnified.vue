<template>
  <UnifiedImageProcessingTemplate
    function-id="face-swap"
    title-icon-name="face-swap"
    title-icon-color="var(--van-warning-color)"
    process-button-icon-name="face-swap"
    :is-processing="isLoading"
    :progress="progressPercent"
    :processing-description="processingStatus"
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
    // 处理多图上传数据，先在临时变量中完成所有逻辑
    let processedPhotos = Array.isArray(data) ? data.map(item => item.url || item) : []

    // 自动补齐逻辑在赋值前完成，避免多次修改响应式变量
    if (processedPhotos.length > 0 && processedPhotos.length < 4) {
      const lastPhoto = processedPhotos[processedPhotos.length - 1]
      while (processedPhotos.length < 4) {
        processedPhotos.push(lastPhoto)
      }
    }

    // 一次性赋值，减少响应式触发次数
    facePhotos.value = processedPhotos

    // 只在有结果时才清空，避免不必要的状态变更
    if (resultImage.value !== null) {
      resultImage.value = null
    }

    // 显示提示信息
    if (data.length > 0) {
      Toast.success(`已选择 ${data.length} 张照片${data.length < 4 ? '，自动补齐至4张' : ''}`)
    }
  } else if (panelId === 'target-image') {
    // 先更新目标图片
    targetImage.value = data

    // 只在有结果时才清空，避免不必要的状态变更
    if (resultImage.value !== null) {
      resultImage.value = null
    }
  }
}

// 处理图片
const processImages = async () => {
  if (!canProcess.value) {
    Toast.fail('请先上传人脸照片和目标图片')
    return
  }

  isLoading.value = true
  processingStatus.value = '正在初始化...'
  startTime.value = Date.now()

  try {
    console.log('🚀 开始极速换脸处理')

    // 调用换脸处理服务
    const result = await processFaceSwapImage({
      facePhotos: facePhotos.value,
      targetImage: targetImage.value,
      onProgress: (status, progress) => {
        // 直接同步更新，WebSocket管理器已经处理了异步
        processingStatus.value = status
        progressPercent.value = progress || 0
        console.log(`📊 处理状态: ${status}, 进度: ${progress}%`)
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
      const pointsInfo = result.pointsConsumed ? `\n消耗${result.pointsConsumed}点积分` : ''
      Toast.success(`🎉 换脸完成！${pointsInfo}\n可以拖拽中间线对比目标图像和换脸结果`)
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
const handleDownload = async (imageUrl) => {
  if (!imageUrl) return

  const { downloadImage } = await import('../utils/downloadUtils.js')
  await downloadImage(imageUrl, 'faceswap_result')
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

/* 移动端优化 */
@media (max-width: 768px) {
  /* 移动端特定样式 */
}

/* 深色主题适配 */
@media (prefers-color-scheme: dark) {
  /* 深色主题样式 */
}
</style>

