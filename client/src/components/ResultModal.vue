<template>
  <van-popup
    v-model:show="visible"
    position="center"
    :style="{ width: '95%', maxWidth: '500px' }"
    round
    closeable
    close-icon-position="top-right"
  >
    <div class="result-modal">
      <div class="modal-header">
        <h3>图片预览</h3>
        <div class="result-info">
          <div class="result-desc">{{ resultData?.description }}</div>
          <div class="result-time">{{ formatDate(resultData?.createdAt) }}</div>
        </div>
      </div>

      <div class="modal-content">
        <div v-if="loading" class="loading-state">
          <van-loading size="24px" vertical>加载中...</van-loading>
        </div>

        <div v-else-if="error" class="error-state">
          <van-empty
            image="error"
            description="加载失败"
          >
            <van-button type="primary" size="small" @click="retryLoad">
              重试
            </van-button>
          </van-empty>
        </div>

        <div v-else class="result-content">
          <!-- 有媒体URL时显示内容 -->
          <div v-if="resultData?.mediaUrl" class="media-container">
            <!-- 图片结果 -->
            <div v-if="isImage" class="image-result">
              <van-image
                :src="resultData.mediaUrl"
                fit="contain"
                :show-loading="true"
                :show-error="true"
                @click="previewImage"
                class="result-image"
                @load="handleImageLoad"
                @error="handleImageError"
              >
                <template #loading>
                  <van-loading type="spinner" size="20" />
                </template>
                <template #error>
                  <div class="image-error">
                    <van-icon name="photo-fail" size="32" />
                    <div>图片加载失败</div>
                    <div style="font-size: 10px; margin-top: 4px;">{{ resultData.mediaUrl }}</div>
                  </div>
                </template>
              </van-image>
            </div>

            <!-- 视频结果 -->
            <div v-else-if="isVideo" class="video-result">
              <video
                :src="resultData.mediaUrl"
                controls
                preload="metadata"
                @error="handleMediaError"
                class="result-video"
              >
                您的浏览器不支持视频播放
              </video>
            </div>

            <!-- 其他文件类型 -->
            <div v-else class="file-result">
              <div class="file-info">
                <van-icon name="description" size="48" />
                <div class="file-name">生成结果文件</div>
              </div>
            </div>
          </div>

          <!-- 无媒体URL时显示提示 -->
          <div v-else class="no-result">
            <van-empty description="暂无结果数据" />
          </div>
        </div>

        <!-- 固定在底部的操作按钮 -->
        <div v-if="resultData?.mediaUrl" class="modal-footer">
          <van-button
            type="primary"
            size="small"
            @click="downloadFile"
            icon="down"
            block
          >
            下载
          </van-button>
        </div>
      </div>
    </div>
  </van-popup>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Toast, ImagePreview } from 'vant'

// Props
const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  resultData: {
    type: Object,
    default: () => ({})
  }
})

// Emits
const emit = defineEmits(['update:show'])

// 响应式数据
const visible = computed({
  get: () => props.show,
  set: (value) => emit('update:show', value)
})

const loading = ref(false)
const error = ref(false)

// 计算媒体类型
const isImage = computed(() => {
  if (!props.resultData?.mediaUrl) return false
  const url = props.resultData.mediaUrl.toLowerCase()
  // 如果是视频格式则返回false，否则默认当作图片处理
  const isVideoFormat = /\.(mp4|webm|ogg|avi|mov)(\?.*)?$/i.test(url)
  return !isVideoFormat
})

const isVideo = computed(() => {
  if (!props.resultData?.mediaUrl) return false
  const url = props.resultData.mediaUrl.toLowerCase()
  return /\.(mp4|webm|ogg|avi|mov)(\?.*)?$/i.test(url)
})

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 预览图片
const previewImage = () => {
  if (!isImage.value) return

  ImagePreview({
    images: [props.resultData.mediaUrl],
    showIndex: false,
    closeable: true
  })
}

// 下载文件
const downloadFile = () => {
  if (!props.resultData?.mediaUrl) {
    Toast.fail('文件地址无效')
    return
  }

  try {
    const link = document.createElement('a')
    link.href = props.resultData.mediaUrl
    link.download = `result_${Date.now()}`
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    Toast.success('开始下载')
  } catch (error) {
    console.error('下载失败:', error)
    Toast.fail('下载失败')
  }
}

