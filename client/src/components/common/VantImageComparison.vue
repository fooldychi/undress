<template>
  <div class="vant-image-comparison">
    <!-- 结果标题 -->
    <MobileCard title="处理结果" inset>
      <!-- 图片对比区域 -->
      <div class="comparison-container">
        <!-- 原图 -->
        <div class="image-section">
          <div class="image-header">
            <van-icon name="photo-o" size="16" color="rgba(255, 255, 255, 0.8)" />
            <span class="image-title">原图</span>
          </div>
          <div class="image-wrapper">
            <van-image
              :src="originalImage"
              fit="cover"
              :show-loading="true"
              :show-error="true"
              class="comparison-image"
              @click="previewImage(originalImage, '原图')"
            >
              <template #loading>
                <van-loading type="spinner" size="20" />
              </template>
              <template #error>
                <van-icon name="photo-fail" size="32" />
              </template>
            </van-image>
          </div>
        </div>

        <!-- 分隔线 -->
        <div class="divider">
          <van-icon name="arrow" size="16" color="rgba(255, 255, 255, 0.9)" />
        </div>

        <!-- 结果图 -->
        <div class="image-section">
          <div class="image-header">
            <van-icon name="star" size="16" color="#FFD700" />
            <span class="image-title">结果</span>
          </div>
          <div class="image-wrapper">
            <van-image
              :src="resultImage"
              fit="cover"
              :show-loading="true"
              :show-error="true"
              class="comparison-image"
              @click="previewImage(resultImage, '处理结果')"
            >
              <template #loading>
                <van-loading type="spinner" size="20" />
              </template>
              <template #error>
                <van-icon name="photo-fail" size="32" />
              </template>
            </van-image>
          </div>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="action-buttons">
        <van-button
          type="primary"
          size="small"
          icon="down"
          @click="downloadImage"
          class="action-btn"
        >
          下载图片
        </van-button>

        <van-button
          type="default"
          size="small"
          icon="photo-o"
          @click="previewBoth"
          class="action-btn"
        >
          预览对比
        </van-button>

        <van-button
          type="warning"
          size="small"
          icon="replay"
          @click="$emit('reset')"
          class="action-btn"
        >
          重新处理
        </van-button>
      </div>
    </MobileCard>

    <!-- 处理信息 -->
    <MobileCard v-if="showProcessInfo && processInfo" title="处理信息" inset>
      <van-cell-group inset>
        <van-cell
          v-if="processInfo.processingTime"
          title="处理时间"
          :value="`${Math.floor(processInfo.processingTime / 1000)}秒`"
          icon="clock-o"
        />
        <van-cell
          v-if="processInfo.promptId"
          title="任务ID"
          :value="processInfo.promptId"
          icon="orders-o"
        />
        <van-cell
          v-if="processInfo.model"
          title="使用模型"
          :value="processInfo.model"
          icon="setting-o"
        />
        <van-cell
          v-if="processInfo.timestamp"
          title="完成时间"
          :value="formatTime(processInfo.timestamp)"
          icon="calendar-o"
        />
      </van-cell-group>
    </MobileCard>
  </div>
</template>

<script setup>
import { ImagePreview, Toast } from 'vant'
import { MobileCard } from '../mobile'

// Props
const props = defineProps({
  originalImage: {
    type: String,
    required: true
  },
  resultImage: {
    type: String,
    required: true
  },
  showProcessInfo: {
    type: Boolean,
    default: true
  },
  processInfo: {
    type: Object,
    default: () => ({})
  }
})

// Events
const emit = defineEmits(['reset', 'download'])

// Methods
const previewImage = (imageUrl, title) => {
  ImagePreview({
    images: [imageUrl],
    showIndex: false,
    closeable: true
  })
}

const previewBoth = () => {
  ImagePreview({
    images: [props.originalImage, props.resultImage],
    startPosition: 0,
    showIndex: true,
    closeable: true
  })
}

const downloadImage = async () => {
  try {
    // 创建下载链接
    const link = document.createElement('a')
    link.href = props.resultImage
    link.download = `ai-result-${Date.now()}.jpg`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    Toast.success('开始下载图片')
    emit('download', props.resultImage)
  } catch (error) {
    console.error('下载失败:', error)
    Toast.fail('下载失败，请重试')
  }
}

const formatTime = (timestamp) => {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>

<style scoped>
.vant-image-comparison {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.comparison-container {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 0;
}

.image-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.image-header {
  display: flex;
  align-items: center;
  gap: 6px;
  justify-content: center;
}

.image-title {
  font-size: 14px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.image-wrapper {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  border-radius: 12px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.comparison-image {
  width: 100%;
  height: 100%;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.comparison-image:hover {
  transform: scale(1.05);
}

.divider {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-radius: 50%;
  flex-shrink: 0;
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.action-buttons {
  display: flex;
  gap: 8px;
  margin-top: 16px;
  flex-wrap: wrap;
}

.action-btn {
  flex: 1;
  min-width: 0;
}

/* 移动端优化 */
@media (max-width: 768px) {
  .comparison-container {
    gap: 8px;
    padding: 12px 0;
  }

  .image-title {
    font-size: 13px;
  }

  .divider {
    width: 36px;
    height: 36px;
  }

  .action-buttons {
    gap: 6px;
  }

  .action-btn {
    font-size: 13px;
  }
}

/* 深色主题适配 */
@media (prefers-color-scheme: dark) {
  .image-wrapper {
    background: rgba(0, 0, 0, 0.3);
    border-color: rgba(255, 255, 255, 0.1);
  }

  .divider {
    background: rgba(0, 0, 0, 0.3);
    border-color: rgba(255, 255, 255, 0.1);
  }
}

/* 减少动画在低性能设备上的影响 */
@media (prefers-reduced-motion: reduce) {
  .comparison-image {
    transition: none;
  }

  .comparison-image:hover {
    transform: none;
  }
}
</style>
