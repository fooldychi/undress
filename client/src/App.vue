<template>
  <div class="app">
    <router-view />
    <!-- VantUI Toast 会自动处理，无需手动添加容器 -->

    <!-- 全局错误弹窗 -->
    <GlobalErrorModal
      :visible="errorState.visible"
      :title="errorState.title"
      :message="errorState.message"
      @close="hideGlobalError"
    />
  </div>
</template>

<script setup>
import GlobalErrorModal from './components/GlobalErrorModal.vue'
import { getErrorState, hideGlobalError } from './services/globalErrorHandler.js'

// 获取全局错误状态
const errorState = getErrorState()
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
