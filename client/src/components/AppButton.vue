<template>
  <van-button
    :type="buttonType"
    :size="size"
    :round="round"
    :block="block"
    :disabled="disabled"
    :loading="loading"
    :icon="icon"
    :plain="plain"
    :square="square"
    :color="customColor"
    :class="['app-button', customClass]"
    @click="handleClick"
  >
    <slot />
  </van-button>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  type: {
    type: String,
    default: 'primary',
    validator: (value) => ['primary', 'success', 'warning', 'danger', 'default'].includes(value)
  },
  size: {
    type: String,
    default: 'normal',
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
  disabled: {
    type: Boolean,
    default: false
  },
  loading: {
    type: Boolean,
    default: false
  },
  icon: {
    type: String,
    default: ''
  },
  plain: {
    type: Boolean,
    default: false
  },
  square: {
    type: Boolean,
    default: false
  },
  color: {
    type: String,
    default: ''
  },
  customClass: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['click'])

const buttonType = computed(() => props.type)
const customColor = computed(() => props.color)

const handleClick = (event) => {
  if (!props.disabled && !props.loading) {
    emit('click', event)
  }
}
</script>

<style scoped>
.app-button {
  font-weight: 600;
  transition: var(--transition);
  box-shadow: var(--shadow-sm);
}

.app-button:hover:not(.van-button--disabled) {
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.app-button:active:not(.van-button--disabled) {
  transform: translateY(0);
}

.app-button.van-button--primary {
  background: linear-gradient(135deg, var(--primary-color), var(--primary-light));
  border: none;
}

.app-button.van-button--success {
  background: linear-gradient(135deg, var(--success-color), #34d399);
  border: none;
}

.app-button.van-button--warning {
  background: linear-gradient(135deg, var(--warning-color), #fbbf24);
  border: none;
}

.app-button.van-button--danger {
  background: linear-gradient(135deg, var(--error-color), #f87171);
  border: none;
}

.app-button.van-button--default {
  background: var(--bg-dark-light);
  border: 1px solid var(--border-color);
  color: var(--text-color);
}

.app-button.van-button--default:hover:not(.van-button--disabled) {
  background: var(--border-color);
  border-color: var(--border-light);
}
</style>
