<template>
  <div class="comparison-container" ref="comparisonContainer" :style="containerStyle">
    <div class="comparison-wrapper">
      <!-- 原图层 -->
      <div class="image-layer original-layer">
        <img
          :src="originalImage"
          alt="原图"
          class="comparison-image"
          :style="imageStyle"
          @load="handleImageLoad"
          ref="originalImageRef"
        />
      </div>

      <!-- 结果图层 -->
      <div
        class="image-layer result-layer"
        :style="{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }"
      >
        <img :src="resultImage" alt="处理结果" class="comparison-image" :style="imageStyle" />
      </div>

      <!-- 拖拽滑块 -->
      <div
        class="comparison-slider"
        :style="{ left: sliderPosition + '%' }"
        @mousedown="startDragging"
        @touchstart="startDragging"
      >
        <div class="slider-line"></div>
        <div class="slider-handle">
          <van-icon name="arrow-left" size="12" color="white" class="slider-arrow left" />
          <div class="slider-circle"></div>
          <van-icon name="arrow" size="12" color="white" class="slider-arrow right" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { ImageSizeUtils } from '../config/imageSizeConfig.js'

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

const emit = defineEmits([])

const sliderPosition = ref(50)
const isDragging = ref(false)
const comparisonContainer = ref(null)
const originalImageRef = ref(null)
const imageAspectRatio = ref(1) // 默认1:1比例
const isMobile = ref(false)

// 计算容器样式 - 使用preview配置（只固定高度，宽度自适应保持原图比例）
const containerStyle = computed(() => {
  return ImageSizeUtils.getContainerStyle('preview', isMobile.value)
})

const imageStyle = computed(() => {
  return ImageSizeUtils.getImageStyle('preview', isMobile.value)
})

// 处理图片加载
const handleImageLoad = () => {
  if (originalImageRef.value) {
    const img = originalImageRef.value
    imageAspectRatio.value = img.naturalWidth / img.naturalHeight
  }
}

// 监听图片变化，重新计算比例
watch(() => props.originalImage, () => {
  // 当图片URL变化时，重置比例为默认值，等待新图片加载
  imageAspectRatio.value = 1
}, { immediate: true })

const startDragging = (event) => {
  isDragging.value = true
  document.addEventListener('mousemove', handleDrag)
  document.addEventListener('mouseup', stopDragging)
  document.addEventListener('touchmove', handleDrag)
  document.addEventListener('touchend', stopDragging)
  event.preventDefault()
}

const handleDrag = (event) => {
  if (!isDragging.value || !comparisonContainer.value) return

  const rect = comparisonContainer.value.getBoundingClientRect()
  const clientX = event.clientX || (event.touches && event.touches[0].clientX)
  const x = clientX - rect.left
  const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100))

  sliderPosition.value = percentage
}

const stopDragging = () => {
  isDragging.value = false
  document.removeEventListener('mousemove', handleDrag)
  document.removeEventListener('mouseup', stopDragging)
  document.removeEventListener('touchmove', handleDrag)
  document.removeEventListener('touchend', stopDragging)
}

// 移除下载和重置功能，只保留纯粹的对比功能

// 响应式检测
const updateMobileStatus = () => {
  isMobile.value = ImageSizeUtils.isMobile()
}

// 键盘快捷键支持
const handleKeyPress = (event) => {
  if (event.key === 'ArrowLeft') {
    sliderPosition.value = Math.max(0, sliderPosition.value - 5)
  } else if (event.key === 'ArrowRight') {
    sliderPosition.value = Math.min(100, sliderPosition.value + 5)
  }
}

onMounted(() => {
  updateMobileStatus()
  window.addEventListener('resize', updateMobileStatus)
  document.addEventListener('keydown', handleKeyPress)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateMobileStatus)
  document.removeEventListener('keydown', handleKeyPress)
  stopDragging()
})
</script>

<style scoped>
.comparison-container {
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  user-select: none;
  cursor: pointer;
  transition: all 0.3s ease;
  min-height: 300px;
  max-height: 500px;
  height: 400px;
  /* 使用弹性布局确保居中，避免子元素宽度为0 */
  display: flex;
  justify-content: center;
  align-items: center;
  /* 限制最大宽度，确保图片不会过宽 */
  max-width: 100%;
  margin: 0 auto;
}

.comparison-wrapper {
  position: relative;
  overflow: hidden;
  cursor: col-resize;
  background: #000000;
  /* 使用弹性布局的子元素，确保有明确的尺寸 */
  width: 100%;
  height: 100%;
  min-height: 300px;
  max-height: 500px;
  /* 确保wrapper能够正确显示内容 */
  flex-shrink: 0;
}

.image-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.comparison-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: center;
  display: block;
}

.result-layer {
  transition: clip-path 0.1s ease-out;
}



.comparison-slider {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 4px;
  background: white;
  cursor: col-resize;
  z-index: 20;
  transform: translateX(-2px);
  left: 50%; /* 确保滑块初始位置在中间 */
}

.slider-line {
  width: 100%;
  height: 100%;
  background: white;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
}

.slider-handle {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 48px;
  height: 48px;
  background: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  cursor: grab;
}

.slider-handle:active {
  cursor: grabbing;
}

.slider-circle {
  width: 8px;
  height: 8px;
  background: #1989fa;
  border-radius: 50%;
}

.slider-arrow {
  opacity: 0.7;
  font-size: 12px;
  color: #666;
}



@media (max-width: 768px) {
  .comparison-container {
    height: 300px; /* 移动端固定较小高度 */
    min-height: 300px;
    max-height: 400px;
  }

  .comparison-wrapper {
    min-height: 300px;
    max-height: 400px;
  }

  .slider-handle {
    width: 36px;
    height: 36px;
  }
}
</style>
