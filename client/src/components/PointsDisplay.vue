<template>
  <div class="points-display" :class="{ 'compact': isCompact }">
    <!-- 紧凑模式：右上角显示 -->
    <div v-if="isCompact" class="points-compact" @click="showPointsModal = true" title="点击查看积分详情">
      <div class="compact-main">
        <span class="points-icon">💎</span>
        <span class="points-value">{{ pointsStatus.current }}</span>
      </div>
    </div>

    <!-- 完整模式：原有显示 -->
    <template v-else>
      <div class="points-info">
        <div class="points-main">
          <span class="points-icon">💎</span>
          <span class="points-value">{{ pointsStatus.current }}</span>
          <span class="points-label">体验点</span>
        </div>

        <div class="points-details">
          <div class="daily-info">
            <span class="daily-label">今日免费:</span>
            <span class="daily-value">{{ pointsStatus.dailyRemaining }}/{{ pointsStatus.dailyFreePoints }}</span>
          </div>

          <div class="cost-info">
            <span class="cost-label">每次消耗:</span>
            <span class="cost-value">{{ pointsStatus.generationCost }}点</span>
          </div>
        </div>
      </div>

      <div class="points-actions">
        <van-button
          v-if="!pointsStatus.canGenerate"
          @click="showPurchaseModal = true"
          type="primary"
          size="small"
          round
          class="recharge-btn"
        >
          <span class="btn-icon">🎫</span>
          充值体验卡
        </van-button>

        <van-button
          v-else
          @click="showDetailsModal = true"
          type="default"
          size="small"
          plain
          round
          class="details-btn"
        >
          详情
        </van-button>
      </div>
    </template>

    <!-- 购买体验卡模态框 -->
    <van-popup
      v-model:show="showPurchaseModal"
      position="center"
      :style="{ width: '90%', maxWidth: '400px' }"
      round
    >
      <div class="purchase-modal">
        <div class="modal-header">
          <h3 class="modal-title">
            <span class="title-icon">🎫</span>
            购买体验卡
          </h3>
          <van-icon
            name="cross"
            @click="showPurchaseModal = false"
            class="close-btn"
          />
        </div>

        <div class="modal-content">
          <div class="card-info">
            <div class="card-item">
              <span class="card-icon">💎</span>
              <div class="card-details">
                <div class="card-title">体验卡</div>
                <div class="card-desc">获得 {{ pointsStatus.experienceCardPoints }} 体验点</div>
              </div>
              <div class="card-price">¥{{ pointsStatus.experienceCardPrice }}</div>
            </div>
          </div>

          <div class="payment-section">
            <h4 class="payment-title">支付方式</h4>
            <div class="payment-methods">
              <div
                class="payment-method"
                :class="{ active: selectedPayment === 'wechat' }"
                @click="selectedPayment = 'wechat'"
              >
                <span class="payment-icon">💚</span>
                <span class="payment-name">微信支付</span>
              </div>
              <div
                class="payment-method"
                :class="{ active: selectedPayment === 'alipay' }"
                @click="selectedPayment = 'alipay'"
              >
                <span class="payment-icon">💙</span>
                <span class="payment-name">支付宝</span>
              </div>
            </div>
          </div>

          <div class="modal-actions">
            <van-button
              @click="generatePaymentCode"
              type="primary"
              size="large"
              round
              block
              :loading="generating"
            >
              {{ generating ? '生成中...' : '生成付款码' }}
            </van-button>
          </div>
        </div>
      </div>
    </van-popup>

    <!-- 付款码模态框 -->
    <van-popup
      v-model:show="showPaymentModal"
      position="center"
      :style="{ width: '90%', maxWidth: '350px' }"
      round
    >
      <div class="payment-modal">
        <div class="modal-header">
          <h3 class="modal-title">
            <span class="title-icon">{{ selectedPayment === 'wechat' ? '💚' : '💙' }}</span>
            {{ selectedPayment === 'wechat' ? '微信支付' : '支付宝' }}
          </h3>
          <van-icon
            name="cross"
            @click="closePaymentModal"
            class="close-btn"
          />
        </div>

        <div class="modal-content">
          <div class="qr-section">
            <div class="qr-code">
              <div class="qr-placeholder">
                <span class="qr-icon">📱</span>
                <div class="qr-text">
                  <div>请使用{{ selectedPayment === 'wechat' ? '微信' : '支付宝' }}扫码支付</div>
                  <div class="qr-amount">¥{{ pointsStatus.experienceCardPrice }}</div>
                </div>
              </div>
            </div>
          </div>

          <div class="payment-info">
            <div class="info-item">
              <span class="info-label">商品:</span>
              <span class="info-value">体验卡 ({{ pointsStatus.experienceCardPoints }}点)</span>
            </div>
            <div class="info-item">
              <span class="info-label">金额:</span>
              <span class="info-value">¥{{ pointsStatus.experienceCardPrice }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">订单号:</span>
              <span class="info-value">{{ currentOrderId }}</span>
            </div>
          </div>

          <div class="payment-status">
            <van-loading v-if="checkingPayment" size="20px" />
            <span class="status-text">{{ paymentStatusText }}</span>
          </div>

          <div class="modal-actions">
            <van-button
              @click="checkPaymentStatus"
              type="primary"
              size="normal"
              round
              :loading="checkingPayment"
            >
              {{ checkingPayment ? '检查中...' : '我已支付' }}
            </van-button>
            <van-button
              @click="closePaymentModal"
              type="default"
              size="normal"
              round
            >
              取消支付
            </van-button>
          </div>
        </div>
      </div>
    </van-popup>

    <!-- 点数详情模态框 -->
    <van-popup
      v-model:show="showDetailsModal"
      position="center"
      :style="{ width: '90%', maxWidth: '400px' }"
      round
    >
      <div class="details-modal">
        <div class="modal-header">
          <h3 class="modal-title">
            <span class="title-icon">💎</span>
            体验点详情
          </h3>
          <van-icon
            name="cross"
            @click="showDetailsModal = false"
            class="close-btn"
          />
        </div>

        <div class="modal-content">
          <div class="status-overview">
            <div class="status-item">
              <div class="status-value">{{ pointsStatus.current }}</div>
              <div class="status-label">当前点数</div>
            </div>
            <div class="status-item">
              <div class="status-value">{{ pointsStatus.dailyRemaining }}</div>
              <div class="status-label">今日免费剩余</div>
            </div>
            <div class="status-item">
              <div class="status-value">{{ pointsStatus.totalUsedToday }}</div>
              <div class="status-label">今日已用</div>
            </div>
          </div>

          <div class="rules-section">
            <h4 class="rules-title">使用规则</h4>
            <ul class="rules-list">
              <li>每日免费获得 {{ pointsStatus.dailyFreePoints }} 体验点</li>
              <li>每次生成图片消耗 {{ pointsStatus.generationCost }} 体验点</li>
              <li>体验卡可获得 {{ pointsStatus.experienceCardPoints }} 体验点</li>
              <li>免费点数每日0点重置，购买点数永久有效</li>
            </ul>
          </div>

          <div class="purchase-history" v-if="pointsStatus.purchaseHistory.length > 0">
            <h4 class="history-title">购买记录</h4>
            <div class="history-list">
              <div
                v-for="item in pointsStatus.purchaseHistory.slice(-3)"
                :key="item.id"
                class="history-item"
              >
                <div class="history-info">
                  <div class="history-type">体验卡</div>
                  <div class="history-date">{{ formatDate(item.timestamp) }}</div>
                </div>
                <div class="history-points">+{{ item.points }}点</div>
              </div>
            </div>
          </div>

          <div class="modal-actions">
            <van-button
              @click="showPurchaseModal = true; showDetailsModal = false"
              type="primary"
              size="normal"
              round
              block
            >
              购买体验卡
            </van-button>
          </div>
        </div>
      </div>
    </van-popup>

    <!-- 积分弹窗 -->
    <PointsModal
      v-model:show="showPointsModal"
      @points-updated="handlePointsUpdated"
    />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { Toast } from 'vant'
import levelCardPointsManager from '../utils/levelCardPointsManager.js'
import PointsModal from './PointsModal.vue'

// Props
const props = defineProps({
  compact: {
    type: Boolean,
    default: false
  }
})

// 计算是否为紧凑模式
const isCompact = ref(props.compact)

// 响应式数据
const pointsStatus = reactive({
  current: 0,
  total_points: 0,
  cards_count: 0,
  canGenerate: false,
  generationCost: 20,
  isLoggedIn: false
})
const showPurchaseModal = ref(false)
const showPaymentModal = ref(false)
const showDetailsModal = ref(false)
const showPointsModal = ref(false)
const selectedPayment = ref('wechat')
const generating = ref(false)
const checkingPayment = ref(false)
const currentOrderId = ref('')
const paymentStatusText = ref('等待支付...')

// 定时器（仅保留支付检查定时器）
let paymentCheckTimer = null

// 组件挂载时初始化
onMounted(() => {
  updatePointsStatus()
})

// 组件卸载时清理定时器
onUnmounted(() => {
  if (paymentCheckTimer) {
    clearInterval(paymentCheckTimer)
  }
})

// 更新点数状态
const updatePointsStatus = async () => {
  // 检查登录状态，如果未登录则不发送API请求
  if (!levelCardPointsManager.isLoggedIn()) {
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
    const newStatus = await levelCardPointsManager.getPointsStatus()
    Object.assign(pointsStatus, newStatus)
  } catch (error) {
    console.error('更新积分状态失败:', error)
    // 如果是认证错误，重置为未登录状态
    if (error.message && (error.message.includes('令牌') || error.message.includes('401'))) {
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

// 生成付款码
const generatePaymentCode = async () => {
  generating.value = true

  try {
    // 模拟生成订单
    await new Promise(resolve => setTimeout(resolve, 1000))

    currentOrderId.value = `EXP${Date.now()}`
    paymentStatusText.value = '等待支付...'

    showPurchaseModal.value = false
    showPaymentModal.value = true

    // 开始检查支付状态
    startPaymentCheck()

  } catch (error) {
    Toast.fail('生成付款码失败，请重试')
  } finally {
    generating.value = false
  }
}

// 开始支付状态检查
const startPaymentCheck = () => {
  // 模拟支付检查，实际应该调用后端API
  paymentCheckTimer = setInterval(() => {
    // 这里应该调用真实的支付状态检查API
    // 现在模拟30秒后支付成功
    if (Date.now() - parseInt(currentOrderId.value.replace('EXP', '')) > 30000) {
      handlePaymentSuccess()
    }
  }, 3000)
}

// 检查支付状态
const checkPaymentStatus = async () => {
  checkingPayment.value = true
  paymentStatusText.value = '检查支付状态...'

  try {
    // 模拟检查支付状态
    await new Promise(resolve => setTimeout(resolve, 2000))

    // 模拟支付成功（实际应该调用后端API）
    const isSuccess = Math.random() > 0.3 // 70%概率成功

    if (isSuccess) {
      handlePaymentSuccess()
    } else {
      paymentStatusText.value = '未检测到支付，请确认支付后重试'
      Toast.fail('未检测到支付')
    }

  } catch (error) {
    paymentStatusText.value = '检查失败，请重试'
    Toast.fail('检查支付状态失败')
  } finally {
    checkingPayment.value = false
  }
}

// 处理支付成功
const handlePaymentSuccess = async () => {
  try {
    // 清理定时器
    if (paymentCheckTimer) {
      clearInterval(paymentCheckTimer)
      paymentCheckTimer = null
    }

    // 更新状态
    await updatePointsStatus()

    // 关闭模态框
    closePaymentModal()

    // 显示成功消息
    Toast.success('支付成功！请使用等级卡绑定功能获得积分')

  } catch (error) {
    Toast.fail('处理支付失败，请联系客服')
  }
}

// 关闭支付模态框
const closePaymentModal = () => {
  showPaymentModal.value = false

  if (paymentCheckTimer) {
    clearInterval(paymentCheckTimer)
    paymentCheckTimer = null
  }

  currentOrderId.value = ''
  paymentStatusText.value = '等待支付...'
  checkingPayment.value = false
}

// 处理积分更新（等级卡绑定成功后）
const handlePointsUpdated = async (data) => {
  console.log('积分已更新:', data)

  // 更新本地积分状态
  await updatePointsStatus()

  // 显示成功提示
  if (data.pointsAdded) {
    Toast.success(`绑定成功！获得 ${data.pointsAdded} 积分`)
  }
}

// 格式化日期
const formatDate = (timestamp) => {
  const date = new Date(timestamp)
  return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`
}

// 暴露给父组件的方法
defineExpose({
  updatePointsStatus,
  getCurrentPoints: () => pointsStatus.current,
  hasEnoughPoints: () => pointsStatus.canGenerate,
  consumePoints: async (amount, description) => {
    try {
      await levelCardPointsManager.consumePoints(amount, description)
      await updatePointsStatus()
      return true
    } catch (error) {
      console.error('消耗积分失败:', error)
      throw error
    }
  }
})
</script>

<style scoped>
.points-display {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 12px 16px;
  margin-bottom: 16px;
}

.points-info {
  display: flex;
  align-items: center;
  gap: 16px;
}

.points-main {
  display: flex;
  align-items: center;
  gap: 8px;
}

.points-icon {
  font-size: 1.2rem;
}

.points-value {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--primary-color);
}

.points-label {
  color: var(--text-light);
  font-size: 0.9rem;
}

.points-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 0.8rem;
  color: var(--text-light);
}

.daily-info, .cost-info {
  display: flex;
  gap: 4px;
}

.daily-value, .cost-value {
  color: var(--text-color);
  font-weight: 500;
}

.points-actions {
  flex-shrink: 0;
}

.recharge-btn {
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--success-color) 100%);
  border: none;
}

.btn-icon {
  margin-right: 4px;
}

/* 紧凑模式样式 */
.points-display.compact {
  margin-bottom: 0;
  padding: 0;
  background: transparent;
  border: none;
}

.points-compact {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 20px;
  padding: 8px 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
  box-shadow: var(--shadow-md);
}

.points-compact:hover {
  background: var(--bg-secondary);
  border-color: var(--primary-color);
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.compact-main {
  display: flex;
  align-items: center;
  gap: 6px;
}

.compact-main .points-icon {
  font-size: 1rem;
}

.compact-main .points-value {
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--primary-color);
}

.compact-status {
  margin-top: 2px;
  text-align: center;
}

.status-text {
  font-size: 0.7rem;
  color: var(--error-color);
  font-weight: 500;
}

/* 模态框样式 */
.purchase-modal,
.payment-modal,
.details-modal {
  background: var(--bg-card);
  border-radius: 16px;
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  border-bottom: 1px solid var(--border-color);
}

.modal-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  color: var(--text-color);
  font-size: 1.1rem;
  font-weight: 600;
}

.title-icon {
  font-size: 1.2rem;
}

.close-btn {
  color: var(--text-light);
  font-size: 1.2rem;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: var(--transition);
}

.close-btn:hover {
  background: var(--bg-hover);
  color: var(--text-color);
}

.modal-content {
  padding: 20px;
}

/* 体验卡信息 */
.card-info {
  margin-bottom: 24px;
}

.card-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: var(--bg-secondary);
  border-radius: 12px;
  border: 2px solid var(--primary-color);
}

.card-icon {
  font-size: 1.5rem;
}

.card-details {
  flex: 1;
}

.card-title {
  color: var(--text-color);
  font-weight: 600;
  margin-bottom: 4px;
}

.card-desc {
  color: var(--text-light);
  font-size: 0.9rem;
}

.card-price {
  color: var(--primary-color);
  font-size: 1.2rem;
  font-weight: 600;
}

/* 支付方式 */
.payment-section {
  margin-bottom: 24px;
}

.payment-title {
  color: var(--text-color);
  margin: 0 0 12px 0;
  font-size: 1rem;
  font-weight: 600;
}

.payment-methods {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.payment-method {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: var(--bg-secondary);
  border: 2px solid var(--border-color);
  border-radius: 8px;
  cursor: pointer;
  transition: var(--transition);
}

.payment-method.active {
  border-color: var(--primary-color);
  background: rgba(var(--primary-color-rgb), 0.1);
}

.payment-icon {
  font-size: 1.2rem;
}

.payment-name {
  color: var(--text-color);
  font-weight: 500;
}

/* 二维码区域 */
.qr-section {
  margin-bottom: 20px;
}

.qr-code {
  display: flex;
  justify-content: center;
  margin-bottom: 16px;
}

.qr-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 200px;
  height: 200px;
  background: var(--bg-secondary);
  border: 2px dashed var(--border-color);
  border-radius: 12px;
  text-align: center;
}

.qr-icon {
  font-size: 3rem;
  margin-bottom: 12px;
}

.qr-text {
  color: var(--text-light);
  font-size: 0.9rem;
  line-height: 1.4;
}

.qr-amount {
  color: var(--primary-color);
  font-size: 1.2rem;
  font-weight: 600;
  margin-top: 8px;
}

/* 支付信息 */
.payment-info {
  margin-bottom: 20px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid var(--border-color);
}

.info-item:last-child {
  border-bottom: none;
}

.info-label {
  color: var(--text-light);
}

.info-value {
  color: var(--text-color);
  font-weight: 500;
}

/* 支付状态 */
.payment-status {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  background: var(--bg-secondary);
  border-radius: 8px;
  margin-bottom: 20px;
}

.status-text {
  color: var(--text-light);
  font-size: 0.9rem;
}

/* 状态概览 */
.status-overview {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.status-item {
  text-align: center;
  padding: 16px;
  background: var(--bg-secondary);
  border-radius: 12px;
}

.status-value {
  color: var(--primary-color);
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 4px;
}

.status-label {
  color: var(--text-light);
  font-size: 0.8rem;
}

/* 规则说明 */
.rules-section {
  margin-bottom: 24px;
}

.rules-title {
  color: var(--text-color);
  margin: 0 0 12px 0;
  font-size: 1rem;
  font-weight: 600;
}

.rules-list {
  margin: 0;
  padding-left: 16px;
  color: var(--text-light);
  font-size: 0.9rem;
  line-height: 1.6;
}

.rules-list li {
  margin-bottom: 8px;
}

/* 购买历史 */
.purchase-history {
  margin-bottom: 24px;
}

.history-title {
  color: var(--text-color);
  margin: 0 0 12px 0;
  font-size: 1rem;
  font-weight: 600;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: var(--bg-secondary);
  border-radius: 8px;
}

.history-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.history-type {
  color: var(--text-color);
  font-weight: 500;
  font-size: 0.9rem;
}

.history-date {
  color: var(--text-light);
  font-size: 0.8rem;
}

.history-points {
  color: var(--success-color);
  font-weight: 600;
}

.modal-actions {
  display: flex;
  gap: 12px;
}

.modal-actions .van-button {
  flex: 1;
}

@media (max-width: 768px) {
  .points-display {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }

  .points-info {
    justify-content: center;
  }

  .points-actions {
    text-align: center;
  }

  .status-overview {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .payment-methods {
    grid-template-columns: 1fr;
  }

  .modal-actions {
    flex-direction: column;
  }
}
</style>
