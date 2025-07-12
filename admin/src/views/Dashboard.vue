<template>
  <div class="dashboard">
    <h1 class="page-title">仪表盘</h1>

    <!-- 统计卡片 -->
    <el-row :gutter="20" class="stats-row">
      <el-col :xs="24" :sm="12" :md="6">
        <div class="stat-card">
          <div class="stat-icon primary">
            <el-icon><User /></el-icon>
          </div>
          <div class="stat-value">{{ stats.totalUsers || 0 }}</div>
          <div class="stat-label">总用户数</div>
        </div>
      </el-col>

      <el-col :xs="24" :sm="12" :md="6">
        <div class="stat-card">
          <div class="stat-icon success">
            <el-icon><CreditCard /></el-icon>
          </div>
          <div class="stat-value">{{ stats.totalCards || 0 }}</div>
          <div class="stat-label">等级卡总数</div>
        </div>
      </el-col>

      <el-col :xs="24" :sm="12" :md="6">
        <div class="stat-card">
          <div class="stat-icon warning">
            <el-icon><Coin /></el-icon>
          </div>
          <div class="stat-value">{{ formatNumber(stats.totalPoints) || 0 }}</div>
          <div class="stat-label">总积分数</div>
        </div>
      </el-col>

      <el-col :xs="24" :sm="12" :md="6">
        <div class="stat-card">
          <div class="stat-icon danger">
            <el-icon><TrendCharts /></el-icon>
          </div>
          <div class="stat-value">{{ stats.todayActiveUsers || 0 }}</div>
          <div class="stat-label">今日活跃用户</div>
        </div>
      </el-col>
    </el-row>

    <!-- 图表区域 -->
    <el-row :gutter="20" class="charts-row">
      <el-col :xs="24" :lg="12">
        <el-card class="chart-card">
          <template #header>
            <div class="card-header">
              <span>用户注册趋势</span>
              <el-button type="text" @click="refreshCharts">
                <el-icon><Refresh /></el-icon>
              </el-button>
            </div>
          </template>
          <div class="chart-container" ref="userChartRef"></div>
        </el-card>
      </el-col>

      <el-col :xs="24" :lg="12">
        <el-card class="chart-card">
          <template #header>
            <div class="card-header">
              <span>积分消费统计</span>
              <el-button type="text" @click="refreshCharts">
                <el-icon><Refresh /></el-icon>
              </el-button>
            </div>
          </template>
          <div class="chart-container" ref="pointsChartRef"></div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 最近活动 -->
    <el-card class="activity-card">
      <template #header>
        <div class="card-header">
          <span>最近活动</span>
          <el-button type="text" @click="loadStats">
            <el-icon><Refresh /></el-icon>
          </el-button>
        </div>
      </template>

      <el-timeline>
        <el-timeline-item
          v-for="(activity, index) in recentActivities"
          :key="index"
          :timestamp="activity.time"
          placement="top"
        >
          <el-card>
            <h4>{{ activity.title }}</h4>
            <p>{{ activity.description }}</p>
          </el-card>
        </el-timeline-item>
      </el-timeline>

      <div v-if="recentActivities.length === 0" class="no-data">
        <el-empty description="暂无最近活动" />
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { getDashboardStats } from '@/api/dashboard'

const stats = ref({
  totalUsers: 0,
  totalCards: 0,
  totalPoints: 0,
  todayActiveUsers: 0
})

const recentActivities = ref([
  {
    title: '系统启动',
    description: 'iComfy管理系统已成功启动',
    time: new Date().toLocaleString()
  }
])

const userChartRef = ref()
const pointsChartRef = ref()

// 格式化数字
const formatNumber = (num) => {
  if (!num) return 0
  return num.toLocaleString()
}

// 加载统计数据
const loadStats = async () => {
  try {
    const response = await getDashboardStats()
    if (response.success) {
      // 映射后端数据到前端显示格式
      stats.value = {
        totalUsers: response.data.users?.total_users || 0,
        totalCards: response.data.cards?.total_cards || 0,
        totalPoints: response.data.points?.total_points || 0,
        todayActiveUsers: response.data.users?.today_new_users || 0
      }
    }
  } catch (error) {
    console.error('加载统计数据失败:', error)
    ElMessage.error('加载统计数据失败')
  }
}

// 初始化图表
const initCharts = async () => {
  await nextTick()

  // 这里可以使用 ECharts 初始化图表
  // 由于依赖安装问题，暂时显示占位内容
  if (userChartRef.value) {
    userChartRef.value.innerHTML = '<div style="height: 300px; display: flex; align-items: center; justify-content: center; color: #909399;">用户注册趋势图表</div>'
  }

  if (pointsChartRef.value) {
    pointsChartRef.value.innerHTML = '<div style="height: 300px; display: flex; align-items: center; justify-content: center; color: #909399;">积分消费统计图表</div>'
  }
}

// 刷新图表
const refreshCharts = () => {
  ElMessage.success('图表已刷新')
  initCharts()
}

onMounted(() => {
  loadStats()
  initCharts()
})
</script>

<style scoped>
.dashboard {
  max-width: 1200px;
  margin: 0 auto;
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 24px;
}

.stats-row {
  margin-bottom: 24px;
}

.charts-row {
  margin-bottom: 24px;
}

.chart-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chart-container {
  height: 300px;
  background: #fafafa;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #909399;
}

.activity-card {
  .el-timeline {
    padding: 0 20px;
  }
}

.no-data {
  text-align: center;
  padding: 40px 0;
}

@media (max-width: 768px) {
  .stats-row .el-col {
    margin-bottom: 16px;
  }

  .charts-row .el-col {
    margin-bottom: 16px;
  }
}
</style>
