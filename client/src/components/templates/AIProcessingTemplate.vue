<template>
  <MobilePageContainer
    :title="title"
    @login="$emit('login', $event)"
    @logout="$emit('logout', $event)"
  >
    <!-- 页面头部描述 -->
    <template #header>
      <div class="ai-page-header">
        <div class="page-title">
          <component
            :is="titleIcon"
            v-if="titleIcon"
            :size="24"
            :color="titleIconColor"
          />
          <van-icon
            v-else-if="titleIconName"
            :name="titleIconName"
            :size="24"
            :color="titleIconColor"
          />
          <span>{{ description }}</span>
        </div>
      </div>
    </template>

    <!-- 主要内容 -->
    <div class="input-section">
      <!-- 输入区域插槽 - 始终显示，包含对比组件 -->
      <slot name="inputs" />

      <!-- 处理按钮 - 只在没有结果且可以处理时显示 -->
      <div v-if="!resultData && canProcess && !isProcessing" class="action-section">
        <MobileActionButton
          @click="$emit('process')"
          type="primary"
          block
          variant="floating"
          :icon="typeof processButtonIcon === 'string' ? processButtonIcon : ''"
        >
          <template v-if="$slots['process-button-icon'] || (processButtonIcon && typeof processButtonIcon === 'object')" #icon>
            <slot v-if="$slots['process-button-icon']" name="process-button-icon" />
            <component
              v-else-if="processButtonIcon && typeof processButtonIcon === 'object'"
              :is="processButtonIcon"
              :size="18"
              color="white"
            />
          </template>
          {{ processButtonText }}
        </MobileActionButton>
      </div>

      <!-- 上传提示 - 只在没有结果时显示 -->
      <div v-else-if="!resultData && showUploadTips" class="upload-tips">
        <slot name="upload-tips" />
      </div>
    </div>

    <!-- 处理状态显示 -->
    <SimpleProgressDisplay
      v-if="isProcessing"
      :visible="isProcessing"
      status="loading"
      :description="processingStatusDescription"
      :progress="progress"
      :show-progress="showProgress"
    />

    <!-- 结果展示 - 只显示额外的结果信息，操作按钮始终在底部 -->
    <div v-if="resultData" class="result-section">
      <!-- 额外的结果信息插槽 -->
      <slot name="result" :result="resultData" />
    </div>

    <!-- 结果操作按钮 - 有结果时显示 -->
    <div v-if="resultData" class="result-actions">
      <van-button
        type="primary"
        size="large"
        @click="$emit('download', resultData)"
        :loading="downloadLoading"
        class="result-action-btn"
      >
        下载图片
      </van-button>

      <van-button
        type="default"
        size="large"
        @click="$emit('reset')"
        class="result-action-btn"
      >
        重新选择
      </van-button>
    </div>

    <!-- 底部固定积分消耗提醒 - 用户上传图片前显示，上传图片后隐藏 -->
    <div v-if="shouldShowBottomPointsNotice" class="bottom-points-notice">
      <div class="points-notice-content">
        <span>{{ title }}将消耗 <strong>{{ pointsCost }}</strong> 积分</span>
      </div>
    </div>


  </MobilePageContainer>
</template>

<script setup>
import { computed, watch, onMounted, onUnmounted } from 'vue'
import { MobilePageContainer, MobileActionButton, MobileStatusCard, SimpleProgressDisplay } from '../mobile'

// Props
const props = defineProps({
  // 页面基本信息
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  titleIcon: {
    type: [String, Object],
    default: null
  },
  titleIconName: {
    type: String,
    default: ''
  },
  titleIconColor: {
    type: String,
    default: 'var(--van-primary-color)'
  },

  // 处理状态
  isProcessing: {
    type: Boolean,
    default: false
  },
  canProcess: {
    type: Boolean,
    default: false
  },
  showUploadTips: {
    type: Boolean,
    default: true
  },

  // 处理按钮
  processButtonText: {
    type: String,
    default: '开始处理'
  },
  processButtonIcon: {
    type: [String, Object],
    default: null
  },

  // 处理进度
  progress: {
    type: Number,
    default: 0
  },
  showProgress: {
    type: Boolean,
    default: true
  },
  processingTitle: {
    type: String,
    default: '正在处理...'
  },
  processingDescription: {
    type: String,
    default: ''
  },
  processingInfo: {
    type: Object,
    default: () => ({})
  },

  // 结果数据
  resultData: {
    type: [Object, String],
    default: null
  },

  // 下载状态
  downloadLoading: {
    type: Boolean,
    default: false
  },

  // 积分消耗
  pointsCost: {
    type: Number,
    default: 0
  }
})

// Events
defineEmits(['login', 'logout', 'process', 'download', 'reprocess'])

// Computed
const processingStatusDescription = computed(() => {
  if (!props.isProcessing) return ''

  const baseDescription = props.processingDescription || ''
  const warningText = '⚠️请不要离开当前页面，等待处理完成后可自行下载'

  return baseDescription ? `${baseDescription} ${warningText}` : warningText
})

// 控制底部积分提醒显示时机：用户上传图片前显示，上传图片后隐藏，避免遮挡提交按钮
const shouldShowBottomPointsNotice = computed(() => {
  return props.pointsCost > 0 && // 有积分消耗
         !props.isProcessing && // 未在处理中
         !props.resultData && // 没有结果
         !props.canProcess // 用户还未上传图片（不能处理时才显示）
})

