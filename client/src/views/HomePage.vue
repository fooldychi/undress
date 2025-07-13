<template>
  <MobilePageContainer
    title="AI Magic"
    @login="handleUserLogin"
    @logout="handleUserLogout"
  >
    <!-- 页面头部 -->
    <template #header>
      <div class="home-header">
        <div class="welcome-section">
          <h1 class="app-title">
            <van-icon name="magic" size="32" color="#FFD700" />
            AI Magic
          </h1>
          <p class="app-subtitle">智能图像处理，释放创意无限可能</p>
        </div>
      </div>
    </template>

    <!-- 主要内容 -->
    <div class="features-section">
      <!-- 动态渲染功能卡片 -->
      <MobileCard
        v-for="feature in featureConfigs"
        :key="feature.id"
        :title="feature.title"
        :clickable="true"
        :show-arrow="true"
        inset
        @click="navigateTo(feature)"
        class="feature-card"
      >
        <template #icon>
          <div class="feature-icon" :class="feature.iconClass">
            <!-- 自定义SVG图标 -->
            <component
              v-if="feature.icon.type === 'custom'"
              :is="feature.icon.component"
              :size="feature.icon.size"
              :color="feature.icon.color"
            />
            <!-- Vant图标 -->
            <van-icon
              v-else-if="feature.icon.type === 'vant'"
              :name="feature.icon.name"
              :size="feature.icon.size"
              :color="feature.icon.color"
            />
          </div>
        </template>

        <div class="feature-content">
          <div class="feature-description">
            {{ feature.description }}
          </div>
          <div class="feature-tags">
            <van-tag
              v-for="tag in feature.tags"
              :key="tag.text"
              :type="tag.type"
              size="small"
            >
              {{ tag.text }}
            </van-tag>
          </div>
        </div>
      </MobileCard>
    </div>

    <!-- 页面底部 -->
    <template #footer>
      <div class="home-footer">
        <div class="footer-content">
          <p class="copyright">© 2025 AI Magic 智能图像处理应用</p>
          <p class="disclaimer">(仅供个人娱乐，请勿在互联网传播，否则后果自负)</p>
        </div>
      </div>
    </template>
  </MobilePageContainer>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Toast } from 'vant'
import { MobilePageContainer, MobileCard } from '../components/mobile'
import { authApi } from '../services/api.js'
import { fetchFeaturesFromAPI } from '../config/features.js'
import { generateIconStyle, isDarkTheme, injectCSS, createCSSRule } from '../utils/styleGenerator.js'

const router = useRouter()

// 功能配置 - 从配置文件获取
const featureConfigs = ref([])

// 动态生成CSS样式
const generateDynamicStyles = () => {
  const isDark = isDarkTheme()
  let cssRules = []

  featureConfigs.value.forEach(feature => {
    if (feature.iconClass && feature.icon.color) {
      const iconStyle = generateIconStyle({
        color: feature.icon.color,
        opacity: 0.2
      }, isDark)

      const rule = createCSSRule(`.${feature.iconClass}`, iconStyle)
      cssRules.push(rule)
    }
  })

  if (cssRules.length > 0) {
    injectCSS(cssRules.join('\n\n'), 'feature-icon-styles')
  }
}

// 初始化功能配置
onMounted(async () => {
  try {
    featureConfigs.value = await fetchFeaturesFromAPI()
    // 生成动态样式
    generateDynamicStyles()
  } catch (error) {
    console.error('获取功能配置失败:', error)
    Toast.fail('加载功能列表失败')
  }
})

// 检查登录状态并导航
const navigateTo = (featureConfig) => {
  const { route, requireLogin, title } = featureConfig
  console.log('🔥 点击事件触发，准备导航到:', route)

  if (requireLogin) {
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
    console.log('🚀 开始导航到:', route)
    router.push(route)
    console.log('✅ 导航成功')
  } catch (error) {
    console.error('❌ 导航失败:', error)
    Toast.fail(`导航到 ${title} 失败，请刷新页面重试`)
  }
}





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
/* 页面头部样式 */
.home-header {
  text-align: center;
  padding: 24px 0;
}

.welcome-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.app-title {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 28px;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.95);
  text-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
  margin: 0;
}

.app-subtitle {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.8);
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  margin: 0;
  text-align: center;
  line-height: 1.5;
}

