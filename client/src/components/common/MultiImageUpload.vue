<template>
  <div class="multi-image-upload">
    <!-- 图片网格 -->
    <div class="images-grid" :style="{ gridTemplateColumns: gridColumnsValue }">
      <!-- 已上传的图片 -->
      <div
        v-for="(image, index) in imageList"
        :key="`image-${index}`"
        class="image-item"
      >
        <div class="image-container">
          <img
            :src="image.url"
            :alt="`图片 ${index + 1}`"
            class="uploaded-image"
            @click="previewImage(index)"
          />

          <!-- 图片操作覆盖层 -->
          <div class="image-overlay">
            <van-icon
              name="eye-o"
              size="16"
              color="white"
              @click.stop="previewImage(index)"
            />
            <van-icon
              name="delete"
              size="16"
              color="white"
              @click.stop="removeImage(index)"
            />
          </div>

          <!-- 图片序号 -->
          <div class="image-index">{{ index + 1 }}</div>
        </div>
      </div>

      <!-- 上传按钮 -->
      <div
        v-if="imageList.length < maxCount"
        class="upload-item"
        :class="{ 'disabled': disabled }"
        @click="!disabled && triggerUpload()"
      >
        <van-icon
          name="plus"
          :size="iconSize"
          :color="iconColor"
        />
        <div class="upload-text">{{ uploadText }}</div>
      </div>
    </div>

    <!-- 批量操作 -->
    <div v-if="imageList.length > 0" class="batch-actions">
      <van-button
        size="small"
        type="default"
        @click="clearAll"
      >
        <van-icon name="delete-o" size="14" />
        清空全部
      </van-button>

      <van-button
        size="small"
        type="primary"
        @click="triggerUpload()"
        :disabled="disabled || imageList.length >= maxCount"
      >
        <van-icon name="plus" size="14" />
        继续添加
      </van-button>
    </div>

    <!-- 拖拽排序提示 -->
    <div v-if="sortable && imageList.length > 1" class="sort-tip">
      <van-icon name="info-o" size="12" />
      <span>长按图片可拖拽排序</span>
    </div>

    <!-- 隐藏的文件输入 -->
    <input
      ref="fileInput"
      type="file"
      :accept="accept"
      :multiple="true"
      style="display: none"
      @change="handleFileSelect"
    />

    <!-- 图片预览弹窗 -->
    <van-image-preview
      v-model:show="showPreview"
      :images="previewImages"
      :start-position="previewIndex"
      @close="showPreview = false"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Toast } from 'vant'

// Props
const props = defineProps({
  modelValue: {
    type: Array,
    default: () => []
  },
  maxCount: {
    type: Number,
    default: 4
  },
  minCount: {
    type: Number,
    default: 1
  },
  uploadText: {
    type: String,
    default: '添加图片'
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
    default: 24
  },
  iconColor: {
    type: String,
    default: 'var(--van-text-color-3)'
  },
  sortable: {
    type: Boolean,
    default: false
  },
  gridColumns: {
    type: Number,
    default: 4
  }
})

// Emits
const emit = defineEmits(['update:modelValue', 'change', 'error'])

// 响应式数据
const fileInput = ref(null)
const imageList = ref([])
const showPreview = ref(false)
const previewIndex = ref(0)

// 计算属性
const previewImages = computed(() => {
  return imageList.value.map(item => item.url)
})

const gridColumnsValue = computed(() => {
  return `repeat(${props.gridColumns}, 1fr)`
})

// 监听modelValue变化，同步到内部状态
watch(() => props.modelValue, (newValue) => {
  if (Array.isArray(newValue)) {
    imageList.value = newValue.map((item, index) => ({
      id: `img-${Date.now()}-${index}`,
      url: typeof item === 'string' ? item : item.url,
      file: typeof item === 'object' ? item.file : null
    }))
  } else {
    imageList.value = []
  }
}, { immediate: true })

// 方法
const triggerUpload = () => {
  if (fileInput.value && !props.disabled) {
    fileInput.value.click()
  }
}

