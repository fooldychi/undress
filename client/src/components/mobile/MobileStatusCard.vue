<template>
  <MobileCard :inset="inset" class="mobile-status-card">
    <div class="status-content">
      <!-- 状态图标 -->
      <div class="status-icon" :class="`status-icon--${status}`">
        <van-icon
          v-if="!$slots.icon"
          :name="statusIcon"
          :size="iconSize"
        />
        <slot v-else name="icon" />
      </div>

      <!-- 状态信息 -->
      <div class="status-info">
        <div class="status-title">{{ title }}</div>
        <div v-if="description" class="status-description">{{ description }}</div>

        <!-- 进度条（加载状态时显示） -->
        <div v-if="status === 'loading' && showProgress" class="status-progress">
          <van-progress
            :percentage="progress"
            :show-pivot="false"
            color="var(--van-primary-color, #1989fa)"
            track-color="var(--van-border-color, #ebedf0)"
          />
          <div class="progress-text">{{ progress }}%</div>
        </div>

        <!-- 额外信息 -->
        <div v-if="$slots.extra" class="status-extra">
          <slot name="extra" />
        </div>
      </div>

      <!-- 操作按钮 -->
      <div v-if="$slots.action" class="status-action">
        <slot name="action" />
      </div>
    </div>
  </MobileCard>
</template>

<script setup>
import { computed } from 'vue'
import MobileCard from './MobileCard.vue'

// Props
const props = defineProps({
  status: {
    type: String,
    default: 'default',
    validator: (value) => ['default', 'loading', 'success', 'error', 'warning', 'info'].includes(value)
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  progress: {
    type: Number,
    default: 0,
    validator: (value) => value >= 0 && value <= 100
  },
  showProgress: {
    type: Boolean,
    default: true
  },
  iconSize: {
    type: [String, Number],
    default: 24
  },
  inset: {
    type: Boolean,
    default: true
  }
})

// Computed
const statusIcon = computed(() => {
  const iconMap = {
    default: 'info-o',
    loading: 'loading',
    success: 'success',
    error: 'close',
    warning: 'warning-o',
    info: 'info-o'
  }
  return iconMap[props.status] || 'info-o'
})
</script>

<style scoped>
.mobile-status-card {
  margin-bottom: 16px;
}

.status-content {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.status-icon {
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 2px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 2px solid rgba(255, 255, 255, 0.3);
}

.status-icon--default {
  background: rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.8);
}

.status-icon--loading {
  background: linear-gradient(135deg, rgba(25, 137, 250, 0.3), rgba(25, 137, 250, 0.1));
  color: #1989fa;
  animation: pulse 2s ease-in-out infinite;
}

.status-icon--success {
  background: linear-gradient(135deg, rgba(7, 193, 96, 0.3), rgba(7, 193, 96, 0.1));
  color: #07c160;
}

.status-icon--error {
  background: linear-gradient(135deg, rgba(238, 10, 36, 0.3), rgba(238, 10, 36, 0.1));
  color: #ee0a24;
}

.status-icon--warning {
  background: linear-gradient(135deg, rgba(255, 151, 106, 0.3), rgba(255, 151, 106, 0.1));
  color: #ff976a;
}

.status-icon--info {
  background: linear-gradient(135deg, rgba(25, 137, 250, 0.3), rgba(25, 137, 250, 0.1));
  color: #1989fa;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

.status-info {
  flex: 1;
  min-width: 0;
}

.status-title {
  font-size: 17px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.95);
  margin-bottom: 6px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.status-description {
  font-size: 15px;
  color: rgba(255, 255, 255, 0.8);
  line-height: 1.5;
  margin-bottom: 12px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.status-progress {
  margin-top: 8px;
}

.progress-text {
  font-size: 12px;
  color: var(--van-text-color-3, #969799);
  text-align: right;
  margin-top: 4px;
}

.status-extra {
  margin-top: 8px;
}

.status-action {
  flex-shrink: 0;
  margin-left: 8px;
}

/* 移动端优化 */
@media (max-width: 768px) {
  .status-icon {
    width: 36px;
    height: 36px;
  }

  .status-title {
    font-size: 15px;
  }

  .status-description {
    font-size: 13px;
  }
}

/* 深色主题适配 */
@media (prefers-color-scheme: dark) {
  .status-icon--default {
    background: var(--van-gray-7, #323233);
    color: var(--van-text-color-2, #969799);
  }

  .status-icon--loading {
    background: rgba(25, 137, 250, 0.2);
  }

  .status-icon--success {
    background: rgba(7, 193, 96, 0.2);
  }

  .status-icon--error {
    background: rgba(238, 10, 36, 0.2);
  }

  .status-icon--warning {
    background: rgba(255, 151, 106, 0.2);
  }

  .status-icon--info {
    background: rgba(25, 137, 250, 0.2);
  }
}
</style>
