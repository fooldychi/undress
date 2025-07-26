<template>
  <div
    class="svg-icon"
    :style="{
      width: size + 'px',
      height: size + 'px',
      color: color
    }"
    v-html="svgContent"
  />
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { getSvgIcon } from '../../utils/iconManager.js'

const props = defineProps({
  name: {
    type: String,
    required: true
  },
  size: {
    type: [String, Number],
    default: 24
  },
  color: {
    type: String,
    default: 'var(--van-primary-color)'
  }
})

const svgContent = ref('')

const loadSvg = () => {
  const svg = getSvgIcon(props.name)
  if (svg) {
    svgContent.value = svg
  } else {
    console.warn(`SVG图标 ${props.name} 未找到`)
    svgContent.value = '<div style="display: flex; align-items: center; justify-content: center; font-size: 12px; color: #999;">图标未找到</div>'
  }
}

onMounted(() => {
  loadSvg()
})

// 监听name变化，重新加载SVG
watch(() => props.name, () => {
  loadSvg()
})
</script>

<style scoped>
.svg-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.svg-icon :deep(svg) {
  width: 100%;
  height: 100%;
}
</style>
