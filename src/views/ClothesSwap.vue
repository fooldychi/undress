<template>
  <div class="feature-page">
    <div class="container">
      <header class="page-header">
        <router-link to="/" class="back-btn">
          <span class="back-icon">←</span>
          返回首页
        </router-link>
        <h1 class="page-title">
          <span class="page-icon">👔</span>
          一键换衣
        </h1>
        <p class="page-description">上传人物照片，AI将为您智能更换服装</p>
      </header>

      <main class="page-content">
        <div class="upload-section">
          <div class="upload-card">
            <input
              type="file"
              accept="image/*"
              @change="handleFileChange"
              id="image-upload"
              class="hidden"
            >
            <label for="image-upload" class="upload-area">
              <div v-if="!selectedImage" class="upload-placeholder">
                <div class="upload-icon">📷</div>
                <h3>选择图片</h3>
                <p>支持 JPG、PNG 格式，建议尺寸 512x512 以上</p>
              </div>
              <div v-else class="image-preview">
                <img :src="selectedImage" alt="预览图" class="preview-image">
                <div class="image-overlay">
                  <span>点击更换图片</span>
                </div>
              </div>
            </label>
          </div>

          <div v-if="selectedImage" class="action-section">
            <button
              @click="processImage"
              :disabled="isLoading"
              class="btn btn-primary process-btn"
            >
              <span v-if="isLoading" class="loading"></span>
              {{ isLoading ? '处理中...' : '开始换衣' }}
            </button>

            <div v-if="processingStatus" class="status-message" :class="{ 'error': processingStatus.includes('失败') }">
              {{ processingStatus }}
            </div>

            <div v-if="promptId" class="prompt-id">
              <small>任务ID: {{ promptId }}</small>
            </div>
          </div>
        </div>

        <div v-if="resultImage" class="result-section">
          <div class="result-card">
            <h3 class="result-title">处理结果</h3>
            <div class="result-image-container">
              <img :src="resultImage" alt="结果图" class="result-image">
            </div>
            <div class="result-actions">
              <a
                :href="resultImage"
                download="clothes-swap-result.jpg"
                class="btn btn-primary download-btn"
              >
                下载图片
              </a>
              <button @click="resetProcess" class="btn btn-secondary">
                重新处理
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

// 动态导入ComfyUI服务，避免初始加载错误
let processUndressImage = null

// 异步加载ComfyUI服务
const loadComfyUIService = async () => {
  try {
    const module = await import('../services/comfyui.js')
    processUndressImage = module.processUndressImage
    console.log('ComfyUI服务加载成功')
    return true
  } catch (error) {
    console.error('ComfyUI服务加载失败:', error)
    return false
  }
}

const selectedImage = ref(null)
const resultImage = ref(null)
const isLoading = ref(false)
const processingStatus = ref('')
const promptId = ref('')

const handleFileChange = (event) => {
  const file = event.target.files[0]
  if (file) {
    // 验证文件大小（限制为10MB）
    if (file.size > 10 * 1024 * 1024) {
      alert('文件大小不能超过10MB')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      selectedImage.value = e.target.result
      resultImage.value = null // 清除之前的结果
    }
    reader.readAsDataURL(file)
  }
}

const processImage = async () => {
  if (!selectedImage.value) return

  isLoading.value = true
  processingStatus.value = '正在加载服务...'

  try {
    console.log('🚀 开始一键换衣处理')

    // 确保ComfyUI服务已加载
    if (!processUndressImage) {
      processingStatus.value = '正在加载ComfyUI服务...'
      const loaded = await loadComfyUIService()
      if (!loaded) {
        throw new Error('ComfyUI服务加载失败')
      }
    }

    processingStatus.value = '开始处理图片...'

    // 调用真实的ComfyUI API
    const result = await processUndressImage(selectedImage.value)

    if (result && result.success) {
      resultImage.value = result.resultImage
      promptId.value = result.promptId || ''
      processingStatus.value = '✅ 处理完成！'
      console.log('🎉 换衣处理成功')
    } else {
      throw new Error(result?.error || '处理失败')
    }

  } catch (error) {
    console.error('❌ 处理失败:', error)
    processingStatus.value = `❌ 处理失败: ${error.message}`

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

    alert(errorMessage)
  } finally {
    isLoading.value = false
  }
}

const resetProcess = () => {
  selectedImage.value = null
  resultImage.value = null
  processingStatus.value = ''
  promptId.value = ''
  // 清除文件输入
  const fileInput = document.getElementById('image-upload')
  if (fileInput) {
    fileInput.value = ''
  }
}
</script>

<style scoped>
.feature-page {
  min-height: 100vh;
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.container {
  max-width: 1000px;
  margin: 0 auto;
}

.page-header {
  text-align: center;
  margin-bottom: 40px;
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
  align-items: center;
  gap: 24px;
}

.upload-card {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 20px;
  padding: 32px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
}

.hidden {
  display: none;
}

.upload-area {
  display: block;
  cursor: pointer;
  border: 3px dashed #ddd;
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

.preview-image {
  max-width: 100%;
  max-height: 400px;
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

.prompt-id {
  margin-top: 8px;
  text-align: center;
  color: var(--text-light);
}

.result-section {
  display: flex;
  justify-content: center;
}

.result-card {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 20px;
  padding: 32px;
  text-align: center;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
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
}
</style>
