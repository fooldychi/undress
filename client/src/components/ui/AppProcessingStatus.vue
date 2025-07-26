<template>
  <div class="app-processing-status" :class="containerClasses">
    <AppProgressBar
      :status-text="statusText"
      :show-status="showStatus"
      :variant="variant"
      :animated="animated"
    >
      <template #extra>
        <slot name="extra">
        </slot>
      </template>
    </AppProgressBar>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import AppProgressBar from './AppProgressBar.vue'

const props = defineProps({
  percentage: {
    type: Number,
    default: 0
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
    default: 'primary'
  },
  animated: {
    type: Boolean,
    default: true
  },

  centered: {
    type: Boolean,
    default: true
  },
  compact: {
    type: Boolean,
    default: false
  }
})

const containerClasses = computed(() => ({
  'app-processing-status--centered': props.centered,
  'app-processing-status--compact': props.compact
}))
</script>

<style scoped>
.app-processing-status {
  width: 100%;
}

.app-processing-status--centered {
  text-align: center;
  margin-top: 20px;
}

.app-processing-status--compact {
  margin-top: 12px;
}

.prompt-id,
.processing-time {
  margin-top: 8px;
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.9rem;
}

.prompt-id small,
.processing-time small {
  color: inherit;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .app-processing-status--centered {
    margin-top: 16px;
  }

  .prompt-id,
  .processing-time {
    font-size: 0.8rem;
  }
}
</style>
