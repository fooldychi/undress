<template>
  <MobilePageContainer
    title="个人中心"
    @login="handleUserLogin"
    @logout="handleUserLogout"
  >
    <!-- 加载状态 -->
    <div v-if="loading && !userInfo" class="loading-skeleton">
      <!-- 用户信息骨架屏 -->
      <MobileCard :inset="true">
        <van-skeleton title avatar :row="3" />
      </MobileCard>

      <!-- 积分信息骨架屏 -->
      <MobileCard :inset="true">
        <van-skeleton title :row="2" />
      </MobileCard>

      <!-- 等级卡骨架屏 -->
      <MobileCard :inset="true">
        <van-skeleton title :row="3" />
      </MobileCard>

      <!-- 最近记录骨架屏 -->
      <MobileCard :inset="true">
        <van-skeleton title :row="4" />
      </MobileCard>
    </div>

    <!-- 传统加载状态（作为后备） -->
    <van-loading v-else-if="loading" class="loading-center" size="24px" vertical>
      加载中...
    </van-loading>

    <!-- 未登录状态 -->
    <div v-else-if="!isLoggedIn" class="not-logged-in">
      <van-empty
        image="https://fastly.jsdelivr.net/npm/@vant/assets/custom-empty-image.png"
        description="请先登录"
      >
        <MobileActionButton type="primary" @click="showLoginModal">
          立即登录
        </MobileActionButton>
      </van-empty>
    </div>

    <!-- 已登录状态 -->
    <div v-else class="profile-content">
        <!-- 用户信息卡片 -->
        <MobileCard
          title="用户信息"
          icon="user-o"
          :inset="true"
        >
          <!-- 用户基本信息 -->
          <div class="user-section">
            <div class="user-avatar">
              <van-icon name="user-o" size="36" color="var(--van-primary-color)" />
            </div>
            <div class="user-info">
              <h2 class="username">{{ userInfo?.username }}</h2>
              <p class="user-id">ID: {{ userInfo?.id }}</p>
            </div>
          </div>


        </MobileCard>

        <!-- 积分信息卡片 -->
        <MobileCard
          title="我的积分"
          icon="diamond-o"
          :inset="true"
        >
          <div class="points-display">
            <div class="points-item-centered">
              <div class="points-value">{{ pointsInfo?.total_points || 0 }}</div>
              <div class="points-label">总积分</div>
            </div>
          </div>
        </MobileCard>

        <!-- 我的等级卡 -->
        <MobileCard
          v-if="levelCards.length > 0"
          title="我的等级卡"
          icon="credit-pay"
          :inset="true"
        >
          <div class="level-cards-list">
            <van-cell-group class="transparent-cell-group">
              <van-cell
                v-for="card in levelCards"
                :key="card.id"
                class="level-card-item transparent-cell"
              >
                <template #icon>
                  <div class="card-icon">
                    <span class="card-type-icon">{{ card.icon || '💎' }}</span>
                  </div>
                </template>
                <template #title>
                  <div class="card-type">{{ card.type_name }}</div>
                </template>
                <template #label>
                  <div class="card-date">{{ formatDate(card.bound_at) }}</div>
                </template>
                <template #value>
                  <div class="card-points">
                    <span class="points-current">{{ card.remaining_points }}</span>
                    <span class="points-separator">/</span>
                    <span class="points-total">{{ card.total_points }}</span>
                  </div>
                </template>
              </van-cell>
            </van-cell-group>
          </div>
        </MobileCard>

        <!-- 最近积分记录 -->
        <MobileCard
          title="最近记录"
          icon="orders-o"
          :inset="true"
        >
          <div v-if="recentRecords.length === 0" class="no-records">
            <van-empty description="暂无记录" />
          </div>

          <div v-else>
            <van-cell-group class="transparent-cell-group">
              <van-cell
                v-for="record in recentRecords.slice(0, 3)"
                :key="record.id"
                class="record-item transparent-cell"
              >
                <template #icon>
                  <div class="record-icon">
                    <van-icon
                      name="diamond-o"
                      size="16"
                      :color="record.action_type === 'consume' ? 'var(--van-danger-color)' : 'var(--van-success-color)'"
                    />
                  </div>
                </template>
                <template #title>
                  <div class="record-desc">{{ record.description }}</div>
                </template>
                <template #label>
                  <div class="record-time">{{ formatDate(record.created_at) }}</div>
                </template>
                <template #value>
                  <div class="record-value-container">
                    <div class="record-amount" :class="record.action_type">
                      {{ record.action_type === 'consume' ? '-' : '+' }}{{ record.points_amount }}
                    </div>
                    <van-button
                      v-if="record.action_type === 'consume' && record.url"
                      type="default"
                      size="mini"
                      plain
                      class="view-button"
                      @click="handleViewResult({
                        id: record.id,
                        description: record.description,
                        mediaUrl: record.url,
                        createdAt: record.created_at
                      })"
                      :loading="resultLoading === record.id"
                    >
                      查看
                    </van-button>
                  </div>
                </template>
              </van-cell>
            </van-cell-group>
          </div>

          <template #footer>
            <div class="records-footer">
              <MobileActionButton
                type="primary"
                size="small"
                variant="ghost"
                @click="viewAllRecords"
                block
              >
                查看全部记录
              </MobileActionButton>
            </div>
          </template>
        </MobileCard>

        <!-- 测试按钮 -->
        <MobileCard
          title="测试功能"
          icon="setting-o"
          :inset="true"
        >
          <MobileActionButton
            type="primary"
            size="small"
            variant="ghost"
            @click="testResultModal"
            block
          >
            测试图片预览
          </MobileActionButton>
        </MobileCard>

        <!-- 操作按钮 -->
        <div class="action-buttons">
          <MobileActionButton
            type="danger"
            block
            @click="handleLogout"
            icon="sign"
          >
            退出登录
          </MobileActionButton>
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
  </MobilePageContainer>
