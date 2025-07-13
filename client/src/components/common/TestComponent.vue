<template>
  <div class="test-component">
    <h3>组件测试</h3>
    <p>如果你能看到这个组件，说明基础语法没有问题。</p>
    
    <!-- 测试v-bind语法 -->
    <div class="test-container" :style="{ height: containerHeight }">
      测试容器
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

// Props
const props = defineProps({
  height: {
    type: [String, Number],
    default: 100
  }
})

// 计算属性
const containerHeight = computed(() => {
  return typeof props.height === 'number' 
    ? `${props.height}px` 
    : props.height
})
</script>

<style scoped>
.test-component {
  padding: 16px;
  border: 1px solid #ccc;
  border-radius: 8px;
  margin: 16px;
}

.test-container {
  background: #f0f0f0;
  border: 1px solid #ddd;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 16px;
}
</style>
