<template>
  <div class="feature-page">
    <!-- 右上角用户信息 -->
    <div class="top-corner">
      <UserInfo @login="handleUserLogin" @logout="handleUserLogout" />
    </div>

    <div class="container">
      <header class="page-header">
        <van-button
          @click="$router.push('/')"
          type="default"
          size="small"
          plain
          round
          icon="arrow-left"
          class="back-btn"
        >
          返回首页
        </van-button>
        <h1 class="page-title">
          <FaceSwapIcon :size="32" color="var(--warning-color)" class="page-icon" />
          极速换脸
        </h1>
        <p class="page-description">上传4张人脸照片和1张目标图片，AI将为您智能换脸</p>
      </header>

      <!-- 体验点显示 -->
      <PointsDisplay ref="pointsDisplayRef" />

      <main class="page-content">
        <div v-if="!resultImage" class="upload-section">
          <!-- 人脸照片上传区域 -->
          <div class="face-photos-section">
            <h3 class="section-title">
              <FaceSwapIcon :size="20" color="var(--primary-color)" class="section-icon" />
              人脸照片 (1-4张)
            </h3>
            <!-- <p class="section-description">一次性选择1-4张清晰的人脸照片</p> -->

            <MultiImageUpload
              v-model="facePhotos"
              :disabled="isLoading"
              @change="handleFacePhotosChange"
            />
          </div>

          <!-- 目标图片上传区域 -->
          <div class="target-image-section">
            <h3 class="section-title">
              <Image :size="20" color="var(--success-color)" class="section-icon" />
              目标图片
            </h3>
            <!-- <p class="section-description">上传需要换脸的目标图片</p> -->

            <ImageUpload
              v-model="targetImage"
              title="上传需要换脸的目标图片"
              description="支持 JPG、PNG 格式，建议尺寸 512x512 以上"
              icon="Image"
              :icon-size="48"
              :disabled="isLoading"
              @change="handleTargetImageChange"
            />
          </div>

          <!-- 处理按钮 -->
          <div v-if="canProcess && !isLoading" class="action-section">
            <van-button
              @click="processImages"
              type="primary"
              size="large"
              round
              block
              class="process-btn"
            >
              <Users :size="20" color="white" class="btn-icon" />
              开始换脸
            </van-button>
          </div>

          <!-- 上传提示 -->
          <div v-else class="upload-tips">
            <div class="tip-item">
              <Image :size="16" color="var(--primary-color)" class="tip-icon" />
              <span>已上传 {{ uploadedFacePhotos }}/4 张人脸照片</span>
            </div>
            <div class="tip-item">
              <Image :size="16" color="var(--success-color)" class="tip-icon" />
              <van-icon :name="targetImage ? 'success' : 'cross'" size="16" :color="targetImage ? 'var(--success-color)' : 'var(--error-color)'" />
              <span>目标图片</span>
            </div>
          </div>
        </div>

        <!-- 处理状态 -->
        <ProcessingStatus
          v-if="isLoading"
          status="loading"
          title="正在处理换脸..."
          description="请耐心等待，处理时间可能需要几分钟"
          :progress="progressPercent"
          :prompt-id="promptId"
          :processing-time="processingTime"
        />

        <!-- 结果展示区域 -->
        <ImageComparison
          v-if="resultImage"
          :original-image="targetImageForComparison"
          :result-image="resultImage"
          @reset="resetProcess"
        />
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Toast } from 'vant'
import { Image } from 'lucide-vue-next'
import ImageUpload from '../components/ImageUpload.vue'
import MultiImageUpload from '../components/MultiImageUpload.vue'
import ProcessingStatus from '../components/ProcessingStatus.vue'
import ImageComparison from '../components/ImageComparison.vue'
import PointsDisplay from '../components/PointsDisplay.vue'
import UserInfo from '../components/UserInfo.vue'
import { FaceSwapIcon } from '../components/icons'

// 静态导入ComfyUI服务
import { processFaceSwapImage } from '../services/comfyui.js'

console.log('FaceSwap组件已加载，ComfyUI服务已导入')

// 响应式数据
const facePhotos = ref([]) // 人脸照片数组（1-4张，自动补齐到4张）
const targetImage = ref(null) // 目标图片（用于上传）
const targetImageForComparison = ref(null) // 目标图片（用于对比显示）
const resultImage = ref(null) // 处理结果
const isLoading = ref(false)
const processingStatus = ref('')
const promptId = ref('')
const processingTime = ref('')
const progressPercent = ref(0)

// 拖拽对比功能
const sliderPosition = ref(50)
const isDragging = ref(false)
const comparisonContainer = ref(null)
const startTime = ref(null)

// 体验点组件引用
const pointsDisplayRef = ref(null)

// 使用VantUI Toast系统

// 计算属性
const uploadedFacePhotos = computed(() => {
  return facePhotos.value.length
})

const canProcess = computed(() => {
  return facePhotos.value.length === 4 && targetImage.value !== null
})

