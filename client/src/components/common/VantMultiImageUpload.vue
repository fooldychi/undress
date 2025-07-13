<template>
  <div class="vant-multi-image-upload">
    <van-uploader
      v-model="fileList"
      :max-count="maxCount"
      :max-size="maxSize"
      :accept="accept"
      :disabled="disabled"
      :preview-size="previewSize"
      :deletable="deletable"
      :show-upload="showUpload"
      :before-read="beforeRead"
      @oversize="onOversize"
      @delete="onDelete"
      multiple
      class="multi-image-uploader"
    >
      <template #default>
        <div class="upload-slot">
          <van-icon
            name="plus"
            :size="iconSize"
            :color="iconColor"
          />
          <div class="upload-text">{{ uploadText }}</div>
        </div>
      </template>
    </van-uploader>

    <!-- 上传状态提示 -->
    <div class="upload-status">
      <div class="status-item">
        <van-icon
          name="photograph"
          size="16"
          :color="fileList.length > 0 ? 'var(--van-success-color)' : 'var(--van-text-color-3)'"
        />
        <span :class="{ 'text-success': fileList.length > 0 }">
          已上传 {{ fileList.length }}/{{ maxCount }} 张图片
        </span>
      </div>

      <div v-if="minCount > 0" class="status-item">
        <van-icon
          :name="fileList.length >= minCount ? 'success' : 'info-o'"
          size="16"
          :color="fileList.length >= minCount ? 'var(--van-success-color)' : 'var(--van-warning-color)'"
        />
        <span :class="{ 'text-success': fileList.length >= minCount, 'text-warning': fileList.length < minCount }">
          {{ fileList.length >= minCount ? '已满足最少上传要求' : `至少需要上传 ${minCount} 张图片` }}
        </span>
      </div>
    </div>

    <!-- 上传提示 -->
    <div v-if="showTips && tips.length > 0" class="upload-tips">
      <div v-for="(tip, index) in tips" :key="index" class="tip-item">
        <van-icon name="info-o" size="14" color="var(--van-text-color-3)" />
        <span>{{ tip }}</span>
      </div>
    </div>
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
  maxSize: {
    type: Number,
    default: 10 * 1024 * 1024 // 10MB
  },
  accept: {
    type: String,
    default: 'image/*'
  },
  disabled: {
    type: Boolean,
    default: false
  },
  previewSize: {
    type: [String, Number],
    default: 80
  },
  uploadText: {
    type: String,
    default: '添加图片'
  },
  iconSize: {
    type: [String, Number],
    default: 24
  },
  iconColor: {
    type: String,
    default: 'var(--van-text-color-3, #c8c9cc)'
  },
  deletable: {
    type: Boolean,
    default: true
  },
  showTips: {
    type: Boolean,
    default: true
  },
  tips: {
    type: Array,
    default: () => [
      '支持 JPG、PNG 格式',
      '建议尺寸 512x512 以上',
      '文件大小不超过 10MB',
      '可一次选择多张图片'
    ]
  }
})

// Events
const emit = defineEmits(['update:modelValue', 'change', 'delete', 'oversize'])

// Data
const fileList = ref([])

// Computed
const showUpload = computed(() => {
  return !props.disabled && fileList.value.length < props.maxCount
})

// Watch
watch(() => props.modelValue, (newValue) => {
  if (Array.isArray(newValue)) {
    fileList.value = newValue.map((item, index) => ({
      url: typeof item === 'string' ? item : item.url,
      file: typeof item === 'object' ? item.file : null,
      status: 'done',
      message: '',
      uid: `${Date.now()}-${index}`
    }))
  } else {
    fileList.value = []
  }
}, { immediate: true })

watch(fileList, (newValue) => {
  const result = newValue.map(item => ({
    url: item.url,
    file: item.file
  }))

  emit('update:modelValue', result)
  emit('change', result)
}, { deep: true })

