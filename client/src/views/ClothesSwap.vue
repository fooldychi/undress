<template>
  <div class="feature-page">
    <!-- 右上角用户信息 -->
    <div class="top-corner">
      <UserInfo @login="handleUserLogin" @logout="handleUserLogout" />
    </div>

    <div class="container">
      <header class="page-header">
        <BackToHomeButton class="back-btn" />
        <h1 class="page-title">
          <UndressWomanIcon :size="32" color="var(--primary-color)" class="page-icon" />
          一键褪衣
        </h1>
        <p class="page-description">上传人物照片，AI将为您智能移除服装</p>
      </header>

      <!-- 体验点显示 -->
      <PointsDisplay ref="pointsDisplayRef" />

      <main class="page-content">
        <div v-if="!resultImage" class="upload-section">
          <div class="target-image-section">
            <h3 class="section-title">
              <UndressWomanIcon :size="20" color="var(--primary-color)" class="section-icon" />
              上传人物照片
            </h3>
            <!-- <p class="section-description">上传需要换衣的人物照片</p> -->

            <ImageUpload
              v-model="selectedImage"
              title="选择人物照片"
              description="支持 JPG、PNG 格式，建议尺寸 512x512 以上"
              icon="Image"
              :icon-size="48"
              :min-height="300"
              :disabled="isLoading"
              @change="handleImageChange"
            />
          </div>

          <div v-if="selectedImage" class="action-section">
            <!-- 处理按钮 -->
            <van-button
              v-if="!isLoading && !resultImage"
              @click="processImage"
              type="primary"
              size="large"
              round
              block
              class="process-btn"
            >
              <Shirt :size="20" color="white" class="btn-icon" />
              开始换衣
            </van-button>
          </div>
        </div>

        <!-- 处理状态 -->
        <ProcessingStatus
          v-if="isLoading"
          status="loading"
          title="正在处理换衣..."
          description="请耐心等待，处理时间可能需要几分钟"
          :progress="progressPercent"
          :prompt-id="promptId"
          :processing-time="processingTime"
        />

        <!-- 结果展示 -->
        <ImageComparison
          v-if="resultImage"
          :original-image="originalImageForComparison || selectedImage"
          :result-image="resultImage"
          @reset="resetProcess"
        />
      </main>
    </div>


  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { Toast } from 'vant'
import ImageUpload from '../components/ImageUpload.vue'
import ProcessingStatus from '../components/ProcessingStatus.vue'
import ImageComparison from '../components/ImageComparison.vue'
import PointsDisplay from '../components/PointsDisplay.vue'
import UserInfo from '../components/UserInfo.vue'
import BackToHomeButton from '../components/BackToHomeButton.vue'

import { UndressWomanIcon } from '../components/icons'

// 静态导入ComfyUI服务
import { processUndressImage } from '../services/comfyui.js'

console.log('ClothesSwap组件已加载，ComfyUI服务已导入')

const selectedImage = ref(null)
const originalImageForComparison = ref(null) // 新增：用于对比的原图（节点49）
const resultImage = ref(null)
const isLoading = ref(false)
const processingStatus = ref('')
const promptId = ref('')
const processingTime = ref('')
const progressPercent = ref(0) // 新增：处理进度百分比

// 拖拽对比功能
const sliderPosition = ref(50) // 滑块位置百分比
const isDragging = ref(false)
const comparisonContainer = ref(null)
const startTime = ref(null)

// 体验点组件引用
const pointsDisplayRef = ref(null)

// 使用VantUI Toast系统

const handleImageChange = (imageData, file) => {
  selectedImage.value = imageData
  resultImage.value = null // 清除之前的结果
  // 不再自动处理，等待用户点击按钮
}

const processImage = async () => {
  if (!selectedImage.value) return

  isLoading.value = true
  processingStatus.value = '正在加载服务...'
  progressPercent.value = 10
  startTime.value = Date.now()

  try {
    console.log('🚀 开始一键换衣处理')

    // ComfyUI服务已静态导入，无需动态加载

    processingStatus.value = '开始处理图片...'
    progressPercent.value = 30

    // 调用真实的ComfyUI API
    processingStatus.value = '正在处理图片...'
    progressPercent.value = 50

    const result = await processUndressImage(selectedImage.value)
    progressPercent.value = 90

    if (result && result.success) {
      resultImage.value = result.resultImage
      // 设置用于对比的原图（优先使用节点49的图片，否则使用用户上传的图片）
      originalImageForComparison.value = result.originalImage || selectedImage.value
      promptId.value = result.promptId || ''
      processingStatus.value = '处理完成！'
      progressPercent.value = 100

      // 计算处理时间
      if (startTime.value) {
        const duration = Math.round((Date.now() - startTime.value) / 1000)
        processingTime.value = `${duration}秒`
      }

      // 更新体验点显示
      if (pointsDisplayRef.value) {
        pointsDisplayRef.value.updatePointsStatus()
      }

      // 显示成功toast
      const pointsInfo = result.pointsConsumed ? `（消耗${result.pointsConsumed}点）` : ''
      Toast.success(`🎉 处理完成！${pointsInfo}可以拖拽中间线对比效果`)

      console.log('🎉 换衣处理成功')
    } else {
      throw new Error(result?.error || '处理失败')
    }

  } catch (error) {
    console.error('❌ 处理失败:', error)
    processingStatus.value = `❌ 处理失败: ${error.message}`
    progressPercent.value = 0

    // 显示用户友好的错误信息
    let errorMessage = '处理失败，请重试'
    if (error.message.includes('上传')) {
      errorMessage = '图片上传失败，请检查网络连接'
    } else if (error.message.includes('超时')) {
      errorMessage = '处理超时，请稍后重试'
    } else if (error.message.includes('工作流')) {
      errorMessage = '服务器处理失败，请稍后重试'
    } else if (error.message.includes('网络')) {
      errorMessage = '网络连接失败，请检查网络'
    } else if (error.message.includes('加载')) {
      errorMessage = '服务加载失败，请刷新页面重试'
    }

    Toast.fail(errorMessage)
  } finally {
    isLoading.value = false
    progressPercent.value = 0
  }
}

