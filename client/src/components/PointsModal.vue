<template>
  <van-popup
    v-model:show="visible"
    position="center"
    :style="{ width: '90%', maxWidth: '400px', borderRadius: '16px' }"
    :close-on-click-overlay="false"
  >
    <div class="points-modal">
      <!-- 头部 -->
      <div class="modal-header">
        <h2 class="modal-title">
          <van-icon name="diamond-o" size="24" />
          我的积分
        </h2>
        <van-icon
          name="cross"
          size="20"
          class="close-btn"
          @click="closeModal"
        />
      </div>

      <!-- 加载状态 -->
      <van-loading v-if="loading" class="loading-center" size="24px" vertical>
        加载中...
      </van-loading>

      <!-- 内容 -->
      <div v-else class="modal-content">
        <!-- 未登录提示 -->
        <div v-if="!isLoggedIn" class="login-prompt">
          <div class="prompt-icon">🔐</div>
          <div class="prompt-title">请先登录</div>
          <div class="prompt-desc">登录后即可查看积分信息和绑定等级卡</div>
          <van-button
            type="primary"
            round
            block
            @click="closeModal"
            class="login-btn"
          >
            去登录
          </van-button>
        </div>

        <!-- 已登录内容 -->
        <template v-else>
          <!-- 积分概览 -->
          <div class="points-overview">
            <div class="points-total">
              <div class="points-number">{{ pointsInfo?.total_points || 0 }}</div>
              <div class="points-label">总积分</div>
            </div>
            
            <!-- 购买等级卡按钮 - 移到积分概览内 -->
            <div class="purchase-btn-container">
              <van-button
                type="primary"
                round
                @click="showPurchaseModal = true"
                class="purchase-btn"
              >
                <van-icon name="shopping-cart-o" size="14" />
                购买等级卡
              </van-button>
            </div>
          </div>

          <!-- 绑定等级卡 -->
          <div class="bind-section">
            <h3 class="section-title">
              <van-icon name="credit-pay" size="16" />
              绑定等级卡
            </h3>

            <!-- 体验卡限制提示 -->
            <div v-if="hasUnusedExperienceCard" class="experience-card-notice">
              <van-notice-bar
                left-icon="info-o"
                color="#ff6b35"
                background="rgba(255, 107, 53, 0.1)"
                text="提示：您已有可用的体验卡，体验卡在使用前不可叠加绑定。"
              />
            </div>

            <form @submit.prevent="handleBindCard" class="bind-form">
              <BaseInput
                v-model="bindForm.cardNumber"
                placeholder="请输入卡号"
                :rules="cardNumberRules"
                clearable
                class="bind-input-full"
              />

              <BaseInput
                v-model="bindForm.cardPassword"
                type="password"
                placeholder="请输入卡密"
                :rules="cardPasswordRules"
                clearable
                class="bind-input-full"
              />

              <div class="bind-actions">
                <van-button
                  type="primary"
                  native-type="submit"
                  round
                  block
                  :loading="bindLoading"
                  :disabled="bindLoading"
                  class="bind-button"
                >
                  {{ bindLoading ? '绑定中...' : '绑定' }}
                </van-button>
              </div>
            </form>
          </div>
        </template>
      </div>
    </div>
  </van-popup>

  <!-- 购买等级卡弹窗 -->
  <van-popup
    v-model:show="showPurchaseModal"
    position="center"
    :style="{ width: '95%', maxWidth: '450px', borderRadius: '16px' }"
    :close-on-click-overlay="false"
  >
    <div class="purchase-modal">
      <!-- 头部 -->
      <div class="modal-header">
        <h2 class="modal-title">
          <van-icon name="shopping-cart-o" size="24" />
          购买等级卡
        </h2>
        <van-icon
          name="cross"
          size="20"
          class="close-btn"
          @click="showPurchaseModal = false"
        />
      </div>

      <!-- 内容 -->
      <div class="modal-content">
        <!-- 等级卡类型（三列横排） -->
        <div class="card-types-grid">
          <div class="card-type-card">
            <div class="card-icon">🥉</div>
            <div class="card-name">基础卡</div>
            <div class="card-price">¥9.9</div>
            <div class="card-points">300积分</div>
          </div>
          <div class="card-type-card">
            <div class="card-icon">🥈</div>
            <div class="card-name">高级卡</div>
            <div class="card-price">¥30</div>
            <div class="card-points">1000积分</div>
          </div>
          <div class="card-type-card">
            <div class="card-icon">🥇</div>
            <div class="card-name">至尊卡</div>
            <div class="card-price">¥50</div>
            <div class="card-points">2000积分</div>
          </div>
        </div>

        <!-- 兑换流程 -->
        <div class="exchange-process">
          <h4 class="process-title">兑换流程</h4>
          <div class="process-steps">
            <div class="process-step">
              <div class="step-number">1</div>
              <div class="step-text">加客服</div>
            </div>
            <div class="process-arrow">→</div>
            <div class="process-step">
              <div class="step-number">2</div>
              <div class="step-text">发红包</div>
            </div>
            <div class="process-arrow">→</div>
            <div class="process-step">
              <div class="step-number">3</div>
              <div class="step-text">收卡号</div>
            </div>
            <div class="process-arrow">→</div>
            <div class="process-step">
              <div class="step-number">4</div>
              <div class="step-text">绑定</div>
            </div>
          </div>
        </div>

        <!-- 联系客服按钮 -->
        <div class="contact-section">
          <van-button
            type="primary"
            round
            @click="contactCustomerService"
            class="contact-btn"
          >
            <van-icon name="chat-o" size="14" />
            联系客服
          </van-button>
        </div>
      </div>
    </div>
  </van-popup>
