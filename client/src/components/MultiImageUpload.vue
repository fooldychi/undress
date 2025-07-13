<template>
  <div class="multi-image-upload">
    <!-- 主上传区域 - 只在没有选择图片时显示 -->
    <div v-if="selectedImages.length === 0" class="upload-area-container">
      <input
        :id="inputId"
        type="file"
        accept="image/*"
        multiple
        @change="handleFileChange"
        class="hidden"
        :disabled="disabled"
        :webkitdirectory="false"
        ref="fileInput"
      >
      <div class="main-upload-area" :class="{ disabled }" @click="triggerFileSelect">
        <div class="upload-placeholder">
          <Users :size="48" color="var(--primary-color)" class="upload-icon" />
          <h4 class="upload-title">选择人脸照片</h4>
          <p class="upload-description">
            一次选择1-4张照片，支持 JPG、PNG 格式<br>
            如果少于4张，将自动重复最后一张
          </p>
          <van-button
            type="primary"
            size="small"
            round
            class="upload-btn"
            @click.stop="triggerFileSelect"
            :disabled="disabled"
          >
            <Upload :size="16" color="white" class="btn-icon" />
            选择照片 (最多4张)
          </van-button>
        </div>
      </div>
    </div>

    <!-- 已选择的图片预览 -->
    <div v-if="selectedImages.length > 0" class="selected-images">
      <div class="success-header">
        <div class="success-icon">
          <CheckCircle :size="24" color="var(--success-color)" />
        </div>
        <h5 class="preview-title">
          已选择 {{ originalCount }} 张照片
          <span v-if="originalCount < 4" class="auto-fill-hint">
            (自动补齐至4张)
          </span>
        </h5>
      </div>

      <div class="images-grid">
        <div
          v-for="(image, index) in displayImages"
          :key="index"
          class="image-item"
          :class="{ 'auto-filled': index >= originalCount }"
        >
          <div class="image-preview">
            <img :src="image" :alt="`人脸照片 ${index + 1}`" class="preview-image">
            <div class="image-overlay">
              <span class="image-number">{{ index + 1 }}</span>
              <span v-if="index >= originalCount" class="auto-fill-badge">自动补齐</span>
            </div>
          </div>
          <p class="image-label">人脸照片 {{ index + 1 }}</p>
        </div>
      </div>

      <div class="upload-actions">
        <van-button @click="clearImages" size="small" type="default">
          <Trash2 :size="16" class="btn-icon" />
          重新选择
        </van-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Toast } from 'vant'
import { Users, Upload, Trash2, CheckCircle } from 'lucide-vue-next'

const props = defineProps({
  modelValue: {
    type: Array,
    default: () => []
  },
  maxSize: {
    type: Number,
    default: 10 * 1024 * 1024 // 10MB
  },
  disabled: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'change'])

const inputId = computed(() => `multi-image-upload-${Math.random().toString(36).substring(2, 11)}`)
const selectedImages = ref([])
const originalCount = ref(0)
const fileInput = ref(null)

// 显示的图片数组（包含自动补齐的）
const displayImages = computed(() => {
  if (selectedImages.value.length === 0) return []

  const images = [...selectedImages.value]
  const lastImage = images[images.length - 1]

  // 如果少于4张，用最后一张补齐
  while (images.length < 4) {
    images.push(lastImage)
  }

  return images
})

const handleFileChange = (event) => {
  const files = Array.from(event.target.files)
  if (files.length === 0) return

  // 限制最多4张 - 如果选择超过4张，只取前4张
  let selectedFiles = files
  if (files.length > 4) {
    selectedFiles = files.slice(0, 4)
    Toast.fail(`最多只能选择4张照片，已自动选择前4张`)
  }

  // 验证文件大小
  for (const file of selectedFiles) {
    if (file.size > props.maxSize) {
      const maxSizeMB = Math.round(props.maxSize / (1024 * 1024))
      Toast.fail(`文件大小不能超过${maxSizeMB}MB`)
      return
    }
  }

  // 读取所有文件
  const promises = selectedFiles.map(file => {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target.result)
      reader.readAsDataURL(file)
    })
  })

  Promise.all(promises).then(results => {
    selectedImages.value = results
    originalCount.value = results.length
    updateModelValue()

    const message = results.length < 4
      ? `已选择 ${results.length} 张照片，自动补齐至4张`
      : `已选择 ${results.length} 张照片`
    Toast.success(message)
  })

  // 清空input以允许重新选择相同文件
  event.target.value = ''
}