const handleFileSelect = async (event) => {
  const files = Array.from(event.target.files)
  if (files.length === 0) return

  // 检查数量限制
  const remainingSlots = props.maxCount - imageList.value.length
  if (remainingSlots <= 0) {
    Toast.fail(`最多只能上传 ${props.maxCount} 张图片`)
    event.target.value = ''
    return
  }

  // 处理文件
  const validFiles = files.slice(0, remainingSlots).filter(file => validateFile(file))

  if (validFiles.length === 0) {
    event.target.value = ''
    return
  }

  try {
    const newImages = await Promise.all(
      validFiles.map(async (file, index) => {
        const dataUrl = await readFileAsDataURL(file)
        return {
          id: `img-${Date.now()}-${imageList.value.length + index}`,
          url: dataUrl,
          file: file
        }
      })
    )

    // 批量更新，避免多次触发响应式
    imageList.value = [...imageList.value, ...newImages]

    // 直接emit更新，避免通过watch触发
    const value = imageList.value.map(item => ({
      url: item.url,
      file: item.file
    }))
    emit('update:modelValue', value)
    emit('change', value)

    const addedCount = newImages.length
    Toast.success(`成功添加 ${addedCount} 张图片`)

    if (files.length > remainingSlots) {
      Toast.fail(`已达到最大数量限制，仅添加了前 ${remainingSlots} 张图片`)
    }
  } catch (error) {
    console.error('图片处理失败:', error)
    Toast.fail('图片处理失败')
    emit('error', error)
  } finally {
    event.target.value = ''
  }
}

const validateFile = (file) => {
  // 检查文件类型
  if (!file.type.startsWith('image/')) {
    Toast.fail(`文件 ${file.name} 不是图片格式`)
    return false
  }

  // 检查文件大小
  if (file.size > props.maxSize) {
    const maxSizeMB = Math.round(props.maxSize / 1024 / 1024)
    Toast.fail(`文件 ${file.name} 大小超过 ${maxSizeMB}MB`)
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

const removeImage = (index) => {
  imageList.value.splice(index, 1)

  // 直接emit更新，避免通过watch触发
  const value = imageList.value.map(item => ({
    url: item.url,
    file: item.file
  }))
  emit('update:modelValue', value)
  emit('change', value)

  Toast.success('图片已移除')
}

const clearAll = () => {
  imageList.value = []

  // 直接emit更新，避免通过watch触发
  emit('update:modelValue', [])
  emit('change', [])

  Toast.success('已清空所有图片')
}

const previewImage = (index) => {
  previewIndex.value = index
  showPreview.value = true
}

// 拖拽排序功能（如果需要的话）
const startDrag = (index, event) => {
  if (!props.sortable) return

  // 这里可以实现拖拽排序逻辑
  console.log('开始拖拽:', index)
}
</script>

<style scoped>
.multi-image-upload {
  width: 100%;
}

.images-grid {
  display: grid;
  gap: 8px;
  margin-bottom: 12px;
}

.image-item,
.upload-item {
  aspect-ratio: 1;
  border-radius: 8px;
  overflow: hidden;
  position: relative;
}

.image-container {
  width: 100%;
  height: 100%;
  position: relative;
  cursor: pointer;
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
  gap: 12px;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.image-item:hover .image-overlay {
  opacity: 1;
}

.image-index {
  position: absolute;
  top: 4px;
  left: 4px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  font-size: 12px;
  padding: 2px 6px;
  border-radius: 4px;
  min-width: 20px;
  text-align: center;
}

.upload-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 2px dashed rgba(255, 255, 255, 0.2);
  cursor: pointer;
  transition: all 0.3s ease;
}

.upload-item:hover:not(.disabled) {
  border-color: rgba(255, 255, 255, 0.4);
  background: rgba(255, 255, 255, 0.05);
}

.upload-item.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.upload-text {
  font-size: 12px;
  color: var(--van-text-color-3);
  margin-top: 4px;
}

.batch-actions {
  display: flex;
  gap: 8px;
  justify-content: center;
  margin-bottom: 8px;
}

.sort-tip {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--van-text-color-3);
  justify-content: center;
}

/* 移动端优化 */
@media (max-width: 768px) {
  .images-grid {
    grid-template-columns: repeat(3, 1fr);
  }

  .image-overlay {
    gap: 8px;
  }

  .batch-actions {
    flex-direction: column;
    align-items: center;
  }
}

/* 小屏幕优化 */
@media (max-width: 480px) {
  .images-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