</template>

<script>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Toast } from 'vant'
import { authApi, pointsApi, userApi, levelCardApi } from '../services/api.js'
import { MobilePageContainer, MobileCard, MobileActionButton } from '../components/mobile'
import ResultModal from '../components/ResultModal.vue'
import AuthModal from '../components/AuthModal.vue'

export default {
  name: 'Profile',
  components: {
    MobilePageContainer,
    MobileCard,
    MobileActionButton,
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

    // 数据缓存
    const dataCache = {
      userInfo: { data: null, timestamp: 0, ttl: 5 * 60 * 1000 }, // 5分钟缓存
      pointsInfo: { data: null, timestamp: 0, ttl: 2 * 60 * 1000 }, // 2分钟缓存
      levelCards: { data: null, timestamp: 0, ttl: 10 * 60 * 1000 }, // 10分钟缓存
      recentRecords: { data: null, timestamp: 0, ttl: 3 * 60 * 1000 } // 3分钟缓存
    }

    // 检查缓存是否有效
    const isCacheValid = (cacheKey) => {
      const cache = dataCache[cacheKey]
      return cache.data && (Date.now() - cache.timestamp) < cache.ttl
    }

    // 设置缓存
    const setCache = (cacheKey, data) => {
      dataCache[cacheKey] = {
        data,
        timestamp: Date.now(),
        ttl: dataCache[cacheKey].ttl
      }
    }

    // 获取缓存
    const getCache = (cacheKey) => {
      return isCacheValid(cacheKey) ? dataCache[cacheKey].data : null
    }

    // 刷新用户信息
    const refreshUserInfo = async () => {
      if (!isLoggedIn.value) return

      try {
        refreshing.value = true
        const response = await authApi.getCurrentUser()

        if (response.success) {
          userInfo.value = response.data.user
          setCache('userInfo', response.data.user)
          return response.data.user
        } else {
          throw new Error(response.message || '获取用户信息失败')
        }
      } catch (error) {
        console.error('刷新用户信息失败:', error)
        throw error
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
          setCache('pointsInfo', response.data)
          return response.data
        } else {
          throw new Error(response.message || '获取积分信息失败')
        }
      } catch (error) {
        console.error('获取积分信息失败:', error)
        throw error
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
          setCache('recentRecords', response.data.logs || [])
          return response.data.logs || []
        } else {
          throw new Error(response.message || '获取最近记录失败')
        }
      } catch (error) {
        console.error('获取最近记录失败:', error)
        throw error
      }
    }

    // 获取等级卡列表
    const loadLevelCards = async () => {
      if (!isLoggedIn.value) return

      try {
        const response = await levelCardApi.getMyCards()
        if (response.success) {
          levelCards.value = response.data.cards || []
          setCache('levelCards', response.data.cards || [])
          return response.data.cards || []
        } else {
          throw new Error(response.message || '获取等级卡失败')
        }
      } catch (error) {
        console.error('获取等级卡失败:', error)
        throw error
      }
    }

    // 查看生成结果
    const handleViewResult = (resultData) => {
      console.log('handleViewResult 被调用，数据:', resultData)
      currentResult.value = resultData
      showResultModal.value = true
    }

    // 测试结果弹窗
    const testResultModal = () => {
      const testData = {
        id: 'test-1',
        description: '测试图片预览',
        mediaUrl: 'https://picsum.photos/400/300?random=1',
        createdAt: new Date().toISOString()
      }
      console.log('测试数据:', testData)
      handleViewResult(testData)
    }

    // 查看全部记录
    const viewAllRecords = () => {
      Toast.fail('功能未开通，敬请期待')
    }



    // 初始化数据（优化版本）
    const initializeData = async () => {
      if (!isLoggedIn.value) {
        loading.value = false
        return
      }

      try {
        loading.value = true

        // 优先使用缓存数据
        const cachedUserInfo = getCache('userInfo')
        const cachedPointsInfo = getCache('pointsInfo')
        const cachedLevelCards = getCache('levelCards')
        const cachedRecentRecords = getCache('recentRecords')

        if (cachedUserInfo) userInfo.value = cachedUserInfo
        if (cachedPointsInfo) pointsInfo.value = cachedPointsInfo
        if (cachedLevelCards) levelCards.value = cachedLevelCards
        if (cachedRecentRecords) recentRecords.value = cachedRecentRecords

        // 如果所有数据都有缓存，快速显示
        if (cachedUserInfo && cachedPointsInfo && cachedLevelCards && cachedRecentRecords) {
          loading.value = false
        }

        // 并行加载需要更新的数据
        const loadTasks = []

        if (!isCacheValid('userInfo')) {
          loadTasks.push(refreshUserInfo().catch(err => console.warn('刷新用户信息失败:', err)))
        }

        if (!isCacheValid('pointsInfo')) {
          loadTasks.push(refreshPoints().catch(err => console.warn('刷新积分信息失败:', err)))
        }

        if (!isCacheValid('levelCards')) {
          loadTasks.push(loadLevelCards().catch(err => console.warn('加载等级卡失败:', err)))
        }

        if (!isCacheValid('recentRecords')) {
          loadTasks.push(loadRecentRecords().catch(err => console.warn('加载最近记录失败:', err)))
        }

        // 等待所有任务完成，但不阻塞UI
        if (loadTasks.length > 0) {
          await Promise.allSettled(loadTasks)
        }

      } catch (error) {
        console.error('初始化数据失败:', error)
        Toast.fail('数据加载失败，请稍后重试')
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
      testResultModal,

      initializeData
    }
  }
}
</script>

