<template>
  <div class="profile-page">
    <!-- 顶部导航 -->
    <TopNavigation
      ref="topNavigationRef"
      @login="handleUserLogin"
      @logout="handleUserLogout"
    />

    <div class="container">
      <!-- 页面头部 -->
      <header class="header">
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
        <h1 class="title">
          <van-icon name="user-o" size="32" color="var(--primary-color)" />
          个人中心
        </h1>
      </header>

      <!-- 加载状态 -->
      <van-loading v-if="loading" class="loading-center" size="24px" vertical>
        加载中...
      </van-loading>

      <!-- 未登录状态 -->
      <div v-else-if="!isLoggedIn" class="not-logged-in">
        <van-empty
          image="https://fastly.jsdelivr.net/npm/@vant/assets/custom-empty-image.png"
          description="请先登录"
        >
          <van-button type="primary" round @click="showLoginModal">
            立即登录
          </van-button>
        </van-empty>
      </div>

      <!-- 已登录状态 -->
      <div v-else class="profile-content">
        <!-- 用户信息卡片 -->
        <div class="feature-card user-card">
          <div class="feature-content">
            <div class="feature-icon user-avatar">
              <van-icon name="user-o" size="48" color="var(--primary-color)" />
            </div>
            <div class="user-info">
              <h2 class="feature-title username">{{ userInfo?.username }}</h2>
              <p class="feature-description user-id">ID: {{ userInfo?.id }}</p>
              <div class="user-details">
                <p class="join-date">
                  注册时间: {{ formatDate(userInfo?.created_at) }}
                </p>
                <p v-if="userInfo?.last_login" class="last-login">
                  最后登录: {{ formatDate(userInfo?.last_login) }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- 积分信息卡片 -->
        <div class="feature-card points-card">
          <div class="feature-content points-content">
            <div class="points-header">
              <div class="feature-icon">
                <van-icon name="diamond-o" size="48" color="var(--primary-color)" />
              </div>
              <h2 class="feature-title">我的积分</h2>
            </div>
            <div class="points-summary">
              <div class="points-grid">
                <div class="points-item">
                  <div class="points-value">{{ pointsInfo?.total_points || 0 }}</div>
                  <div class="points-label">总积分</div>
                </div>
                <div class="points-divider"></div>
                <div class="points-item">
                  <div class="points-value">{{ pointsInfo?.cards_count || 0 }}</div>
                  <div class="points-label">等级卡数量</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 我的等级卡 -->
        <div v-if="levelCards.length > 0" class="feature-card level-cards-section">
          <div class="feature-content level-cards-content">
            <div class="level-cards-header">
              <div class="feature-icon">
                <van-icon name="credit-pay" size="48" color="var(--primary-color)" />
              </div>
              <h2 class="feature-title">我的等级卡</h2>
            </div>

            <div class="level-cards-list">
              <div
                v-for="card in levelCards"
                :key="card.id"
                class="level-card-item-unified"
              >
                <div class="level-card-icon">
                  <van-icon name="credit-pay" size="24" color="var(--primary-color)" />
                </div>
                <div class="level-card-info">
                  <div class="level-card-type">{{ card.type_name }}</div>
                  <div class="level-card-date">{{ formatDate(card.bound_at) }}</div>
                </div>
                <div class="level-card-points">
                  <span class="points-current">{{ card.remaining_points }}</span>
                  <span class="points-separator">/</span>
                  <span class="points-total">{{ card.total_points }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 最近积分记录 -->
        <div class="feature-card recent-records">
          <div class="feature-content records-content">
            <div class="records-header">
              <div class="feature-icon">
                <van-icon name="records" size="48" color="var(--primary-color)" />
              </div>
              <h2 class="feature-title">最近记录</h2>
            </div>

            <div v-if="recentRecords.length === 0" class="no-records">
              <van-empty description="暂无记录" />
            </div>

            <div v-else class="records-list">
              <div
                v-for="record in recentRecords.slice(0, 3)"
                :key="record.id"
                class="record-item-unified"
              >
                <div class="record-info">
                  <div class="record-desc">{{ record.description }}</div>
                  <div class="record-time">{{ formatDate(record.created_at) }}</div>
                </div>
                <div class="record-amount" :class="record.action_type">
                  {{ record.action_type === 'consume' ? '-' : '+' }}{{ record.points_amount }}
                </div>
                <div class="record-actions" v-if="record.action_type === 'consume' && record.media_url">
                  <van-button
                    type="primary"
                    size="mini"
                    plain
                    @click="handleViewResult({
                      id: record.id,
                      description: record.description,
                      mediaUrl: record.media_url,
                      createdAt: record.created_at
                    })"
                    :loading="resultLoading === record.id"
                  >
                    查看结果
                  </van-button>
                </div>
              </div>
            </div>

            <div class="records-footer">
              <van-button
                type="primary"
                size="small"
                plain
                @click="viewAllRecords"
                class="view-all-btn"
              >
                查看全部
              </van-button>
            </div>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="action-buttons">
          <van-button
            type="danger"
            block
            round
            @click="handleLogout"
            icon="sign"
          >
            退出登录
          </van-button>
        </div>
      </div>
    </div>

    <!-- 登录注册弹窗 -->
    <AuthModal
      v-model:show="showAuthModal"
      :default-mode="authMode"
      @success="handleAuthSuccess"
    />

    <!-- 结果查看弹窗 -->
    <ResultModal
      v-model:show="showResultModal"
      :result-data="currentResult"
    />


  </div>
