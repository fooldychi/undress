<template>
  <van-button
    :type="type"
    :size="size"
    :round="round"
    :block="block"
    :loading="loading"
    :disabled="disabled"
    :color="color"
    :icon="icon"
    class="mobile-action-button"
    :class="buttonClass"
    @click="$emit('click', $event)"
  >
    <!-- 自定义图标插槽 -->
    <template v-if="$slots.icon" #icon>
      <slot name="icon" />
    </template>

    <!-- 按钮文本 -->
    <slot />
  </van-button>
</template>

<script setup>
import { computed } from 'vue'

// Props
const props = defineProps({
  type: {
    type: String,
    default: 'primary',
    validator: (value) => ['primary', 'success', 'warning', 'danger', 'default'].includes(value)
  },
  size: {
    type: String,
    default: 'large',
    validator: (value) => ['large', 'normal', 'small', 'mini'].includes(value)
  },
  round: {
    type: Boolean,
    default: true
  },
  block: {
    type: Boolean,
    default: false
  },
  loading: {
    type: Boolean,
    default: false
  },
  disabled: {
    type: Boolean,
    default: false
  },
  color: {
    type: String,
    default: ''
  },
  icon: {
    type: String,
    default: ''
  },
  variant: {
    type: String,
    default: 'default',
    validator: (value) => ['default', 'floating', 'ghost'].includes(value)
  }
})

// Events
defineEmits(['click'])

// Computed
const buttonClass = computed(() => {
  return {
    [`mobile-action-button--${props.variant}`]: props.variant !== 'default'
  }
})
</script>

<style scoped>
.mobile-action-button {
  min-height: 48px;
  font-weight: 700;
  font-size: 16px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 12px;
  position: relative;
  overflow: hidden;
}

/* 添加按钮光泽效果 */
.mobile-action-button::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  transition: left 0.5s ease;
}

.mobile-action-button:hover::before {
  left: 100%;
}

/* 浮动按钮样式 */
.mobile-action-button--floating {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  box-shadow:
    0 8px 24px rgba(102, 126, 234, 0.4),
    0 4px 12px rgba(118, 75, 162, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
  transform: translateY(0);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.mobile-action-button--floating:hover {
  transform: translateY(-2px);
  box-shadow:
    0 12px 32px rgba(102, 126, 234, 0.5),
    0 6px 16px rgba(118, 75, 162, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.4);
}

.mobile-action-button--floating:active {
  transform: translateY(0);
  box-shadow:
    0 4px 16px rgba(102, 126, 234, 0.3),
    0 2px 8px rgba(118, 75, 162, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
}

/* 幽灵按钮样式 */
.mobile-action-button--ghost {
  background: rgba(255, 255, 255, 0.05) !important; /* Reduced from 0.1 */
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 2px solid rgba(255, 255, 255, 0.2); /* Reduced from 0.3 */
  color: rgba(255, 255, 255, 0.9);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.mobile-action-button--ghost:hover {
  background: rgba(255, 255, 255, 0.1) !important; /* Reduced from 0.2 */
  border-color: rgba(255, 255, 255, 0.3); /* Reduced from 0.5 */
  transform: translateY(-1px);
}

.mobile-action-button--ghost:active {
  background: rgba(255, 255, 255, 0.15) !important; /* Reduced from 0.3 */
  transform: translateY(0);
}

/* 移动端优化 */
@media (max-width: 768px) {
  .mobile-action-button {
    min-height: 44px;
    font-size: 15px;
  }
}

/* 深色主题适配 */
@media (prefers-color-scheme: dark) {
  .mobile-action-button--floating {
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    box-shadow:
      0 8px 24px rgba(79, 172, 254, 0.3),
      0 4px 12px rgba(168, 85, 247, 0.2),
      inset 0 1px 0 rgba(255, 255, 255, 0.1);
  }

  .mobile-action-button--floating:hover {
    box-shadow:
      0 12px 32px rgba(79, 172, 254, 0.4),
      0 6px 16px rgba(168, 85, 247, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.2);
  }

  .mobile-action-button--ghost {
    background: rgba(0, 0, 0, 0.2) !important; /* Reduced from 0.3 */
    border-color: rgba(255, 255, 255, 0.1); /* Reduced from 0.2 */
  }

  .mobile-action-button--ghost:hover {
    background: rgba(0, 0, 0, 0.25) !important; /* Reduced from 0.4 */
    border-color: rgba(255, 255, 255, 0.15); /* Reduced from 0.3 */
  }
}

/* 减少动画在低性能设备上的影响 */
@media (prefers-reduced-motion: reduce) {
  .mobile-action-button {
    transition: none;
  }

  .mobile-action-button::before {
    display: none;
  }

  .mobile-action-button:hover {
    transform: none;
  }
}
</style>

