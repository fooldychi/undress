<template>
  <van-nav-bar
    :left-arrow="showBackButton"
    @click-left="handleLeftClick"
    class="top-navigation"
    fixed
    placeholder
  >
    <!-- 左侧插槽 -->
    <template #left>
      <div class="nav-left">
        <template v-if="showBackButton">
          <!-- Make back button visible -->
          <div class="back-button">
            <van-icon name="arrow-left" size="18" color="#fff" />
          </div>
        </template>
        <template v-else>
          <!-- New left side branding with emoji -->
          <div class="nav-branding" @click="goToHome">
            <span class="palette-emoji">🎨</span>
            <span class="brand-text">AI Magic</span>
          </div>
        </template>
      </div>
    </template>

    <!-- 标题插槽 - 移除中间标题 -->
    <template #title>
      <!-- Title removed -->
    </template>

    <!-- 右侧插槽保持不变 -->
    <template #right>
      <div class="nav-right">
        <!-- 积分显示 - 仅在登录时显示 -->
        <div
          v-if="isLoggedIn"
          class="nav-points"
          @click="showPointsModal = true"
          title="点击查看积分详情"
        >
          <van-icon name="diamond-o" size="16" />
          <span v-if="!pointsLoading" class="points-text">{{ pointsStatus.current }}</span>
          <van-loading v-else size="12" color="var(--primary-color)" />
        </div>

        <!-- 用户信息 -->
        <div class="nav-user">
          <!-- 未登录状态 -->
          <div v-if="!isLoggedIn" @click="showLoginModal" title="点击登录">
            <van-icon name="user-o" size="16" />
            <span class="user-text">登录</span>
          </div>
          <!-- 已登录状态 -->
          <div v-else @click="goToProfile" title="点击进入个人中心">
            <van-icon name="user-o" size="16" />
          </div>
        </div>
      </div>
    </template>
  </van-nav-bar>

  <!-- 积分弹窗 -->
  <PointsModal
    v-model:show="showPointsModal"
    @points-updated="handlePointsUpdated"
  />

  <!-- 登录注册弹窗 -->
  <AuthModal
    v-model:show="showAuthModal"
    :default-mode="authMode"
    @success="handleAuthSuccess"
  />
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Toast } from 'vant'
import { authApi } from '../services/api.js'
import levelCardPointsManager from '../utils/levelCardPointsManager.js'
import PointsModal from './PointsModal.vue'
import AuthModal from './AuthModal.vue'

// 定义props
const props = defineProps({
  title: {
    type: String,
    default: ''
  },
  showBack: {
    type: Boolean,
    default: null // null表示自动判断
  }
})

// 定义事件
const emit = defineEmits(['login', 'logout'])

// 路由
const router = useRouter()
const route = useRoute()

// 计算属性
const pageTitle = computed(() => {
  if (props.title) return props.title

  // 根据路由自动生成标题
  const routeTitleMap = {
    '/': 'AI Magic',
    '/clothes-swap': '一键换衣',
    '/face-swap': '极速换脸',
    '/text-to-image': '文生图',
    '/profile': '个人中心'
  }

  return routeTitleMap[route.path] || 'AI Magic'
})

const showBackButton = computed(() => {
  if (props.showBack !== null) return props.showBack

  // 自动判断：首页不显示返回按钮，其他页面显示
  return route.path !== '/'
})

// 获取标题图标 - 不再需要此函数
// const getTitleIcon = () => {
//   const iconMap = {
//     '/': 'home-o',
//     '/clothes-swap': 'user-o',
//     '/face-swap': 'friends-o',
//     '/text-to-image': 'photo-o',
//     '/profile': 'manager-o'
//   }
//
//   return iconMap[route.path] || 'apps-o'
// }

// 响应式数据
const showPointsModal = ref(false)
const showAuthModal = ref(false)
const authMode = ref('login')
const loading = ref(false)
const pointsLoading = ref(false)

// 用户信息
const userInfo = ref(null)
const isLoggedIn = computed(() => {
  const hasToken = authApi.isLoggedIn()
  const hasUserInfo = !!userInfo.value
  return hasToken && hasUserInfo
})

