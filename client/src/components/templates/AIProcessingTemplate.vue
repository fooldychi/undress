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
    <div v-if="!resultData" class="input-section">
      <!-- 输入区域插槽 -->
      <slot name="inputs" />

      <!-- 处理按钮 -->
      <div v-if="canProcess && !isProcessing" class="action-section">
        <MobileActionButton
          @click="$emit('process')"
          type="primary"
          block
          variant="floating"
          :icon="processButtonIcon"
        >
          <template v-if="processButtonIcon" #icon>
            <component
              :is="processButtonIcon"
              :size="18"
              color="white"
            />
          </template>
          {{ processButtonText }}
        </MobileActionButton>
      </div>

      <!-- 上传提示 -->
      <div v-else-if="showUploadTips" class="upload-tips">
        <slot name="upload-tips" />
      </div>
    </div>

    <!-- 处理状态 -->
    <MobileStatusCard
      v-if="isProcessing"
      status="loading"
      :title="processingTitle"
      :description="processingDescription"
      :progress="progress"
      :show-progress="showProgress"
    >
      <template #extra>
        <div v-if="processingInfo" class="processing-info">
          <div v-if="processingInfo.promptId" class="info-item">
            <span class="info-label">任务ID:</span>
            <span class="info-value">{{ processingInfo.promptId }}</span>
          </div>
          <div v-if="processingInfo.processingTime > 0" class="info-item">
            <span class="info-label">处理时间:</span>
            <span class="info-value">{{ Math.floor(processingInfo.processingTime / 1000) }}秒</span>
          </div>
        </div>
      </template>
    </MobileStatusCard>

    <!-- 结果展示 -->
    <div v-if="resultData" class="result-section">
      <slot name="result" :result="resultData" />
    </div>
  </MobilePageContainer>
</template>

<script setup>
import { computed } from 'vue'
import { MobilePageContainer, MobileActionButton, MobileStatusCard } from '../mobile'

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
    default: '请耐心等待，处理时间可能需要几分钟'
  },
  processingInfo: {
    type: Object,
    default: () => ({})
  },

  // 结果数据
  resultData: {
    type: [Object, String],
    default: null
  }
})

// Events
defineEmits(['login', 'logout', 'process'])
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
  margin-bottom: 20px;
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
  padding: 0 16px;
  margin-top: 24px;
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

/* 移动端优化 */
@media (max-width: 768px) {
  .ai-page-header {
    padding: 12px 0;
    margin-bottom: 16px;
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


