<template>
  <div class="cards-page">
    <div class="page-header">
      <h1 class="page-title">等级卡管理</h1>
      <el-button type="primary" @click="showGenerateDialog">
        <el-icon><Plus /></el-icon>
        生成体验卡
      </el-button>
    </div>

    <el-card>
      <el-table :data="cardList" v-loading="loading">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="card_number" label="卡号" width="200" />
        <el-table-column prop="type_name" label="类型" width="120" />
        <el-table-column prop="total_points" label="总积分" width="100" />
        <el-table-column prop="remaining_points" label="剩余积分" width="100" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 生成体验卡对话框 -->
    <el-dialog v-model="generateDialogVisible" title="生成体验卡" width="500px">
      <el-form :model="generateForm" label-width="100px">
        <el-form-item label="卡片数量">
          <el-input-number v-model="generateForm.count" :min="1" :max="100" />
        </el-form-item>
        <el-form-item label="积分数量">
          <el-input-number v-model="generateForm.points" :min="10" :max="1000" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="generateDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleGenerate">生成</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getCardList, generateExperienceCards } from '@/api/cards'

const loading = ref(false)
const cardList = ref([])
const generateDialogVisible = ref(false)

const generateForm = reactive({
  count: 10,
  points: 100
})

const formatDate = (date) => {
  if (!date) return ''
  return new Date(date).toLocaleString()
}

const getStatusType = (status) => {
  const types = {
    'unused': 'success',
    'used': 'info',
    'bound': 'warning'
  }
  return types[status] || 'info'
}

const getStatusText = (status) => {
  const texts = {
    'unused': '未使用',
    'used': '已使用',
    'bound': '已绑定'
  }
  return texts[status] || status
}

const showGenerateDialog = () => {
  generateDialogVisible.value = true
}

const handleGenerate = async () => {
  try {
    const response = await generateExperienceCards({
      count: generateForm.count,
      points: generateForm.points
    })
    if (response.success) {
      ElMessage.success(`已生成 ${generateForm.count} 张体验卡`)
      generateDialogVisible.value = false
      loadCards()
    }
  } catch (error) {
    console.error('生成体验卡失败:', error)
    ElMessage.error('生成体验卡失败')
  }
}

const loadCards = async () => {
  loading.value = true
  try {
    const response = await getCardList({ page: 1, pageSize: 50 })
    if (response.success) {
      cardList.value = response.data.items
    }
  } catch (error) {
    console.error('加载等级卡列表失败:', error)
    ElMessage.error('加载等级卡列表失败')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadCards()
})
</script>

<style scoped>
.cards-page {
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
