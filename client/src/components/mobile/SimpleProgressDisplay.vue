<template>
  <div v-if="visible" class="simple-progress-display">
    <div class="progress-content">
      <!-- 状态图标 -->
      <div class="progress-icon">
        <van-loading
          v-if="status === 'loading'"
          size="16"
          color="rgba(255, 255, 255, 0.9)"
        />
        <van-icon
          v-else
          :name="statusIcon"
          size="16"
          :color="iconColor"
        />
      </div>

      <!-- 状态信息 -->
      <div class="progress-info">
        <div class="progress-title">{{ displayTitle }}</div>
        <div class="progress-description">{{ displayDescription }}</div>
      </div>

    </div>

    <!-- 进度条和进度数据 -->
    <div v-if="showProgress" class="progress-section">
      <van-progress
        :percentage="isWorkflowProgress ? progress : 100"
        :show-pivot="false"
        color="linear-gradient(90deg, #6366f1, #818cf8)"
        track-color="rgba(255, 255, 255, 0.15)"
        stroke-width="4"
        :class="{ 'progress-animation': !isWorkflowProgress }"
      />
      <!-- 进度数据显示在进度条下方 -->
      <div v-if="isWorkflowProgress" class="progress-data">
        {{ progressDataText }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, watch, onMounted, onUnmounted } from 'vue'

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
    default: ''
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
    default: true
  }
})

// Computed
const isWorkflowProgress = computed(() => {
  // 判断是否是工作流进度（包含百分比和节点信息的格式）
  return props.description && props.description.includes('（') && props.description.includes('）')
})

// 显示标题逻辑
const displayTitle = computed(() => {
  // 如果有自定义标题，优先使用
  if (props.title) return props.title

  if (!props.description) return '处理中...'

  // 如果是工作流进度阶段，显示"图片处理中..."
  if (isWorkflowProgress.value) {
    return '图片处理中...'
  }

  // 非工作流阶段，从描述中提取阶段信息作为标题
  // 移除警告信息，只保留主要状态
  const cleanTitle = props.description.replace(/⚠️.*$/, '').trim()

  // 如果提取到的标题是有效的阶段信息，直接使用
  if (cleanTitle && cleanTitle !== props.description) {
    return cleanTitle
  }

  // 如果描述就是阶段信息（没有警告文字），直接使用
  if (cleanTitle) {
    return cleanTitle
  }

  return '处理中...'
})

// 显示描述逻辑
const displayDescription = computed(() => {
  // 始终显示警告信息
  return '⚠️请不要离开当前页面，等待处理完成后可自行下载'
})

// 提取进度数据文本，格式为 "5%(4/73)"
const progressDataText = computed(() => {
  if (!isWorkflowProgress.value || !props.description) return ''

  // 匹配格式如 "67%（49/73）" - 使用中文括号
  const match = props.description.match(/^(\d+%（[^）]+）)/)
  if (match && match[1]) {
    // 转换为英文括号格式 "5%(4/73)"
    return match[1].replace(/（/g, '(').replace(/）/g, ')')
  }

  // 如果没有匹配到，返回空字符串
  return ''
})

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

const iconColor = computed(() => {
  const colorMap = {
    loading: 'rgba(255, 255, 255, 0.9)',
    success: 'rgba(255, 255, 255, 0.9)',
    error: 'rgba(255, 255, 255, 0.9)',
    warning: 'rgba(255, 255, 255, 0.9)',
    info: 'rgba(255, 255, 255, 0.9)'
  }
  return colorMap[props.status] || 'rgba(255, 255, 255, 0.9)'
})

// 监听visible变化，调整页面布局
watch(() => props.visible, (visible) => {
  if (visible) {
    document.body.classList.add('has-progress-display')
  } else {
    document.body.classList.remove('has-progress-display')
  }
}, { immediate: true })

// 组件卸载时清理
onUnmounted(() => {
  document.body.classList.remove('has-progress-display')
})
</script>

<style scoped>
.simple-progress-display {
  position: fixed;
  bottom: 16px;
  left: 16px;
  right: 16px;
  z-index: 9999;
  /* 毛玻璃效果 - 与页面风格一致 */
  background: rgba(15, 15, 30, 0.6);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(30, 30, 60, 0.3);
  border-radius: 16px;
  color: rgba(255, 255, 255, 0.95);
  padding: 16px;
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.2),
    0 4px 16px rgba(0, 0, 0, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
  animation: slideUp 0.3s ease-out;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.progress-content {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.progress-icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
}

.progress-info {
  flex: 1;
  min-width: 0;
}

.progress-title {
  font-weight: 600;
  font-size: 15px;
  color: rgba(255, 255, 255, 0.95);
  margin-bottom: 4px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.progress-description {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.8);
  line-height: 1.4;
  word-break: break-word;
}

.progress-section {
  margin-top: 12px;
}

.progress-data {
  text-align: center;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  margin-top: 6px;
  font-weight: 500;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
}

/* 进度条动画 */
.progress-animation :deep(.van-progress__portion) {
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

@keyframes slideUp {
  from {
    transform: translateY(100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

/* 确保页面内容不被遮挡 */
:global(body.has-progress-display) {
  padding-bottom: 100px !important;
}

/* 响应式设计 */
@media (max-width: 480px) {
  .simple-progress-display {
    padding: 14px;
    margin: 0 12px 12px 12px;
  }

  .progress-content {
    gap: 10px;
    margin-bottom: 10px;
  }

  .progress-icon {
    width: 18px;
    height: 18px;
  }

  .progress-title {
    font-size: 14px;
  }

  .progress-description {
    font-size: 12px;
  }

  .progress-data {
    font-size: 11px;
  }

  .progress-section {
    margin-top: 10px;
  }
}


</style>
