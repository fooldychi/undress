<template>
  <div class="websocket-test">
    <div class="header">
      <h1>ComfyUI WebSocket 测试</h1>
      <p>测试 WebSocket 实时通信功能</p>
    </div>

    <div class="status-section">
      <div class="status-card">
        <h3>连接状态</h3>
        <div class="status-indicator" :class="connectionStatus">
          <div class="status-dot"></div>
          <span>{{ connectionText }}</span>
        </div>
        <button @click="reconnectWebSocket" :disabled="isConnected" class="btn">
          重新连接
        </button>
      </div>

      <div class="status-card">
        <h3>消息统计</h3>
        <div class="stats">
          <div class="stat-item">
            <span class="label">接收消息:</span>
            <span class="value">{{ messageCount }}</span>
          </div>
          <div class="stat-item">
            <span class="label">任务数量:</span>
            <span class="value">{{ taskCount }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="messages-section">
      <h3>实时消息</h3>
      <div class="messages-container">
        <div
          v-for="(message, index) in messages"
          :key="index"
          class="message-item"
          :class="message.type"
        >
          <div class="message-header">
            <span class="message-type">{{ message.type }}</span>
            <span class="message-time">{{ formatTime(message.timestamp) }}</span>
          </div>
          <div class="message-content">
            <pre>{{ JSON.stringify(message.data, null, 2) }}</pre>
          </div>
        </div>
      </div>
      <button @click="clearMessages" class="btn btn-secondary">
        清空消息
      </button>
    </div>

    <div class="test-section">
      <h3>测试功能</h3>
      <div class="test-buttons">
        <button @click="testImageUpload" :disabled="!isConnected" class="btn">
          测试图片上传
        </button>
        <button @click="testWorkflowSubmit" :disabled="!isConnected" class="btn">
          测试工作流提交
        </button>
        <button @click="testTaskStatus" :disabled="!isConnected" class="btn">
          测试任务状态查询
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted } from 'vue'
import webSocketManager from '../services/webSocketManager.js'
import { Toast } from 'vant'