</template>

<script>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Toast } from 'vant'
import { authApi, pointsApi, userApi, levelCardApi } from '../services/api.js'
import TopNavigation from '../components/TopNavigation.vue'
import ResultModal from '../components/ResultModal.vue'
import AuthModal from '../components/AuthModal.vue'

export default {
  name: 'Profile',
  components: {
    TopNavigation,
    ResultModal,
    AuthModal
  },
  setup() {
    const router = useRouter()

    // 响应式数据
    const loading = ref(true)
    const refreshing = ref(false)
    const pointsLoading = ref(false)
    const recordsLoading = ref(false)
    const recordsFinished = ref(false)
    const resultLoading = ref(null)
    const showAuthModal = ref(false)

    const showResultModal = ref(false)
    const authMode = ref('login')

    const userInfo = ref(null)
    const pointsInfo = ref(null)
    const levelCards = ref([])
    const recentRecords = ref([])

    const currentResult = ref({})

    // 计算属性
    const isLoggedIn = computed(() => authApi.isLoggedIn() && userInfo.value)

    // 格式化日期
    const formatDate = (dateString) => {
      if (!dateString) return '未知'
      const date = new Date(dateString)
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    }

    // 显示登录弹窗
    const showLoginModal = () => {
      authMode.value = 'login'
      showAuthModal.value = true
    }

    // 处理认证成功
    const handleAuthSuccess = (data) => {
      userInfo.value = data.user
      initializeData()
    }

    // 处理用户登录
    const handleUserLogin = (data) => {
      userInfo.value = data.user
      initializeData()
    }

    // 处理用户登出
    const handleUserLogout = () => {
      userInfo.value = null
      pointsInfo.value = null
      recentRecords.value = []
      router.push('/')
    }

    // 退出登录
    const handleLogout = () => {
      authApi.logout()
      handleUserLogout()
      Toast.success('退出登录成功')

      // 跳转到首页并显示登录模态框
      router.push('/')
      setTimeout(() => {
        showLoginModal()
      }, 500) // 延迟显示登录模态框，确保页面跳转完成
    }

    // 刷新用户信息
    const refreshUserInfo = async () => {
      if (!isLoggedIn.value) return

      try {
        refreshing.value = true
        const response = await authApi.getCurrentUser()

        if (response.success) {
          userInfo.value = response.data.user
          Toast.success('用户信息已刷新')
        } else {
          Toast.fail('刷新失败')
        }
      } catch (error) {
        console.error('刷新用户信息失败:', error)
        Toast.fail('刷新失败')
      } finally {
        refreshing.value = false
      }
    }

    // 刷新积分信息
    const refreshPoints = async () => {
      if (!isLoggedIn.value) return

      try {
        pointsLoading.value = true
        const response = await pointsApi.getUserPoints()

        if (response.success) {
          pointsInfo.value = response.data
          Toast.success('积分信息已刷新')
        } else {
          Toast.fail('获取积分信息失败')
        }
      } catch (error) {
        console.error('获取积分信息失败:', error)
        Toast.fail('获取积分信息失败')
      } finally {
        pointsLoading.value = false
      }
    }

    // 加载最近积分记录
    const loadRecentRecords = async () => {
      if (!isLoggedIn.value) return

      try {
        const response = await pointsApi.getPointsHistory(1, 3, true)

        if (response.success) {
          recentRecords.value = response.data.logs || []
        }
      } catch (error) {
        console.error('获取最近记录失败:', error)
      }
    }

    // 获取等级卡列表
    const loadLevelCards = async () => {
      if (!isLoggedIn.value) return

      try {
        const response = await levelCardApi.getMyCards()
        if (response.success) {
          levelCards.value = response.data.cards || []
        }
      } catch (error) {
        console.error('获取等级卡失败:', error)
      }
    }

    // 查看生成结果
    const handleViewResult = (resultData) => {
      currentResult.value = resultData
      showResultModal.value = true
    }

    // 查看全部记录
    const viewAllRecords = () => {
      Toast.fail('功能未开通，敬请期待')
    }



    // 初始化数据
    const initializeData = async () => {
      if (!isLoggedIn.value) {
        loading.value = false
        return
      }

      try {
        loading.value = true

        // 并行加载用户信息、积分信息、等级卡和最近记录
        await Promise.all([
          refreshUserInfo(),
          refreshPoints(),
          loadLevelCards(),
          loadRecentRecords()
        ])
      } catch (error) {
        console.error('初始化数据失败:', error)
      } finally {
        loading.value = false
      }
    }

    // 组件挂载时初始化
    onMounted(() => {
      // 从本地存储获取用户信息
      if (authApi.isLoggedIn()) {
        userInfo.value = authApi.getLocalUserInfo()
      }

      initializeData()
    })

    return {
      loading,
      refreshing,
      pointsLoading,
      recordsLoading,
      recordsFinished,
      resultLoading,
      showAuthModal,

      showResultModal,
      authMode,
      userInfo,
      pointsInfo,
      levelCards,
      recentRecords,

      currentResult,
      isLoggedIn,
      formatDate,
      showLoginModal,
      handleAuthSuccess,
      handleUserLogin,
      handleUserLogout,
      handleLogout,
      refreshUserInfo,
      refreshPoints,

      loadRecentRecords,
      handleViewResult,
      viewAllRecords,

      initializeData
    }
  }
}
</script>