// 处理人脸照片上传（多选）
const handleFacePhotosChange = (images, originalCount) => {
  facePhotos.value = images
  resultImage.value = null // 清除之前的结果

  if (originalCount > 0) {
    Toast.success(`已选择 ${originalCount} 张照片${originalCount < 4 ? '，自动补齐至4张' : ''}`)
  }
}

// 处理目标图片上传
const handleTargetImageChange = (imageData, file) => {
  targetImage.value = imageData
  resultImage.value = null // 清除之前的结果
}

// Toast功能已移至useToast组合式函数

// 处理图片
const processImages = async () => {
  if (!canProcess.value) return

  isLoading.value = true
  processingStatus.value = '正在加载服务...'
  progressPercent.value = 10
  startTime.value = Date.now()

  try {
    console.log('🚀 开始极速换脸处理')

    // ComfyUI服务已静态导入，无需动态加载

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
      targetImageForComparison.value = result.targetImageUrl || targetImage.value
      promptId.value = result.promptId || ''

      // 计算处理时间
      const endTime = Date.now()
      const duration = Math.round((endTime - startTime.value) / 1000)
      processingTime.value = `${duration}秒`

      // 更新体验点显示
      if (pointsDisplayRef.value) {
        pointsDisplayRef.value.updatePointsStatus()
      }

      // 显示成功toast
      const pointsInfo = result.pointsConsumed ? `（消耗${result.pointsConsumed}点）` : ''
      Toast.success(`🎉 换脸完成！${pointsInfo}可以拖拽中间线对比目标图像和换脸结果`)
      console.log('✅ 换脸处理完成')
    } else {
      throw new Error(result.error || '换脸处理失败')
    }
  } catch (error) {
    console.error('❌ 换脸处理失败:', error)
    Toast.fail(`换脸失败: ${error.message}`)
  } finally {
    isLoading.value = false
    processingStatus.value = ''
    progressPercent.value = 0
  }
}

// 下载结果
const downloadResult = () => {
  if (!resultImage.value) return

  const link = document.createElement('a')
  link.href = resultImage.value
  link.download = `faceswap_result_${Date.now()}.png`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  Toast.success('图片下载已开始')
}

// 重置处理
const resetProcess = () => {
  facePhotos.value = [null, null, null, null]
  targetImage.value = null
  targetImageForComparison.value = null
  resultImage.value = null
  processingStatus.value = ''
  promptId.value = ''
  processingTime.value = ''
  sliderPosition.value = 50
  Toast.success('已重置，可以重新选择图片')
}

// 拖拽功能
const startDrag = (e) => {
  isDragging.value = true
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
  document.addEventListener('touchmove', onDrag)
  document.addEventListener('touchend', stopDrag)
  e.preventDefault()
}

const onDrag = (e) => {
  if (!isDragging.value || !comparisonContainer.value) return

  const rect = comparisonContainer.value.getBoundingClientRect()
  const clientX = e.clientX || (e.touches && e.touches[0].clientX)
  const x = clientX - rect.left
  const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100))
  sliderPosition.value = percentage
}

const stopDrag = () => {
  isDragging.value = false
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
  document.removeEventListener('touchmove', onDrag)
  document.removeEventListener('touchend', stopDrag)
}



// 生命周期
onMounted(() => {
  console.log('FaceSwap组件已挂载，ComfyUI服务已准备就绪')
})

