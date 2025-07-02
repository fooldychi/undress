<template>
  <div class="home">
    <div class="container">
      <header class="header">
        <h1 class="title">
          <span class="logo">🎨</span>
          Imagic - 测试版
        </h1>
        <p class="subtitle">AI驱动的图像处理应用 (Vue正常工作!)</p>
      </header>

      <main class="main">
        <div class="features">
          <div class="feature-card" @click="navigateTo('/clothes-swap')">
            <div class="feature-icon">👔</div>
            <h2 class="feature-title">一键换衣</h2>
            <p class="feature-description">智能识别人物轮廓，快速更换照片中的服装款式</p>
            <div class="feature-arrow">→</div>
          </div>

          <div class="feature-card" @click="navigateTo('/text-to-image')">
            <div class="feature-icon">🖼️</div>
            <h2 class="feature-title">文生图</h2>
            <p class="feature-description">通过自然语言描述，AI生成高质量的创意图像</p>
            <div class="feature-arrow">→</div>
          </div>

          <div class="feature-card" @click="navigateTo('/face-swap')">
            <div class="feature-icon">😀</div>
            <h2 class="feature-title">极速换脸</h2>
            <p class="feature-description">精准面部识别技术，实现自然的人脸替换效果</p>
            <div class="feature-arrow">→</div>
          </div>
        </div>
      </main>

      <footer class="footer">
        <p>&copy; 2024 Imagic. 基于ComfyUI工作流的AI图像处理平台</p>
        <div class="footer-actions">
          <button @click="showConfigModal = !showConfigModal" class="config-btn">⚙️ 配置</button>
          <button @click="testConnection" class="config-btn">🔗 测试连接</button>
          <router-link v-if="isDev" to="/api-test" class="debug-btn">🧪 API测试</router-link>
          <router-link v-if="isDev" to="/debug" class="debug-btn">🔧 调试</router-link>
        </div>
        <div v-if="showConfigModal" class="config-notice">
          <h3>ComfyUI 配置</h3>
          <p><strong>服务器:</strong> https://w47dwct9xg-8188.cnb.run</p>
          <p><strong>客户端ID:</strong> abc1373d4ad648a3a81d0587fbe5534b</p>
          <div style="margin-top: 12px;">
            <button @click="testConnection" class="config-btn" style="margin-right: 8px;">测试连接</button>
            <button @click="showConfigModal = false" class="config-btn">关闭</button>
          </div>
        </div>
      </footer>

      <!-- 配置模态框 - 暂时禁用 -->
      <!-- <ConfigModal
        :visible="showConfigModal"
        @close="showConfigModal = false"
        @saved="onConfigSaved"
      /> -->
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { computed, ref } from 'vue'
// import ConfigModal from '../components/ConfigModal.vue'

const router = useRouter()

// 检查是否为开发环境
const isDev = computed(() => import.meta.env.DEV)

// 配置模态框状态
const showConfigModal = ref(false)

const navigateTo = (path) => {
  try {
    console.log('导航到:', path)
    router.push(path)
  } catch (error) {
    console.error('导航失败:', error)
    alert(`导航到 ${path} 失败，请刷新页面重试`)
  }
}

// 配置保存回调
const onConfigSaved = (config) => {
  console.log('配置已保存:', config)
  showConfigModal.value = false
  alert('配置已保存')
}

// 测试连接
const testConnection = async () => {
  try {
    const response = await fetch('https://w47dwct9xg-8188.cnb.run/system_stats')
    if (response.ok) {
      alert('✅ 连接成功!')
    } else {
      alert('❌ 连接失败: ' + response.status)
    }
  } catch (error) {
    alert('❌ 网络错误: ' + error.message)
  }
}
</script>

<style scoped>
.home {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
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
  color: white;
  margin-bottom: 16px;
  text-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.logo {
  display: inline-block;
  margin-right: 16px;
  font-size: 4.5rem;
}

.subtitle {
  font-size: 1.5rem;
  color: rgba(255, 255, 255, 0.9);
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
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  padding: 40px 32px;
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  position: relative;
  overflow: hidden;
}

.feature-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
  transition: left 0.6s;
}

.feature-card:hover::before {
  left: 100%;
}

.feature-card:hover {
  transform: translateY(-8px) scale(1.02);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
}

.feature-icon {
  font-size: 4rem;
  margin-bottom: 24px;
  display: block;
}

.feature-title {
  font-size: 1.8rem;
  font-weight: 600;
  color: var(--text-color);
  margin-bottom: 16px;
}

.feature-description {
  font-size: 1rem;
  color: var(--text-light);
  line-height: 1.6;
  margin-bottom: 24px;
}

.feature-arrow {
  font-size: 1.5rem;
  color: var(--primary-color);
  font-weight: bold;
  opacity: 0;
  transform: translateX(-10px);
  transition: all 0.3s ease;
}

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

.config-notice {
  margin-top: 16px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.config-notice p {
  margin: 0 0 12px 0;
  color: rgba(255, 255, 255, 0.9);
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
