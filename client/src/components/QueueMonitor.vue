<template>
  <div class="queue-monitor">
    <!-- 队列状态概览 -->
    <div class="queue-overview">
      <h3 class="monitor-title">
        <span class="title-icon">📊</span>
        任务队列监控
        <span class="status-indicator" :class="{ 'paused': queueStatus.isPaused }">
          {{ queueStatus.isPaused ? '⏸️' : '▶️' }}
        </span>
      </h3>

      <div class="stats-grid">
        <div class="stat-card queued">
          <div class="stat-value">{{ queueStatus.queued }}</div>
          <div class="stat-label">排队中</div>
        </div>

        <div class="stat-card processing">
          <div class="stat-value">{{ queueStatus.processing }}</div>
          <div class="stat-label">处理中</div>
        </div>

        <div class="stat-card completed">
          <div class="stat-value">{{ queueStatus.completed }}</div>
          <div class="stat-label">已完成</div>
        </div>

        <div class="stat-card failed">
          <div class="stat-value">{{ queueStatus.failed }}</div>
          <div class="stat-label">失败</div>
        </div>
      </div>
    </div>

    <!-- 性能统计 -->
    <div class="performance-stats" v-if="queueStatus.stats">
      <h4>📈 性能统计</h4>
      <div class="stats-row">
        <span>总处理: {{ queueStatus.stats.totalProcessed }}</span>
        <span>成功率: {{ successRate }}%</span>
        <span>平均耗时: {{ averageTime }}s</span>
        <span>重试次数: {{ queueStatus.stats.totalRetried }}</span>
      </div>
    </div>

    <!-- 控制按钮 -->
    <div class="queue-controls">
      <button
        @click="pauseQueue"
        :disabled="queueStatus.isPaused"
        class="control-btn pause-btn"
      >
        ⏸️ 暂停队列
      </button>

      <button
        @click="resumeQueue"
        :disabled="!queueStatus.isPaused"
        class="control-btn resume-btn"
      >
        ▶️ 恢复队列
      </button>

      <button
        @click="clearQueue"
        class="control-btn clear-btn"
        :disabled="queueStatus.queued === 0"
      >
        🧹 清空队列
      </button>

      <button
        @click="refreshStatus"
        class="control-btn refresh-btn"
      >
        🔄 刷新状态
      </button>
    </div>

    <!-- 正在处理的任务详情 -->
    <div class="processing-details" v-if="processingTasks.length > 0">
      <h4>🔄 正在处理的任务</h4>
      <div class="task-list">
        <div
          v-for="task in processingTasks"
          :key="task.id"
          class="task-item processing"
        >
          <div class="task-header">
            <span class="task-id">{{ task.id.substring(0, 12) }}...</span>
            <span class="task-type">{{ task.workflowType }}</span>
            <span class="task-time">{{ formatDuration(task.processingTime) }}</span>
          </div>

          <div class="task-progress" v-if="task.progressHistory.length > 0">
            <div class="progress-bar">
              <div
                class="progress-fill"
                :style="{ width: getLatestProgress(task) + '%' }"
              ></div>
            </div>
            <span class="progress-text">
              {{ getLatestProgressMessage(task) }}
            </span>
          </div>

          <div class="task-status">
            <span class="status-text">
              进度更新: {{ formatTimeAgo(task.timeSinceLastProgress) }}
            </span>
            <span
              class="stuck-warning"
              v-if="task.timeSinceLastProgress > 60000"
            >
              ⚠️ 可能卡住
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 排队任务列表 -->
    <div class="queued-details" v-if="queuedTasks.length > 0">
      <h4>📥 排队任务 ({{ queuedTasks.length }})</h4>
      <div class="task-list">
        <div
          v-for="(task, index) in queuedTasks.slice(0, 5)"
          :key="task.id"
          class="task-item queued"
        >
          <div class="task-header">
            <span class="queue-position">#{{ index + 1 }}</span>
            <span class="task-id">{{ task.id.substring(0, 12) }}...</span>
            <span class="task-type">{{ task.workflowType }}</span>
            <span class="priority-badge" :class="'priority-' + task.priority">
              P{{ task.priority }}
            </span>
          </div>
          <div class="task-status">
            等待时间: {{ formatDuration(task.waitingTime) }}
          </div>
        </div>

        <div v-if="queuedTasks.length > 5" class="more-tasks">
          还有 {{ queuedTasks.length - 5 }} 个任务...
        </div>
      </div>
    </div>

    <!-- 最近完成/失败的任务 -->
    <div class="recent-tasks" v-if="showRecentTasks">
      <div class="recent-section" v-if="recentCompleted.length > 0">
        <h4>✅ 最近完成 ({{ recentCompleted.length }})</h4>
        <div class="task-list">
          <div
            v-for="task in recentCompleted.slice(0, 3)"
            :key="task.id"
            class="task-item completed"
          >
            <div class="task-header">
              <span class="task-id">{{ task.id.substring(0, 12) }}...</span>
              <span class="task-type">{{ task.workflowType }}</span>
              <span class="task-time">{{ formatDuration(task.processingTime) }}</span>
            </div>
            <div class="task-status">
              完成时间: {{ formatTimeAgo(Date.now() - task.completedAt) }}
            </div>
          </div>
        </div>
      </div>

      <div class="recent-section" v-if="recentFailed.length > 0">
        <h4>❌ 最近失败 ({{ recentFailed.length }})</h4>
        <div class="task-list">
          <div
            v-for="task in recentFailed.slice(0, 3)"
            :key="task.id"
            class="task-item failed"
          >
            <div class="task-header">
              <span class="task-id">{{ task.id.substring(0, 12) }}...</span>
              <span class="task-type">{{ task.workflowType }}</span>
              <span class="attempts">{{ task.attempts }}次尝试</span>
            </div>
            <div class="task-status">
              失败时间: {{ formatTimeAgo(Date.now() - task.failedAt) }}
            </div>
            <div class="error-message" v-if="task.errors.length > 0">
              {{ task.errors[task.errors.length - 1].error }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 展开/收起按钮 -->
    <div class="toggle-section">
      <button
        @click="showRecentTasks = !showRecentTasks"
        class="toggle-btn"
      >
        {{ showRecentTasks ? '收起' : '展开' }}历史记录
        {{ showRecentTasks ? '▲' : '▼' }}
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'QueueMonitor',
  data() {
    return {
      queueStatus: {
        queued: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        maxConcurrent: 3,
        isPaused: false,
        stats: {
          totalProcessed: 0,
          totalSucceeded: 0,
          totalFailed: 0,
          totalRetried: 0,
          averageProcessingTime: 0
        }
      },
      detailedStatus: {
        queuedTasks: [],
        processingTasks: [],
        recentCompleted: [],
        recentFailed: []
      },
      showRecentTasks: false,
      updateInterval: null
    }
  },
  computed: {
    successRate() {
      const total = this.queueStatus.stats.totalSucceeded + this.queueStatus.stats.totalFailed
      if (total === 0) return 0
      return Math.round((this.queueStatus.stats.totalSucceeded / total) * 100)
    },

    averageTime() {
      return Math.round(this.queueStatus.stats.averageProcessingTime / 1000)
    },

    queuedTasks() {
      return this.detailedStatus.queuedTasks || []
    },

    processingTasks() {
      return this.detailedStatus.processingTasks || []
    },

    recentCompleted() {
      return this.detailedStatus.recentCompleted || []
    },

    recentFailed() {
      return this.detailedStatus.recentFailed || []
    }
  },
  mounted() {
    this.startMonitoring()
  },
  beforeDestroy() {
    this.stopMonitoring()
  },
  methods: {
    startMonitoring() {
      this.updateStatus()
      this.updateInterval = setInterval(() => {
        this.updateStatus()
      }, 2000) // 每2秒更新一次
    },

    stopMonitoring() {
      if (this.updateInterval) {
        clearInterval(this.updateInterval)
        this.updateInterval = null
      }
    },

    updateStatus() {
      if (window.taskQueueManager) {
        this.queueStatus = window.taskQueueManager.getQueueStatus()
        this.detailedStatus = window.taskQueueManager.getDetailedStatus()
      }
    },

    pauseQueue() {
      if (window.taskQueueManager) {
        window.taskQueueManager.pause()
        this.updateStatus()
      }
    },

    resumeQueue() {
      if (window.taskQueueManager) {
        window.taskQueueManager.resume()
        this.updateStatus()
      }
    },

    clearQueue() {
      if (window.taskQueueManager && confirm('确定要清空队列吗？这将取消所有排队中的任务。')) {
        window.taskQueueManager.clearQueue()
        this.updateStatus()
      }
    },

    refreshStatus() {
      this.updateStatus()
    },

    getLatestProgress(task) {
      if (!task.progressHistory || task.progressHistory.length === 0) return 0
      return task.progressHistory[task.progressHistory.length - 1].percent || 0
    },

    getLatestProgressMessage(task) {
      if (!task.progressHistory || task.progressHistory.length === 0) return '等待中...'
      return task.progressHistory[task.progressHistory.length - 1].message || '处理中...'
    },

    formatDuration(ms) {
      const seconds = Math.floor(ms / 1000)
      const minutes = Math.floor(seconds / 60)
      const hours = Math.floor(minutes / 60)

      if (hours > 0) {
        return `${hours}h ${minutes % 60}m`
      } else if (minutes > 0) {
        return `${minutes}m ${seconds % 60}s`
      } else {
        return `${seconds}s`
      }
    },

    formatTimeAgo(ms) {
      const seconds = Math.floor(ms / 1000)
      const minutes = Math.floor(seconds / 60)
      const hours = Math.floor(minutes / 60)

      if (hours > 0) {
        return `${hours}小时前`
      } else if (minutes > 0) {
        return `${minutes}分钟前`
      } else {
        return `${seconds}秒前`
      }
    }
  }
}
</script>

