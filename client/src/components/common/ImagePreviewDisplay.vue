<template>
  <div class="image-preview-display">
    <MobileCard :title="title" inset>
      <div class="preview-container" :style="containerStyle">
        <div class="image-wrapper">
          <img
            :src="imageUrl"
            :alt="title"
            class="preview-image"
            :style="imageStyle"
            @load="onImageLoad"
            @error="onImageError"
            @click="previewImage"
          />

          <!-- 加载状态 -->
          <div v-if="loading" class="loading-overlay">
            <van-loading size="24" color="white" />
          </div>

          <!-- 错误状态 -->
          <div v-if="error" class="error-overlay">
            <van-icon name="photo-fail" size="32" color="rgba(255, 255, 255, 0.6)" />
            <span class="error-text">图片加载失败</span>
          </div>
        </div>

        <!-- 图片信息 -->
        <div v-if="showImageInfo && imageInfo" class="image-info">
          <div class="info-item">
            <van-icon name="photo-o" size="14" />
            <span>{{ imageInfo.width }} × {{ imageInfo.height }}</span>
          </div>
          <div v-if="imageInfo.size" class="info-item">
            <van-icon name="info-o" size="14" />
            <span>{{ imageInfo.size }}</span>
          </div>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div v-if="showActions" class="action-buttons">
        <van-button
          v-if="downloadEnabled"
          type="primary"
          size="small"
          icon="down"
          @click="downloadImage"
          class="action-btn"
        >
          下载图片
        </van-button>

        <van-button
          v-if="previewEnabled"
          type="default"
          size="small"
          icon="eye-o"
          @click="previewImage"
          class="action-btn"
        >
          预览图片
        </van-button>

        <van-button
          v-if="editEnabled"
          type="warning"
          size="small"
          icon="edit"
          @click="$emit('edit')"
          class="action-btn"
        >
          重新选择
        </van-button>
      </div>
    </MobileCard>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ImagePreview, Toast } from 'vant'
import { MobileCard } from '../mobile'
import { ImageSizeUtils } from '../../config/imageSizeConfig.js'

// Props
const props = defineProps({
  imageUrl: {
    type: String,
    required: true
  },
  title: {
    type: String,
    default: '图片预览'
  },
  showImageInfo: {
    type: Boolean,
    default: true
  },
  showActions: {
    type: Boolean,
    default: true
  },
  downloadEnabled: {
    type: Boolean,
    default: true
  },
  previewEnabled: {
    type: Boolean,
    default: true
  },
  editEnabled: {
    type: Boolean,
    default: true
  }
})

// Events
const emit = defineEmits(['edit', 'download'])

// 响应式数据
const loading = ref(true)
const error = ref(false)
const isMobile = ref(false)
const imageInfo = ref(null)

// 计算属性
const containerStyle = computed(() => {
  return ImageSizeUtils.getContainerStyle('preview', isMobile.value)
})

const imageStyle = computed(() => {
  return ImageSizeUtils.getImageStyle('preview', isMobile.value)
})

// 方法
const onImageLoad = (event) => {
  loading.value = false
  error.value = false

  const img = event.target
  imageInfo.value = {
    width: img.naturalWidth,
    height: img.naturalHeight,
    size: formatFileSize(getImageSize(img))
  }
}

const onImageError = () => {
  loading.value = false
  error.value = true
}

const previewImage = () => {
  if (!error.value && props.imageUrl) {
    ImagePreview({
      images: [props.imageUrl],
      showIndex: false,
      closeable: true
    })
  }
}

const downloadImage = async () => {
  try {
    const { downloadImage: downloadUtil } = await import('../../utils/downloadUtils.js')
    const success = await downloadUtil(props.imageUrl, 'AI_Magic_image')

    if (success) {
      emit('download', props.imageUrl)
    }
  } catch (error) {
    console.error('下载失败:', error)
    Toast.fail('下载失败，请重试')
  }
}

// 工具函数
const formatFileSize = (bytes) => {
  if (!bytes) return ''
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const getImageSize = (img) => {
  // 估算图片文件大小（这是一个近似值）
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  ctx.drawImage(img, 0, 0)

  try {
    const dataURL = canvas.toDataURL('image/jpeg', 0.8)
    return Math.round((dataURL.length - 'data:image/jpeg;base64,'.length) * 3 / 4)
  } catch {
    return 0
  }
}

// 响应式检测
const updateMobileStatus = () => {
  isMobile.value = ImageSizeUtils.isMobile()
}

// 生命周期
onMounted(() => {
  updateMobileStatus()
  window.addEventListener('resize', updateMobileStatus)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateMobileStatus)
})
</script>

<style scoped>
.image-preview-display {
  width: 100%;
}

.preview-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.image-wrapper {
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: all 0.3s ease;
}

.image-wrapper:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

.preview-image {
  display: block;
  border-radius: 12px;
}

.loading-overlay,
.error-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.error-text {
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
}

.image-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.info-item {
  display: flex;
  align-items: center;
  gap: 6px;
  color: rgba(255, 255, 255, 0.8);
  font-size: 12px;
}

.action-buttons {
  display: flex;
  gap: 8px;
  margin-top: 16px;
  flex-wrap: wrap;
  justify-content: center;
}

.action-btn {
  flex: 1;
  min-width: 0;
}

/* 移动端优化 */
@media (max-width: 768px) {
  .preview-container {
    gap: 12px;
  }

  .action-buttons {
    gap: 6px;
  }

  .action-btn {
    font-size: 13px;
  }

  .info-item {
    font-size: 11px;
  }
}
</style>
