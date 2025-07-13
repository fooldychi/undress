<template>
  <van-button
    @click="goHome"
    type="default"
    size="small"
    plain
    round
    icon="arrow-left"
    class="back-to-home-btn"
  >
    返回首页
  </van-button>
</template>

<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

const goHome = () => {
  router.push('/')
}
</script>

<style scoped>
.back-to-home-btn {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: var(--text-color);
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
}

.back-to-home-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: var(--primary-color);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.back-to-home-btn:active {
  transform: translateY(0);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .back-to-home-btn {
    font-size: 12px;
    padding: 6px 12px;
  }
}
</style>