<style scoped>
.queue-monitor {
  background: #f8f9fa;
  border-radius: 12px;
  padding: 20px;
  margin: 20px 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* 标题样式 */
.monitor-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 20px 0;
  font-size: 18px;
  font-weight: 600;
  color: #2c3e50;
}

.title-icon {
  font-size: 20px;
}

.status-indicator {
  margin-left: auto;
  font-size: 16px;
}

.status-indicator.paused {
  color: #f39c12;
}

/* 统计网格 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.stat-card {
  background: white;
  border-radius: 8px;
  padding: 16px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  border-left: 4px solid;
}

.stat-card.queued {
  border-left-color: #3498db;
}

.stat-card.processing {
  border-left-color: #f39c12;
}

.stat-card.completed {
  border-left-color: #27ae60;
}

.stat-card.failed {
  border-left-color: #e74c3c;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 12px;
  color: #7f8c8d;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* 性能统计 */
.performance-stats {
  background: white;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
  border: 1px solid #e9ecef;
}

.performance-stats h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: #2c3e50;
}

.stats-row {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
  font-size: 13px;
  color: #5a6c7d;
}

.stats-row span {
  background: #f8f9fa;
  padding: 4px 8px;
  border-radius: 4px;
  border: 1px solid #e9ecef;
}

