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
        <div class="user-basic-info">
          <h2>{{ userInfo.username }}</h2>
          <div class="info-grid">
            <div class="info-item">
              <label>用户ID:</label>
              <span>{{ userInfo.id }}</span>
            </div>
            <div class="info-item">
              <label>邮箱:</label>
              <span>{{ userInfo.email }}</span>
            </div>
            <div class="info-item">
              <label>状态:</label>
              <el-tag :type="getStatusType(userInfo.status)">
                {{ getStatusText(userInfo.status) }}
              </el-tag>
            </div>
            <div class="info-item">
              <label>注册时间:</label>
              <span>{{ formatDate(userInfo.created_at) }}</span>
            </div>
            <div class="info-item" v-if="userInfo.updated_at">
              <label>更新时间:</label>
              <span>{{ formatDate(userInfo.updated_at) }}</span>
            </div>
            <div class="info-item" v-if="userInfo.last_login">
              <label>最后登录:</label>
              <span>{{ formatDate(userInfo.last_login) }}</span>
            </div>
          </div>
        </div>
      </div>
      <el-empty v-else-if="!loading" description="用户不存在" />
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getUserDetail } from '@/api/users'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const userInfo = ref(null)

const formatDate = (date) => {
  if (!date) return ''
  return new Date(date).toLocaleString()
}

const getStatusType = (status) => {
  switch (status) {
    case 'active': return 'success'
    case 'banned': return 'danger'
    case 'inactive': return 'warning'
    default: return 'info'
  }
}

const getStatusText = (status) => {
  switch (status) {
    case 'active': return '正常'
    case 'banned': return '已封禁'
    case 'inactive': return '未激活'
    default: return '未知'
  }
}

const goBack = () => {
  router.push('/users')
}

// 加载用户详情
const loadUserDetail = async () => {
  loading.value = true
  try {
    const response = await getUserDetail(route.params.id)
    if (response.success) {
      userInfo.value = response.data.user
    } else {
      ElMessage.error('获取用户详情失败')
    }
  } catch (error) {
    console.error('获取用户详情失败:', error)
    ElMessage.error('获取用户详情失败')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadUserDetail()
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

.user-basic-info h2 {
  margin-bottom: 20px;
  color: #303133;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 16px;
}

.info-item {
  display: flex;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
}

.info-item label {
  font-weight: 500;
  color: #606266;
  min-width: 100px;
  margin-right: 12px;
}

.info-item span {
  color: #303133;
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
  margin: 16px 0 0 0;
}
</style>
