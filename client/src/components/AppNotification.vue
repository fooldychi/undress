<template>
  <transition name="notification" appear>
    <div v-if="visible" :class="['app-notification', `app-notification--${type}`]">
      <div class="notification-content">
        <van-icon 
          :name="iconName" 
          :size="20" 
          :color="iconColor" 
          class="notification-icon" 
        />
        <div class="notification-text">
          <h4 v-if="title" class="notification-title">{{ title }}</h4>
          <p class="notification-message">{{ message }}</p>
        </div>
        <van-icon 
          v-if="closable"
          name="cross" 
          :size="16" 
          color="var(--text-light)" 
          class="notification-close"
          @click="handleClose"
        />
      </div>
      <div v-if="showProgress" class="notification-progress">
        <div 
          class="progress-bar" 
          :style="{ width: progress + '%', backgroundColor: progressColor }"
        ></div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { computed, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  visible: {
    type: Boolean,
    default: true
  },
  type: {
    type: String,
    default: 'info',
    validator: (value) => ['success', 'error', 'warning', 'info', 'loading'].includes(value)
  },
  title: {
    type: String,
    default: ''
  },
  message: {
    type: String,
    required: true
  },
  duration: {
    type: Number,
    default: 3000
  },
  closable: {
    type: Boolean,
    default: true
  },
  showProgress: {
    type: Boolean,
    default: false
  },
  progress: {
    type: Number,
    default: 0
  }
})

const emit = defineEmits(['close'])

const iconName = computed(() => {
  const iconMap = {
    success: 'success',
    error: 'cross',
    warning: 'warning-o',
    info: 'info-o',
    loading: 'loading'
  }
  return iconMap[props.type] || 'info-o'
})

const iconColor = computed(() => {
  const colorMap = {
    success: 'var(--success-color)',
    error: 'var(--error-color)',
    warning: 'var(--warning-color)',
    info: 'var(--info-color)',
    loading: 'var(--primary-color)'
  }
  return colorMap[props.type] || 'var(--info-color)'
})

const progressColor = computed(() => {
  const colorMap = {
    success: 'var(--success-color)',
    error: 'var(--error-color)',
    warning: 'var(--warning-color)',
    info: 'var(--info-color)',
    loading: 'var(--primary-color)'
  }
  return colorMap[props.type] || 'var(--primary-color)'
})

let timer = null

const handleClose = () => {
  emit('close')
}

const startTimer = () => {
  if (props.duration > 0 && props.type !== 'loading') {
    timer = setTimeout(() => {
      handleClose()
    }, props.duration)
  }
}

const clearTimer = () => {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
}

onMounted(() => {
  startTimer()
})

onUnmounted(() => {
  clearTimer()
})
</script>

<style scoped>
.app-notification {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  box-shadow: var(--shadow-lg);
  margin-bottom: 12px;
  overflow: hidden;
  max-width: 400px;
  min-width: 300px;
}

.app-notification--success {
  border-left: 4px solid var(--success-color);
}

.app-notification--error {
  border-left: 4px solid var(--error-color);
}

.app-notification--warning {
  border-left: 4px solid var(--warning-color);
}

.app-notification--info {
  border-left: 4px solid var(--info-color);
}

.app-notification--loading {
  border-left: 4px solid var(--primary-color);
}

.notification-content {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
}

.notification-icon {
  flex-shrink: 0;
  margin-top: 2px;
}

.notification-text {
  flex: 1;
  min-width: 0;
}

.notification-title {
  color: var(--text-color);
  font-size: 14px;
  font-weight: 600;
  margin: 0 0 4px 0;
  line-height: 1.4;
}

.notification-message {
  color: var(--text-light);
  font-size: 13px;
  margin: 0;
  line-height: 1.4;
  word-wrap: break-word;
}

.notification-close {
  flex-shrink: 0;
  cursor: pointer;
  padding: 2px;
  border-radius: 4px;
  transition: var(--transition);
}

.notification-close:hover {
  background: var(--bg-dark-light);
}

.notification-progress {
  height: 3px;
  background: var(--bg-dark-light);
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  transition: width 0.3s ease;
}

/* 动画效果 */
.notification-enter-active,
.notification-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.notification-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.notification-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

@media (max-width: 768px) {
  .app-notification {
    max-width: calc(100vw - 32px);
    min-width: 280px;
  }
  
  .notification-content {
    padding: 12px;
    gap: 10px;
  }
  
  .notification-title {
    font-size: 13px;
  }
  
  .notification-message {
    font-size: 12px;
  }
}
</style>
