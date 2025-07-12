<template>
  <div class="toast-container">
    <AppToast
      v-for="toast in toasts"
      :key="toast.id"
      :visible="toast.visible"
      :type="toast.type"
      :title="toast.title"
      :message="toast.message"
      :duration="0"
      :closable="toast.closable"
      :show-icon="toast.showIcon"
      :position="toast.position"
      @close="removeToast(toast.id)"
      @click="handleToastClick(toast)"
    />
  </div>
</template>

<script setup>
import AppToast from './AppToast.vue'
import { useToast } from '../../composables/useToast.js'

const { toasts, removeToast } = useToast()

const handleToastClick = (toast) => {
  // 可以在这里添加点击Toast的处理逻辑
  console.log('Toast clicked:', toast)
}
</script>

<style scoped>
.toast-container {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 1000;
}

.toast-container > * {
  pointer-events: auto;
}
</style>