/* 功能区域样式 */
.features-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 0 4px;
}

.feature-card {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
}

.feature-card:hover {
  transform: translateY(-4px);
}

.feature-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: 16px;
  margin-bottom: 16px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  position: relative;
  overflow: hidden;
}

.feature-icon::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: linear-gradient(45deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transform: rotate(45deg) translate(-100%, -100%);
  transition: transform 0.6s ease;
}

.feature-card:hover .feature-icon::before {
  transform: rotate(45deg) translate(50%, 50%);
}

/* 动态图标样式 */
.undress-icon {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.2), rgba(102, 126, 234, 0.1));
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(102, 126, 234, 0.3);
}

.faceswap-icon {
  background: linear-gradient(135deg, rgba(240, 147, 251, 0.2), rgba(240, 147, 251, 0.1));
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(240, 147, 251, 0.3);
}

.texttoimage-icon {
  background: linear-gradient(135deg, rgba(79, 172, 254, 0.2), rgba(79, 172, 254, 0.1));
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(79, 172, 254, 0.3);
}

.feature-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.feature-description {
  font-size: 15px;
  color: rgba(255, 255, 255, 0.85);
  line-height: 1.6;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.feature-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.feature-tags .van-tag {
  opacity: 0.7; /* 降低不透明度 */
  font-weight: normal; /* 减轻字体粗细 */
  font-size: 10px; /* 减小字体大小 */
  padding: 0 8px; /* 调整内边距 */
  border-radius: 4px; /* 圆角更柔和 */
  background: rgba(255, 255, 255, 0.1); /* 半透明背景 */
  border: 1px solid rgba(255, 255, 255, 0.15); /* 添加细边框 */
  color: rgba(255, 255, 255, 0.85); /* 文字颜色更柔和 */
}

/* 覆盖不同类型标签的样式 */
.feature-tags .van-tag--primary {
  background: rgba(102, 126, 234, 0.15);
  border-color: rgba(102, 126, 234, 0.3);
  color: rgba(102, 126, 234, 0.9);
}

.feature-tags .van-tag--success {
  background: rgba(16, 185, 129, 0.15);
  border-color: rgba(16, 185, 129, 0.3);
  color: rgba(16, 185, 129, 0.9);
}

.feature-tags .van-tag--warning {
  background: rgba(245, 158, 11, 0.15);
  border-color: rgba(245, 158, 11, 0.3);
  color: rgba(245, 158, 11, 0.9);
}

/* 页面底部样式 */
.home-footer {
  margin-top: 40px;
  padding: 24px 0;
  text-align: center;
}

.footer-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.copyright {
  font-size: 14px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  margin: 0;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.disclaimer {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  margin: 0;
  line-height: 1.4;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

/* 移动端优化 */
@media (max-width: 768px) {
  .home-header {
    padding: 20px 0;
  }

  .app-title {
    font-size: 24px;
    gap: 10px;
  }

  .app-subtitle {
    font-size: 15px;
  }

  .features-section {
    gap: 16px;
    padding: 0 2px;
  }

  .feature-icon {
    width: 48px;
    height: 48px;
    margin-bottom: 12px;
  }

  .feature-description {
    font-size: 14px;
  }

  .home-footer {
    margin-top: 32px;
    padding: 20px 0;
  }
}

/* 深色主题适配 */
@media (prefers-color-scheme: dark) {
  .undress-icon {
    background: linear-gradient(135deg, rgba(102, 126, 234, 0.3), rgba(102, 126, 234, 0.1));
    border-color: rgba(102, 126, 234, 0.4);
  }

  .faceswap-icon {
    background: linear-gradient(135deg, rgba(240, 147, 251, 0.3), rgba(240, 147, 251, 0.1));
    border-color: rgba(240, 147, 251, 0.4);
  }

  .texttoimage-icon {
    background: linear-gradient(135deg, rgba(79, 172, 254, 0.3), rgba(79, 172, 254, 0.1));
    border-color: rgba(79, 172, 254, 0.4);
  }
}

/* 减少动画在低性能设备上的影响 */
@media (prefers-reduced-motion: reduce) {
  .feature-card {
    transition: none;
  }

  .feature-card:hover {
    transform: none;
  }

  .feature-icon::before {
    display: none;
  }
}
</style>