<style scoped>
.profile-page {
  min-height: 100vh;
  background: linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 100%);
  padding: 20px;
  padding-top: 80px; /* 为TopNavigation留出空间 */
}

.container {
  max-width: 1200px;
  margin: 0 auto;
}

/* 页面头部 */
.header {
  text-align: center;
  margin-bottom: 60px;
  position: relative;
}

.back-btn {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: var(--text-color);
  backdrop-filter: blur(10px);
}

.back-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: var(--primary-color);
}

.title {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  color: var(--text-color);
  font-size: 2.5rem;
  font-weight: 700;
  margin: 0;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

/* 加载状态 */
.loading-center {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  color: var(--text-color);
}

/* 未登录状态 */
.not-logged-in {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 20px;
  padding: 40px 20px;
  text-align: center;
  box-shadow: var(--shadow-lg);
}

/* 主要内容区域 */
.profile-content {
  display: flex;
  flex-direction: column;
  gap: 32px;
  margin-bottom: 60px;
}

/* 统一的卡片样式 - 与首页保持一致 */
.feature-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 20px;
  cursor: default;
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

.feature-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-xl);
  border-color: var(--border-light);
}

/* 用户信息卡片特定样式 */
.user-card .user-avatar {
  background: rgba(102, 102, 255, 0.1);
}

.user-card .user-info {
  text-align: left;
  flex: 1;
}

.user-card .username {
  text-align: left;
  margin-bottom: 8px;
}

.user-card .user-id {
  text-align: left;
  margin-bottom: 16px;
}

.user-details {
  text-align: left;
}

.join-date,
.last-login {
  font-size: 14px;
  color: var(--text-light);
  margin: 4px 0;
}

/* 积分卡片特定样式 */
.points-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.points-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 30px;
}

.points-header .feature-icon {
  margin-bottom: 16px;
}

.points-header .feature-title {
  margin-bottom: 0;
}

.points-summary {
  width: 100%;
  max-width: 500px;
}

.points-grid {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 40px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  border: 1px solid var(--border-color);
}

.points-item {
  text-align: center;
  flex: 1;
}

.points-value {
  display: block;
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--primary-color);
  margin-bottom: 8px;
  line-height: 1;
}

.points-label {
  font-size: 1rem;
  color: var(--text-light);
  font-weight: 500;
}

.points-divider {
  width: 2px;
  height: 60px;
  background: linear-gradient(to bottom, transparent, var(--border-color), transparent);
  border-radius: 1px;
}

