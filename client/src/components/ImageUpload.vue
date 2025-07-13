<template>
  <div class="image-upload-card">
    <input
      :id="inputId"
      type="file"
      accept="image/*"
      @change="handleFileChange"
      class="hidden"
      :disabled="disabled"
    >
    <label :for="inputId" class="upload-area" :class="{ disabled }">
      <div v-if="!imageUrl" class="upload-placeholder">
        <component :is="iconComponent" :size="iconSize" color="var(--text-light)" class="upload-icon" />
        <h4 class="upload-title">{{ title }}</h4>
        <p class="upload-description">{{ description }}</p>
      </div>
      <div v-else class="image-preview">
        <img :src="imageUrl" :alt="title" class="preview-image">
        <div class="image-overlay">
          <Edit :size="24" color="white" />
          <span>点击更换</span>
        </div>
      </div>
    </label>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Image, Edit } from 'lucide-vue-next'

const props = defineProps({
  modelValue: {
    type: String,
    default: null
  },
  title: {
    type: String,
    default: '选择图片'
  },
  description: {
    type: String,
    default: '支持 JPG、PNG 格式'
  },
  icon: {
    type: String,
    default: 'Image'
  },
  iconSize: {
    type: [String, Number],
    default: 48
  },
  maxSize: {
    type: Number,
    default: 10 * 1024 * 1024 // 10MB
  },
  disabled: {
    type: Boolean,
    default: false
  },
  minHeight: {
    type: [String, Number],
    default: 200
  }
})

const emit = defineEmits(['update:modelValue', 'change'])

const inputId = computed(() => `image-upload-${Math.random().toString(36).substring(2, 11)}`)
const imageUrl = computed(() => props.modelValue)

// 动态图标组件
const iconComponent = computed(() => {
  const iconMap = {
    'Image': Image,
    'photo': Image,
    'photograph': Image
  }
  return iconMap[props.icon] || Image
})

const handleFileChange = (event) => {
  const file = event.target.files[0]
  if (!file) return

  // 验证文件大小
  if (file.size > props.maxSize) {
    const maxSizeMB = Math.round(props.maxSize / (1024 * 1024))
    Toast.fail(`文件大小不能超过${maxSizeMB}MB`)
    return
  }

  const reader = new FileReader()
  reader.onload = (e) => {
    const result = e.target.result
    emit('update:modelValue', result)
    emit('change', result, file)
  }
  reader.readAsDataURL(file)
}
</script>

<style scoped>
.image-upload-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  transition: var(--transition);
  width: 100%;
  /* Removed max-width */
  margin: 0 auto;
}

.image-upload-card:hover {
  border-color: var(--primary-color);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
}

.hidden {
  display: none;
}

.upload-area {
  display: block;
  cursor: pointer;
  min-height: v-bind('minHeight + "px"');
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  padding: 24px;
  transition: var(--transition);
}

.upload-area.disabled {
  cursor: not-allowed;
  opacity: 0.6;
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
  font-size: 1.1rem;
  font-weight: 500;
}

.upload-description {
  font-size: 0.9rem;
  margin: 0;
  line-height: 1.5;
}

.image-preview {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: v-bind('minHeight + "px"');
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-image {
  width: 100%;
  height: 100%;
  border-radius: 8px;
  object-fit: cover;
}

.image-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  opacity: 0;
  transition: var(--transition);
  border-radius: 8px;
}

.image-preview:hover .image-overlay {
  opacity: 1;
}
</style>
