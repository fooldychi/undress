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
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.url && row.type === 'spend'"
              type="text"
              size="small"
              @click="viewResult(row)"
            >
              查看结果
            </el-button>
            <span v-else-if="row.type === 'spend'" class="no-result">无结果</span>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 结果查看弹窗 -->
    <el-dialog
      v-model="resultDialogVisible"
      :title="resultDialogTitle"
      width="80%"
      :close-on-click-modal="false"
      class="result-dialog"
    >
      <div class="result-content">
        <div class="result-info">
          <p><strong>描述:</strong> {{ currentResult.description }}</p>
          <p><strong>时间:</strong> {{ formatDate(currentResult.created_at) }}</p>
          <p><strong>积分:</strong> {{ currentResult.points }}</p>
        </div>

        <div class="result-preview" v-loading="previewLoading">
          <!-- 图片预览 -->
          <div v-if="isImage(currentResult.url)" class="image-preview">
            <img
              :src="getFullUrl(currentResult.url)"
              alt="结果图片"
              @load="previewLoading = false"
              @error="handlePreviewError"
            />
          </div>

          <!-- 视频预览 -->
          <div v-else-if="isVideo(currentResult.url)" class="video-preview">
            <video
              :src="getFullUrl(currentResult.url)"
              controls
              @loadeddata="previewLoading = false"
              @error="handlePreviewError"
            >
              您的浏览器不支持视频播放
            </video>
          </div>

          <!-- 其他文件类型 -->
          <div v-else class="file-preview">
            <el-icon size="48"><Document /></el-icon>
            <p>{{ getFileName(currentResult.url) }}</p>
            <p class="file-type">{{ getFileType(currentResult.url) }}</p>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="resultDialogVisible = false">关闭</el-button>
          <el-button type="primary" @click="downloadResult">
            <el-icon><Download /></el-icon>
            下载
          </el-button>
          <el-button type="success" @click="openInNewTab">
            <el-icon><View /></el-icon>
            新窗口打开
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh, Download, View, Document } from '@element-plus/icons-vue'
import { getPointsList } from '@/api/points'

const loading = ref(false)
const pointsList = ref([])
const resultDialogVisible = ref(false)
const resultDialogTitle = ref('')
const currentResult = ref({})
const previewLoading = ref(false)

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

// 查看结果
const viewResult = (row) => {
  if (!row.url) {
    ElMessage.warning('暂无结果可查看')
    return
  }

  currentResult.value = row
  resultDialogTitle.value = `查看结果 - ${row.description}`
  resultDialogVisible.value = true
  previewLoading.value = true
}

// 获取完整URL
const getFullUrl = (url) => {
  if (!url) return ''

  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  } else if (url.startsWith('/')) {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'
    return `${baseUrl}${url}`
  } else {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'
    return `${baseUrl}/${url}`
  }
}

// 判断是否为图片
const isImage = (url) => {
  if (!url) return false
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg']
  return imageExtensions.some(ext => url.toLowerCase().includes(ext))
}

// 判断是否为视频
const isVideo = (url) => {
  if (!url) return false
  const videoExtensions = ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv']
  return videoExtensions.some(ext => url.toLowerCase().includes(ext))
}

// 获取文件名
const getFileName = (url) => {
  if (!url) return '未知文件'
  const parts = url.split('/')
  return parts[parts.length - 1] || '未知文件'
}

// 获取文件类型
const getFileType = (url) => {
  if (!url) return '未知类型'
  const extension = url.split('.').pop()?.toLowerCase()
  return extension ? `.${extension}` : '未知类型'
}

// 处理预览错误
const handlePreviewError = () => {
  previewLoading.value = false
  ElMessage.error('预览加载失败')
}

// 下载文件
const downloadResult = () => {
  if (!currentResult.value.url) {
    ElMessage.warning('无法下载，文件URL不存在')
    return
  }

  const fullUrl = getFullUrl(currentResult.value.url)
  const fileName = getFileName(currentResult.value.url)

  // 创建下载链接
  const link = document.createElement('a')
  link.href = fullUrl
  link.download = fileName
  link.target = '_blank'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  ElMessage.success('开始下载')
}

// 在新窗口打开
const openInNewTab = () => {
  if (!currentResult.value.url) {
    ElMessage.warning('无法打开，文件URL不存在')
    return
  }

  const fullUrl = getFullUrl(currentResult.value.url)
  window.open(fullUrl, '_blank')
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

.no-result {
  color: #909399;
  font-size: 12px;
}

/* 结果弹窗样式 */
.result-dialog {
  .el-dialog__body {
    padding: 20px;
  }
}

.result-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.result-info {
  background: #f8f9fa;
  padding: 16px;
  border-radius: 8px;
  border-left: 4px solid #409eff;
}

.result-info p {
  margin: 8px 0;
  color: #606266;
}

.result-info strong {
  color: #303133;
  margin-right: 8px;
}

.result-preview {
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px dashed #dcdfe6;
  border-radius: 8px;
  background: #fafafa;
}

.image-preview img {
  max-width: 100%;
  max-height: 500px;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.video-preview video {
  max-width: 100%;
  max-height: 500px;
  border-radius: 8px;
}

.file-preview {
  text-align: center;
  color: #606266;
}

.file-preview p {
  margin: 8px 0;
}

.file-type {
  color: #909399;
  font-size: 14px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