// 分享结果
const shareResult = () => {
  if (navigator.share && props.resultData?.mediaUrl) {
    navigator.share({
      title: '我的AI生成结果',
      text: props.resultData.description,
      url: props.resultData.mediaUrl
    }).catch(() => {
      copyToClipboard()
    })
  } else {
    copyToClipboard()
  }
}

// 复制到剪贴板
const copyToClipboard = () => {
  if (!props.resultData?.mediaUrl) return

  navigator.clipboard.writeText(props.resultData.mediaUrl).then(() => {
    Toast.success('链接已复制到剪贴板')
  }).catch(() => {
    Toast.fail('复制失败')
  })
}

// 处理媒体错误
const handleMediaError = () => {
  error.value = true
  Toast.fail('媒体文件加载失败')
}

// 处理图片加载成功
const handleImageLoad = () => {
  console.log('图片加载成功:', props.resultData?.mediaUrl)
}

// 处理图片加载失败
const handleImageError = () => {
  console.error('图片加载失败:', props.resultData?.mediaUrl)
  Toast.fail('图片加载失败')
}

// 重试加载
const retryLoad = () => {
  error.value = false
  loading.value = true

  setTimeout(() => {
    loading.value = false
  }, 1000)
}

// 监听显示状态
watch(() => props.show, (newVal) => {
  if (newVal) {
    error.value = false
    loading.value = false
    console.log('ResultModal 打开，数据:', props.resultData)
  }
})

// 监听resultData变化
watch(() => props.resultData, (newVal) => {
  console.log('ResultModal resultData 变化:', newVal)
}, { deep: true })
</script>

<style scoped>
.result-modal {
  padding: 0;
  max-height: 80vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: rgba(10, 10, 20, 0.95);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(30, 30, 60, 0.5);
  border-radius: 16px;
}

.modal-header {
  padding: 16px 20px;
  border-bottom: 1px solid rgba(30, 30, 60, 0.5);
  background: rgba(15, 15, 30, 0.8);
  backdrop-filter: blur(10px);
  flex-shrink: 0;
}

.modal-header h3 {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--van-text-color, #f7f8fa);
}

.result-info {
  margin-top: 8px;
}

.result-desc {
  font-size: 14px;
  color: var(--van-text-color-2, #969799);
  margin-bottom: 4px;
}

.result-time {
  font-size: 12px;
  color: var(--van-text-color-3, #646566);
}

.modal-content {
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px 0;
  min-height: 0;
}

.media-container {
  padding-bottom: 16px;
}

.modal-footer {
  padding: 16px;
  border-top: 1px solid rgba(30, 30, 60, 0.5);
  background: rgba(15, 15, 30, 0.8);
  backdrop-filter: blur(10px);
  flex-shrink: 0;
}

.loading-state,
.error-state,
.no-result {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
}

.result-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.image-result {
  text-align: center;
  width: 100%;
}

.result-image {
  width: 100%;
  max-height: 400px;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
}

.result-image-direct {
  width: 100%;
  max-height: 400px;
  border-radius: 8px;
  cursor: pointer;
  object-fit: contain;
  display: block;
}

.image-result .van-image {
  width: 100%;
  max-height: 400px;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
}

.image-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: #969799;
  padding: 40px 20px;
}

.video-result {
  width: 100%;
}

.result-video {
  width: 100%;
  max-height: 400px;
  border-radius: 8px;
}

.video-result video {
  width: 100%;
  max-height: 400px;
  border-radius: 8px;
}

.file-result {
  text-align: center;
  padding: 40px 20px;
}

.file-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.file-name {
  font-size: 14px;
  color: #646566;
}



/* 深色主题适配 */
@media (prefers-color-scheme: dark) {
  .modal-header {
    border-bottom-color: #3a3a3c;
  }

  .modal-header h3 {
    color: #ffffff;
  }

  .result-desc {
    color: #8e8e93;
  }

  .result-time {
    color: #6d6d70;
  }

  .file-name {
    color: #8e8e93;
  }
}
</style>