/* 等级卡部分 */
.level-cards-section {
  margin-bottom: 40px;
}

.level-cards-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.level-cards-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 30px;
}

.level-cards-header .feature-icon {
  margin-bottom: 16px;
}

.level-cards-header .feature-title {
  margin-bottom: 0;
}

.level-cards-list {
  width: 100%;
  margin-bottom: 30px;
}

.level-card-item-unified {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  margin-bottom: 12px;
  transition: all 0.3s ease;
}

.level-card-item-unified:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: var(--primary-color);
  transform: translateY(-1px);
}

.level-card-item-unified:last-child {
  margin-bottom: 0;
}

.level-card-icon {
  flex-shrink: 0;
}

.level-card-info {
  flex: 1;
  text-align: left;
}

.level-card-type {
  font-size: 16px;
  font-weight: 500;
  color: var(--text-color);
  margin-bottom: 4px;
}

.level-card-date {
  font-size: 14px;
  color: var(--text-light);
}

.level-card-points {
  display: flex;
  align-items: baseline;
  gap: 4px;
  font-weight: 600;
}

.level-card-points .points-current {
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--primary-color);
}

.level-card-points .points-separator {
  font-size: 1rem;
  color: var(--text-light);
}

.level-card-points .points-total {
  font-size: 1rem;
  color: var(--text-light);
}

/* 记录部分样式 */
.records-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.records-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 30px;
}

.records-header .feature-icon {
  margin-bottom: 16px;
}

.records-header .feature-title {
  margin-bottom: 0;
}

.no-records {
  padding: 40px 20px;
  text-align: center;
  color: var(--text-light);
}

.records-list {
  width: 100%;
  margin-bottom: 30px;
}

.record-item-unified {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  margin-bottom: 12px;
  transition: all 0.3s ease;
}

.record-item-unified:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: var(--primary-color);
  transform: translateY(-1px);
}

.record-item-unified:last-child {
  margin-bottom: 0;
}

.record-info {
  flex: 1;
  text-align: left;
}

.record-desc {
  font-size: 16px;
  font-weight: 500;
  color: var(--text-color);
  margin-bottom: 4px;
}

.record-time {
  font-size: 14px;
  color: var(--text-light);
}

.record-amount {
  font-size: 18px;
  font-weight: 700;
  min-width: 80px;
  text-align: right;
}

.record-amount.consume {
  color: #ef4444;
}

.record-amount.bind,
.record-amount.purchase {
  color: #10b981;
}

.record-actions {
  flex-shrink: 0;
  min-width: 80px;
  display: flex;
  justify-content: flex-end;
}

.records-footer {
  text-align: center;
  padding-top: 20px;
  border-top: 1px solid var(--border-color);
  width: 100%;
}

.view-all-btn {
  background: rgba(102, 102, 255, 0.1);
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.record-time {
  font-size: 12px;
  color: #969799;
}

.record-url {
  margin-top: 4px;
}

.record-amount {
  font-size: 16px;
  font-weight: 600;
  flex-shrink: 0;
}

.record-amount.consume {
  color: #ee0a24;
}

.record-amount.add,
.record-amount.purchase,
.record-amount.daily_reset {
  color: #07c160;
}

/* 操作按钮 */
.action-buttons {
  margin-top: 40px;
  text-align: center;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .profile-page {
    padding: 16px;
    padding-top: 70px;
  }

  .container {
    max-width: 100%;
  }

  .header {
    margin-bottom: 40px;
  }

  .title {
    font-size: 2rem;
  }

  .back-btn {
    position: static;
    transform: none;
    margin-bottom: 20px;
  }

  .profile-content {
    gap: 20px;
  }

  .level-cards-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .feature-content {
    padding: 24px;
  }

  .feature-icon {
    width: 60px;
    height: 60px;
  }

  .feature-title {
    font-size: 1.3rem;
  }

  .points-grid {
    gap: 16px;
  }

  .points-value {
    font-size: 1.5rem;
  }

  .section-title {
    font-size: 1.5rem;
  }

  .points-grid {
    gap: 20px;
    padding: 16px;
  }

  .points-value {
    font-size: 2rem;
  }

  .record-item-unified {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
    padding: 16px;
  }

  .record-amount {
    align-self: flex-end;
    min-width: auto;
  }

  .record-actions {
    align-self: flex-end;
    min-width: auto;
  }
}




</style>
