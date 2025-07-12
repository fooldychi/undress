<template>
  <div class="load-balancer-status">
    <div class="status-header">
      <h3>ComfyUI 服务器状态</h3>
      <div class="header-actions">
        <van-button 
          size="small" 
          type="primary" 
          @click="refreshStatus"
          :loading="refreshing"
        >
          🔄 刷新
        </van-button>
        <van-button 
          size="small" 
          type="default" 
          @click="showDetails = !showDetails"
        >
          {{ showDetails ? '隐藏详情' : '显示详情' }}
        </van-button>
      </div>
    </div>

    <div class="status-summary">
      <div class="summary-item">
        <span class="label">总服务器:</span>
        <span class="value">{{ stats.total }}</span>
      </div>
      <div class="summary-item">
        <span class="label">健康服务器:</span>
        <span class="value healthy">{{ stats.healthy }}</span>
      </div>
      <div class="summary-item">
        <span class="label">当前锁定:</span>
        <span class="value locked">{{ stats.locked ? '是' : '否' }}</span>
      </div>
    </div>

    <div v-if="showDetails" class="server-list">
      <div 
        v-for="server in stats.servers" 
        :key="server.url"
        class="server-item"
        :class="{ 
          healthy: server.healthy, 
          unhealthy: !server.healthy,
          locked: server.locked 
        }"
      >
        <div class="server-info">
          <div class="server-url">
            <span class="status-icon">{{ server.healthy ? '✅' : '❌' }}</span>
            <span class="url">{{ server.url }}</span>
            <span v-if="server.locked" class="lock-icon">🔒</span>
          </div>
          <div class="server-meta">
            <span class="type">{{ server.type === 'primary' ? '主服务器' : '备用服务器' }}</span>
            <span class="priority">优先级: {{ server.priority }}</span>
            <span class="queue">队列: {{ server.queue }}</span>
          </div>
        </div>
        <div class="server-actions">
          <van-button 
            size="mini" 
            type="primary" 
            @click="testServer(server.url)"
            :loading="testingServers.has(server.url)"
          >
            测试
          </van-button>
        </div>
      </div>
    </div>

    <div v-if="lastUpdate" class="last-update">
      最后更新: {{ formatTime(lastUpdate) }}
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { Toast } from 'vant'
import loadBalancer from '../services/loadBalancer.js'

// 响应式数据
const stats = ref({
  total: 0,
  healthy: 0,
  locked: null,
  servers: []
})

const showDetails = ref(false)
const refreshing = ref(false)
const testingServers = ref(new Set())
const lastUpdate = ref(null)

// 定时器
let updateTimer = null

// 刷新状态
const refreshStatus = async () => {
  refreshing.value = true
  try {
    // 强制更新负载均衡器状态
    await loadBalancer.updateServerLoads()
    
    // 获取最新统计信息
    const newStats = loadBalancer.getServerStats()
    stats.value = newStats
    lastUpdate.value = new Date()
    
    console.log('✅ 负载均衡器状态已刷新:', newStats)
    Toast.success('状态已刷新')
  } catch (error) {
    console.error('❌ 刷新状态失败:', error)
    Toast.fail('刷新失败: ' + error.message)
  } finally {
    refreshing.value = false
  }
}

// 测试单个服务器
const testServer = async (serverUrl) => {
  testingServers.value.add(serverUrl)
  try {
    console.log('🧪 测试服务器:', serverUrl)
    
    // 检查服务器健康状态
    const healthResult = await loadBalancer.checkServerHealth(serverUrl)
    
    if (healthResult.healthy) {
      Toast.success(`服务器 ${serverUrl} 连接正常`)
    } else {
      Toast.fail(`服务器 ${serverUrl} 连接失败`)
    }
    
    // 刷新状态
    await refreshStatus()
    
  } catch (error) {
    console.error('❌ 测试服务器失败:', error)
    Toast.fail('测试失败: ' + error.message)
  } finally {
    testingServers.value.delete(serverUrl)
  }
}

// 格式化时间
const formatTime = (date) => {
  if (!date) return ''
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

// 定时更新状态
const startAutoUpdate = () => {
  updateTimer = setInterval(async () => {
    try {
      const newStats = loadBalancer.getServerStats()
      stats.value = newStats
      lastUpdate.value = new Date()
    } catch (error) {
      console.warn('⚠️ 自动更新状态失败:', error)
    }
  }, 30000) // 30秒更新一次
}

const stopAutoUpdate = () => {
  if (updateTimer) {
    clearInterval(updateTimer)
    updateTimer = null
  }
}

// 组件挂载
onMounted(async () => {
  await refreshStatus()
  startAutoUpdate()
})

// 组件卸载
onUnmounted(() => {
  stopAutoUpdate()
})
</script>

<style scoped>
.load-balancer-status {
  background: var(--van-background-2);
  border-radius: 8px;
  padding: 16px;
  margin: 16px 0;
}

.status-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.status-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--van-text-color);
}

.header-actions {
  display: flex;
  gap: 8px;
}

.status-summary {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
  padding: 12px;
  background: var(--van-background);
  border-radius: 6px;
}

.summary-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.summary-item .label {
  font-size: 12px;
  color: var(--van-text-color-2);
}

.summary-item .value {
  font-size: 16px;
  font-weight: 600;
  color: var(--van-text-color);
}

.summary-item .value.healthy {
  color: var(--van-success-color);
}

.summary-item .value.locked {
  color: var(--van-warning-color);
}

.server-list {
  margin-top: 16px;
}

.server-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  margin-bottom: 8px;
  border-radius: 6px;
  border: 1px solid var(--van-border-color);
}

.server-item.healthy {
  border-color: var(--van-success-color);
  background: rgba(25, 137, 250, 0.05);
}

.server-item.unhealthy {
  border-color: var(--van-danger-color);
  background: rgba(238, 10, 36, 0.05);
}

.server-item.locked {
  border-color: var(--van-warning-color);
  background: rgba(255, 158, 25, 0.05);
}

.server-info {
  flex: 1;
}

.server-url {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.status-icon {
  font-size: 14px;
}

.url {
  font-size: 14px;
  font-weight: 500;
  color: var(--van-text-color);
}

.lock-icon {
  font-size: 12px;
}

.server-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: var(--van-text-color-2);
}

.server-actions {
  margin-left: 12px;
}

.last-update {
  margin-top: 16px;
  text-align: center;
  font-size: 12px;
  color: var(--van-text-color-3);
}
</style>