onUnmounted(() => {
  if (isDragging.value) {
    stopDrag()
  }
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

.section-title {
  color: var(--text-color);
  font-size: 1.3rem;
  font-weight: 600;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.section-icon {
  flex-shrink: 0;
}

.section-description {
  color: var(--text-light);
  font-size: 0.95rem;
  margin-bottom: 24px;
  line-height: 1.5;
}

.face-photos-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 32px;
}

.upload-tips {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 20px;
  margin-top: 24px;
}

.tip-item {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  color: var(--text-light);
  font-size: 0.95rem;
}

.tip-item:last-child {
  margin-bottom: 0;
}

.tip-icon {
  flex-shrink: 0;
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

.loading-icon,
.btn-icon {
  flex-shrink: 0;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: rgba(255, 255, 255, 0.9);
  text-decoration: none;
  font-size: 1rem;
  margin-bottom: 20px;
  transition: var(--transition);
}

.back-btn:hover {
  color: white;
  transform: translateX(-4px);
}

.back-icon {
  font-size: 1.2rem;
}

.page-title {
  font-size: 3rem;
  color: white;
  margin-bottom: 16px;
  text-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.page-icon {
  margin-right: 16px;
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

/* 人脸照片区域样式 */
.face-photos-section, .target-image-section {
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
  font-size: 1.5rem;
  color: var(--text-color);
  margin-bottom: 16px;
}

.section-icon {
  font-size: 1.8rem;
}

.section-description {
  color: var(--text-light);
  margin-bottom: 24px;
  line-height: 1.6;
}

/* 人脸照片网格样式已移至 MultiImageUpload 组件 */

/* 人脸照片相关样式已移至 MultiImageUpload 组件 */

.target-image-card {
  max-width: 400px;
  margin: 0 auto;
  background: var(--bg-dark-light);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  transition: var(--transition);
}

.target-image-card:hover {
  border-color: var(--primary-color);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4);
}

.target-image-area {
  display: block;
  cursor: pointer;
  min-height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  padding: 32px;
}

.target-image-placeholder {
  text-align: center;
  color: var(--text-light);
}

.target-image-placeholder h3 {
  margin: 16px 0 12px;
  color: var(--text-color);
  font-size: 1.2rem;
}

.target-image-placeholder p {
  font-size: 0.9rem;
  margin: 0;
  line-height: 1.5;
}

.target-image-preview {
  position: relative;
  width: 100%;
  height: 100%;
}

/* 上传提示样式已移至 shared.css */

/* 处理状态样式已移至 shared.css */

.hidden {
  display: none;
}

.image-preview {
  position: relative;
  border-radius: 12px;
  overflow: hidden;
}

.preview-image {
  max-width: 100%;
  max-height: 200px;
  border-radius: 12px;
  display: block;
}

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

.upload-grid {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 32px;
  align-items: center;
  margin-bottom: 32px;
}

.upload-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 20px;
  padding: 24px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
}

.upload-title {
  text-align: center;
  margin-bottom: 16px;
  color: var(--text-color);
  font-size: 1.2rem;
}

.upload-area {
  display: block;
  cursor: pointer;
  border: 3px dashed var(--border-color);
  border-radius: 16px;
  padding: 32px 16px;
  text-align: center;
  transition: var(--transition);
  min-height: 250px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
}

.upload-area:hover {
  border-color: var(--primary-color);
  background: rgba(102, 126, 234, 0.05);
}

.upload-placeholder p {
  margin: 12px 0 4px;
  color: var(--text-color);
  font-weight: 600;
}

.upload-hint {
  font-size: 0.85rem;
  color: var(--text-light);
}

.upload-icon {
  font-size: 3rem;
  margin-bottom: 8px;
}

.swap-arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 50%;
  width: 60px;
  height: 60px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
}

.arrow-icon {
  font-size: 1.5rem;
  color: var(--primary-color);
  font-weight: bold;
}

.action-section {
  text-align: center;
}

.swap-options {
  display: flex;
  justify-content: center;
  gap: 32px;
  margin-bottom: 24px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  padding: 20px;
  border-radius: 12px;
}

.option-group label {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-color);
  font-weight: 500;
  cursor: pointer;
}

.option-group input[type="checkbox"] {
  width: 18px;
  height: 18px;
  accent-color: var(--primary-color);
}

.swap-btn {
  font-size: 1.1rem;
  padding: 16px 32px;
  min-width: 200px;
}

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
  max-width: 800px;
  width: 100%;
}

.result-title {
  font-size: 1.5rem;
  margin-bottom: 24px;
  color: var(--text-color);
}

.result-comparison {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 24px;
  align-items: center;
  margin: 24px 0;
}

.comparison-item {
  text-align: center;
}

.comparison-item h4 {
  margin-bottom: 12px;
  color: var(--text-color);
}

.comparison-image {
  max-width: 100%;
  max-height: 300px;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

.comparison-arrow {
  font-size: 2rem;
  color: var(--primary-color);
  font-weight: bold;
}

/* 结果展示样式 */
.result-container {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 20px;
  padding: 32px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
}

.comparison-container {
  position: relative;
  margin: 24px 0;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.15);
  user-select: none;
  background: #f8f9fa;
  width: 100%;
  height: 80vh;
  min-height: 700px;
  max-height: 900px;
}

.comparison-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: var(--bg-dark);
}

.image-before, .image-after {
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
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
  object-fit: contain;
  object-position: center;
  display: block;
}

.image-label {
  position: absolute;
  top: 16px;
  left: 16px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: 500;
}

.slider-handle {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 4px;
  cursor: ew-resize;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
}

.slider-line {
  width: 4px;
  height: 100%;
  background: white;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.3);
}

.slider-button {
  position: absolute;
  background: white;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  color: var(--primary-color);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  cursor: ew-resize;
  user-select: none;
}

.result-actions {
  display: flex;
  gap: 16px;
  justify-content: center;
  margin-top: 24px;
}

/* 处理信息样式 */
.process-info {
  display: flex;
  gap: 24px;
  justify-content: center;
  flex-wrap: wrap;
}

/* 按钮样式已移至AppButton组件 */

@media (max-width: 768px) {
  .page-title {
    font-size: 2rem;
  }

  .face-photos-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }

  .comparison-container {
    height: 60vh;
    min-height: 400px;
    max-height: 600px;
    margin: 16px 0;
  }

  .result-actions {
    flex-direction: column;
    gap: 12px;
  }

  .process-info {
    flex-direction: column;
    gap: 16px;
    text-align: center;
  }

  .upload-tips {
    padding: 16px;
  }

  .tip-item {
    font-size: 1rem;
  }
}
</style>
