<template>
  <div class="top-navigation">
    <!-- 积分显示（左边） -->
    <div class="nav-item nav-points" @click="showPointsModal = true" title="点击查看积分详情">
      <div class="nav-icon">
        <van-icon name="diamond-o" size="18" />
      </div>
      <span class="nav-text">{{ pointsStatus.current }}</span>
    </div>

    <!-- 用户信息（右边） -->
    <div class="nav-item nav-user">
      <!-- 未登录状态 -->
      <div v-if="!isLoggedIn" class="nav-login" @click="showLoginModal" title="点击登录">
        <div class="nav-icon">
          <van-icon name="user-o" size="18" />
        </div>
        <span class="nav-text">登录</span>
      </div>

      <!-- 已登录状态 -->
      <div v-else class="nav-avatar" @click="goToProfile" title="点击进入个人中心">
        <div class="nav-icon">
          <van-icon name="user-o" size="18" />
        </div>
      </div>
    </div>

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
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { Toast } from 'vant'
import { authApi } from '../services/api.js'
import levelCardPointsManager from '../utils/levelCardPointsManager.js'
import PointsModal from './PointsModal.vue'
import AuthModal from './AuthModal.vue'

// 定义事件
const emit = defineEmits(['login', 'logout'])

// 路由
const router = useRouter()

// 响应式数据
const showPointsModal = ref(false)
const showAuthModal = ref(false)
const authMode = ref('login')
const loading = ref(false)

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

// 定时器
let statusUpdateTimer = null

// 更新积分状态
const updatePointsStatus = async () => {
  console.log('🔄 更新积分状态，当前登录状态:', levelCardPointsManager.isLoggedIn(), isLoggedIn.value)

  // 检查登录状态，如果未登录则不发送API请求
  if (!levelCardPointsManager.isLoggedIn() || !isLoggedIn.value) {
    console.log('❌ 未登录，设置默认积分状态')
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
  }
}

// 显示登录弹窗
const showLoginModal = () => {
  authMode.value = 'login'
  showAuthModal.value = true
}

// 处理认证成功
const handleAuthSuccess = (data) => {
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

  // 延迟更新积分状态，确保登录状态已同步
  setTimeout(() => {
    updatePointsStatus()
  }, 100)

  // 关闭弹窗
  showAuthModal.value = false
}

// 跳转到个人中心
const goToProfile = () => {
  router.push('/profile')
}

// 处理积分更新
const handlePointsUpdated = () => {
  updatePointsStatus()
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
  } else {
    console.log('❌ 未找到有效的登录信息')
    userInfo.value = null
    pointsStatus.isLoggedIn = false
  }
}

// 监听localStorage变化
const handleStorageChange = (event) => {
  console.log('localStorage变化:', event)
  if (event.key === 'auth_token' || event.key === 'user_info') {
    console.log('认证相关数据变化，重新初始化')
    initUserInfo()
    updatePointsStatus()
  }
}

// 组件挂载时初始化
onMounted(() => {
  initUserInfo()
  updatePointsStatus()

  // 监听storage事件（跨标签页同步）
  window.addEventListener('storage', handleStorageChange)

  // 每30秒更新一次状态
  statusUpdateTimer = setInterval(updatePointsStatus, 30000)
})

// 组件卸载时清理
onUnmounted(() => {
  window.removeEventListener('storage', handleStorageChange)
  if (statusUpdateTimer) {
    clearInterval(statusUpdateTimer)
  }
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
.top-navigation {
  position: fixed;
  top: 20px;
  right: 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  z-index: 1000;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.nav-item:hover {
  background: rgba(255, 255, 255, 1);
  border-color: #1989fa;
  box-shadow: 0 4px 12px rgba(25, 137, 250, 0.2);
  transform: translateY(-1px);
}

.nav-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  color: #1989fa;
}

.nav-text {
  font-size: 14px;
  font-weight: 500;
  color: #323233;
  white-space: nowrap;
}

.nav-points {
  order: 1; /* 积分在左边 */
}

.nav-user {
  order: 2; /* 用户在右边 */
}

.nav-login {
  display: flex;
  align-items: center;
  gap: 6px;
}

.nav-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, #1989fa, #1976d2);
  border-radius: 50%;
  color: white;
  margin: -4px;
}

.nav-avatar:hover {
  background: linear-gradient(135deg, #1976d2, #1565c0);
  transform: scale(1.05);
}

/* 深色主题适配 */
@media (prefers-color-scheme: dark) {
  .nav-item {
    background: rgba(30, 30, 30, 0.95);
    border-color: rgba(255, 255, 255, 0.1);
  }

  .nav-item:hover {
    background: rgba(40, 40, 40, 1);
    border-color: #1989fa;
  }

  .nav-text {
    color: #ffffff;
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .top-navigation {
    top: 15px;
    right: 15px;
    gap: 8px;
  }

  .nav-item {
    padding: 6px 10px;
  }

  .nav-text {
    font-size: 13px;
  }

  .nav-icon {
    width: 20px;
    height: 20px;
  }
}
</style>