// 页面离开警告
const handleBeforeUnload = (event) => {
  if (props.isProcessing) {
    event.preventDefault()
    event.returnValue = '正在处理中，确定要离开页面吗？处理进度将会丢失。'
    return '正在处理中，确定要离开页面吗？处理进度将会丢失。'
  }
}

// 监听处理状态变化，添加/移除页面离开警告
watch(() => props.isProcessing, (isProcessing) => {
  if (isProcessing) {
    // 添加页面顶部间距
    document.body.classList.add('has-fixed-status-bar')
    // 添加页面离开警告
    window.addEventListener('beforeunload', handleBeforeUnload)
  } else {
    // 移除页面顶部间距
    document.body.classList.remove('has-fixed-status-bar')
    // 移除页面离开警告
    window.removeEventListener('beforeunload', handleBeforeUnload)
  }
})

// 组件挂载时检查处理状态
onMounted(() => {
  if (props.isProcessing) {
    document.body.classList.add('has-fixed-status-bar')
    window.addEventListener('beforeunload', handleBeforeUnload)
  }
})

// 组件卸载时清理
onUnmounted(() => {
  document.body.classList.remove('has-fixed-status-bar')
  window.removeEventListener('beforeunload', handleBeforeUnload)
})
</script>

<style scoped>
/* 页面头部样式 */
.ai-page-header {
  text-align: center;
  padding: 16px 0;
  /* Removing frosted glass effect */
  background: transparent;
  /* backdrop-filter: blur(10px); - Removed */
  /* -webkit-backdrop-filter: blur(10px); - Removed */
  border-radius: 16px;
  /* margin-bottom removed */
}

.page-title {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  font-size: 18px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.95);
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

/* 输入区域样式 */
.input-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}



.action-section {
  position: fixed;
  bottom: 16px;
  left: 16px;
  right: 16px;
  display: flex;
  gap: 12px;
  justify-content: center;
  padding: 16px;
  background: rgba(15, 15, 30, 0.6);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(30, 30, 60, 0.3);
  border-radius: 16px;
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.2),
    0 4px 16px rgba(0, 0, 0, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
  z-index: 1000;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 上传提示样式 */
.upload-tips {
  padding: 20px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-radius: 12px;
  margin-top: 20px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
}

/* 处理信息样式 */
.processing-info {
  margin-top: 16px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
  font-size: 14px;
}

.info-label {
  color: rgba(255, 255, 255, 0.7);
}

.info-value {
  color: rgba(255, 255, 255, 0.9);
  font-weight: 600;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

/* 结果区域样式 */
.result-section {
  margin-top: 24px;
}

/* 结果操作按钮样式 - 固定底部显示 */
.result-actions {
  position: fixed;
  bottom: 16px;
  left: 16px;
  right: 16px;
  display: flex;
  gap: 12px;
  justify-content: center;
  padding: 16px;
  background: rgba(15, 15, 30, 0.6);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(30, 30, 60, 0.3);
  border-radius: 16px;
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.2),
    0 4px 16px rgba(0, 0, 0, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
  z-index: 1000;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 底部固定积分消耗提醒样式 - 圆角提示浮层，与进度条配色一致 */
.bottom-points-notice {
  position: fixed;
  bottom: 16px;
  left: 16px;
  right: 16px;
  z-index: 1000;
  /* 与进度条配色保持一致 */
  background: rgba(15, 15, 30, 0.6);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(30, 30, 60, 0.3);
  border-radius: 16px;
  padding: 16px;
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.2),
    0 4px 16px rgba(0, 0, 0, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
  animation: slideUpIn 0.3s ease-out;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.points-notice-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: rgba(255, 255, 255, 0.95);
  font-size: 14px;
  font-weight: 500;
  text-align: center;
}

.points-notice-content strong {
  /* 使用与进度条一致的渐变色 */
  background: linear-gradient(90deg, #6366f1, #818cf8);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-weight: 600;
  font-size: 16px;
}

/* 确保页面内容不被底部积分提醒遮挡 */
.ai-processing-template:has(.bottom-points-notice) .mobile-page-main {
  padding-bottom: 100px;
}

/* 确保页面内容不被底部按钮遮挡 */
.ai-processing-template:has(.result-actions) .mobile-page-main {
  padding-bottom: 120px;
}

@keyframes slideUpIn {
  from {
    transform: translateY(100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}



/* 响应式设计 */
@media (max-width: 480px) {
  .action-section {
    margin: 0 12px 12px 12px;
    padding: 14px;
    gap: 10px;
  }

  .ai-processing-template:has(.action-section) .mobile-page-main {
    padding-bottom: 110px;
  }
}

.result-action-btn {
  flex: 1;
  max-width: 150px;
  font-size: 14px;
  font-weight: 500;
  border-radius: 8px;
}

/* 移动端优化 */
@media (max-width: 768px) {
  .ai-page-header {
    padding: 12px 0;
  }

  .page-title {
    font-size: 16px;
    gap: 8px;
  }

  .input-section {
    gap: 16px;
  }

  .action-section {
    margin-top: 20px;
  }

  .upload-tips {
    padding: 16px;
    margin-top: 16px;
  }

  .result-actions {
    gap: 8px;
    margin-top: 16px;
    padding: 0 12px;
  }

  .result-action-btn {
    font-size: 13px;
  }
}

/* 深色主题适配 */
@media (prefers-color-scheme: dark) {
  .ai-page-header {
    background: transparent; /* Changed from rgba(0, 0, 0, 0.3) */
    border: 1px solid rgba(255, 255, 255, 0.05); /* Reduced opacity from 0.1 */
  }

  .upload-tips {
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .processing-info {
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.05);
  }
}
</style>