<style scoped>
/* 用户信息样式 */
.user-section {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}

.user-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  background: rgba(25, 137, 250, 0.1);
  border-radius: 50%;
  flex-shrink: 0;
}

.user-info {
  flex: 1;
}

.username {
  color: var(--van-text-color, #323233);
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 4px 0;
}

.user-id {
  color: var(--van-text-color-2, #646566);
  font-size: 14px;
  margin: 0;
}

/* 用户详细信息 */
.user-details {
  margin-top: 16px;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  font-size: 14px;
}

.detail-label {
  color: var(--van-text-color-2, #646566);
}

.detail-value {
  color: var(--van-text-color, #323233);
  font-weight: 500;
}

/* 积分显示 - 居中且无背景 */
.points-display {
  display: flex;
  justify-content: center;
  padding: 16px;
}

.points-item-centered {
  text-align: center;
}

.points-value {
  display: block;
  font-size: 24px;
  font-weight: 700;
  color: var(--van-primary-color, #1989fa);
  margin-bottom: 4px;
  line-height: 1;
}

.points-label {
  font-size: 14px;
  color: var(--van-text-color-2, #646566);
  font-weight: 500;
}

/* 透明单元格组样式 */
.transparent-cell-group {
  background: transparent !important;
}

.transparent-cell {
  background: transparent !important;
}

.transparent-cell-group .van-cell {
  background: transparent !important;
}

.level-card-item {
  background: transparent !important;
}

.record-item {
  background: transparent !important;
}

/* 确保所有相关的 Vant 组件背景透明 */
.profile-content .van-cell-group {
  background: transparent !important;
}

.profile-content .van-cell {
  background: transparent !important;
}

/* 等级卡样式 */
.card-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  margin-right: 12px;
}

.card-type-icon {
  font-size: 18px;
}

.card-type {
  font-size: 16px;
  font-weight: 600;
  color: var(--van-text-color, #323233);
}

.card-date {
  font-size: 12px;
  color: var(--van-text-color-3, #969799);
  margin-top: 2px;
}

.card-points {
  font-size: 14px;
  font-weight: 600;
}

.points-current {
  color: var(--van-primary-color, #1989fa);
}

.points-separator {
  color: var(--van-text-color-3, #969799);
  margin: 0 2px;
}

.points-total {
  color: var(--van-text-color-2, #646566);
}

/* 记录样式 */
.record-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  margin-right: 12px;
}

.record-desc {
  font-size: 14px;
  color: var(--van-text-color, #323233);
  font-weight: 500;
}

.record-time {
  font-size: 12px;
  color: var(--van-text-color-3, #969799);
  margin-top: 2px;
}

.record-amount {
  font-size: 14px;
  font-weight: 600;
}

.record-amount.consume {
  color: var(--van-danger-color, #ee0a24);
}

.record-amount:not(.consume) {
  color: var(--van-success-color, #07c160);
}

.records-footer {
  margin-top: 12px;
}

/* 操作按钮 */
.action-buttons {
  margin-top: 24px;
  padding: 0 12px;
}

/* 加载状态 */
.loading-center {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
}

.loading-skeleton {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* 未登录状态 */
.not-logged-in {
  padding: 40px 20px;
  text-align: center;
}

/* 主要内容区域 */
.profile-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}








































/* 记录项样式 */
.record-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  margin-right: 8px;
}

.record-desc {
  font-size: 14px;
  color: var(--van-text-color);
  font-weight: 500;
}

.record-time {
  font-size: 12px;
  color: var(--van-text-color-3);
  margin-top: 2px;
}

.record-value-container {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
  min-width: 60px;
}

.record-amount {
  font-size: 14px;
  font-weight: 600;
  text-align: right;
}

.record-amount.consume {
  color: var(--van-danger-color);
}

.record-amount.earn {
  color: var(--van-success-color);
}

.view-button {
  font-size: 11px;
  padding: 2px 8px;
  height: 20px;
  line-height: 16px;
  border-color: var(--van-border-color);
  color: var(--van-text-color-2);
  background: transparent;
}

.view-button:hover {
  border-color: var(--van-primary-color);
  color: var(--van-primary-color);
}
</style>
