<template>
  <div>
    <!-- WebSocket连接状态 -->
    <div class="websocket-status" v-if="showStatus">
      <div class="status-indicator" :class="statusClass">
        <div class="status-dot"></div>
        <span class="status-text">{{ statusText }}</span>
      </div>
    </div>

    <!-- 处理结果通知 -->
    <div v-if="notifications.length > 0" class="notification-container">
      <div
        v-for="notification in notifications"
        :key="notification.id"
        class="notification"
        :class="notification.type"
      >
        <div class="notification-content">
          <div class="notification-icon">{{ getNotificationIcon(notification.type) }}</div>
          <div class="notification-message">{{ notification.message }}</div>
          <div class="notification-time">{{ notification.time }}</div>
        </div>
        <button @click="removeNotification(notification.id)" class="notification-close">×</button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted } from 'vue'
import webSocketManager from '../services/webSocketManager.js'

export default {
  name: 'WebSocketStatus',
  setup() {
    const showStatus = ref(false)
    const statusClass = ref('disconnected')
    const statusText = ref('WebSocket 未连接')
    const notifications = ref([])

    let statusCheckInterval = null
    let notificationId = 0

    // 更新状态显示
    const updateStatus = () => {
      if (webSocketManager.isWsConnected) {
        statusClass.value = 'connected'
        statusText.value = 'ComfyUI 实时连接'
        showStatus.value = true

        // 连接成功后5秒隐藏状态
        setTimeout(() => {
          showStatus.value = false
        }, 5000)
      } else {
        statusClass.value = 'disconnected'
        statusText.value = 'ComfyUI 连接中...'
        showStatus.value = true
      }
    }

    // 添加通知
    const addNotification = (message, type = 'info') => {
      const notification = {
        id: ++notificationId,
        message,
        type,
        time: new Date().toLocaleTimeString()
      }

      notifications.value.unshift(notification)

      // 自动移除通知（成功和信息类型8秒后移除，错误类型15秒后移除）
      const autoRemoveTime = type === 'error' ? 15000 : 8000
      setTimeout(() => {
        removeNotification(notification.id)
      }, autoRemoveTime)

      // 最多保留5个通知
      if (notifications.value.length > 5) {
        notifications.value = notifications.value.slice(0, 5)
      }
    }

    // 移除通知
    const removeNotification = (id) => {
      const index = notifications.value.findIndex(n => n.id === id)
      if (index > -1) {
        notifications.value.splice(index, 1)
      }
    }

    // 获取通知图标
    const getNotificationIcon = (type) => {
      const icons = {
        'success': '✅',
        'error': '❌',
        'warning': '⚠️',
        'info': 'ℹ️'
      }
      return icons[type] || 'ℹ️'
    }

    // 监听自定义事件
    const handleComfyUIStatus = (event) => {
      const { message, type } = event.detail
      addNotification(message, type)
    }

    onMounted(() => {
      // 初始状态检查
      updateStatus()

      // 定期检查连接状态
      statusCheckInterval = setInterval(updateStatus, 2000)

      // 监听ComfyUI状态事件
      window.addEventListener('comfyui-status', handleComfyUIStatus)

      // 监听 WebSocket 事件
      if (webSocketManager.wsConnection) {
        webSocketManager.wsConnection.addEventListener('open', () => {
          updateStatus()
          // 只在调试模式下显示连接成功通知
          if (import.meta.env.DEV) {
            addNotification('WebSocket连接成功', 'success')
          }
        })

        webSocketManager.wsConnection.addEventListener('close', () => {
          updateStatus()
          // 简化连接断开通知
          addNotification('连接已断开', 'warning')
        })

        webSocketManager.wsConnection.addEventListener('error', () => {
          statusClass.value = 'error'
          statusText.value = 'ComfyUI 连接错误'
          showStatus.value = true
          addNotification('连接错误', 'error')
        })
      }
    })

    onUnmounted(() => {
      if (statusCheckInterval) {
        clearInterval(statusCheckInterval)
      }

      // 移除事件监听
      window.removeEventListener('comfyui-status', handleComfyUIStatus)
    })

    return {
      showStatus,
      statusClass,
      statusText,
      notifications,
      removeNotification,
      getNotificationIcon
    }
  }
}
</script>

<style scoped>
.websocket-status {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(10px);
  border-radius: 8px;
  padding: 8px 12px;
  color: white;
  font-size: 12px;
  transition: all 0.3s ease;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  transition: background-color 0.3s ease;
}

.connected .status-dot {
  background-color: #4caf50;
  box-shadow: 0 0 6px rgba(76, 175, 80, 0.6);
}

.disconnected .status-dot {
  background-color: #ff9800;
  animation: pulse 1.5s infinite;
}

.error .status-dot {
  background-color: #f44336;
  animation: pulse 1s infinite;
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

.status-text {
  font-weight: 500;
}

/* 通知容器 */
.notification-container {
  position: fixed;
  top: 70px;
  right: 20px;
  z-index: 1001;
  max-width: 350px;
}

.notification {
  display: flex;
  align-items: flex-start;
  margin-bottom: 10px;
  padding: 12px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  animation: slideIn 0.3s ease-out;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
}

.notification:hover {
  transform: translateX(-5px);
}

.notification.success {
  background-color: rgba(240, 253, 244, 0.95);
  border: 1px solid #22c55e;
  color: #15803d;
}

.notification.error {
  background-color: rgba(254, 242, 242, 0.95);
  border: 1px solid #ef4444;
  color: #dc2626;
}

.notification.warning {
  background-color: rgba(255, 251, 235, 0.95);
  border: 1px solid #f59e0b;
  color: #d97706;
}

.notification.info {
  background-color: rgba(240, 249, 255, 0.95);
  border: 1px solid #3b82f6;
  color: #1d4ed8;
}

.notification-content {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
}

.notification-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.notification-message {
  flex: 1;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.4;
}

.notification-time {
  font-size: 11px;
  opacity: 0.7;
  flex-shrink: 0;
}

.notification-close {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  padding: 0;
  margin-left: 8px;
  opacity: 0.5;
  transition: opacity 0.2s;
  color: inherit;
}

.notification-close:hover {
  opacity: 1;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

/* 移动端适配 */
@media (max-width: 768px) {
  .websocket-status {
    top: 10px;
    right: 10px;
    font-size: 11px;
    padding: 6px 10px;
  }

  .notification-container {
    top: 60px;
    right: 10px;
    max-width: calc(100vw - 20px);
  }

  .notification {
    padding: 10px;
    font-size: 13px;
  }

  .notification-message {
    font-size: 13px;
  }
}
</style>
