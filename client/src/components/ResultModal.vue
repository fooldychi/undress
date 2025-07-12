<template>
  <van-popup
    v-model:show="visible"
    position="center"
    :style="{ width: '90%', maxWidth: '400px' }"
    round
    closeable
    close-icon-position="top-right"
  >
    <div class="result-modal">
      <div class="modal-header">
        <h3>生成结果</h3>
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

        <div v-else-if="resultData?.mediaUrl" class="result-content">
          <!-- 图片结果 -->
          <div v-if="isImage" class="image-result">
            <van-image
              :src="resultData.mediaUrl"
              fit="contain"
              :show-loading="true"
              :show-error="true"
              @click="previewImage"
            >
              <template #loading>
                <van-loading type="spinner" size="20" />
              </template>
              <template #error>
                <div class="image-error">
                  <van-icon name="photo-fail" size="32" />
                  <div>图片加载失败</div>
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
            >
              您的浏览器不支持视频播放
            </video>
          </div>

          <!-- 其他文件类型 -->
          <div v-else class="file-result">
            <div class="file-info">
              <van-icon name="description" size="48" />
              <div class="file-name">生成结果文件</div>
              <van-button type="primary" size="small" @click="downloadFile">
                下载文件
              </van-button>
            </div>
          </div>

          <!-- 操作按钮 -->
          <div class="result-actions">
            <van-button
              v-if="isImage"
              type="primary"
              size="small"
              @click="previewImage"
              icon="eye-o"
            >
              预览
            </van-button>
            <van-button
              type="default"
              size="small"
              @click="downloadFile"
              icon="down"
            >
              下载
            </van-button>
            <van-button
              type="default"
              size="small"
              @click="shareResult"
              icon="share-o"
            >
              分享
            </van-button>
          </div>
        </div>

        <div v-else class="no-result">
          <van-empty description="暂无结果数据" />
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
  return /\.(jpg|jpeg|png|gif|webp|bmp)(\?.*)?$/i.test(url)
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
  }
})
</script>

<style scoped>
.result-modal {
  padding: 0;
  max-height: 80vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-header {
  padding: 20px 20px 16px;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
}

.modal-header h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
  color: #323233;
}

.result-info {
  margin-top: 8px;
}

.result-desc {
  font-size: 14px;
  color: #646566;
  margin-bottom: 4px;
}

.result-time {
  font-size: 12px;
  color: #969799;
}

.modal-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px 20px;
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
}

.image-result .van-image {
  max-width: 100%;
  max-height: 300px;
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

.video-result video {
  width: 100%;
  max-height: 300px;
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

.result-actions {
  display: flex;
  gap: 8px;
  justify-content: center;
  flex-wrap: wrap;
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