// Methods
const beforeRead = (file) => {
  // 如果是多个文件
  if (Array.isArray(file)) {
    // 检查总数量
    if (fileList.value.length + file.length > props.maxCount) {
      Toast.fail(`最多只能上传 ${props.maxCount} 张图片`)
      return false
    }

    // 检查每个文件
    for (const f of file) {
      if (!validateFile(f)) {
        return false
      }
    }
  } else {
    // 单个文件
    if (fileList.value.length >= props.maxCount) {
      Toast.fail(`最多只能上传 ${props.maxCount} 张图片`)
      return false
    }

    if (!validateFile(file)) {
      return false
    }
  }

  return true
}

const validateFile = (file) => {
  // 检查文件类型
  if (!file.type.startsWith('image/')) {
    Toast.fail('请选择图片文件')
    return false
  }

  // 检查文件大小
  if (file.size > props.maxSize) {
    Toast.fail(`文件大小不能超过 ${(props.maxSize / 1024 / 1024).toFixed(1)}MB`)
    return false
  }

  return true
}

const onOversize = (file) => {
  Toast.fail(`文件大小不能超过 ${(props.maxSize / 1024 / 1024).toFixed(1)}MB`)
  emit('oversize', file)
}

const onDelete = (file, detail) => {
  emit('delete', file, detail)
}
</script>

<style scoped>
.vant-multi-image-upload {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.multi-image-uploader {
  width: 100%;
  display: flex;
  justify-content: center;
}

.upload-slot {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 88px;
  height: 88px;
  border: 2px dashed rgba(255, 255, 255, 0.3);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  position: relative;
  overflow: hidden;
}

.upload-slot::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: linear-gradient(45deg, transparent, rgba(255, 255, 255, 0.1), transparent);
  transform: rotate(45deg) translate(-100%, -100%);
  transition: transform 0.6s ease;
  pointer-events: none;
}

.upload-slot:hover {
  border-color: rgba(255, 255, 255, 0.6);
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
}

.upload-slot:hover::before {
  transform: rotate(45deg) translate(50%, 50%);
}

.upload-text {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
  margin-top: 6px;
  text-align: center;
  font-weight: 500;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.upload-status {
  width: 100%;
  margin-top: 16px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
}

.status-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 8px;
}

.status-item:last-child {
  margin-bottom: 0;
}

.text-success {
  color: #07c160;
  font-weight: 600;
}

.text-warning {
  color: #ff976a;
  font-weight: 600;
}

.upload-tips {
  width: 100%;
  margin-top: 16px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
}

.tip-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.5;
  margin-bottom: 6px;
}

.tip-item:last-child {
  margin-bottom: 0;
}

/* 移动端优化 */
@media (max-width: 768px) {
  .upload-slot {
    width: 80px;
    height: 80px;
  }

  .upload-text {
    font-size: 11px;
    margin-top: 4px;
  }

  .upload-status,
  .upload-tips {
    padding: 12px;
    margin-top: 12px;
  }

  .status-item {
    font-size: 13px;
    margin-bottom: 6px;
  }

  .tip-item {
    font-size: 12px;
    margin-bottom: 4px;
  }
}

/* 深色主题适配 */
@media (prefers-color-scheme: dark) {
  .upload-slot {
    background: rgba(0, 0, 0, 0.3);
    border-color: rgba(255, 255, 255, 0.2);
  }

  .upload-slot:hover {
    background: rgba(0, 0, 0, 0.4);
    border-color: rgba(255, 255, 255, 0.4);
  }

  .upload-status,
  .upload-tips {
    background: rgba(0, 0, 0, 0.2);
    border-color: rgba(255, 255, 255, 0.1);
  }
}

/* 减少动画在低性能设备上的影响 */
@media (prefers-reduced-motion: reduce) {
  .upload-slot {
    transition: none;
  }

  .upload-slot::before {
    display: none;
  }

  .upload-slot:hover {
    transform: none;
  }
}
</style>