// Toast功能已移至useToast组合式函数

// 拖拽对比功能
const startDragging = (event) => {
  event.preventDefault()
  isDragging.value = true

  const moveHandler = (e) => {
    if (!isDragging.value || !comparisonContainer.value) return

    const rect = comparisonContainer.value.getBoundingClientRect()
    const clientX = e.clientX || (e.touches && e.touches[0].clientX)
    const x = clientX - rect.left
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100))

    sliderPosition.value = percentage
  }

  const stopDragging = () => {
    isDragging.value = false
    document.removeEventListener('mousemove', moveHandler)
    document.removeEventListener('mouseup', stopDragging)
    document.removeEventListener('touchmove', moveHandler)
    document.removeEventListener('touchend', stopDragging)
  }

  document.addEventListener('mousemove', moveHandler)
  document.addEventListener('mouseup', stopDragging)
  document.addEventListener('touchmove', moveHandler)
  document.addEventListener('touchend', stopDragging)
}

// 下载结果图片
const downloadResult = () => {
  if (!resultImage.value) return

  const link = document.createElement('a')
  link.href = resultImage.value
  link.download = `clothes-swap-result-${Date.now()}.jpg`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

const resetProcess = () => {
  selectedImage.value = null
  resultImage.value = null
  processingStatus.value = ''
  promptId.value = ''
  processingTime.value = ''
  sliderPosition.value = 50
  startTime.value = null

  // 清除文件输入
  const fileInput = document.getElementById('image-upload')
  if (fileInput) {
    fileInput.value = ''
  }
}

// 键盘快捷键支持
const handleKeyPress = (event) => {
  if (!resultImage.value) return

  if (event.key === 'ArrowLeft') {
    sliderPosition.value = Math.max(0, sliderPosition.value - 5)
  } else if (event.key === 'ArrowRight') {
    sliderPosition.value = Math.min(100, sliderPosition.value + 5)
  }
}

// 生命周期钩子
onMounted(() => {
  document.addEventListener('keydown', handleKeyPress)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyPress)
})

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
</script>

<style scoped>
.feature-page {
  min-height: 100vh;
  padding: 20px;
  background: linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 100%);
  position: relative;
}

/* 右上角用户信息 */
.top-corner {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 1000;
}

.container {
  max-width: 1000px;
  margin: 0 auto;
}

.page-header {
  text-align: center;
  margin-bottom: 40px;
}

.page-title {
  color: var(--text-color);
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

.page-icon {
  flex-shrink: 0;
}

.page-description {
  color: var(--text-light);
  font-size: 1.1rem;
  margin: 0;
  line-height: 1.5;
}

.page-description {
  font-size: 1.2rem;
  color: rgba(255, 255, 255, 0.8);
}

.page-content {
  display: flex;
  flex-direction: column;
  gap: 40px;
}

.upload-section {
  display: flex;
  flex-direction: column;
  gap: 40px;
}

/* 目标图片区域样式 - 与换脸页面保持一致 */
.target-image-section {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 20px;
  padding: 32px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
}

.section-title {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0 0 12px 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text-color);
}

.section-icon {
  flex-shrink: 0;
}

.section-description {
  margin: 0 0 24px 0;
  color: var(--text-light);
  font-size: 1rem;
  line-height: 1.5;
}

.upload-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 20px;
  padding: 32px;
  box-shadow: var(--shadow);
  color: var(--text-color);
}

.hidden {
  display: none;
}

.upload-area {
  display: block;
  cursor: pointer;
  border: 3px dashed var(--border-color);
  border-radius: 16px;
  padding: 40px;
  text-align: center;
  transition: var(--transition);
  min-width: 400px;
  min-height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.upload-area:hover {
  border-color: var(--primary-color);
  background: rgba(102, 126, 234, 0.05);
}

.upload-placeholder h3 {
  margin: 16px 0 8px;
  color: var(--text-color);
}

.upload-placeholder p {
  color: var(--text-light);
  font-size: 0.9rem;
}

.upload-icon {
  font-size: 4rem;
  margin-bottom: 16px;
}

.image-preview {
  position: relative;
  border-radius: 12px;
  overflow: hidden;
}

/* 移除预览图片的高度限制，让ImageUpload组件自己控制 */

.image-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: var(--transition);
}

