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
          <van-icon name="photo-o" size="32" color="#07c160" class="page-icon" />
          文生图
        </h1>
        <p class="page-description">输入文字描述，AI为您生成精美图像</p>
      </header>

      <main class="page-content">
        <div class="input-section">
          <div class="input-card">
            <h3 class="input-title">描述您想要的图像</h3>
            <textarea
              v-model="prompt"
              placeholder="请详细描述您想要生成的图像，例如：一只橙色的猫坐在窗台上，窗外是蓝天白云，阳光透过窗户洒在猫咪身上，画面温馨美好，高清摄影风格"
              rows="6"
              class="prompt-input"
              :disabled="isLoading"
            ></textarea>

            <div class="prompt-examples">
              <h4>示例提示词：</h4>
              <div class="examples">
                <button
                  v-for="example in examples"
                  :key="example"
                  @click="prompt = example"
                  class="example-btn"
                  :disabled="isLoading"
                >
                  {{ example }}
                </button>
              </div>
            </div>

            <div class="generation-options">
              <div class="option-group">
                <label>图像尺寸：</label>
                <select v-model="imageSize" class="size-select" :disabled="isLoading">
                  <option value="512x512">512x512 (正方形)</option>
                  <option value="768x512">768x512 (横向)</option>
                  <option value="512x768">512x768 (纵向)</option>
                  <option value="1024x1024">1024x1024 (高清正方形)</option>
                </select>
              </div>

              <div class="option-group">
                <label>生成风格：</label>
                <select v-model="style" class="style-select" :disabled="isLoading">
                  <option value="realistic">写实风格</option>
                  <option value="anime">动漫风格</option>
                  <option value="artistic">艺术风格</option>
                  <option value="photography">摄影风格</option>
                </select>
              </div>
            </div>

            <van-button
              @click="generateImage"
              :disabled="isLoading || !prompt.trim()"
              type="primary"
              size="large"
              round
              :loading="isLoading"
              icon="photo-o"
              class="generate-btn"
            >
              {{ isLoading ? '生成中...' : '生成图像' }}
            </van-button>
          </div>
        </div>

        <div v-if="resultImage" class="result-section">
          <div class="result-card">
            <h3 class="result-title">生成结果</h3>
            <div class="result-image-container">
              <img :src="resultImage" alt="生成图像" class="result-image">
            </div>
            <div class="result-info">
              <p><strong>提示词：</strong>{{ usedPrompt }}</p>
              <p><strong>尺寸：</strong>{{ imageSize }}</p>
              <p><strong>风格：</strong>{{ getStyleName(style) }}</p>
            </div>
            <div class="result-actions">
              <a
                :href="resultImage"
                download="text-to-image-result.jpg"
                class="btn btn-primary download-btn"
              >
                下载图片
              </a>
              <button @click="generateAgain" class="btn btn-secondary">
                重新生成
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
import UserInfo from '../components/UserInfo.vue'
// import { comfyApi } from '../services/api.js'

const prompt = ref('')
const resultImage = ref(null)
const isLoading = ref(false)
const usedPrompt = ref('')
const imageSize = ref('512x512')
const style = ref('realistic')

const examples = [
  '一只可爱的小猫咪在花园里玩耍，阳光明媚',
  '未来科技城市的夜景，霓虹灯闪烁',
  '古代中国山水画风格的风景，水墨画效果',
  '宇宙中的星云和行星，科幻风格',
  '温馨的咖啡厅内景，暖色调灯光'
]

const generateImage = async () => {
  if (!prompt.value.trim()) return

  isLoading.value = true
  usedPrompt.value = prompt.value

  try {
    // 模拟文生图处理
    await new Promise(resolve => setTimeout(resolve, 3000))

    // 模拟生成结果 - 使用一个示例图片
    resultImage.value = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiIgZmlsbD0iIzY2N2VlYSIvPjx0ZXh0IHg9IjI1NiIgeT0iMjU2IiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjQiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+6ZSA55Sf5Zu+PC90ZXh0Pjx0ZXh0IHg9IjI1NiIgeT0iMzAwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTYiIGZpbGw9IndoaXRlIiBvcGFjaXR5PSIwLjgiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj7mqKHmi5/nu5PmnpwgKOW+heWQjuWunueOsClcPC90ZXh0Pjwvc3ZnPg=='

  } catch (error) {
    console.error('生成失败:', error)
    alert('生成失败，请重试')
  } finally {
    isLoading.value = false
  }
}

const generateAgain = () => {
  generateImage()
}

const getStyleName = (styleValue) => {
  const styleMap = {
    realistic: '写实风格',
    anime: '动漫风格',
    artistic: '艺术风格',
    photography: '摄影风格'
  }
  return styleMap[styleValue] || styleValue
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
</script>

<style scoped>
.feature-page {
  min-height: 100vh;
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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

.input-section {
  display: flex;
  justify-content: center;
}

.input-card {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 20px;
  padding: 32px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
  max-width: 800px;
  width: 100%;
}

.input-title {
  font-size: 1.5rem;
  margin-bottom: 20px;
  color: var(--text-color);
  text-align: center;
}

.prompt-input {
  width: 100%;
  padding: 16px;
  border: 2px solid #e1e5e9;
  border-radius: 12px;
  font-size: 16px;
  line-height: 1.5;
  resize: vertical;
  transition: var(--transition);
  font-family: inherit;
}

.prompt-input:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.prompt-examples {
  margin: 24px 0;
}

.prompt-examples h4 {
  margin-bottom: 12px;
  color: var(--text-color);
  font-size: 1rem;
}

.examples {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.example-btn {
  padding: 8px 16px;
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 20px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: var(--transition);
}

.example-btn:hover {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

.generation-options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin: 24px 0;
}

.option-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.option-group label {
  font-weight: 600;
  color: var(--text-color);
}

.size-select, .style-select {
  padding: 10px 12px;
  border: 2px solid #e1e5e9;
  border-radius: 8px;
  font-size: 14px;
  transition: var(--transition);
}

.size-select:focus, .style-select:focus {
  outline: none;
  border-color: var(--primary-color);
}

.generate-btn {
  width: 100%;
  font-size: 1.1rem;
  padding: 16px;
  margin-top: 24px;
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
  width: 100%;
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

.result-info {
  background: #f8f9fa;
  padding: 16px;
  border-radius: 12px;
  margin: 20px 0;
  text-align: left;
}

.result-info p {
  margin: 8px 0;
  color: var(--text-color);
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

  .generation-options {
    grid-template-columns: 1fr;
  }

  .examples {
    flex-direction: column;
  }

  .example-btn {
    text-align: left;
  }

  .result-actions {
    flex-direction: column;
  }
}
</style>