const triggerFileSelect = () => {
  if (props.disabled) return

  // 尝试通过ref获取input元素
  if (fileInput.value) {
    fileInput.value.click()
    return
  }

  // 备用方案：通过ID获取input元素
  const input = document.getElementById(inputId.value)
  if (input) {
    input.click()
  }
}

const clearImages = () => {
  selectedImages.value = []
  originalCount.value = 0
  updateModelValue()
  Toast.success('已清空所有照片')
}

const updateModelValue = () => {
  const finalImages = displayImages.value
  emit('update:modelValue', finalImages)
  emit('change', finalImages, originalCount.value)
}

// 监听外部值变化
watch(() => props.modelValue, (newValue) => {
  if (newValue && newValue.length > 0) {
    selectedImages.value = newValue.slice(0, Math.min(newValue.length, 4))
    originalCount.value = selectedImages.value.length
  }
}, { immediate: true })
</script>

<style scoped>
.multi-image-upload {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.upload-area-container {
  margin-bottom: 24px;
  display: flex;
  justify-content: center;
  width: 100%;
}

.hidden {
  display: none;
}

.main-upload-area {
  background: var(--bg-card);
  border: 2px dashed var(--border-color);
  border-radius: 16px;
  padding: 40px 24px;
  text-align: center;
  transition: var(--transition);
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  width: 100%;
  /* Removed max-width */
}

.main-upload-area:hover {
  border-color: var(--primary-color);
  background: rgba(102, 126, 234, 0.05);
}

.main-upload-area.disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.upload-placeholder {
  text-align: center;
  color: var(--text-light);
}

.upload-icon {
  margin-bottom: 16px;
}

.upload-title {
  margin: 12px 0 8px;
  color: var(--text-color);
  font-size: 1.2rem;
  font-weight: 600;
}

.upload-description {
  font-size: 0.9rem;
  margin: 0 0 20px 0;
  line-height: 1.5;
  color: var(--text-light);
}

.upload-btn {
  margin-top: 8px;
}

.btn-icon {
  margin-right: 4px;
}

.selected-images {
  background: var(--bg-card);
  border: 2px solid var(--primary-color);
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 8px 24px rgba(102, 126, 234, 0.2);
  animation: slideIn 0.3s ease-out;
  width: 100%;
  /* Removed max-width */
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.success-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.success-icon {
  flex-shrink: 0;
  animation: checkmark 0.5s ease-out;
}

@keyframes checkmark {
  0% {
    transform: scale(0);
    opacity: 0;
  }
  50% {
    transform: scale(1.2);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.preview-title {
  margin: 0;
  color: var(--text-color);
  font-size: 1.1rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}

.auto-fill-hint {
  font-size: 0.85rem;
  color: var(--text-light);
  font-weight: normal;
}

.images-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}

@media (max-width: 768px) {
  .images-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }
}

.image-item {
  text-align: center;
}

.image-item.auto-filled {
  opacity: 0.7;
}

.image-preview {
  position: relative;
  width: 100%;
  height: 120px;
  border-radius: 12px;
  overflow: hidden;
  background: var(--bg-dark);
  border: 2px solid var(--border-color);
}

.image-item.auto-filled .image-preview {
  border-color: var(--warning-color);
  border-style: dashed;
}

.preview-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
}

.image-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 30%, transparent 70%, rgba(0,0,0,0.7) 100%);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  color: white;
  font-size: 0.75rem;
  font-weight: 600;
}

.image-number {
  background: var(--primary-color);
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.7rem;
}

.auto-fill-badge {
  background: var(--warning-color);
  padding: 2px 6px;
  border-radius: 8px;
  font-size: 0.65rem;
}

.image-label {
  margin: 8px 0 0 0;
  font-size: 0.85rem;
  color: var(--text-light);
}

.upload-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.upload-actions .van-button {
  display: flex;
  align-items: center;
  gap: 4px;
}
</style>
