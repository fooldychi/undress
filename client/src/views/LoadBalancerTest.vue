<template>
  <div class="load-balancer-test">
    <van-nav-bar title="负载均衡器测试" left-arrow @click-left="$router.back()" />
    
    <div class="test-container">
      <van-cell-group>
        <van-cell title="负载均衡器状态" :value="balancerStatus" />
        <van-cell title="配置的服务器数量" :value="serverCount" />
        <van-cell title="健康服务器数量" :value="healthyCount" />
        <van-cell title="当前锁定服务器" :value="lockedServer || '无'" />
      </van-cell-group>

      <div class="test-actions">
        <van-button 
          type="primary" 
          block 
          @click="testServerSelection"
          :loading="testing"
        >
          测试服务器选择
        </van-button>
        
        <van-button 
          type="default" 
          block 
          @click="refreshServerStatus"
          :loading="refreshing"
        >
          刷新服务器状态
        </van-button>
        
        <van-button 
          type="warning" 
          block 
          @click="testFailover"
          :loading="testingFailover"
        >
          测试故障转移
        </van-button>
      </div>

      <div class="server-list">
        <h3>服务器列表</h3>
        <div 
          v-for="(server, index) in servers" 
          :key="index"
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
              <span>类型: {{ server.type === 'primary' ? '主服务器' : '备用服务器' }}</span>
              <span>优先级: {{ server.priority }}</span>
              <span>队列: {{ server.queue || 0 }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="test-log">
        <h3>测试日志</h3>
        <div class="log-content">
          <div 
            v-for="(log, index) in logs" 
            :key="index"
            class="log-item"
            :class="log.type"
          >
            <span class="log-time">{{ formatTime(log.time) }}</span>
            <span class="log-message">{{ log.message }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { Toast } from 'vant'
import loadBalancer from '../services/loadBalancer.js'

// 响应式数据
const balancerStatus = ref('未知')
const serverCount = ref(0)
const healthyCount = ref(0)
const lockedServer = ref(null)
const servers = ref([])
const logs = ref([])

// 加载状态
const testing = ref(false)
const refreshing = ref(false)
const testingFailover = ref(false)

// 定时器
let statusTimer = null

// 添加日志
const addLog = (message, type = 'info') => {
  logs.value.unshift({
    time: new Date(),
    message,
    type
  })
  
  // 限制日志数量
  if (logs.value.length > 50) {
    logs.value = logs.value.slice(0, 50)
  }
}

// 格式化时间
const formatTime = (date) => {
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

// 更新状态
const updateStatus = async () => {
  try {
    const stats = loadBalancer.getServerStats()
    
    balancerStatus.value = '正常'
    serverCount.value = stats.total
    healthyCount.value = stats.healthy
    lockedServer.value = stats.locked
    servers.value = stats.servers
    
  } catch (error) {
    balancerStatus.value = '异常'
    addLog(`状态更新失败: ${error.message}`, 'error')
  }
}

// 测试服务器选择
const testServerSelection = async () => {
  testing.value = true
  try {
    addLog('开始测试服务器选择...', 'info')
    
    for (let i = 0; i < 3; i++) {
      const selectedServer = await loadBalancer.getOptimalServer()
      addLog(`第${i + 1}次选择: ${selectedServer}`, 'success')
      
      // 等待1秒
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    
    await updateStatus()
    Toast.success('服务器选择测试完成')
    
  } catch (error) {
    addLog(`服务器选择测试失败: ${error.message}`, 'error')
    Toast.fail('测试失败')
  } finally {
    testing.value = false
  }
}

// 刷新服务器状态
const refreshServerStatus = async () => {
  refreshing.value = true
  try {
    addLog('开始刷新服务器状态...', 'info')
    
    await loadBalancer.updateServerLoads()
    await updateStatus()
    
    addLog('服务器状态刷新完成', 'success')
    Toast.success('状态已刷新')
    
  } catch (error) {
    addLog(`状态刷新失败: ${error.message}`, 'error')
    Toast.fail('刷新失败')
  } finally {
    refreshing.value = false
  }
}

// 测试故障转移
const testFailover = async () => {
  testingFailover.value = true
  try {
    addLog('开始测试故障转移...', 'info')
    
    // 获取当前服务器
    const currentServer = await loadBalancer.getOptimalServer()
    addLog(`当前服务器: ${currentServer}`, 'info')
    
    // 模拟故障
    await loadBalancer.recordFailure(currentServer)
    addLog(`模拟服务器故障: ${currentServer}`, 'warning')
    
    // 重新选择服务器
    const newServer = await loadBalancer.getOptimalServer()
    addLog(`新选择的服务器: ${newServer}`, 'success')
    
    if (newServer !== currentServer) {
      addLog('故障转移测试成功', 'success')
      Toast.success('故障转移测试成功')
    } else {
      addLog('故障转移测试失败 - 仍然选择了相同的服务器', 'warning')
      Toast.fail('故障转移测试失败')
    }
    
    await updateStatus()
    
  } catch (error) {
    addLog(`故障转移测试失败: ${error.message}`, 'error')
    Toast.fail('测试失败')
  } finally {
    testingFailover.value = false
  }
}

// 启动定时状态更新
const startStatusTimer = () => {
  statusTimer = setInterval(updateStatus, 10000) // 10秒更新一次
}

const stopStatusTimer = () => {
  if (statusTimer) {
    clearInterval(statusTimer)
    statusTimer = null
  }
}

// 组件挂载
onMounted(async () => {
  addLog('负载均衡器测试页面已加载', 'info')
  await updateStatus()
  startStatusTimer()
})

// 组件卸载
onUnmounted(() => {
  stopStatusTimer()
})
</script>

<style scoped>
.load-balancer-test {
  min-height: 100vh;
  background: var(--van-background);
}

.test-container {
  padding: 16px;
}

.test-actions {
  margin: 16px 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.server-list {
  margin: 24px 0;
}

.server-list h3 {
  margin: 0 0 12px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--van-text-color);
}

.server-item {
  padding: 12px;
  margin-bottom: 8px;
  border-radius: 6px;
  border: 1px solid var(--van-border-color);
  background: var(--van-background-2);
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
  flex: 1;
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

.test-log {
  margin: 24px 0;
}

.test-log h3 {
  margin: 0 0 12px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--van-text-color);
}

.log-content {
  max-height: 300px;
  overflow-y: auto;
  background: var(--van-background-2);
  border-radius: 6px;
  padding: 12px;
}

.log-item {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 12px;
}

.log-item.info {
  color: var(--van-text-color-2);
}

.log-item.success {
  color: var(--van-success-color);
}

.log-item.warning {
  color: var(--van-warning-color);
}

.log-item.error {
  color: var(--van-danger-color);
}

.log-time {
  font-weight: 500;
  min-width: 60px;
}

.log-message {
  flex: 1;
}
</style>
