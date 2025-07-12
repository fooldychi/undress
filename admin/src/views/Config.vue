<template>
  <div class="config-page">
    <div class="page-header">
      <h1 class="page-title">系统配置</h1>
      <el-button type="primary" @click="saveConfig">
        <el-icon><Check /></el-icon>
        保存配置
      </el-button>
    </div>
    
    <el-row :gutter="20">
      <el-col :span="12">
        <el-card title="基础配置">
          <template #header>
            <span>基础配置</span>
          </template>
          <el-form :model="config" label-width="120px">
            <el-form-item label="系统名称">
              <el-input v-model="config.systemName" />
            </el-form-item>
            <el-form-item label="系统描述">
              <el-input v-model="config.systemDesc" type="textarea" />
            </el-form-item>
            <el-form-item label="默认积分">
              <el-input-number v-model="config.defaultPoints" :min="0" />
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>
      
      <el-col :span="12">
        <el-card title="AI服务配置">
          <template #header>
            <span>AI服务配置</span>
          </template>
          <el-form :model="config" label-width="120px">
            <el-form-item label="换脸服务">
              <el-switch v-model="config.faceSwapEnabled" />
            </el-form-item>
            <el-form-item label="换装服务">
              <el-switch v-model="config.clothingSwapEnabled" />
            </el-form-item>
            <el-form-item label="文本生图">
              <el-switch v-model="config.textToImageEnabled" />
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { reactive } from 'vue'
import { ElMessage } from 'element-plus'

const config = reactive({
  systemName: 'iComfy AI图像处理平台',
  systemDesc: '专业的AI图像处理服务平台',
  defaultPoints: 100,
  faceSwapEnabled: true,
  clothingSwapEnabled: true,
  textToImageEnabled: true
})

const saveConfig = () => {
  ElMessage.success('配置保存成功')
}
</script>

<style scoped>
.config-page {
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
