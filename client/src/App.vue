<template>
  <div class="app">
    <router-view />
    <!-- VantUI Toast 会自动处理，无需手动添加容器 -->

    <!-- WebSocket 连接状态指示器 -->
    <WebSocketStatus />
  </div>
</template>

<script setup>
import WebSocketStatus from './components/WebSocketStatus.vue'
// VantUI Toast 无需导入容器组件
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

/* body样式已移至style.css */

.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
</style>