.image-preview:hover .image-overlay {
  opacity: 1;
}

.process-btn {
  font-size: 1.1rem;
  padding: 16px 32px;
  min-width: 200px;
}

.status-message {
  margin-top: 16px;
  padding: 12px 16px;
  border-radius: 8px;
  background: rgba(76, 175, 80, 0.1);
  border: 1px solid rgba(76, 175, 80, 0.3);
  color: #2e7d32;
  font-size: 0.9rem;
  text-align: center;
}

.status-message.error {
  background: rgba(244, 67, 54, 0.1);
  border-color: rgba(244, 67, 54, 0.3);
  color: #c62828;
}

/* prompt-id样式已移至 shared.css */

.result-section {
  display: flex;
  justify-content: center;
}

.result-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 20px;
  padding: 32px;
  text-align: center;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
  max-width: 600px;
}

.result-title {
  font-size: 1.5rem;
  margin-bottom: 24px;
  color: var(--text-color);
}

.result-image-container {
  margin-bottom: 24px;
}

.result-image {
  max-width: 100%;
  max-height: 500px;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

.result-actions {
  display: flex;
  gap: 16px;
  justify-content: center;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background: #5a6268;
  transform: translateY(-2px);
}

/* 拖拽对比功能样式 */
.image-comparison-container {
  margin: 20px 0;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.comparison-wrapper {
  position: relative;
  width: 100%;
  height: 600px;
  overflow: hidden;
  cursor: col-resize;
  user-select: none;
  background: #000000; /* 改为黑色背景，避免白色间距 */
}

.image-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.comparison-image {
  width: 100%;
  height: 100%;
  object-fit: cover; /* 改为cover，充满整个区域 */
  object-position: center;
  display: block;
}

.result-layer {
  clip-path: inset(0 50% 0 0);
  transition: clip-path 0.1s ease-out;
}

.image-label {
  position: absolute;
  top: 16px;
  padding: 8px 16px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: 500;
  backdrop-filter: blur(10px);
  z-index: 10;
}

.original-label {
  left: 16px;
}

.result-label {
  right: 16px;
}

.comparison-slider {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 4px;
  background: white;
  cursor: col-resize;
  z-index: 20;
  transform: translateX(-2px);
  transition: left 0.1s ease-out;
}

.slider-line {
  width: 100%;
  height: 100%;
  background: linear-gradient(to bottom,
    rgba(255, 255, 255, 0.8),
    rgba(255, 255, 255, 1),
    rgba(255, 255, 255, 0.8)
  );
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.3);
}

.slider-handle {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 40px;
  height: 40px;
  background: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  cursor: col-resize;
}

.slider-circle {
  width: 12px;
  height: 12px;
  background: #007bff;
  border-radius: 50%;
}

.slider-arrow {
  position: absolute;
  color: #007bff;
  font-size: 12px;
  font-weight: bold;
}

.slider-arrow.left {
  left: 6px;
}

.slider-arrow.right {
  right: 6px;
}

.slider-handle:hover {
  transform: translate(-50%, -50%) scale(1.1);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
}

/* 处理信息样式 */
.process-info {
  margin-top: 20px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.info-label {
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.9rem;
}

.info-value {
  color: white;
  font-weight: 500;
  font-family: monospace;
  background: rgba(255, 255, 255, 0.1);
  padding: 4px 8px;
  border-radius: 4px;
}

/* 按钮样式已移至AppButton组件 */

@media (max-width: 768px) {
  .page-title {
    font-size: 2rem;
  }

  .upload-area {
    min-width: 300px;
    min-height: 250px;
    padding: 24px;
  }

  .result-actions {
    flex-direction: column;
  }

  .comparison-wrapper {
    height: 500px;
  }

  .slider-handle {
    width: 36px;
    height: 36px;
  }

  .slider-arrow {
    font-size: 10px;
  }

  .process-info {
    flex-direction: column;
    gap: 12px;
  }

  .toast {
    right: 20px;
    top: 20px;
  }

  .toast-content {
    padding: 12px 16px;
  }
}

/* VantUI组件样式覆盖 */
.processing-status {
  margin-top: 24px;
  padding: 20px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 12px;
}

.status-info {
  margin-top: 16px;
  text-align: center;
}

.status-text {
  color: var(--text-color);
  font-size: 16px;
  margin-bottom: 12px;
}

.process-details {
  display: flex;
  justify-content: center;
  gap: 20px;
  font-size: 14px;
  color: var(--text-light);
}

.action-section {
  text-align: center;
}

.process-btn {
  margin-top: 24px;
}

.process-btn .van-button__content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.btn-icon {
  flex-shrink: 0;
}

/* 动画已移至 shared.css */
</style>
