<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="mobile-fixed-status-bar"
      :class="`status-bar--${status}`"
    >
      <div class="status-bar-content">
        <!-- 状态图标 -->
        <div class="status-icon">
          <van-loading
            v-if="status === 'loading'"
            size="16"
            color="currentColor"
          />
          <van-icon
            v-else
            :name="statusIcon"
            size="16"
          />
        </div>

        <!-- 状态信息 -->
        <div class="status-info">
          <div class="status-title">{{ title }}</div>
          <div v-if="description" class="status-description">{{ description }}</div>
        </div>

        <!-- 进度条 -->
        <div v-if="status === 'loading' && showProgress" class="status-progress">
          <van-progress
            :percentage="progress"
            :show-pivot="false"
            color="rgba(255, 255, 255, 0.8)"
            track-color="rgba(255, 255, 255, 0.2)"
            stroke-width="2"
          />
          <span class="progress-text">{{ progress }}%</span>
        </div>

        <!-- 关闭按钮 -->
        <div v-if="closable" class="status-close" @click="$emit('close')">
          <van-icon name="cross" size="14" />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue'

// Props
const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    default: 'loading',
    validator: (value) => ['loading', 'success', 'error', 'warning', 'info'].includes(value)
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
    default: 0
  },
  showProgress: {
    type: Boolean,
    default: false
  },
  closable: {
    type: Boolean,
    default: false
  }
})

// Emits
const emit = defineEmits(['close'])

// Computed
const statusIcon = computed(() => {
  const iconMap = {
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
.mobile-fixed-status-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 9999;
  padding: 12px 16px;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 2px 20px rgba(0, 0, 0, 0.1);
  animation: slideDown 0.3s ease-out;
}

.status-bar--loading {
  background: linear-gradient(135deg,
    rgba(25, 137, 250, 0.9) 0%,
    rgba(25, 137, 250, 0.8) 100%);
  color: white;
}

.status-bar--success {
  background: linear-gradient(135deg,
    rgba(7, 193, 96, 0.9) 0%,
    rgba(7, 193, 96, 0.8) 100%);
  color: white;
}

.status-bar--error {
  background: linear-gradient(135deg,
    rgba(238, 10, 36, 0.9) 0%,
    rgba(238, 10, 36, 0.8) 100%);
  color: white;
}

.status-bar--warning {
  background: linear-gradient(135deg,
    rgba(255, 151, 106, 0.9) 0%,
    rgba(255, 151, 106, 0.8) 100%);
  color: white;
}

.status-bar--info {
  background: linear-gradient(135deg,
    rgba(25, 137, 250, 0.9) 0%,
    rgba(25, 137, 250, 0.8) 100%);
  color: white;
}

.status-bar-content {
  display: flex;
  align-items: center;
  gap: 12px;
  max-width: 100%;
}

.status-icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.status-info {
  flex: 1;
  min-width: 0;
}

.status-title {
  font-size: 14px;
  font-weight: 600;
  line-height: 1.2;
  margin-bottom: 2px;
}

.status-description {
  font-size: 12px;
  opacity: 0.9;
  line-height: 1.3;
}

.status-progress {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 80px;
}

.progress-text {
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
}

.status-close {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: 50%;
  transition: background-color 0.2s;
}

.status-close:hover {
  background-color: rgba(255, 255, 255, 0.2);
}

.status-close:active {
  background-color: rgba(255, 255, 255, 0.3);
}

@keyframes slideDown {
  from {
    transform: translateY(-100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

/* 确保页面内容不被遮挡 */
:global(body.has-fixed-status-bar) {
  padding-top: 70px !important;
}

:global(body.has-fixed-status-bar .mobile-page-container) {
  padding-top: 0 !important;
}

/* 响应式设计 */
@media (max-width: 480px) {
  .mobile-fixed-status-bar {
    padding: 10px 12px;
  }

  .status-bar-content {
    gap: 8px;
  }

  .status-title {
    font-size: 13px;
  }

  .status-description {
    font-size: 11px;
  }

  .status-progress {
    min-width: 60px;
  }

  .progress-text {
    font-size: 11px;
  }
}
</style>
