<template>
  <div class="test-api-container">
    <el-card>
      <template #header>
        <h2>API 测试工具</h2>
      </template>
      
      <el-space direction="vertical" size="large" style="width: 100%">
        <!-- Token 设置 -->
        <el-card>
          <template #header>
            <h3>Token 设置</h3>
          </template>
          <el-input 
            v-model="testToken" 
            placeholder="输入测试token"
            style="margin-bottom: 10px"
          />
          <el-button @click="setTestToken" type="primary">设置Token</el-button>
          <el-button @click="clearToken" type="danger">清除Token</el-button>
          <p>当前Token: {{ currentToken || '无' }}</p>
        </el-card>

        <!-- 接口测试 -->
        <el-card>
          <template #header>
            <h3>接口测试</h3>
          </template>
          
          <el-space wrap>
            <el-button @click="testHealthAPI" type="success">测试健康检查</el-button>
            <el-button @click="testCardTypesAPI" type="primary" :loading="loading">测试等级卡类型</el-button>
            <el-button @click="testCardsAPI" type="info">测试等级卡列表</el-button>
          </el-space>
        </el-card>

        <!-- 结果显示 -->
        <el-card v-if="testResult">
          <template #header>
            <h3>测试结果</h3>
          </template>
          <pre>{{ testResult }}</pre>
        </el-card>
      </el-space>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getToken, setToken, removeToken } from '@/utils/auth'
import { getCardTypes, getCardList } from '@/api/cards'
import request from '@/utils/request'

const testToken = ref('admin-token')
const currentToken = ref('')
const loading = ref(false)
const testResult = ref('')

// 获取当前token
const getCurrentToken = () => {
  currentToken.value = getToken() || ''
}

// 设置测试token
const setTestToken = () => {
  setToken(testToken.value)
  getCurrentToken()
  ElMessage.success('Token已设置')
}

// 清除token
const clearToken = () => {
  removeToken()
  getCurrentToken()
  ElMessage.success('Token已清除')
}

// 测试健康检查API
const testHealthAPI = async () => {
  try {
    loading.value = true
    const response = await request({
      url: '/health',
      method: 'get'
    })
    testResult.value = JSON.stringify(response, null, 2)
    ElMessage.success('健康检查成功')
  } catch (error) {
    testResult.value = `错误: ${error.message}\n${JSON.stringify(error.response?.data, null, 2)}`
    ElMessage.error('健康检查失败')
  } finally {
    loading.value = false
  }
}

// 测试等级卡类型API
const testCardTypesAPI = async () => {
  try {
    loading.value = true
    console.log('🧪 开始测试等级卡类型API...')
    
    const response = await getCardTypes()
    testResult.value = JSON.stringify(response, null, 2)
    ElMessage.success('等级卡类型API测试成功')
  } catch (error) {
    console.error('❌ 等级卡类型API测试失败:', error)
    testResult.value = `错误: ${error.message}\n${JSON.stringify(error.response?.data, null, 2)}`
    ElMessage.error('等级卡类型API测试失败')
  } finally {
    loading.value = false
  }
}

// 测试等级卡列表API
const testCardsAPI = async () => {
  try {
    loading.value = true
    const response = await getCardList({ page: 1, pageSize: 10 })
    testResult.value = JSON.stringify(response, null, 2)
    ElMessage.success('等级卡列表API测试成功')
  } catch (error) {
    testResult.value = `错误: ${error.message}\n${JSON.stringify(error.response?.data, null, 2)}`
    ElMessage.error('等级卡列表API测试失败')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  getCurrentToken()
})
</script>

<style scoped>
.test-api-container {
  padding: 20px;
}

pre {
  background-color: #f5f5f5;
  padding: 15px;
  border-radius: 4px;
  overflow-x: auto;
  max-height: 400px;
  overflow-y: auto;
}
</style>
