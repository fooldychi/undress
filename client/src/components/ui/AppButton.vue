<template>
  <button
    :class="buttonClasses"
    :disabled="disabled || loading"
    @click="handleClick"
  >
    <span v-if="loading" class="loading-spinner"></span>
    <span :class="{ 'loading-text': loading }">
      <slot>{{ text }}</slot>
    </span>
  </button>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  variant: {
    type: String,
    default: 'primary',
    validator: (value) => ['primary', 'secondary', 'outline', 'success'].includes(value)
  },
  size: {
    type: String,
    default: 'medium',
    validator: (value) => ['small', 'medium', 'large'].includes(value)
  },
  disabled: {
    type: Boolean,
    default: false
  },
  loading: {
    type: Boolean,
    default: false
  },
  text: {
    type: String,
    default: ''
  },
  fullWidth: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['click'])

const buttonClasses = computed(() => [
  'app-button',
  `app-button--${props.variant}`,
  `app-button--${props.size}`,
  {
    'app-button--disabled': props.disabled,
    'app-button--loading': props.loading,
    'app-button--full-width': props.fullWidth
  }
])

const handleClick = (event) => {
  if (!props.disabled && !props.loading) {
    emit('click', event)
  }
}
</script>

<style scoped>
.app-button {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: none;
  border-radius: var(--border-radius);
  font-weight: 600;
  cursor: pointer;
  transition: var(--transition);
  text-decoration: none;
  text-align: center;
  white-space: nowrap;
  user-select: none;
  outline: none;
}

/* 尺寸变体 */
.app-button--small {
  padding: 8px 16px;
  font-size: 14px;
}

.app-button--medium {
  padding: 12px 24px;
  font-size: 16px;
}

.app-button--large {
  padding: 16px 32px;
  font-size: 18px;
}

/* 颜色变体 */
.app-button--primary {
  background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
  color: white;
}

.app-button--primary:hover:not(.app-button--disabled):not(.app-button--loading) {
  transform: translateY(-2px);
  box-shadow: var(--shadow-hover);
}

.app-button--secondary {
  background: #6c757d;
  color: white;
}

.app-button--secondary:hover:not(.app-button--disabled):not(.app-button--loading) {
  background: #5a6268;
  transform: translateY(-2px);
}

.app-button--success {
  background: #28a745;
  color: white;
}

.app-button--success:hover:not(.app-button--disabled):not(.app-button--loading) {
  background: #218838;
  transform: translateY(-2px);
}

.app-button--outline {
  background: transparent;
  border: 2px solid rgba(255, 255, 255, 0.3);
  color: white;
}

.app-button--outline:hover:not(.app-button--disabled):not(.app-button--loading) {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.5);
  transform: translateY(-2px);
}

.app-button--success:hover:not(.app-button--disabled):not(.app-button--loading) {
  background: #218838;
  transform: translateY(-2px);
}

.app-button--outline {
  background: transparent;
  border: 2px solid rgba(255, 255, 255, 0.3);
  color: white;
}

.app-button--outline:hover:not(.app-button--disabled):not(.app-button--loading) {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.5);
}

/* 状态变体 */
.app-button--disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none !important;
}

.app-button--loading {
  cursor: wait;
}

.app-button--full-width {
  width: 100%;
}

/* 加载状态 */
.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.loading-text {
  opacity: 0.7;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .app-button--large {
    padding: 14px 28px;
    font-size: 16px;
  }

  .app-button--medium {
    padding: 10px 20px;
    font-size: 14px;
  }
}
</style>