/* 控制按钮 */
.queue-controls {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.control-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 4px;
}

.control-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pause-btn {
  background: #f39c12;
  color: white;
}

.pause-btn:hover:not(:disabled) {
  background: #e67e22;
}

.resume-btn {
  background: #27ae60;
  color: white;
}

.resume-btn:hover:not(:disabled) {
  background: #229954;
}

.clear-btn {
  background: #e74c3c;
  color: white;
}

.clear-btn:hover:not(:disabled) {
  background: #c0392b;
}

.refresh-btn {
  background: #3498db;
  color: white;
}

.refresh-btn:hover:not(:disabled) {
  background: #2980b9;
}

/* 任务详情区域 */
.processing-details,
.queued-details,
.recent-tasks {
  background: white;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
  border: 1px solid #e9ecef;
}

.processing-details h4,
.queued-details h4,
.recent-section h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: #2c3e50;
}

/* 任务列表 */
.task-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.task-item {
  background: #f8f9fa;
  border-radius: 6px;
  padding: 12px;
  border-left: 3px solid;
}

.task-item.queued {
  border-left-color: #3498db;
}

.task-item.processing {
  border-left-color: #f39c12;
}

.task-item.completed {
  border-left-color: #27ae60;
}

.task-item.failed {
  border-left-color: #e74c3c;
}

.task-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
  flex-wrap: wrap;
}

.task-id {
  font-family: 'Courier New', monospace;
  font-size: 11px;
  background: #e9ecef;
  padding: 2px 6px;
  border-radius: 3px;
  color: #495057;
}

.task-type {
  background: #007bff;
  color: white;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
}

.task-time {
  font-size: 11px;
  color: #6c757d;
  margin-left: auto;
}

.queue-position {
  background: #6c757d;
  color: white;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 10px;
  font-weight: bold;
}

.priority-badge {
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 10px;
  font-weight: bold;
}

.priority-1 {
  background: #d1ecf1;
  color: #0c5460;
}

.priority-2 {
  background: #d4edda;
  color: #155724;
}

.priority-3 {
  background: #fff3cd;
  color: #856404;
}

.priority-4 {
  background: #f8d7da;
  color: #721c24;
}

.attempts {
  font-size: 11px;
  color: #dc3545;
  font-weight: 500;
}

/* 进度条 */
.task-progress {
  margin: 8px 0 4px 0;
}

.progress-bar {
  width: 100%;
  height: 4px;
  background: #e9ecef;
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 4px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #3498db, #2ecc71);
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 11px;
  color: #6c757d;
}

/* 任务状态 */
.task-status {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: #6c757d;
}

.status-text {
  flex: 1;
}

.stuck-warning {
  background: #fff3cd;
  color: #856404;
  padding: 2px 6px;
  border-radius: 3px;
  font-weight: 500;
}

.error-message {
  font-size: 11px;
  color: #dc3545;
  background: #f8d7da;
  padding: 4px 8px;
  border-radius: 3px;
  margin-top: 4px;
  word-break: break-word;
}

/* 更多任务提示 */
.more-tasks {
  text-align: center;
  font-size: 12px;
  color: #6c757d;
  padding: 8px;
  background: #f8f9fa;
  border-radius: 4px;
  border: 1px dashed #dee2e6;
}

/* 最近任务区域 */
.recent-tasks {
  border-top: 2px solid #e9ecef;
}

.recent-section {
  margin-bottom: 16px;
}

.recent-section:last-child {
  margin-bottom: 0;
}

/* 展开/收起按钮 */
.toggle-section {
  text-align: center;
  margin-top: 16px;
}

.toggle-btn {
  background: #6c757d;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.2s ease;
}

.toggle-btn:hover {
  background: #5a6268;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .queue-monitor {
    padding: 16px;
    margin: 16px 0;
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  .queue-controls {
    flex-direction: column;
  }

  .control-btn {
    width: 100%;
    justify-content: center;
  }

  .task-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }

  .task-time {
    margin-left: 0;
  }

  .stats-row {
    flex-direction: column;
    gap: 8px;
  }
}
</style>
