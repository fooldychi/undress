<template>
  <div id="app">
    <router-view />
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getToken } from '@/utils/auth'

const router = useRouter()

onMounted(() => {
  // 检查登录状态
  const token = getToken()
  const currentPath = router.currentRoute.value.path
  
  if (!token && currentPath !== '/login') {
    router.push('/login')
  } else if (token && currentPath === '/login') {
    router.push('/dashboard')
  }
})
</script>

<style>
#app {
  min-height: 100vh;
}

/* 全局滚动条样式 */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* Element Plus 样式覆盖 */
.el-menu--horizontal .el-menu-item {
  border-bottom: none !important;
}

.el-table .cell {
  word-break: break-word;
}

/* 响应式表格 */
@media (max-width: 768px) {
  .el-table {
    font-size: 12px;
  }
  
  .el-table .cell {
    padding: 8px 4px;
  }
}
</style>