// 积分状态
const pointsStatus = reactive({
  current: 0,
  total_points: 0,
  cards_count: 0,
  canGenerate: false,
  generationCost: 20,
  isLoggedIn: false
})

// 移除定时器相关变量

// 更新积分状态
const updatePointsStatus = async () => {
  console.log('🔄 更新积分状态，当前登录状态:', levelCardPointsManager.isLoggedIn(), isLoggedIn.value)

  // 检查登录状态，如果未登录则不发送API请求
  if (!levelCardPointsManager.isLoggedIn() || !isLoggedIn.value) {
    console.log('❌ 未登录，设置默认积分状态')
    pointsLoading.value = false
    Object.assign(pointsStatus, {
      current: 0,
      total_points: 0,
      cards_count: 0,
      canGenerate: false,
      generationCost: 20,
      isLoggedIn: false
    })
    return
  }

  try {
    pointsLoading.value = true
    console.log('🚀 发送积分API请求...')
    const newStatus = await levelCardPointsManager.getPointsStatus()
    console.log('✅ 积分状态更新成功:', newStatus)
    Object.assign(pointsStatus, newStatus)
  } catch (error) {
    console.error('❌ 更新积分状态失败:', error)
    // 认证错误处理
    if (error.message && (error.message.includes('令牌') || error.message.includes('401'))) {
      console.log('🔒 认证错误，重置积分状态')
      Object.assign(pointsStatus, {
        current: 0,
        total_points: 0,
        cards_count: 0,
        canGenerate: false,
        generationCost: 20,
        isLoggedIn: false
      })
    }
  } finally {
    pointsLoading.value = false
  }
}

// 显示登录弹窗
const showLoginModal = () => {
  authMode.value = 'login'
  showAuthModal.value = true
}

// 处理认证成功
const handleAuthSuccess = async (data) => {
  console.log('认证成功，更新用户信息:', data)

  // 立即更新用户信息
  userInfo.value = data.user

  // 确保localStorage中的数据是最新的
  if (data.user) {
    localStorage.setItem('user_info', JSON.stringify(data.user))
  }

  // 立即更新积分状态中的登录状态
  pointsStatus.isLoggedIn = true

  // 触发父组件的登录事件
  emit('login', data)

  // 立即更新积分状态，显示加载状态
  await updatePointsStatus()

  // 关闭弹窗
  showAuthModal.value = false
}

// 处理左侧点击事件
const handleLeftClick = () => {
  if (showBackButton.value) {
    // 直接跳转到首页
    router.push('/')
  }
}

// 跳转到首页
const goToHome = () => {
  router.push('/')
}

// 跳转到个人中心
const goToProfile = () => {
  router.push('/profile')
}

// 处理积分更新
const handlePointsUpdated = async () => {
  console.log('🔄 收到积分更新事件，强制刷新积分状态')
  // 清除levelCardPointsManager的缓存，确保获取最新数据
  levelCardPointsManager.clearCache()

  // 更新积分状态
  await updatePointsStatus()
}

// 初始化用户信息
const initUserInfo = () => {
  console.log('🔄 初始化用户信息...')
  const token = authApi.getToken()
  const localUserInfo = authApi.getLocalUserInfo()

  console.log('Token存在:', !!token)
  console.log('本地用户信息:', localUserInfo)

  if (token && localUserInfo) {
    userInfo.value = localUserInfo
    pointsStatus.isLoggedIn = true
    console.log('✅ 设置用户信息:', userInfo.value)
    console.log('✅ 设置登录状态为true')

    // 验证token有效性（静默验证，不影响用户体验）
    validateTokenSilently()
  } else {
    console.log('❌ 未找到有效的登录信息')
    userInfo.value = null
    pointsStatus.isLoggedIn = false
  }
}

// 静默验证token
const validateTokenSilently = async () => {
  try {
    const response = await authApi.getCurrentUser()
    if (!response.success) {
      console.warn('Token验证失败，但不立即登出用户')
      // 不立即清除token，等待下一次API调用时再处理
    }
  } catch (error) {
    console.warn('Token验证出错，但不立即登出用户:', error)
    // 不立即清除token，等待下一次API调用时再处理
  }
}

