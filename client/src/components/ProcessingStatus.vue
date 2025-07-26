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
      v-if="showProgress && isLoading"
      :percentage="isWorkflowProgress ? progress : 100"
      :show-pivot="false"
      color="var(--primary-color)"
      track-color="var(--bg-dark-light)"
      :class="['progress-bar', { 'progress-animation': !isWorkflowProgress }]"
    />


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

})

const isLoading = computed(() => props.status === 'loading')
const isSuccess = computed(() => props.status === 'success')
const isError = computed(() => props.status === 'error')

const isWorkflowProgress = computed(() => {
  // 判断是否是工作流进度（包含百分比和节点信息的格式）
  return props.description && props.description.includes('（') && props.description.includes('）')
})
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

.progress-animation {
  animation: progressPulse 2s ease-in-out infinite;
}

@keyframes progressPulse {
  0%, 100% {
    opacity: 0.8;
  }
  50% {
    opacity: 1;
  }
}



@media (max-width: 768px) {
  .processing-status {
    padding: 16px;
  }

  .status-content {
    gap: 12px;
  }


}
</style>
