<template>
  <div class="vant-image-upload">
    <van-uploader
      v-model="fileList"
      :max-count="maxCount"
      :max-size="maxSize"
      :accept="accept"
      :disabled="disabled"
      :preview-size="previewSize"
      :upload-text="uploadText"
      :upload-icon="uploadIcon"
      :deletable="deletable"
      :show-upload="showUpload"
      :before-read="beforeRead"
      @oversize="onOversize"
      @delete="onDelete"
      @click-upload="onClickUpload"
      class="image-uploader"
    >
      <template #default>
        <div class="upload-area">
          <van-icon
            :name="uploadIcon"
            :size="iconSize"
            :color="iconColor"
            class="upload-icon"
          />
          <div class="upload-text">{{ uploadText }}</div>
          <div v-if="description" class="upload-description">{{ description }}</div>
        </div>
      </template>
    </van-uploader>

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
    type: [Array, String],
    default: () => []
  },
  maxCount: {
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
    default: '上传图片'
  },
  uploadIcon: {
    type: String,
    default: 'photograph'
  },
  iconSize: {
    type: [String, Number],
    default: 32
  },
  iconColor: {
    type: String,
    default: 'var(--van-text-color-3, #c8c9cc)'
  },
  description: {
    type: String,
    default: ''
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
      '文件大小不超过 10MB'
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
  } else if (newValue) {
    fileList.value = [{
      url: newValue,
      status: 'done',
      message: '',
      uid: `${Date.now()}-0`
    }]
  } else {
    fileList.value = []
  }
}, { immediate: true })

watch(fileList, (newValue) => {
  const result = newValue.map(item => ({
    url: item.url,
    file: item.file
  }))

  if (props.maxCount === 1) {
    emit('update:modelValue', result[0] || null)
  } else {
    emit('update:modelValue', result)
  }

  emit('change', result)
}, { deep: true })

// Methods
const beforeRead = (file) => {
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

const onClickUpload = () => {
  if (props.disabled) {
    Toast.fail('当前无法上传')
  }
}
</script>

<style scoped>
.vant-image-upload {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.image-uploader {
  width: 100%;
  display: flex;
  justify-content: center;
}

.upload-area {
  width: 100%;
  /* Removed max-width */
  padding: 40px 24px;
  min-height: 200px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  border: 2px dashed rgba(255, 255, 255, 0.3);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

/* 添加光泽效果 */
.upload-area::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: linear-gradient(45deg, transparent, rgba(255, 255, 255, 0.1), transparent);
  transform: rotate(45deg);
  transition: transform 0.6s ease;
  pointer-events: none;
}

.upload-area:hover {
  border-color: rgba(255, 255, 255, 0.6);
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

.upload-area:hover::before {
  transform: rotate(45deg) translate(50%, 50%);
}

.upload-icon {
  margin-bottom: 12px;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
}

.upload-text {
  font-size: 17px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.95);
  margin-bottom: 6px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.upload-description {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
  text-align: center;
  line-height: 1.5;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.upload-tips {
  width: 100%;
  /* Removed max-width */
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
  .upload-area {
    padding: 32px 16px;
    min-height: 120px;
  }

  .upload-text {
    font-size: 16px;
  }

  .upload-description {
    font-size: 13px;
  }

  .upload-tips {
    padding: 12px;
    margin-top: 12px;
  }

  .tip-item {
    font-size: 12px;
    margin-bottom: 4px;
  }
}

/* 深色主题适配 */
@media (prefers-color-scheme: dark) {
  .upload-area {
    background: rgba(0, 0, 0, 0.3);
    border-color: rgba(255, 255, 255, 0.2);
  }

  .upload-area:hover {
    background: rgba(0, 0, 0, 0.4);
    border-color: rgba(255, 255, 255, 0.4);
  }

  .upload-tips {
    background: rgba(0, 0, 0, 0.2);
    border-color: rgba(255, 255, 255, 0.1);
  }
}

/* 减少动画在低性能设备上的影响 */
@media (prefers-reduced-motion: reduce) {
  .upload-area {
    transition: none;
  }

  .upload-area::before {
    display: none;
  }

  .upload-area:hover {
    transform: none;
  }
}
</style>