// 移除跨标签页同步逻辑

// 组件挂载时初始化
onMounted(() => {
  initUserInfo()
  updatePointsStatus()
})

// 暴露给父组件的方法
defineExpose({
  updatePointsStatus,
  getCurrentPoints: () => pointsStatus.current,
  hasEnoughPoints: () => pointsStatus.canGenerate,
  showLoginModal: () => {
    authMode.value = 'login'
    showAuthModal.value = true
  }
})
</script>

<style scoped>
/* Vant NavBar 自定义样式 */
.top-navigation {
  background: var(--van-nav-bar-background, #fff);
  border-bottom: 1px solid var(--van-border-color, #ebedf0);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  height: 64px !important; /* 增加高度到64px */
  z-index: 9999 !important; /* 确保在最前面 */
  position: fixed !important; /* 确保固定定位 */
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
}

/* 确保导航栏内容垂直居中 */
.top-navigation :deep(.van-nav-bar__content) {
  height: 64px !important;
  display: flex !important;
  align-items: center !important;
}

.top-navigation :deep(.van-nav-bar__left),
.top-navigation :deep(.van-nav-bar__title),
.top-navigation :deep(.van-nav-bar__right) {
  height: 64px !important;
  display: flex !important;
  align-items: center !important;
}

/* 左侧区域 */
.nav-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.nav-logo {
  display: flex;
  align-items: center;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 8px;
  color: var(--van-text-color, #323233);
  min-height: 44px;
  min-width: 44px;
  justify-content: center;
}

/* 标题区域 */
.nav-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
}

.title-icon {
  flex-shrink: 0;
}

/* 右侧区域 */
.nav-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* 积分显示 */
.nav-points {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 12px;
  background: rgba(25, 137, 250, 0.1);
  border-radius: 16px;
  cursor: pointer;
  min-width: 60px;
  min-height: 44px;
  justify-content: center;
}

.points-text {
  font-size: 12px;
  font-weight: 600;
  color: var(--van-primary-color, #1989fa);
  margin-left: 2px;
}

/* 用户信息 */
.nav-user {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.nav-user > div {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 12px;
  border-radius: 16px;
  color: var(--van-text-color, #323233);
  min-height: 44px;
  min-width: 44px;
  justify-content: center;
}

.user-text {
  font-size: 12px;
  font-weight: 500;
}

/* 深色主题适配 */
@media (prefers-color-scheme: dark) {
  .top-navigation {
    background: var(--van-nav-bar-background, #1e1e1e);
    border-bottom-color: var(--van-border-color, #333);
  }

  .nav-points {
    background: rgba(25, 137, 250, 0.2);
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .top-navigation {
    height: 60px !important; /* 移动端稍微降低高度但仍比默认高 */
  }

  .top-navigation :deep(.van-nav-bar__content) {
    height: 60px !important;
  }

  .top-navigation :deep(.van-nav-bar__left),
  .top-navigation :deep(.van-nav-bar__title),
  .top-navigation :deep(.van-nav-bar__right) {
    height: 60px !important;
  }

  .nav-right {
    gap: 8px;
  }

  .nav-points {
    padding: 6px 10px;
    min-width: 50px;
    min-height: 40px;
  }

  .nav-user > div {
    padding: 6px 10px;
    min-height: 40px;
    min-width: 40px;
  }

  .nav-logo {
    padding: 6px 10px;
    min-height: 40px;
    min-width: 40px;
  }

  .points-text,
  .user-text {
    font-size: 11px;
  }
}

/* Add new styles for the branding */
.nav-branding {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.brand-text {
  font-weight: 600;
  font-size: 16px;
  color: var(--text-color, #fff);
}

.palette-emoji {
  font-size: 18px;
  line-height: 1;
}

/* Add styles for back button */
.back-button {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 64px; /* 匹配导航栏高度 */
  cursor: pointer;
}
</style>










