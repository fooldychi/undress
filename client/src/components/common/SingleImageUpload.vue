<template>
  <div class="single-image-upload">
    <div
      class="upload-container"
      :class="{ 'has-image': modelValue, 'disabled': disabled }"
      :style="containerStyle"
      @click="!disabled && triggerUpload()"
    >
      <!-- 无图片状态 -->
      <template v-if="!modelValue">
        <div class="upload-placeholder">
          <van-icon
            name="plus"
            :size="iconSize"
            :color="iconColor"
          />
          <div class="upload-text">{{ uploadText }}</div>
          <div v-if="description" class="upload-description">{{ description }}</div>
        </div>
      </template>

      <!-- 有图片状态 -->
      <template v-else>
        <div class="image-container">
          <img
            :src="modelValue"
            :alt="uploadText"
            class="uploaded-image"
            :style="imageStyle"
            @load="onImageLoad"
            @error="onImageError"
          />

          <!-- 图片操作覆盖层 -->
          <div class="image-overlay">
            <div class="overlay-actions">
              <van-icon
                name="eye-o"
                size="20"
                color="white"
                @click.stop="previewImage"
              />
              <van-icon
                name="edit"
                size="20"
                color="white"
                @click.stop="triggerUpload()"
              />
              <van-icon
                name="delete"
                size="20"
                color="white"
                @click.stop="removeImage"
              />
            </div>
          </div>

          <!-- 加载状态 -->
          <div v-if="loading" class="loading-overlay">
            <van-loading size="24" color="white" />
          </div>
        </div>
      </template>
    </div>

    <!-- 文件信息 -->
    <div v-if="showFileInfo && fileInfo" class="file-info">
      <div class="info-item">
        <van-icon name="info-o" size="14" />
        <span>{{ fileInfo.name }}</span>
      </div>
      <div class="info-item">
        <van-icon name="photo-o" size="14" />
        <span>{{ fileInfo.size }}</span>
      </div>
    </div>

    <!-- 错误提示 -->
    <div v-if="error" class="error-message">
      <van-icon name="warning-o" size="14" color="var(--van-danger-color)" />
      <span>{{ error }}</span>
    </div>

    <!-- 隐藏的文件输入 -->
    <input
      ref="fileInput"
      type="file"
      :accept="accept"
      style="display: none"
      @change="handleFileSelect"
    />

    <!-- 图片预览弹窗 -->
    <van-image-preview
      v-model:show="showPreview"
      :images="[modelValue]"
      :start-position="0"
      @close="showPreview = false"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { Toast } from 'vant'
import { ImageSizeUtils } from '../../config/imageSizeConfig.js'

// Props
const props = defineProps({
  modelValue: {
    type: String,
    default: null
  },
  uploadText: {
    type: String,
    default: '上传图片'
  },
  description: {
    type: String,
    default: ''
  },
  accept: {
    type: String,
    default: 'image/*'
  },
  maxSize: {
    type: Number,
    default: 10 * 1024 * 1024 // 10MB
  },
  disabled: {
    type: Boolean,
    default: false
  },
  iconSize: {
    type: [String, Number],
    default: 32
  },
  iconColor: {
    type: String,
    default: 'var(--van-text-color-3)'
  },
  showFileInfo: {
    type: Boolean,
    default: false
  },
  containerHeight: {
    type: [String, Number],
    default: 120
  }
})

// Emits
const emit = defineEmits(['update:modelValue', 'change', 'error'])

// 响应式数据
const fileInput = ref(null)
const loading = ref(false)
const error = ref('')
const fileInfo = ref(null)
const showPreview = ref(false)
const isMobile = ref(false)

// 计算属性
const containerStyle = computed(() => {
  // 使用统一的上传组件尺寸配置
  return ImageSizeUtils.getContainerStyle('upload', isMobile.value)
})

const imageStyle = computed(() => {
  // 使用统一的图片样式配置
  return ImageSizeUtils.getImageStyle('upload', isMobile.value)
})

