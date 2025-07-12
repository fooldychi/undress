<template>
  <div class="app-progress-container">
    <div v-if="showStatus" class="progress-status">
      <div class="status-text">{{ statusText }}</div>
      <div v-if="showPercentage" class="status-percentage">{{ Math.round(percentage) }}%</div>
    </div>
    
    <div class="progress-bar" :class="{ 'progress-bar--animated': animated }">
      <div 
        class="progress-fill" 
        :style="{ width: percentage + '%' }"
        :class="`progress-fill--${variant}`"
      ></div>
    </div>
    
    <div v-if="$slots.extra" class="progress-extra">
      <slot name="extra"></slot>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  percentage: {
    type: Number,
    default: 0,
    validator: (value) => value >= 0 && value <= 100
  },
  statusText: {
    type: String,
    default: ''
  },
  showStatus: {
    type: Boolean,
    default: true
  },
  showPercentage: {
    type: Boolean,
    default: false
  },
  variant: {
    type: String,
    default: 'primary',
    validator: (value) => ['primary', 'success', 'warning', 'error'].includes(value)
  },
  animated: {
    type: Boolean,
    default: true
  },
  size: {
    type: String,
    default: 'medium',
    validator: (value) => ['small', 'medium', 'large'].includes(value)
  }
})
</script>

<style scoped>
.app-progress-container {
  width: 100%;
}

.progress-status {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.status-text {
  color: white;
  font-weight: 500;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  flex: 1;
}

.status-percentage {
  color: white;
  font-weight: 600;
  font-size: 0.9rem;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 4px;
  overflow: hidden;
  position: relative;
}

.progress-bar--animated {
  transition: all 0.3s ease;
}

.progress-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s ease;
  position: relative;
}

/* 进度条变体 */
.progress-fill--primary {
  background: linear-gradient(90deg, var(--primary-color), #4ecdc4);
}

.progress-fill--success {
  background: linear-gradient(90deg, #28a745, #20c997);
}

.progress-fill--warning {
  background: linear-gradient(90deg, #ffc107, #fd7e14);
}

.progress-fill--error {
  background: linear-gradient(90deg, #dc3545, #e83e8c);
}

/* 动画效果 */
.progress-fill--primary::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  animation: shimmer 2s infinite;
}

.progress-extra {
  margin-top: 8px;
  text-align: center;
}

@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

/* 尺寸变体 */
.progress-bar--small {
  height: 6px;
}

.progress-bar--medium {
  height: 8px;
}

.progress-bar--large {
  height: 12px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .progress-status {
    margin-bottom: 8px;
  }
  
  .status-text {
    font-size: 0.9rem;
  }
  
  .status-percentage {
    font-size: 0.8rem;
  }
}
</style>
