<template>
  <van-overlay
    :show="visible"
    :z-index="9999"
    :lock-scroll="true"
    class="global-error-overlay"
  >
    <div class="global-error-modal">
      <div class="error-icon">
        <van-icon name="warning-o" size="60" color="#ff4444" />
      </div>

      <div class="error-content">
        <h3 class="error-title">{{ title }}</h3>
        <p class="error-message">{{ message }}</p>
      </div>

      <div class="error-actions">
        <van-button
          type="primary"
          size="large"
          block
          @click="handleRefresh"
          :loading="refreshing"
        >
          {{ refreshing ? '正在刷新...' : '刷新页面' }}
        </van-button>
      </div>
    </div>
  </van-overlay>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: '服务器不可用'
  },
  message: {
    type: String,
    default: '目前服务器不可用，请刷新页面或稍后再试！'
  }
})

const emit = defineEmits(['close'])

const refreshing = ref(false)

// 刷新页面
const handleRefresh = () => {
  refreshing.value = true
  setTimeout(() => {
    window.location.reload()
  }, 500)
}


</script>

<style scoped>
.global-error-overlay {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.global-error-modal {
  background: var(--van-background-2);
  border-radius: 16px;
  padding: 32px 24px;
  max-width: 400px;
  width: 100%;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  border: 1px solid var(--van-border-color);
  text-align: center;
}

.error-icon {
  margin-bottom: 24px;
}

.error-content {
  margin-bottom: 32px;
}

.error-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--van-text-color);
  margin: 0 0 12px 0;
}

.error-message {
  font-size: 16px;
  color: var(--van-text-color-2);
  line-height: 1.5;
  margin: 0 0 16px 0;
}



.error-actions {
  display: flex;
  flex-direction: column;
  gap: 0;
}

/* 暗黑主题适配 */
@media (prefers-color-scheme: dark) {
  .global-error-modal {
    background: var(--van-gray-8);
    border-color: var(--van-gray-6);
  }


}
</style>