// 方法
const triggerUpload = () => {
  if (fileInput.value && !props.disabled) {
    fileInput.value.click()
  }
}

const handleFileSelect = async (event) => {
  const file = event.target.files[0]
  if (!file) return

  // 清除之前的错误
  error.value = ''

  // 验证文件
  if (!validateFile(file)) {
    event.target.value = '' // 清空input
    return
  }

  loading.value = true

  try {
    // 读取文件
    const dataUrl = await readFileAsDataURL(file)

    // 更新文件信息
    fileInfo.value = {
      name: file.name,
      size: formatFileSize(file.size),
      type: file.type
    }

    // 发出事件
    emit('update:modelValue', dataUrl)
    emit('change', dataUrl, file)

    Toast.success('图片上传成功')
  } catch (err) {
    error.value = '图片读取失败'
    emit('error', err)
    Toast.fail('图片上传失败')
  } finally {
    loading.value = false
    event.target.value = '' // 清空input
  }
}

const validateFile = (file) => {
  // 检查文件类型
  if (!file.type.startsWith('image/')) {
    error.value = '请选择图片文件'
    Toast.fail('请选择图片文件')
    return false
  }

  // 检查文件大小
  if (file.size > props.maxSize) {
    const maxSizeMB = Math.round(props.maxSize / 1024 / 1024)
    error.value = `文件大小不能超过 ${maxSizeMB}MB`
    Toast.fail(`文件大小不能超过 ${maxSizeMB}MB`)
    return false
  }

  return true
}

const readFileAsDataURL = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const removeImage = () => {
  emit('update:modelValue', null)
  emit('change', null, null)
  fileInfo.value = null
  error.value = ''
  Toast.success('图片已移除')
}

const previewImage = () => {
  if (props.modelValue) {
    showPreview.value = true
  }
}

const onImageLoad = (event) => {
  loading.value = false
  // 不再需要动态调整容器高度，使用统一的固定尺寸
}

const onImageError = () => {
  loading.value = false
  error.value = '图片加载失败'
}

// 响应式检测
const updateMobileStatus = () => {
  isMobile.value = ImageSizeUtils.isMobile()
}

// 监听modelValue变化
watch(() => props.modelValue, (newValue) => {
  if (!newValue) {
    fileInfo.value = null
    error.value = ''
  }
})

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
.single-image-upload {
  width: 100%;
}

.upload-container {
  position: relative;
  border: 2px dashed rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  margin: 0 auto;
}

.upload-container:hover:not(.disabled) {
  border-color: rgba(255, 255, 255, 0.4);
  background: rgba(255, 255, 255, 0.05);
}

.upload-container.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 16px;
}

.upload-text {
  font-size: 14px;
  color: var(--van-text-color-2);
  margin-top: 8px;
}

.upload-description {
  font-size: 12px;
  color: var(--van-text-color-3);
  margin-top: 4px;
  text-align: center;
}

.image-container {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.uploaded-image {
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
  object-fit: contain;
  background: rgba(0, 0, 0, 0.1);
}

.image-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.upload-container:hover .image-overlay {
  opacity: 1;
}

.overlay-actions {
  display: flex;
  gap: 16px;
}

.overlay-actions .van-icon {
  cursor: pointer;
  transition: transform 0.2s ease;
}

.overlay-actions .van-icon:hover {
  transform: scale(1.1);
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
}

.file-info {
  margin-top: 8px;
  padding: 8px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
  font-size: 12px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--van-text-color-3);
  margin-bottom: 4px;
}

.info-item:last-child {
  margin-bottom: 0;
}

.error-message {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  padding: 8px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 4px;
  font-size: 12px;
  color: var(--van-danger-color);
}

/* 移动端优化 */
@media (max-width: 768px) {
  .overlay-actions {
    gap: 12px;
  }

  .overlay-actions .van-icon {
    font-size: 18px;
  }
}
</style>
