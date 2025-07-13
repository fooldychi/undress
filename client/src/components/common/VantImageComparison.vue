<template>
  <div class="comparison-container" :style="containerStyle">
    <!-- 原图 -->
    <div class="image-section">
      <div class="image-header">
        <van-icon name="photo-o" size="16" color="rgba(255, 255, 255, 0.8)" />
        <span class="image-title">原图</span>
      </div>
      <div class="image-wrapper" :style="imageWrapperStyle">
        <van-image
          :src="originalImage"
          fit="contain"
          :show-loading="true"
          :show-error="true"
          class="comparison-image"
          @click="previewImage(originalImage, '原图')"
        >
          <template #loading>
            <van-loading type="spinner" size="20" />
          </template>
          <template #error>
            <van-icon name="photo-fail" size="32" />
          </template>
        </van-image>
      </div>
    </div>

    <!-- 分隔线 -->
    <div class="divider">
      <van-icon name="arrow" size="16" color="rgba(255, 255, 255, 0.9)" />
    </div>

    <!-- 结果图 -->
    <div class="image-section">
      <div class="image-header">
        <van-icon name="star" size="16" color="#FFD700" />
        <span class="image-title">结果</span>
      </div>
      <div class="image-wrapper" :style="imageWrapperStyle">
        <van-image
          :src="resultImage"
          fit="contain"
          :show-loading="true"
          :show-error="true"
          class="comparison-image"
          @click="previewImage(resultImage, '处理结果')"
        >
          <template #loading>
            <van-loading type="spinner" size="20" />
          </template>
          <template #error>
            <van-icon name="photo-fail" size="32" />
          </template>
        </van-image>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ImagePreview } from 'vant'
import { ImageSizeUtils } from '../../config/imageSizeConfig.js'

// Props
const props = defineProps({
  originalImage: {
    type: String,
    required: true
  },
  resultImage: {
    type: String,
    required: true
  }
})

// Events
const emit = defineEmits([])

// 响应式数据
const isMobile = ref(false)

// 计算属性 - 使用preview配置（只固定高度，宽度自适应保持原图比例）
const containerStyle = computed(() => {
  return ImageSizeUtils.getContainerStyle('preview', isMobile.value)
})

const imageWrapperStyle = computed(() => {
  // 为并排展示调整样式，每个图片占一半宽度
  const baseStyle = ImageSizeUtils.getContainerStyle('preview', isMobile.value)
  return {
    ...baseStyle,
    width: '48%', // 并排展示，每个占48%，留2%间距
    flex: '0 0 48%'
  }
})

// Methods - 只保留预览功能
const previewImage = (imageUrl, title) => {
  ImagePreview({
    images: [imageUrl],
    showIndex: false,
    closeable: true
  })
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
.comparison-container {
  display: flex;
  align-items: center;
  gap: 4%;
  width: 100%;
}

.image-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.image-header {
  display: flex;
  align-items: center;
  gap: 6px;
  justify-content: center;
}

.image-title {
  font-size: 14px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.image-wrapper {
  position: relative;
  width: 100%;
  border-radius: 12px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.comparison-image {
  width: 100%;
  height: 100%;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.comparison-image:hover {
  transform: scale(1.05);
}

.divider {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-radius: 50%;
  flex-shrink: 0;
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}



/* 移动端优化 */
@media (max-width: 768px) {
  .comparison-container {
    gap: 8px;
    padding: 12px 0;
  }

  .image-title {
    font-size: 13px;
  }

  .divider {
    width: 36px;
    height: 36px;
  }

  .action-buttons {
    gap: 6px;
  }

  .action-btn {
    font-size: 13px;
  }
}

/* 深色主题适配 */
@media (prefers-color-scheme: dark) {
  .image-wrapper {
    background: rgba(0, 0, 0, 0.3);
    border-color: rgba(255, 255, 255, 0.1);
  }

  .divider {
    background: rgba(0, 0, 0, 0.3);
    border-color: rgba(255, 255, 255, 0.1);
  }
}

/* 减少动画在低性能设备上的影响 */
@media (prefers-reduced-motion: reduce) {
  .comparison-image {
    transition: none;
  }

  .comparison-image:hover {
    transform: none;
  }
}
</style>
