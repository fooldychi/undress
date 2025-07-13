<template>
  <div class="unified-image-upload-panel">
    <!-- 标题区域 -->
    <div class="panel-header">
      <van-icon
        :name="config.icon"
        :color="config.iconColor"
        size="18"
      />
      <span class="panel-title">{{ config.title }}</span>
      <span v-if="config.showCount" class="count-badge">
        ({{ config.minCount }}-{{ config.maxCount }}张)
      </span>
    </div>

    <!-- 对比组件插槽 - 在panel-header和status-section之间 -->
    <div v-if="$slots.comparison" class="comparison-slot">
      <!-- 调试信息 - 开发时可启用 -->
      <!--
      <div style="background: rgba(0,255,0,0.1); padding: 5px; margin: 5px 0; border-radius: 4px; color: white; font-size: 11px;">
        📍 插槽已激活 - shouldHideUpload: {{ shouldHideUpload }}
      </div>
      -->
      <slot name="comparison" />
    </div>

    <!-- 上传区域 - 始终显示，除非有对比组件且明确隐藏 -->
    <div v-if="!($slots.comparison && shouldHideUpload)" class="upload-area">
      <!-- 单图上传 -->
      <SingleImageUpload
        v-if="config.uploadType === 'single'"
        v-model="singleImage"
        :upload-text="config.uploadText"
        :accept="config.accept"
        :max-size="config.maxSize"
        :disabled="disabled"
        :container-height="120"
        @change="handleSingleImageChange"
        @error="handleUploadError"
      />

      <!-- 多图上传 -->
      <MultiImageUpload
        v-else
        v-model="multiImages"
        :max-count="config.maxCount"
        :min-count="config.minCount"
        :upload-text="config.uploadText"
        :accept="config.accept"
        :max-size="config.maxSize"
        :disabled="disabled"
        :grid-columns="4"
        @change="handleMultiImageChange"
        @error="handleUploadError"
      />
    </div>

    <!-- 状态信息 -->
    <div class="status-section">
      <div class="status-item">
        <van-icon
          name="photograph"
          size="16"
          :color="uploadedCount > 0 ? 'var(--van-success-color)' : 'var(--van-text-color-3)'"
        />
        <span :class="{ 'text-success': uploadedCount > 0 }">
          已上传 {{ uploadedCount }}/{{ config.maxCount }} 张图片
        </span>
      </div>

      <div v-if="config.minCount > 0" class="status-item">
        <van-icon
          :name="uploadedCount >= config.minCount ? 'success' : 'warning-o'"
          size="16"
          :color="uploadedCount >= config.minCount ? 'var(--van-success-color)' : 'var(--van-warning-color)'"
        />
        <span :class="{
          'text-success': uploadedCount >= config.minCount,
          'text-warning': uploadedCount < config.minCount
        }">
          {{ uploadedCount >= config.minCount ? '已满足上传要求' : `至少需要上传 ${config.minCount} 张图片` }}
        </span>
      </div>
    </div>

    <!-- 提示信息 -->
    <div v-if="config.tips && config.tips.length > 0" class="tips-section">
      <div v-for="(tip, index) in config.tips" :key="index" class="tip-item">
        <van-icon name="info-o" size="12" color="var(--van-text-color-3)" />
        <span>{{ tip }}</span>
      </div>
    </div>

    <!-- 隐藏的文件输入 -->
    <input
      ref="fileInput"
      type="file"
      :accept="config.accept"
      :multiple="config.uploadType === 'multi'"
      style="display: none"
      @change="handleFileSelect"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Toast } from 'vant'
import SingleImageUpload from './SingleImageUpload.vue'
import MultiImageUpload from './MultiImageUpload.vue'

// Props
const props = defineProps({
  modelValue: {
    type: [Array, String, null],
    default: null
  },
  config: {
    type: Object,
    required: true
  },
  disabled: {
    type: Boolean,
    default: false
  },
  shouldHideUpload: {
    type: Boolean,
    default: false
  }
})

// Emits
const emit = defineEmits(['update:modelValue', 'change', 'error'])

// Refs
const singleImage = ref(null)
const multiImages = ref([])

// 计算属性
const uploadedCount = computed(() => {
  return props.config.uploadType === 'single'
    ? (singleImage.value ? 1 : 0)
    : multiImages.value.length
})

// 监听modelValue变化
watch(() => props.modelValue, (newValue) => {
  if (props.config.uploadType === 'single') {
    singleImage.value = newValue
  } else {
    multiImages.value = Array.isArray(newValue) ? newValue : []
  }
}, { immediate: true })

// 监听内部数据变化
watch([singleImage, multiImages], () => {
  const value = props.config.uploadType === 'single'
    ? singleImage.value
    : multiImages.value

  emit('update:modelValue', value)
  emit('change', value)
}, { deep: true })

// 方法
const handleSingleImageChange = (imageData, file) => {
  singleImage.value = imageData
}

const handleMultiImageChange = (images) => {
  multiImages.value = images
}

const handleUploadError = (error) => {
  emit('error', error)
}
</script>

<style scoped>
.unified-image-upload-panel {
  background: rgba(15, 15, 30, 0.6);
  border-radius: 12px;
  border: 1px solid rgba(30, 30, 60, 0.5);
  padding: 16px;
  margin-bottom: 16px;
}

.panel-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  color: var(--van-text-color, #f7f8fa);
}

.panel-title {
  font-size: 16px;
  font-weight: 600;
}

.count-badge {
  font-size: 14px;
  color: var(--van-text-color-2);
}

/* 对比组件插槽样式 */
.comparison-slot {
  margin-bottom: 16px;
  /* 确保插槽内容能正确显示 */
  display: flex;
  justify-content: center;
  align-items: center;
  /* 避免弹性布局导致的宽度问题 */
  width: 100%;
}

.upload-area {
  margin-bottom: 16px;
}

.status-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--van-text-color-2);
}

.tips-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.tip-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--van-text-color-3);
}

.text-success {
  color: var(--van-success-color);
}

.text-warning {
  color: var(--van-warning-color);
}
</style>
