<template>
  <div class="home">
    <!-- 右上角体验点显示 -->
    <div class="points-corner">
      <PointsDisplay :compact="true" />
    </div>

    <div class="container">
      <header class="header">
        <h1 class="title">
          <Palette :size="48" color="var(--primary-color)" class="logo-icon" />
          AI Magic
        </h1>
        <p class="subtitle">AI驱动的图像处理应用</p>
      </header>

      <main class="main">
        <div class="features">
          <div class="feature-card" @click="navigateTo('/clothes-swap')">
            <div class="feature-content">
              <div class="feature-icon">
                <UndressWomanIcon :size="48" color="var(--primary-color)" />
              </div>
              <h2 class="feature-title">一键褪衣</h2>
              <p class="feature-description">智能识别人物轮廓，快速移除照片中的服装</p>
              <div class="feature-arrow">
                <ChevronRight :size="20" color="var(--text-light)" />
              </div>
            </div>
          </div>

          <!-- 文生图功能暂时隐藏 -->
          <!-- <div class="feature-card" @click="navigateTo('/text-to-image')">
            <div class="feature-content">
              <div class="feature-icon">
                <van-icon name="photo-o" size="48" color="#07c160" />
              </div>
              <h2 class="feature-title">文生图</h2>
              <p class="feature-description">通过自然语言描述，AI生成高质量的创意图像</p>
              <div class="feature-arrow">
                <van-icon name="arrow" size="20" color="#969799" />
              </div>
            </div>
          </div> -->

          <div class="feature-card" @click="navigateTo('/face-swap')">
            <div class="feature-content">
              <div class="feature-icon">
                <FaceSwapIcon :size="48" color="var(--warning-color)" />
              </div>
              <h2 class="feature-title">极速换脸</h2>
              <p class="feature-description">精准面部识别技术，实现自然的人脸替换效果</p>
              <div class="feature-arrow">
                <ChevronRight :size="20" color="var(--text-light)" />
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer class="footer">
        <p>&copy; 2024 Imagic. 基于ComfyUI工作流的AI图像处理平台</p>
        <div class="footer-actions">
          <van-button
            @click="showConfigModal = !showConfigModal"
            type="default"
            size="small"
            plain
            round
          >
            ⚙️ 配置
          </van-button>
        </div>
      </footer>

      <!-- 配置模态框 -->
      <ConfigModal
        :visible="showConfigModal"
        @close="showConfigModal = false"
        @saved="onConfigSaved"
      />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Palette, ChevronRight } from 'lucide-vue-next'
import ConfigModal from '../components/ConfigModal.vue'
import PointsDisplay from '../components/PointsDisplay.vue'
import { UndressWomanIcon, FaceSwapIcon } from '../components/icons'

const router = useRouter()

// 配置模态框状态
const showConfigModal = ref(false)

// 导航函数
const navigateTo = (path) => {
  console.log('🔥 点击事件触发，准备导航到:', path)
  try {
    console.log('🚀 开始导航到:', path)
    router.push(path)
    console.log('✅ 导航成功')
  } catch (error) {
    console.error('❌ 导航失败:', error)
    alert(`导航到 ${path} 失败，请刷新页面重试`)
  }
}

// 配置保存回调
const onConfigSaved = (config) => {
  console.log('配置已保存:', config)
  showConfigModal.value = false
  alert('配置已保存')
}


</script>

<style scoped>
.home {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 100%);
  position: relative;
}

/* 右上角体验点显示 */
.points-corner {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 1000;
}

.container {
  max-width: 1200px;
  width: 100%;
  text-align: center;
}

.header {
  margin-bottom: 60px;
}

.title {
  font-size: 4rem;
  font-weight: 700;
  color: var(--text-color);
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

.logo-icon {
  flex-shrink: 0;
}

.subtitle {
  font-size: 1.5rem;
  color: var(--text-light);
  font-weight: 300;
}

.main {
  margin-bottom: 60px;
}



.features {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 32px;
  margin-top: 40px;
}

.feature-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  position: relative;
  height: 100%;
}

.feature-content {
  padding: 32px;
  text-align: center;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.feature-icon {
  margin-bottom: 20px;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 80px;
  height: 80px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  margin: 0 auto 20px;
}

.feature-title {
  color: var(--text-color);
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 12px;
}

.feature-description {
  color: var(--text-light);
  font-size: 1rem;
  line-height: 1.6;
  margin-bottom: 20px;
  flex-grow: 1;
}

.feature-arrow {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: auto;
}

.feature-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(25, 137, 250, 0.2), transparent);
  transition: left 0.6s;
  pointer-events: none; /* 确保伪元素不阻挡点击事件 */
}

.feature-card:hover::before {
  left: 100%;
}

.feature-card:hover {
  transform: translateY(-8px) scale(1.02);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
  border-color: var(--primary-color);
}

/* 这些样式已在上面的.feature-content中定义，删除重复 */

.feature-card:hover .feature-arrow {
  opacity: 1;
  transform: translateX(0);
}

.footer {
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.9rem;
}

.footer-actions {
  margin-top: 16px;
  display: flex;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
}

.config-btn, .debug-btn {
  display: inline-block;
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.8);
  text-decoration: none;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 20px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: var(--transition);
}

.config-btn:hover, .debug-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  transform: translateY(-2px);
}



@media (max-width: 768px) {
  .title {
    font-size: 2.5rem;
  }

  .logo {
    font-size: 3rem;
  }

  .subtitle {
    font-size: 1.2rem;
  }

  .features {
    grid-template-columns: 1fr;
    gap: 24px;
  }

  .feature-card {
    padding: 32px 24px;
  }
}
</style>