</template>

<script>
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { Toast } from 'vant'
import { levelCardApi, pointsApi, authApi } from '../services/api.js'
import BaseInput from './BaseInput.vue'

export default {
  name: 'PointsModal',
  components: {
    BaseInput
  },
  props: {
    show: {
      type: Boolean,
      default: false
    }
  },
  emits: ['update:show', 'points-updated'],
  setup(props, { emit }) {
    const visible = computed({
      get: () => props.show,
      set: (value) => emit('update:show', value)
    })

    const loading = ref(false)
    const bindLoading = ref(false)
    const pointsInfo = ref(null)
    const showPurchaseModal = ref(false)
    const userCards = ref([])

    // 计算登录状态
    const isLoggedIn = computed(() => authApi.isLoggedIn())

    // 检查是否有未使用的体验卡
    const hasUnusedExperienceCard = computed(() => {
      return userCards.value.some(card =>
        card.type_name === '体验卡' && card.remaining_points > 0
      )
    })


    // 绑定表单数据
    const bindForm = reactive({
      cardNumber: '',
      cardPassword: ''
    })

    // 表单验证规则
    const cardNumberRules = [
      { required: true, message: '请输入卡号' },
      { pattern: /^[A-Za-z0-9]{6,20}$/, message: '卡号格式不正确' }
    ]

    const cardPasswordRules = [
      { required: true, message: '请输入卡密' },
      { pattern: /^[A-Za-z0-9]{6,20}$/, message: '卡密格式不正确' }
    ]

    // 重置绑定表单
    const resetBindForm = () => {
      bindForm.cardNumber = ''
      bindForm.cardPassword = ''
    }

    // 关闭弹窗
    const closeModal = () => {
      visible.value = false
      showPurchaseModal.value = false
      resetBindForm()
    }

    // 联系客服
    const contactCustomerService = () => {
      // 打开Telegram链接
      const telegramUrl = 'https://t.me/tgcomfy'
      window.open(telegramUrl, '_blank')

      // 显示提示
      Toast.success('正在跳转到Telegram客服')
    }

    // 加载积分信息
    const loadPointsInfo = async () => {
      // 检查登录状态
      if (!authApi.isLoggedIn()) {
        pointsInfo.value = {
          total_points: 0,
          cards_count: 0,
          cards_breakdown: []
        }
        userCards.value = []
        loading.value = false
        return
      }

      try {
        loading.value = true

        // 并行加载积分信息和用户卡片信息
        const [pointsResponse, cardsResponse] = await Promise.all([
          pointsApi.getUserPoints(),
          levelCardApi.getMyCards()
        ])

        if (pointsResponse.success) {
          pointsInfo.value = pointsResponse.data
        } else {
          console.error('获取积分信息失败:', pointsResponse.message)
          // 如果是认证错误，显示登录提示
          if (pointsResponse.message && pointsResponse.message.includes('令牌')) {
            Toast.fail('请先登录')
            pointsInfo.value = {
              total_points: 0,
              cards_count: 0,
              cards_breakdown: []
            }
          } else {
            Toast.fail('获取积分信息失败')
          }
        }

        if (cardsResponse.success) {
          userCards.value = cardsResponse.data.cards || []
        } else {
          console.error('获取用户卡片信息失败:', cardsResponse.message)
          userCards.value = []
        }

      } catch (error) {
        console.error('加载积分信息失败:', error)
        // 如果是认证错误，显示登录提示
        if (error.message && (error.message.includes('令牌') || error.message.includes('401') || error.message.includes('登录已过期'))) {
          Toast.fail('登录已过期，请重新登录')
          pointsInfo.value = {
            total_points: 0,
            cards_count: 0,
            cards_breakdown: []
          }
        } else if (error.message && error.message.includes('网络连接失败')) {
          Toast.fail('网络连接失败，请检查服务器状态')
        } else {
          Toast.fail('获取积分信息失败')
        }
        userCards.value = []
      } finally {
        loading.value = false
      }
    }

    // 处理绑定等级卡
    const handleBindCard = async () => {
      if (bindLoading.value) return

      // 检查登录状态
      if (!authApi.isLoggedIn()) {
        Toast.fail('请先登录')
        return
      }

      // 验证表单
      if (!bindForm.cardNumber.trim()) {
        Toast.fail('请输入卡号')
        return
      }

      if (!bindForm.cardPassword.trim()) {
        Toast.fail('请输入卡密')
        return
      }

      bindLoading.value = true

      try {
        console.log('🎫 尝试绑定等级卡:', {
          cardNumber: bindForm.cardNumber.trim(),
          hasUnusedExperienceCard: hasUnusedExperienceCard.value,
          userCards: userCards.value
        })

        const response = await levelCardApi.bindCard(
          bindForm.cardNumber.trim(),
          bindForm.cardPassword.trim()
        )

        console.log('🎫 绑定响应:', response)

        if (response.success) {
          Toast.success(response.message || '绑定成功，正在更新积分...')

          // 显示积分更新中的提示
          Toast.loading({
            message: '正在更新积分信息...',
            forbidClick: true,
            duration: 0
          })

          try {
            // 重新加载积分信息
            await loadPointsInfo()

            Toast.clear()
            Toast.success('等级卡绑定成功，积分已更新')

            // 通知父组件积分已更新
            emit('points-updated', response.data)
          } catch (error) {
            Toast.clear()
            console.error('更新积分信息失败:', error)
            Toast.fail('积分更新失败，请刷新页面')
          }

          // 重置表单
          resetBindForm()
        } else {
          console.error('绑定失败:', response.message)
          // 如果是认证错误，显示登录提示
          if (response.message && response.message.includes('令牌')) {
            Toast.fail('请先登录')
          } else if (response.message && response.message.includes('体验卡')) {
            // 体验卡相关错误，显示详细提示
            Toast.fail(response.message)
          } else {
            Toast.fail(response.message || '绑定失败')
          }
        }
      } catch (error) {
        console.error('🎫 绑定等级卡失败:', error)
        console.error('🎫 错误详情:', {
          message: error.message,
          hasUnusedExperienceCard: hasUnusedExperienceCard.value,
          userCards: userCards.value
        })
        // 如果是认证错误，显示登录提示
        if (error.message && (error.message.includes('令牌') || error.message.includes('401') || error.message.includes('登录已过期'))) {
          Toast.fail('登录已过期，请重新登录')
        } else if (error.message && error.message.includes('体验卡')) {
          // 体验卡相关错误，显示详细提示
          // 提取原始错误消息（去掉"请求失败: "前缀）
          const originalMessage = error.message.replace(/^请求失败:\s*/, '')
          Toast({
            type: 'fail',
            message: originalMessage,
            duration: 4000 // 显示更长时间
          })
        } else if (error.message && error.message.includes('网络连接失败')) {
          Toast.fail('网络连接失败，请检查服务器状态')
        } else {
          Toast.fail(error.message || '绑定失败')
        }
      } finally {
        bindLoading.value = false
      }
    }

    // 监听弹窗显示状态
    watch(visible, (newValue) => {
      if (newValue) {
        loadPointsInfo()
      } else {
        resetBindForm()
        showPurchaseModal.value = false
      }
    })

    return {
      visible,
      loading,
      bindLoading,
      pointsInfo,
      bindForm,
      cardNumberRules,
      cardPasswordRules,
      showPurchaseModal,
      isLoggedIn,
      userCards,
      hasUnusedExperienceCard,
      closeModal,
      loadPointsInfo,
      handleBindCard,
      contactCustomerService
    }
  }
}
</script>

