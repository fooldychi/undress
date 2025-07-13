<template>
  <div class="user-info">
    <!-- 未登录状态 -->
    <div v-if="!isLoggedIn" class="login-section">
      <van-button
        type="primary"
        size="small"
        round
        @click="showLoginModal"
      >
        登录
      </van-button>
    </div>

    <!-- 已登录状态 -->
    <div v-else class="user-section">
      <div class="user-avatar" @click="goToProfile" title="点击进入个人中心">
        <van-icon name="user-o" size="20" />
      </div>
    </div>

    <!-- 登录注册弹窗 -->
    <AuthModal
      v-model:show="showAuthModal"
      :default-mode="authMode"
      @success="handleAuthSuccess"
    />
  </div>
</template>

<script>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { Toast } from 'vant'
import { authApi } from '../services/api.js'
import AuthModal from './AuthModal.vue'

export default {
  name: 'UserInfo',
  components: {
    AuthModal
  },
  emits: ['login', 'logout'],
  setup(props, { emit }) {
    const router = useRouter()
    const showAuthModal = ref(false)
    const authMode = ref('login')
    const loading = ref(false)

    // 用户信息
    const userInfo = ref(null)
    const isLoggedIn = computed(() => {
      const hasToken = authApi.isLoggedIn()
      const hasUserInfo = !!userInfo.value
      console.log('计算登录状态 - Token:', hasToken, 'UserInfo:', hasUserInfo, 'Result:', hasToken && hasUserInfo)
      return hasToken && hasUserInfo
    })

    // 显示登录弹窗
    const showLoginModal = () => {
      authMode.value = 'login'
      showAuthModal.value = true
    }

    // 显示注册弹窗
    const showRegisterModal = () => {
      authMode.value = 'register'
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

      // 触发父组件的登录事件
      emit('login', data)

      // 强制触发响应式更新
      console.log('强制更新后的用户信息:', userInfo.value)
      console.log('当前登录状态:', isLoggedIn.value)

      // 延迟刷新用户信息以确保状态同步
      setTimeout(() => {
        refreshUserInfo()
      }, 100)
    }

    // 刷新用户信息
    const refreshUserInfo = async () => {
      if (!authApi.isLoggedIn()) {
        userInfo.value = null
        return
      }

      try {
        loading.value = true
        const response = await authApi.getCurrentUser()

        if (response.success) {
          userInfo.value = response.data.user
        } else {
          // 如果获取用户信息失败，可能是token过期
          console.warn('获取用户信息失败:', response.message)
          // 只有在明确的认证错误时才退出登录
          if (response.message && (response.message.includes('令牌已过期') ||
                                   response.message.includes('无效的访问令牌'))) {
            handleLogout()
          }
        }
      } catch (error) {
        console.error('刷新用户信息失败:', error)
        // 只有在明确的认证错误时才自动退出登录
        if (error.message.includes('登录已过期')) {
          handleLogout()
        } else if (!error.message.includes('网络') && !error.message.includes('超时')) {
          Toast.fail('获取用户信息失败')
        }
      } finally {
        loading.value = false
      }
    }

    // 跳转到个人中心
    const goToProfile = () => {
      router.push('/profile')
    }

    // 处理退出登录
    const handleLogout = () => {
      authApi.logout()
      userInfo.value = null
      emit('logout')
      Toast.success('退出登录成功')

      // 跳转到首页并显示登录模态框
      router.push('/')
      setTimeout(() => {
        showLoginModal()
      }, 500) // 延迟显示登录模态框，确保页面跳转完成
    }

    // 初始化用户信息
    const initUserInfo = () => {
      console.log('初始化用户信息...')
      const token = authApi.getToken()
      const localUserInfo = authApi.getLocalUserInfo()

      console.log('Token存在:', !!token)
      console.log('本地用户信息:', localUserInfo)

      if (token && localUserInfo) {
        userInfo.value = localUserInfo
        console.log('设置用户信息:', userInfo.value)
        // 异步刷新用户信息
        refreshUserInfo()
      } else {
        console.log('未找到有效的登录信息')
        userInfo.value = null
      }
    }

    // 监听localStorage变化
    const handleStorageChange = (event) => {
      console.log('localStorage变化:', event)
      if (event.key === 'auth_token' || event.key === 'user_info') {
        console.log('认证相关数据变化，重新初始化')
        initUserInfo()
      }
    }

    // 组件挂载时初始化
    onMounted(() => {
      initUserInfo()

      // 监听storage事件（跨标签页同步）
      window.addEventListener('storage', handleStorageChange)

      // 定期检查登录状态（防止token过期等问题）
      const checkInterval = setInterval(() => {
        if (authApi.isLoggedIn() && !userInfo.value) {
          console.log('检测到登录状态不一致，重新初始化')
          initUserInfo()
        }
      }, 5000) // 每5秒检查一次

      // 清理定时器
      onUnmounted(() => {
        window.removeEventListener('storage', handleStorageChange)
        clearInterval(checkInterval)
      })
    })

    return {
      showAuthModal,
      authMode,
      loading,
      userInfo,
      isLoggedIn,
      showLoginModal,
      showRegisterModal,
      handleAuthSuccess,
      goToProfile,
      handleLogout
    }
  }
}
</script>

<style scoped>
.user-info {
  display: flex;
  align-items: center;
}

.login-section {
  display: flex;
  align-items: center;
}

.user-section {
  position: relative;
  display: flex;
  align-items: center;
}

.user-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.3s ease;
  color: white;
  border: 2px solid rgba(255, 255, 255, 0.2);
}

.user-avatar:hover {
  background: rgba(255, 255, 255, 0.25);
  border-color: rgba(255, 255, 255, 0.4);
  transform: scale(1.05);
}

/* 用户头像样式已在上方定义，移除不需要的菜单样式 */

/* 深色主题适配 */
@media (prefers-color-scheme: dark) {
  .user-avatar {
    background: rgba(255, 255, 255, 0.2);
    border-color: rgba(255, 255, 255, 0.3);
  }

  .user-avatar:hover {
    background: rgba(255, 255, 255, 0.3);
    border-color: rgba(255, 255, 255, 0.5);
  }
}
</style>
