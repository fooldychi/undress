<template>
  <div class="feature-page">
    <div class="container">
      <header class="page-header">
        <router-link to="/" class="back-btn">
          <span class="back-icon">←</span>
          返回首页
        </router-link>
        <h1 class="page-title">
          <span class="page-icon">😀</span>
          极速换脸
        </h1>
        <p class="page-description">上传两张照片，AI将实现自然的人脸替换</p>
      </header>

      <main class="page-content">
        <div class="upload-section">
          <div class="upload-grid">
            <div class="upload-card">
              <h3 class="upload-title">源脸部图片</h3>
              <input
                type="file"
                accept="image/*"
                @change="handleSourceChange"
                id="source-upload"
                class="hidden"
              >
              <label for="source-upload" class="upload-area">
                <div v-if="!sourceImage" class="upload-placeholder">
                  <div class="upload-icon">👤</div>
                  <p>选择源脸部图片</p>
                  <span class="upload-hint">要替换的脸部</span>
                </div>
                <div v-else class="image-preview">
                  <img :src="sourceImage" alt="源脸部预览" class="preview-image">
                  <div class="image-overlay">
                    <span>点击更换</span>
                  </div>
                </div>
              </label>
            </div>

            <div class="swap-arrow">
              <span class="arrow-icon">⇄</span>
            </div>

            <div class="upload-card">
              <h3 class="upload-title">目标图片</h3>
              <input
                type="file"
                accept="image/*"
                @change="handleTargetChange"
                id="target-upload"
                class="hidden"
              >
              <label for="target-upload" class="upload-area">
                <div v-if="!targetImage" class="upload-placeholder">
                  <div class="upload-icon">🖼️</div>
                  <p>选择目标图片</p>
                  <span class="upload-hint">要被替换脸部的图片</span>
                </div>
                <div v-else class="image-preview">
                  <img :src="targetImage" alt="目标图片预览" class="preview-image">
                  <div class="image-overlay">
                    <span>点击更换</span>
                  </div>
                </div>
              </label>
            </div>
          </div>

          <div v-if="sourceImage && targetImage" class="action-section">
            <div class="swap-options">
              <div class="option-group">
                <label>
                  <input
                    type="checkbox"
                    v-model="preserveExpression"
                    :disabled="isLoading"
                  >
                  保持原表情
                </label>
              </div>
              <div class="option-group">
                <label>
                  <input
                    type="checkbox"
                    v-model="enhanceQuality"
                    :disabled="isLoading"
                  >
                  增强画质
                </label>
              </div>
            </div>

            <button
              @click="swapFaces"
              :disabled="isLoading"
              class="btn btn-primary swap-btn"
            >
              <span v-if="isLoading" class="loading"></span>
              {{ isLoading ? '处理中...' : '开始换脸' }}
            </button>
          </div>
        </div>

        <div v-if="resultImage" class="result-section">
          <div class="result-card">
            <h3 class="result-title">换脸结果</h3>
            <div class="result-comparison">
              <div class="comparison-item">
                <h4>原图</h4>
                <img :src="targetImage" alt="原图" class="comparison-image">
              </div>
              <div class="comparison-arrow">→</div>
              <div class="comparison-item">
                <h4>结果</h4>
                <img :src="resultImage" alt="换脸结果" class="comparison-image">
              </div>
            </div>
            <div class="result-actions">
              <a
                :href="resultImage"
                download="face-swap-result.jpg"
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
// import { comfyApi } from '../services/api.js'

const sourceImage = ref(null)
const targetImage = ref(null)
const resultImage = ref(null)
const isLoading = ref(false)
const preserveExpression = ref(true)
const enhanceQuality = ref(false)

const handleSourceChange = (event) => {
  const file = event.target.files[0]
  if (file) {
    if (file.size > 10 * 1024 * 1024) {
      alert('文件大小不能超过10MB')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      sourceImage.value = e.target.result
      resultImage.value = null
    }
    reader.readAsDataURL(file)
  }
}

const handleTargetChange = (event) => {
  const file = event.target.files[0]
  if (file) {
    if (file.size > 10 * 1024 * 1024) {
      alert('文件大小不能超过10MB')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      targetImage.value = e.target.result
      resultImage.value = null
    }
    reader.readAsDataURL(file)
  }
}

const swapFaces = async () => {
  if (!sourceImage.value || !targetImage.value) return

  isLoading.value = true
  try {
    // 模拟换脸处理
    await new Promise(resolve => setTimeout(resolve, 3000))

    // 模拟结果 - 返回目标图片作为结果
    resultImage.value = targetImage.value

  } catch (error) {
    console.error('换脸失败:', error)
    alert('换脸失败，请重试')
  } finally {
    isLoading.value = false
  }
}

const resetProcess = () => {
  sourceImage.value = null
  targetImage.value = null
  resultImage.value = null

  // 清除文件输入
  const sourceInput = document.getElementById('source-upload')
  const targetInput = document.getElementById('target-upload')
  if (sourceInput) sourceInput.value = ''
  if (targetInput) targetInput.value = ''
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
  background: rgba(255, 255, 255, 0.95);
  border-radius: 20px;
  padding: 24px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
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
  border: 3px dashed #ddd;
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
  background: rgba(255, 255, 255, 0.9);
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
  background: rgba(255, 255, 255, 0.95);
  border-radius: 20px;
  padding: 32px;
  text-align: center;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
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

  .upload-grid {
    grid-template-columns: 1fr;
    gap: 20px;
  }

  .swap-arrow {
    transform: rotate(90deg);
  }

  .swap-options {
    flex-direction: column;
    gap: 16px;
  }

  .result-comparison {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .comparison-arrow {
    transform: rotate(90deg);
  }

  .result-actions {
    flex-direction: column;
  }
}
</style>