<style scoped>
.points-modal {
  padding: 0;
  background: rgba(10, 10, 20, 0.95);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(30, 30, 60, 0.5);
  border-radius: 16px;
  max-height: 90vh; /* 增加最大高度 */
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(30, 30, 60, 0.5);
  background: rgba(15, 15, 30, 0.8);
  backdrop-filter: blur(10px);
}

.modal-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: var(--van-text-color, #f7f8fa);
  margin: 0;
}

.close-btn {
  color: var(--van-text-color-2, #969799);
  cursor: pointer;
  transition: color 0.3s;
}

.close-btn:hover {
  color: var(--van-text-color, #f7f8fa);
}

.loading-center {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
}

.modal-content {
  padding: 0 16px 16px;
  max-height: calc(90vh - 60px); /* 减去头部高度 */
  overflow-y: auto;
}

/* 登录提示 */
.login-prompt {
  text-align: center;
  padding: 40px 20px;
}

.prompt-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.prompt-title {
  font-size: 18px;
  font-weight: 600;
  color: #323233;
  margin-bottom: 8px;
}

.prompt-desc {
  font-size: 14px;
  color: #969799;
  margin-bottom: 24px;
  line-height: 1.5;
}

.login-btn {
  background: linear-gradient(135deg, #1989fa, #1976d2);
  border: none;
  font-weight: 600;
  height: 48px;
}

/* 积分概览 */
.points-overview {
  display: flex;
  align-items: center;
  justify-content: space-between; /* 改为两端对齐 */
  padding: 16px; /* 减小内边距 */
  background: rgba(15, 15, 30, 0.8);
  border: 1px solid rgba(30, 30, 60, 0.5);
  border-radius: 12px;
  color: var(--van-text-color, #f7f8fa);
  margin-bottom: 12px; /* 减小底部间距 */
}

.points-total {
  text-align: center;
}

.points-number {
  font-size: 32px; /* 减小字体大小 */
  font-weight: 700;
  line-height: 1;
  margin-bottom: 4px;
}

.points-label {
  font-size: 14px;
  opacity: 0.9;
}

.points-stats {
  display: flex;
  gap: 24px;
}

.stat-item {
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 20px;
  font-weight: 600;
  line-height: 1;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 12px;
  opacity: 0.9;
}

/* 区块标题 */
.section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  color: var(--van-text-color, #f7f8fa);
  margin: 0 0 10px 0; /* 减小底部间距 */
}

.section-desc {
  font-size: 12px;
  color: var(--van-text-color-2, #969799);
  margin: 0 0 12px 0;
}

/* 体验卡提示 */
.experience-card-notice {
  margin-bottom: 12px; /* 减小底部间距 */
}

/* 等级卡明细 */
.cards-section {
  margin-bottom: 24px;
}

.cards-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.card-item {
  padding: 12px 16px;
  background: #f7f8fa;
  border-radius: 8px;
}

.card-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-type {
  font-size: 14px;
  color: #323233;
  font-weight: 500;
}

.card-points {
  font-size: 14px;
  color: #1989fa;
  font-weight: 600;
}

/* 绑定区块 */
.bind-section {
  margin-bottom: 12px; /* 减小底部间距 */
  padding: 12px; /* 减小内边距 */
  background: rgba(15, 15, 30, 0.6);
  border-radius: 12px;
  border: 1px solid rgba(30, 30, 60, 0.5);
}

/* 绑定表单 */
.bind-form {
  margin-top: 10px; /* 减小顶部间距 */
}

.bind-input-full {
  width: 100%;
  margin-bottom: 10px; /* 减小底部间距 */
}

.form-field {
  margin-bottom: 16px;
}

/* 自定义输入框样式 */
.custom-field {
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e1e5e9;
  transition: all 0.3s ease;
  overflow: hidden;
}

.custom-field:hover {
  border-color: #1989fa;
  box-shadow: 0 2px 8px rgba(25, 137, 250, 0.1);
}

.custom-field:focus-within {
  border-color: #1989fa;
  box-shadow: 0 0 0 2px rgba(25, 137, 250, 0.1);
}

/* 输入框内部样式 */
.custom-field :deep(.van-field__control) {
  background: transparent;
  border: none;
  padding: 16px;
  font-size: 15px;
  line-height: 1.4;
}

.custom-field :deep(.van-field__label) {
  color: #646566;
  font-weight: 500;
  font-size: 14px;
  padding-left: 16px;
  min-width: 60px;
}

.custom-field :deep(.van-field__body) {
  padding: 0;
}

.custom-field :deep(.van-field__control input) {
  color: #323233;
  font-size: 15px;
}

.custom-field :deep(.van-field__control input::placeholder) {
  color: #c8c9cc;
  font-size: 14px;
}

.custom-field :deep(.van-field__clear) {
  margin-right: 12px;
  color: #c8c9cc;
}

.custom-field :deep(.van-field__clear):hover {
  color: #969799;
}

/* 绑定按钮 */
.bind-actions {
  margin-top: 16px;
  width: 100%; /* 确保容器占据整行 */
}

.bind-button {
  height: 36px;
  font-size: 14px;
  font-weight: 600;
  background: linear-gradient(135deg, #1989fa, #1976d2);
  border: none;
  width: 100%; /* 确保按钮占据整行 */
}

/* 购买区块 */
.purchase-section {
  margin: 12px 0;
  text-align: center;
}

.purchase-btn {
  background: linear-gradient(135deg, #ff6b6b, #ee5a24);
  border: none;
  font-weight: 600;
  height: 36px;
  font-size: 14px;
  min-width: 120px;
}

/* 购买弹窗样式 */
.purchase-modal {
  padding: 0;
  background: rgba(10, 10, 20, 0.95);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(30, 30, 60, 0.5);
  border-radius: 16px;
  max-height: 70vh;
  overflow: hidden;
}

/* 等级卡类型网格（三列横排，固定布局） */
.card-types-grid {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  min-width: 360px;
}

.card-type-card {
  flex: 1;
  padding: 12px 8px;
  background: rgba(15, 15, 30, 0.6);
  border: 1px solid rgba(30, 30, 60, 0.5);
  border-radius: 12px;
  text-align: center;
  transition: all 0.3s;
  min-width: 100px;
}

.card-type-card:hover {
  border-color: var(--van-primary-color, #1989fa);
  background: rgba(25, 137, 250, 0.1);
}

.card-icon {
  font-size: 32px;
  margin-bottom: 8px;
}

.card-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--van-text-color, #f7f8fa);
  margin-bottom: 4px;
}

.card-price {
  font-size: 16px;
  font-weight: 700;
  color: #ff6b6b;
  margin-bottom: 2px;
}

.card-points {
  font-size: 12px;
  color: var(--van-text-color-2, #969799);
}

/* 兑换流程 */
.exchange-process {
  margin-bottom: 12px;
  padding: 10px;
  background: rgba(15, 15, 30, 0.6);
  border: 1px solid rgba(30, 30, 60, 0.5);
  border-radius: 12px;
}

.process-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--van-text-color, #f7f8fa);
  margin: 0 0 8px 0;
  text-align: center;
}

.process-steps {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  flex-wrap: nowrap;
  overflow-x: hidden; /* 改为 hidden 以隐藏滚动条 */
  min-width: 0;
  padding: 5px 0; /* 添加一些内边距 */
}

.process-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 45px;
  flex-shrink: 0;
}

.step-number {
  width: 20px;
  height: 20px;
  background: #1989fa;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 600;
  margin-bottom: 3px;
}

.step-text {
  font-size: 10px;
  color: var(--van-text-color, #f7f8fa);
  text-align: center;
  line-height: 1.2;
}

.process-arrow {
  color: #1989fa;
  font-size: 14px;
  font-weight: 600;
  margin: 0 2px;
}

/* 确保在小屏幕上步骤能够适当缩小 */
@media (max-width: 768px) {
  .process-steps {
    justify-content: space-between; /* 在小屏幕上均匀分布 */
    gap: 2px; /* 减小间距 */
  }
  
  .process-step {
    min-width: 40px; /* 减小最小宽度 */
  }
  
  .process-arrow {
    margin: 0 1px; /* 减小箭头边距 */
    font-size: 12px; /* 减小箭头大小 */
  }
  
  .step-number {
    width: 18px; /* 减小步骤数字圆圈大小 */
    height: 18px;
    font-size: 9px;
  }
  
  .step-text {
    font-size: 9px; /* 减小文字大小 */
  }
}

/* 联系客服 */
.contact-section {
  margin-top: 16px;
  text-align: center;
}

.contact-btn {
  background: linear-gradient(135deg, #00d2ff, #3a7bd5);
  border: none;
  font-weight: 600;
  height: 36px;
  font-size: 14px;
  min-width: 120px;
}

.contact-btn:hover {
  background: linear-gradient(135deg, #3a7bd5, #00d2ff);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .points-overview {
    flex-direction: column;
    gap: 16px;
    text-align: center;
  }

  .points-stats {
    justify-content: center;
  }

  /* 移动端等级卡网格调整 */
  .card-types-grid {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .card-type-card {
    padding: 12px;
  }

  .card-icon {
    font-size: 28px;
  }

  /* 删除以下移动端流程步骤调整，保持横向布局 */
  /* .process-steps {
    flex-direction: column;
    gap: 12px;
  }

  .process-arrow {
    transform: rotate(90deg);
    margin: 4px 0;
  } */

  .step-text {
    font-size: 12px;
  }
}

/* 深色主题适配 */
@media (prefers-color-scheme: dark) {
  .points-modal {
    background: #1e1e1e;
  }

  .modal-header {
    background: #1e1e1e;
    border-bottom-color: #3a3a3c;
  }

  .modal-title {
    color: #ffffff;
  }

  .section-title {
    color: #ffffff;
  }

  .section-desc {
    color: #8e8e93;
  }

  .card-item,
  .bind-section,
  .card-type-item {
    background: #2c2c2e;
  }

  .card-type {
    color: #ffffff;
  }

  .card-type-name {
    color: #ffffff;
  }

  .card-type-desc {
    color: #8e8e93;
  }
}
</style>