export default {
  name: 'WebSocketTest',
  setup() {
    const isConnected = ref(false)
    const connectionStatus = ref('disconnected')
    const connectionText = ref('未连接')
    const messageCount = ref(0)
    const taskCount = ref(0)
    const messages = ref([])

    let statusCheckInterval = null
    let originalOnMessage = null

    // 更新连接状态
    const updateConnectionStatus = () => {
      isConnected.value = webSocketManager.isWsConnected
      if (webSocketManager.isWsConnected) {
        connectionStatus.value = 'connected'
        connectionText.value = '已连接'
      } else {
        connectionStatus.value = 'disconnected'
        connectionText.value = '未连接'
      }
    }

    // 处理 WebSocket 消息
    const handleMessage = (event) => {
      try {
        const message = JSON.parse(event.data)

        // 添加到消息列表
        messages.value.unshift({
          type: message.type || 'unknown',
          data: message.data || message,
          timestamp: Date.now()
        })

        // 限制消息数量
        if (messages.value.length > 50) {
          messages.value = messages.value.slice(0, 50)
        }

        messageCount.value++

        // 统计任务相关消息
        if (message.type === 'executed' || message.type === 'execution_error') {
          taskCount.value++
        }
      } catch (error) {
        console.error('解析 WebSocket 消息失败:', error)
      }
    }

    // 重新连接 WebSocket
    const reconnectWebSocket = async () => {
      try {
        Toast.loading('正在重新连接...')
        await webSocketManager.initializeWebSocket()
        Toast.success('重新连接成功')
      } catch (error) {
        Toast.fail('重新连接失败: ' + error.message)
      }
    }

    // 清空消息
    const clearMessages = () => {
      messages.value = []
      messageCount.value = 0
      taskCount.value = 0
    }

    // 格式化时间
    const formatTime = (timestamp) => {
      const date = new Date(timestamp)
      return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`
    }

    // 测试功能
    const testImageUpload = () => {
      Toast('测试图片上传功能（需要实现）')
    }

    const testWorkflowSubmit = () => {
      Toast('测试工作流提交功能（需要实现）')
    }

    const testTaskStatus = () => {
      Toast('测试任务状态查询功能（需要实现）')
    }

    onMounted(() => {
      // 初始状态检查
      updateConnectionStatus()

      // 定期检查连接状态
      statusCheckInterval = setInterval(updateConnectionStatus, 1000)

      // 监听 WebSocket 消息
      if (webSocketManager.wsConnection) {
        // 保存原始的 onmessage 处理器
        originalOnMessage = webSocketManager.wsConnection.onmessage

        // 添加我们的消息处理器
        webSocketManager.wsConnection.addEventListener('message', handleMessage)
      }
    })

    onUnmounted(() => {
      if (statusCheckInterval) {
        clearInterval(statusCheckInterval)
      }

      // 恢复原始的消息处理器
      if (webSocketManager.wsConnection && originalOnMessage) {
        webSocketManager.wsConnection.removeEventListener('message', handleMessage)
      }
    })

    return {
      isConnected,
      connectionStatus,
      connectionText,
      messageCount,
      taskCount,
      messages,
      reconnectWebSocket,
      clearMessages,
      formatTime,
      testImageUpload,
      testWorkflowSubmit,
      testTaskStatus
    }
  }
}
</script>

<style scoped>
.websocket-test {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.header {
  text-align: center;
  margin-bottom: 30px;
}

.header h1 {
  color: #333;
  margin-bottom: 10px;
}

.header p {
  color: #666;
}

.status-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.status-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.status-card h3 {
  margin-bottom: 15px;
  color: #333;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 15px;
}

.status-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  transition: background-color 0.3s ease;
}

.connected .status-dot {
  background-color: #4caf50;
  box-shadow: 0 0 8px rgba(76, 175, 80, 0.6);
}

.disconnected .status-dot {
  background-color: #f44336;
  animation: pulse 1.5s infinite;
}

.stats {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
}

.label {
  color: #666;
}

.value {
  font-weight: bold;
  color: #333;
}

.messages-section {
  margin-bottom: 30px;
}

.messages-section h3 {
  margin-bottom: 15px;
  color: #333;
}

.messages-container {
  background: #f5f5f5;
  border-radius: 8px;
  padding: 15px;
  max-height: 400px;
  overflow-y: auto;
  margin-bottom: 15px;
}

.message-item {
  background: white;
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 10px;
  border-left: 4px solid #ddd;
}

.message-item.status {
  border-left-color: #2196f3;
}

.message-item.progress {
  border-left-color: #ff9800;
}

.message-item.executed {
  border-left-color: #4caf50;
}

.message-item.execution_error {
  border-left-color: #f44336;
}

.message-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 12px;
}

.message-type {
  font-weight: bold;
  text-transform: uppercase;
}

.message-time {
  color: #666;
}

.message-content pre {
  font-size: 11px;
  color: #333;
  white-space: pre-wrap;
  word-break: break-all;
  margin: 0;
}

.test-section h3 {
  margin-bottom: 15px;
  color: #333;
}

.test-buttons {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  background: #2196f3;
  color: white;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.3s ease;
}

.btn:hover:not(:disabled) {
  background: #1976d2;
}

.btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.btn-secondary {
  background: #666;
}

.btn-secondary:hover:not(:disabled) {
  background: #555;
}

@keyframes pulse {
  0% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.5;
    transform: scale(1.2);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

/* 移动端适配 */
@media (max-width: 768px) {
  .websocket-test {
    padding: 15px;
  }

  .status-section {
    grid-template-columns: 1fr;
  }

  .test-buttons {
    flex-direction: column;
  }

  .btn {
    width: 100%;
  }
}
</style>
