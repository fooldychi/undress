<template>
  <div class="mobile-page">
    <!-- 顶部导航 -->
    <TopNavigation
      ref="topNavigationRef"
      :title="title"
      :show-back="showBack"
      @login="$emit('login', $event)"
      @logout="$emit('logout', $event)"
    />

    <!-- 页面内容 -->
    <div class="mobile-page-content">
      <!-- 页面头部（可选） -->
      <div v-if="$slots.header" class="mobile-page-header">
        <slot name="header" />
      </div>

      <!-- 主要内容 -->
      <div class="mobile-page-main">
        <slot />
      </div>

      <!-- 页面底部（可选） -->
      <div v-if="$slots.footer" class="mobile-page-footer">
        <slot name="footer" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import TopNavigation from '../TopNavigation.vue'

// TopNavigation 组件引用
const topNavigationRef = ref(null)

// Props
defineProps({
  title: {
    type: String,
    default: ''
  },
  showBack: {
    type: Boolean,
    default: null
  }
})

// Events
defineEmits(['login', 'logout'])

// 暴露给父组件的方法
defineExpose({
  showLoginModal: () => {
    if (topNavigationRef.value) {
      topNavigationRef.value.showLoginModal()
    }
  }
})
</script>

<style scoped>
.mobile-page {
  min-height: 100vh;
  background: linear-gradient(135deg,
    #080814 0%,
    #0c1224 25%,
    #0f0f1a 50%,
    #071a30 75%,
    #0f0f1a 100%);
  background-size: 400% 400%;
  animation: gradientShift 15s ease infinite;
  position: relative;
}

/* 添加动态渐变动画 */
@keyframes gradientShift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

/* 添加纹理覆盖层 */
.mobile-page::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background:
    radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.3) 0%, transparent 50%),
    radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.3) 0%, transparent 50%),
    radial-gradient(circle at 40% 40%, rgba(120, 219, 255, 0.2) 0%, transparent 50%);
  pointer-events: none;
}

.mobile-page-content {
  padding-top: 64px; /* 匹配导航栏高度 */
  min-height: calc(100vh - 64px); /* 匹配导航栏高度 */
  position: relative;
  z-index: 1;
}

.mobile-page-header {
  padding: 20px;
  background: transparent;
  /* Removing border and shadow */
  border-bottom: none;
  box-shadow: none;
}

.mobile-page-main {
  padding: 0 20px 20px 20px;
  padding-top: 0;
  flex: 1;
}

.mobile-page-footer {
  padding: 20px;
  background: rgba(255, 255, 255, 0.05); /* Reduced from 0.1 */
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-top: 1px solid rgba(255, 255, 255, 0.1); /* Reduced from 0.2 */
  box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.1);
}

/* 移动端优化 */
@media (max-width: 768px) {
  .mobile-page-content {
    padding-top: 60px; /* 移动端导航栏高度 */
    min-height: calc(100vh - 60px); /* 匹配移动端导航栏高度 */
  }

  .mobile-page-main {
    padding: 16px;
    padding-top: 0;
  }

  .mobile-page-header,
  .mobile-page-footer {
    padding: 16px;
  }
}

/* 深色主题适配 */
@media (prefers-color-scheme: dark) {
  .mobile-page {
    background: linear-gradient(135deg,
      #050510 0%,
      #080f20 25%,
      #0a0a15 50%,
      #051525 75%,
      #0a0a15 100%);
  }

  .mobile-page::before {
    background:
      radial-gradient(circle at 20% 80%, rgba(79, 172, 254, 0.2) 0%, transparent 50%),
      radial-gradient(circle at 80% 20%, rgba(168, 85, 247, 0.2) 0%, transparent 50%),
      radial-gradient(circle at 40% 40%, rgba(34, 197, 94, 0.1) 0%, transparent 50%);
  }

  .mobile-page-header {
    background: transparent;
    /* Removing border in dark mode too */
    border-color: transparent;
  }
}

/* 减少动画在低性能设备上的影响 */
@media (prefers-reduced-motion: reduce) {
  .mobile-page {
    animation: none;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  }
}
</style>










