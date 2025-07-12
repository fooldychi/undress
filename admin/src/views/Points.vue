<template>
  <div class="points-page">
    <div class="page-header">
      <h1 class="page-title">积分记录</h1>
      <el-button type="primary" @click="loadPoints">
        <el-icon><Refresh /></el-icon>
        刷新
      </el-button>
    </div>

    <el-card>
      <el-table :data="pointsList" v-loading="loading">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="user_id" label="用户ID" width="100" />
        <el-table-column prop="username" label="用户名" width="120" />
        <el-table-column prop="type" label="类型" width="100">
          <template #default="{ row }">
            <el-tag :type="row.type === 'earn' ? 'success' : 'warning'">
              {{ row.type === 'earn' ? '获得' : '消费' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="points" label="积分" width="100" />
        <el-table-column prop="description" label="描述" min-width="200" />
        <el-table-column prop="created_at" label="时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getPointsList } from '@/api/points'

const loading = ref(false)
const pointsList = ref([])

const formatDate = (date) => {
  if (!date) return ''
  return new Date(date).toLocaleString()
}

const loadPoints = async () => {
  loading.value = true
  try {
    const response = await getPointsList({ page: 1, pageSize: 50 })
    if (response.success) {
      pointsList.value = response.data.items.map(item => ({
        ...item,
        type: item.action_type === 'consume' ? 'spend' : 'earn',
        points: item.points_amount
      }))
    }
  } catch (error) {
    console.error('加载积分记录失败:', error)
    ElMessage.error('加载积分记录失败')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadPoints()
})
</script>

<style scoped>
.points-page {
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
  margin: 0;
}
</style>
