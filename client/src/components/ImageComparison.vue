<template>
  <div class="result-container">
    <div class="comparison-container" ref="comparisonContainer">
      <div class="comparison-wrapper" :style="containerStyle">
        <!-- 原图层 -->
        <div class="image-layer original-layer">
          <img
            :src="originalImage"
            alt="原图"
            class="comparison-image"
            @load="handleImageLoad"
            ref="originalImageRef"
          />
        </div>

        <!-- 结果图层 -->
        <div
          class="image-layer result-layer"
          :style="{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }"
        >
          <img :src="resultImage" alt="处理结果" class="comparison-image" />
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

    <!-- 操作按钮 -->
    <div class="result-actions">
      <van-button
        @click="downloadResult"
        type="primary"
        size="normal"
        round
        icon="down"
      >
        下载处理结果
      </van-button>
      <van-button
        @click="resetProcess"
        type="default"
        size="normal"
        round
        icon="replay"
      >
        重新选择图片
      </van-button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { Toast } from 'vant'

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

const emit = defineEmits(['reset'])

const sliderPosition = ref(50)
const isDragging = ref(false)
const comparisonContainer = ref(null)
const originalImageRef = ref(null)
const imageAspectRatio = ref(1) // 默认1:1比例

// 计算容器样式
const containerStyle = computed(() => {
  return {
    aspectRatio: imageAspectRatio.value.toString()
  }
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

const downloadResult = () => {
  const link = document.createElement('a')
  link.href = props.resultImage
  link.download = `processed-image-${Date.now()}.jpg`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  Toast.success('图片下载已开始')
}

const resetProcess = () => {
  emit('reset')
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
  document.addEventListener('keydown', handleKeyPress)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyPress)
  stopDragging()
})
</script>

<style scoped>
.result-container {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 20px;
  padding: 24px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
}

.comparison-container {
  position: relative;
  margin: 16px 0;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  user-select: none;
  background: var(--bg-dark);
  width: 100%;
}

.comparison-wrapper {
  position: relative;
  width: 100%;
  overflow: hidden;
  cursor: col-resize;
  background: #000000;
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
  height: auto;
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
  background: var(--primary-color);
  border-radius: 50%;
}

.slider-arrow {
  opacity: 0.7;
}

.result-actions {
  display: flex;
  gap: 16px;
  justify-content: center;
  margin-top: 24px;
}

@media (max-width: 768px) {
  .comparison-container {
    /* height: 60vh; */
    min-height: 400px;
    /* max-height: 600px; */
  }

  .result-actions {
    flex-direction: column;
    gap: 12px;
  }

  .slider-handle {
    width: 36px;
    height: 36px;
  }
}
</style>
