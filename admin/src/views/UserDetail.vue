<template>
  <div class="user-detail">
    <div class="page-header">
      <el-button @click="goBack" type="text">
        <el-icon><ArrowLeft /></el-icon>
        返回用户列表
      </el-button>
      <h1 class="page-title">用户详情</h1>
    </div>
    
    <el-card v-loading="loading">
      <div v-if="userInfo">
        <h2>{{ userInfo.username }}</h2>
        <p>邮箱: {{ userInfo.email }}</p>
        <p>积分: {{ userInfo.points }}</p>
        <p>状态: {{ userInfo.status === 'active' ? '正常' : '禁用' }}</p>
        <p>注册时间: {{ formatDate(userInfo.created_at) }}</p>
      </div>
      <el-empty v-else description="用户不存在" />
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const userInfo = ref(null)

const formatDate = (date) => {
  if (!date) return ''
  return new Date(date).toLocaleString()
}

const goBack = () => {
  router.push('/users')
}

onMounted(() => {
  // 模拟用户数据
  userInfo.value = {
    id: route.params.id,
    username: `user${route.params.id}`,
    email: `user${route.params.id}@example.com`,
    points: 1000,
    status: 'active',
    created_at: new Date().toISOString()
  }
})
</script>

<style scoped>
.user-detail {
  max-width: 800px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 20px;
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
  margin: 16px 0 0 0;
}
</style>
