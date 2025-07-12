<template>
  <div class="home">
    <!-- 顶部导航 -->
    <TopNavigation
      ref="topNavigationRef"
      @login="handleUserLogin"
      @logout="handleUserLogout"
    />

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
        <p>&copy; 2024 AI Magic. AI图像处理应用（仅供个人娱乐，请勿在互联网传播，否则后果自负）</p>
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
          <van-button
            @click="refreshConfig"
            type="default"
            size="small"
            plain
            round
            :loading="configLoading"
          >
            🔄 刷新配置
          </van-button>
          <van-button
            @click="showLoadBalancerStatus = !showLoadBalancerStatus"
            type="default"
            size="small"
            plain
            round
          >
            📊 服务器状态
          </van-button>
          <van-button
            @click="$router.push('/load-balancer-test')"
            type="default"
            size="small"
            plain
            round
          >
            🧪 负载均衡测试
          </van-button>
        </div>
      </footer>

      <!-- 负载均衡器状态 -->
      <LoadBalancerStatus v-if="showLoadBalancerStatus" />

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
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Palette, ChevronRight } from 'lucide-vue-next'
import { Toast } from 'vant'
import ConfigModal from '../components/ConfigModal.vue'
import LoadBalancerStatus from '../components/LoadBalancerStatus.vue'
import TopNavigation from '../components/TopNavigation.vue'
import { UndressWomanIcon, FaceSwapIcon } from '../components/icons'
import { authApi } from '../services/api.js'
import configService from '../services/configService.js'

const router = useRouter()

// 配置模态框状态
const showConfigModal = ref(false)

// TopNavigation组件引用
const topNavigationRef = ref(null)

// 配置加载状态
const configLoading = ref(false)

// 负载均衡器状态显示
const showLoadBalancerStatus = ref(false)

// 检查登录状态并导航
const navigateTo = (path) => {
  console.log('🔥 点击事件触发，准备导航到:', path)

  // 检查是否为需要登录的页面
  const requireLoginPages = ['/clothes-swap', '/text-to-image', '/face-swap']

  if (requireLoginPages.includes(path)) {
    // 检查登录状态
    if (!authApi.isLoggedIn()) {
      console.log('❌ 未登录，显示登录提示')
      Toast.fail('请先登录后再使用此功能')

      // 触发TopNavigation组件显示登录弹窗
      if (topNavigationRef.value) {
        topNavigationRef.value.showLoginModal()
      }
      return
    }
  }

  try {
    console.log('🚀 开始导航到:', path)
    router.push(path)
    console.log('✅ 导航成功')
  } catch (error) {
    console.error('❌ 导航失败:', error)
    Toast.fail(`导航到 ${path} 失败，请刷新页面重试`)
  }
}

// 刷新配置
const refreshConfig = async () => {
  configLoading.value = true
  try {
    console.log('🔄 手动刷新配置...')

    // 清除配置缓存并重新获取
    configService.clearCache()
    await configService.syncComfyUIConfig()

    Toast.success('配置刷新成功')
    console.log('✅ 配置刷新完成')
  } catch (error) {
    console.error('❌ 配置刷新失败:', error)
    Toast.fail('配置刷新失败: ' + error.message)
  } finally {
    configLoading.value = false
  }
}

// 配置保存回调
const onConfigSaved = (config) => {
  console.log('配置已保存:', config)
  showConfigModal.value = false
  Toast.success('配置已保存')
}

// 组件挂载时初始化
onMounted(async () => {
  try {
    // 确保配置服务已初始化
    await configService.getConfig()
    console.log('✅ 首页配置检查完成')
  } catch (error) {
    console.warn('⚠️ 首页配置检查失败:', error)
  }
})

// 用户登录成功回调
const handleUserLogin = (data) => {
  console.log('用户登录成功:', data)
  // 可以在这里触发一些需要登录状态的操作
  // 比如刷新积分信息等
}

// 用户登出回调
const handleUserLogout = () => {
  console.log('用户已登出')
  // 可以在这里清理一些用户相关的状态
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

/* 顶部导航样式已在TopNavigation组件中定义 */

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
