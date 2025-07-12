<template>
  <Teleport to="body">
    <Transition name="toast" appear>
      <div v-if="visible" :class="toastClasses" @click="handleClick">
        <div class="toast-content">
          <div class="toast-icon" v-if="showIcon">
            <span>{{ iconMap[type] }}</span>
          </div>
          <div class="toast-message">
            <div v-if="title" class="toast-title">{{ title }}</div>
            <div class="toast-text">{{ message }}</div>
          </div>
          <button 
            v-if="closable" 
            @click.stop="close" 
            class="toast-close"
            aria-label="关闭"
          >
            ×
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  type: {
    type: String,
    default: 'info',
    validator: (value) => ['success', 'error', 'warning', 'info'].includes(value)
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
  showIcon: {
    type: Boolean,
    default: true
  },
  position: {
    type: String,
    default: 'top-right',
    validator: (value) => ['top-right', 'top-left', 'bottom-right', 'bottom-left', 'top-center', 'bottom-center'].includes(value)
  }
})

const emit = defineEmits(['close', 'click'])

const iconMap = {
  success: '✅',
  error: '❌',
  warning: '⚠️',
  info: 'ℹ️'
}

const toastClasses = computed(() => [
  'app-toast',
  `app-toast--${props.type}`,
  `app-toast--${props.position}`
])

let timer = null

const close = () => {
  emit('close')
}

const handleClick = () => {
  emit('click')
}

const startTimer = () => {
  if (props.duration > 0) {
    timer = setTimeout(() => {
      close()
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

// 鼠标悬停时暂停计时器
const handleMouseEnter = () => {
  clearTimer()
}

const handleMouseLeave = () => {
  startTimer()
}
</script>

<style scoped>
.app-toast {
  position: fixed;
  z-index: 1000;
  min-width: 300px;
  max-width: 500px;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(10px);
  cursor: pointer;
  user-select: none;
}

/* 位置变体 */
.app-toast--top-right {
  top: 20px;
  right: 20px;
}

.app-toast--top-left {
  top: 20px;
  left: 20px;
}

.app-toast--bottom-right {
  bottom: 20px;
  right: 20px;
}

.app-toast--bottom-left {
  bottom: 20px;
  left: 20px;
}

.app-toast--top-center {
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
}

.app-toast--bottom-center {
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
}

/* 类型变体 */
.app-toast--success {
  background: rgba(40, 167, 69, 0.9);
  border-left: 4px solid #28a745;
}

.app-toast--error {
  background: rgba(220, 53, 69, 0.9);
  border-left: 4px solid #dc3545;
}

.app-toast--warning {
  background: rgba(255, 193, 7, 0.9);
  border-left: 4px solid #ffc107;
  color: #212529;
}

.app-toast--info {
  background: rgba(23, 162, 184, 0.9);
  border-left: 4px solid #17a2b8;
}

.toast-content {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px 20px;
  color: white;
}

.app-toast--warning .toast-content {
  color: #212529;
}

.toast-icon {
  flex-shrink: 0;
  font-size: 1.2rem;
  margin-top: 2px;
}

.toast-message {
  flex: 1;
  min-width: 0;
}

.toast-title {
  font-weight: 600;
  margin-bottom: 4px;
  font-size: 1rem;
}

.toast-text {
  font-weight: 500;
  line-height: 1.4;
  word-wrap: break-word;
}

.toast-close {
  flex-shrink: 0;
  background: none;
  border: none;
  color: inherit;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  opacity: 0.8;
  transition: all 0.2s ease;
  margin-top: -2px;
}

.toast-close:hover {
  opacity: 1;
  background: rgba(255, 255, 255, 0.2);
}

.app-toast--warning .toast-close:hover {
  background: rgba(0, 0, 0, 0.1);
}

/* 动画 */
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

.app-toast--top-left .toast-enter-from,
.app-toast--bottom-left .toast-enter-from {
  transform: translateX(-100%);
}

.app-toast--top-left .toast-leave-to,
.app-toast--bottom-left .toast-leave-to {
  transform: translateX(-100%);
}

.app-toast--top-center .toast-enter-from,
.app-toast--bottom-center .toast-enter-from {
  transform: translateX(-50%) translateY(-100%);
}

.app-toast--top-center .toast-leave-to,
.app-toast--bottom-center .toast-leave-to {
  transform: translateX(-50%) translateY(-100%);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .app-toast {
    min-width: 280px;
    max-width: calc(100vw - 20px);
    left: 10px !important;
    right: 10px !important;
    transform: none !important;
  }
  
  .app-toast--top-center,
  .app-toast--bottom-center {
    left: 10px !important;
    transform: none !important;
  }
  
  .toast-content {
    padding: 12px 16px;
  }
  
  .toast-title {
    font-size: 0.9rem;
  }
  
  .toast-text {
    font-size: 0.85rem;
  }
}
</style>
