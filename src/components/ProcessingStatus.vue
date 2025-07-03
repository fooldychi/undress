<template>
  <div class="processing-status">
    <div class="status-content">
      <div v-if="isLoading" class="status-icon loading-container">
        <van-loading size="24" color="var(--primary-color)" />
      </div>
      <CheckCircle v-else-if="isSuccess" :size="24" color="var(--success-color)" class="status-icon" />
      <XCircle v-else-if="isError" :size="24" color="var(--error-color)" class="status-icon" />

      <div class="status-text">
        <h4 class="status-title">{{ title }}</h4>
        <p v-if="description" class="status-description">{{ description }}</p>
      </div>
    </div>

    <!-- 进度条 -->
    <van-progress
      v-if="showProgress && progress >= 0"
      :percentage="progress"
      :show-pivot="false"
      color="var(--primary-color)"
      track-color="var(--bg-dark-light)"
      class="progress-bar"
    />

    <!-- 处理信息 -->
    <div v-if="showInfo && (promptId || processingTime)" class="process-info">
      <div v-if="promptId" class="info-item">
        <span class="info-label">任务ID:</span>
        <span class="info-value">{{ promptId }}</span>
      </div>
      <div v-if="processingTime" class="info-item">
        <span class="info-label">处理时间:</span>
        <span class="info-value">{{ processingTime }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { CheckCircle, XCircle } from 'lucide-vue-next'

const props = defineProps({
  status: {
    type: String,
    default: 'idle', // idle, loading, success, error
    validator: (value) => ['idle', 'loading', 'success', 'error'].includes(value)
  },
  title: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    default: ''
  },
  progress: {
    type: Number,
    default: -1
  },
  showProgress: {
    type: Boolean,
    default: true
  },
  showInfo: {
    type: Boolean,
    default: true
  },
  promptId: {
    type: String,
    default: ''
  },
  processingTime: {
    type: String,
    default: ''
  }
})

const isLoading = computed(() => props.status === 'loading')
const isSuccess = computed(() => props.status === 'success')
const isError = computed(() => props.status === 'error')
</script>

<style scoped>
.processing-status {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 20px;
  margin: 16px 0;
}

.status-content {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}

.status-icon {
  flex-shrink: 0;
}

.loading-container {
  display: flex;
  align-items: center;
  justify-content: center;
}

.status-text {
  flex: 1;
}

.status-title {
  color: var(--text-color);
  font-size: 16px;
  font-weight: 500;
  margin: 0 0 4px 0;
}

.status-description {
  color: var(--text-light);
  font-size: 14px;
  margin: 0;
  line-height: 1.4;
}

.progress-bar {
  margin-bottom: 16px;
}

.process-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 16px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
}

.info-label {
  color: var(--text-light);
}

.info-value {
  color: var(--text-color);
  font-weight: 500;
  font-family: monospace;
}

@media (max-width: 768px) {
  .processing-status {
    padding: 16px;
  }

  .status-content {
    gap: 12px;
  }

  .info-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
}
</style>
