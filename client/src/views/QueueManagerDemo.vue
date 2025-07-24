<template>
  <div class="queue-manager-demo">
    <div class="demo-header">
      <h1>🔥 任务队列管理系统演示</h1>
      <p class="demo-description">
        这个演示展示了如何使用新的任务队列管理系统来彻底解决ComfyUI客户端在52.25%进度卡住的问题。
      </p>
    </div>

    <!-- 初始化控制 -->
    <div class="control-section">
      <h2>🚀 系统控制</h2>
      <div class="control-buttons">
        <button
          @click="initializeSystem"
          :disabled="isInitialized"
          class="btn btn-primary"
        >
          {{ isInitialized ? '✅ 已初始化' : '🚀 初始化队列系统' }}
        </button>

        <button
          @click="startMonitoring"
          :disabled="!isInitialized || isMonitoring"
          class="btn btn-secondary"
        >
          {{ isMonitoring ? '📊 监控中...' : '📊 开始监控' }}
        </button>

        <button
          @click="stopMonitoring"
          :disabled="!isMonitoring"
          class="btn btn-warning"
        >
          ⏹️ 停止监控
        </button>

        <button
          @click="resetSystem"
          class="btn btn-danger"
        >
          🔄 重置系统
        </button>
      </div>
    </div>

    <!-- 队列监控组件 -->
    <QueueMonitor v-if="isInitialized" />

    <!-- 测试控制 -->
    <div class="test-section" v-if="isInitialized">
      <h2>🧪 功能测试</h2>

      <div class="test-grid">
        <!-- 单任务测试 -->
        <div class="test-card">
          <h3>🎯 单任务测试</h3>
          <div class="test-buttons">
            <button
              @click="testUndress"
              :disabled="isProcessing"
              class="btn btn-test"
            >
              👗 测试一键褪衣
            </button>

            <button
              @click="testFaceSwap"
              :disabled="isProcessing"
              class="btn btn-test"
            >
              👤 测试极速换脸
            </button>
          </div>
        </div>

        <!-- 批量测试 -->
        <div class="test-card">
          <h3>📦 批量测试</h3>
          <div class="batch-controls">
            <label>任务数量:</label>
            <input
              v-model.number="batchSize"
              type="number"
              min="1"
              max="10"
              class="batch-input"
            >
            <button
              @click="testBatchProcessing"
              :disabled="isProcessing"
              class="btn btn-test"
            >
              🚀 开始批量测试
            </button>
          </div>
        </div>

        <!-- 卡住恢复测试 -->
        <div class="test-card">
          <h3>🔧 卡住恢复测试</h3>
          <div class="recovery-controls">
            <button
              @click="testStuckRecovery"
              :disabled="isProcessing"
              class="btn btn-test"
            >
              🚨 模拟52.25%卡住
            </button>

            <button
              @click="forceRecovery"
              class="btn btn-warning"
            >
              🔧 强制恢复卡住任务
            </button>
          </div>
        </div>

        <!-- 压力测试 -->
        <div class="test-card">
          <h3>💪 压力测试</h3>
          <div class="stress-controls">
            <button
              @click="runStressTest"
              :disabled="isProcessing"
              class="btn btn-test"
            >
              🔥 运行压力测试
            </button>

            <button
              @click="runCompleteTest"
              :disabled="isProcessing"
              class="btn btn-primary"
            >
              🎯 完整功能测试
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 日志输出 -->
    <div class="log-section">
      <h2>📝 实时日志</h2>
      <div class="log-controls">
        <button @click="clearLogs" class="btn btn-secondary">🧹 清空日志</button>
        <button @click="exportLogs" class="btn btn-secondary">📤 导出日志</button>
        <label class="auto-scroll-label">
          <input v-model="autoScroll" type="checkbox">
          自动滚动
        </label>
      </div>
      <div
        ref="logContainer"
        class="log-container"
        :class="{ 'auto-scroll': autoScroll }"
      >
        <div
          v-for="(log, index) in logs"
          :key="index"
          class="log-entry"
          :class="log.type"
        >
          <span class="log-time">{{ formatTime(log.timestamp) }}</span>
          <span class="log-message">{{ log.message }}</span>
        </div>
      </div>
    </div>

    <!-- 统计信息 -->
    <div class="stats-section" v-if="isInitialized">
      <h2>📈 性能统计</h2>
      <div class="stats-grid">
        <div class="stat-item">
          <div class="stat-label">总处理任务</div>
          <div class="stat-value">{{ stats.totalProcessed }}</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">成功率</div>
          <div class="stat-value">{{ successRate }}%</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">平均处理时间</div>
          <div class="stat-value">{{ averageTime }}s</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">重试次数</div>
          <div class="stat-value">{{ stats.totalRetried }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import QueueMonitor from '../components/QueueMonitor.vue'
import {
  initializeQueueSystem,
  testUndressWithQueue,
  testFaceSwapWithQueue,
  testBatchProcessing,
  testStuckTaskRecovery,
  monitorQueueStatus,
  runCompleteTest
} from '../utils/queueManagerExample.js'

export default {
  name: 'QueueManagerDemo',
  components: {
    QueueMonitor
  },
  data() {
    return {
      isInitialized: false,
      isMonitoring: false,
      isProcessing: false,
      batchSize: 3,
      autoScroll: true,
      logs: [],
      stats: {
        totalProcessed: 0,
        totalSucceeded: 0,
        totalFailed: 0,
        totalRetried: 0,
        averageProcessingTime: 0
      },
      monitoringStopFunction: null,
      updateInterval: null
    }
  },
  computed: {
    successRate() {
      const total = this.stats.totalSucceeded + this.stats.totalFailed
      if (total === 0) return 0
      return Math.round((this.stats.totalSucceeded / total) * 100)
    },

    averageTime() {
      return Math.round(this.stats.averageProcessingTime / 1000)
    }
  },
  mounted() {
    this.setupConsoleCapture()
    this.checkInitialization()
  },
  beforeDestroy() {
    this.stopMonitoring()
    this.stopStatsUpdate()
  },
  methods: {
    // 系统控制方法
    async initializeSystem() {
      try {
        this.addLog('🚀 正在初始化队列管理系统...', 'info')
        await initializeQueueSystem()
        this.isInitialized = true
        this.addLog('✅ 队列管理系统初始化完成', 'success')
        this.startStatsUpdate()
      } catch (error) {
        this.addLog(`❌ 初始化失败: ${error.message}`, 'error')
      }
    },

    startMonitoring() {
      if (this.monitoringStopFunction) return

      this.addLog('📊 开始队列状态监控...', 'info')
      this.monitoringStopFunction = monitorQueueStatus()
      this.isMonitoring = true
    },

    stopMonitoring() {
      if (this.monitoringStopFunction) {
        this.monitoringStopFunction()
        this.monitoringStopFunction = null
        this.isMonitoring = false
        this.addLog('⏹️ 队列状态监控已停止', 'info')
      }
    },

    resetSystem() {
      this.stopMonitoring()
      this.stopStatsUpdate()

      if (window.taskQueueManager) {
        window.taskQueueManager.stop()
        delete window.taskQueueManager
      }

      this.isInitialized = false
      this.isProcessing = false
      this.addLog('🔄 系统已重置', 'warning')
    },

    // 测试方法
    async testUndress() {
      try {
        this.isProcessing = true
        this.addLog('👗 开始一键褪衣测试...', 'info')

        // 模拟base64图片数据
        const mockImage = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k='

        const taskController = await testUndressWithQueue(mockImage)
        this.addLog(`📋 一键褪衣任务已提交: ${taskController.taskId}`, 'success')

      } catch (error) {
        this.addLog(`❌ 一键褪衣测试失败: ${error.message}`, 'error')
      } finally {
        this.isProcessing = false
      }
    },

    async testFaceSwap() {
      try {
        this.isProcessing = true
        this.addLog('👤 开始极速换脸测试...', 'info')

        // 模拟图片数据
        const mockSource = 'mock_source_image'
        const mockTarget = 'mock_target_image'

        const taskController = await testFaceSwapWithQueue(mockSource, mockTarget)
        this.addLog(`📋 极速换脸任务已提交: ${taskController.taskId}`, 'success')

      } catch (error) {
        this.addLog(`❌ 极速换脸测试失败: ${error.message}`, 'error')
      } finally {
        this.isProcessing = false
      }
    },

    async testBatchProcessing() {
      try {
        this.isProcessing = true
        this.addLog(`📦 开始批量测试 (${this.batchSize}个任务)...`, 'info')

        const tasks = await testBatchProcessing()
        this.addLog(`📋 ${tasks.length}个批量任务已提交`, 'success')

      } catch (error) {
        this.addLog(`❌ 批量测试失败: ${error.message}`, 'error')
      } finally {
        this.isProcessing = false
      }
    },

    async testStuckRecovery() {
      try {
        this.isProcessing = true
        this.addLog('🚨 开始卡住恢复测试...', 'info')

        const taskController = await testStuckTaskRecovery()
        this.addLog(`📋 卡住恢复测试任务已提交: ${taskController.taskId}`, 'success')
        this.addLog('⏰ 任务将在52.25%处卡住，请观察自动恢复过程', 'warning')

      } catch (error) {
        this.addLog(`❌ 卡住恢复测试失败: ${error.message}`, 'error')
      } finally {
        this.isProcessing = false
      }
    },

    forceRecovery() {
      this.addLog('🔧 强制恢复所有卡住的任务...', 'warning')
      if (window.forceCompleteStuckTasks) {
        window.forceCompleteStuckTasks()
      } else {
        this.addLog('❌ 恢复工具不可用', 'error')
      }
    },

    async runStressTest() {
      try {
        this.isProcessing = true
        this.addLog('💪 开始压力测试...', 'info')

        // 提交10个并发任务
        const promises = []
        for (let i = 0; i < 10; i++) {
          promises.push(testBatchProcessing())
        }

        await Promise.all(promises)
        this.addLog('✅ 压力测试完成', 'success')

      } catch (error) {
        this.addLog(`❌ 压力测试失败: ${error.message}`, 'error')
      } finally {
        this.isProcessing = false
      }
    },

    async runCompleteTest() {
      try {
        this.isProcessing = true
        this.addLog('🎯 开始完整功能测试...', 'info')

        await runCompleteTest()
        this.addLog('✅ 完整功能测试完成', 'success')

      } catch (error) {
        this.addLog(`❌ 完整功能测试失败: ${error.message}`, 'error')
      } finally {
        this.isProcessing = false
      }
    },

    // 工具方法
    checkInitialization() {
      if (window.taskQueueManager) {
        this.isInitialized = true
        this.startStatsUpdate()
        this.addLog('✅ 检测到已存在的队列管理器', 'info')
      }
    },

    startStatsUpdate() {
      if (this.updateInterval) return

      this.updateInterval = setInterval(() => {
        if (window.taskQueueManager) {
          const status = window.taskQueueManager.getQueueStatus()
          this.stats = status.stats
        }
      }, 2000)
    },

    stopStatsUpdate() {
      if (this.updateInterval) {
        clearInterval(this.updateInterval)
        this.updateInterval = null
      }
    },

    setupConsoleCapture() {
      // 捕获console.log输出到日志区域
      const originalLog = console.log
      const originalError = console.error
      const originalWarn = console.warn

      console.log = (...args) => {
        originalLog.apply(console, args)
        this.addLog(args.join(' '), 'info')
      }

      console.error = (...args) => {
        originalError.apply(console, args)
        this.addLog(args.join(' '), 'error')
      }

      console.warn = (...args) => {
        originalWarn.apply(console, args)
        this.addLog(args.join(' '), 'warning')
      }
    },

    addLog(message, type = 'info') {
      this.logs.push({
        message,
        type,
        timestamp: Date.now()
      })

      // 限制日志数量
      if (this.logs.length > 1000) {
        this.logs = this.logs.slice(-500)
      }

      // 自动滚动到底部
      if (this.autoScroll) {
        this.$nextTick(() => {
          const container = this.$refs.logContainer
          if (container) {
            container.scrollTop = container.scrollHeight
          }
        })
      }
    },

    clearLogs() {
      this.logs = []
    },

    exportLogs() {
      const logText = this.logs.map(log =>
        `[${this.formatTime(log.timestamp)}] ${log.type.toUpperCase()}: ${log.message}`
      ).join('\n')

      const blob = new Blob([logText], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `queue-manager-logs-${Date.now()}.txt`
      a.click()
      URL.revokeObjectURL(url)
    },

    formatTime(timestamp) {
      return new Date(timestamp).toLocaleTimeString()
    }
  }
}
</script>

<style scoped>
.queue-manager-demo {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* 头部样式 */
.demo-header {
  text-align: center;
  margin-bottom: 40px;
  padding: 30px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.demo-header h1 {
  margin: 0 0 16px 0;
  font-size: 2.5em;
  font-weight: 700;
}

.demo-description {
  margin: 0;
  font-size: 1.1em;
  opacity: 0.9;
  line-height: 1.6;
}

/* 控制区域 */
.control-section,
.test-section,
.log-section,
.stats-section {
  background: white;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  border: 1px solid #e9ecef;
}

.control-section h2,
.test-section h2,
.log-section h2,
.stats-section h2 {
  margin: 0 0 20px 0;
  font-size: 1.5em;
  color: #2c3e50;
  display: flex;
  align-items: center;
  gap: 8px;
}

.control-buttons {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

/* 按钮样式 */
.btn {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  min-height: 44px;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none !important;
}

.btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-warning {
  background: #ffc107;
  color: #212529;
}

.btn-danger {
  background: #dc3545;
  color: white;
}

.btn-test {
  background: #28a745;
  color: white;
}

/* 测试区域 */
.test-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}

.test-card {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 20px;
  border: 1px solid #e9ecef;
}

.test-card h3 {
  margin: 0 0 16px 0;
  font-size: 1.2em;
  color: #495057;
}

.test-buttons {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.batch-controls,
.recovery-controls,
.stress-controls {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.batch-controls label {
  font-weight: 500;
  color: #495057;
}

.batch-input {
  padding: 8px 12px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 14px;
}

/* 日志区域 */
.log-controls {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.auto-scroll-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: #6c757d;
  cursor: pointer;
}

.log-container {
  height: 400px;
  overflow-y: auto;
  background: #1e1e1e;
  border-radius: 8px;
  padding: 16px;
  font-family: 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.4;
}

.log-entry {
  margin-bottom: 4px;
  display: flex;
  gap: 12px;
}

.log-time {
  color: #888;
  flex-shrink: 0;
  width: 80px;
}

.log-message {
  flex: 1;
  word-break: break-word;
}

.log-entry.info .log-message {
  color: #e9ecef;
}

.log-entry.success .log-message {
  color: #28a745;
}

.log-entry.warning .log-message {
  color: #ffc107;
}

.log-entry.error .log-message {
  color: #dc3545;
}

/* 统计区域 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.stat-item {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 20px;
  text-align: center;
  border: 1px solid #e9ecef;
}

.stat-label {
  font-size: 14px;
  color: #6c757d;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stat-value {
  font-size: 2em;
  font-weight: bold;
  color: #2c3e50;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .queue-manager-demo {
    padding: 16px;
  }

  .demo-header {
    padding: 20px;
  }

  .demo-header h1 {
    font-size: 2em;
  }

  .control-section,
  .test-section,
  .log-section,
  .stats-section {
    padding: 16px;
  }

  .control-buttons {
    flex-direction: column;
  }

  .btn {
    width: 100%;
    justify-content: center;
  }

  .test-grid {
    grid-template-columns: 1fr;
  }

  .log-controls {
    flex-direction: column;
    align-items: flex-start;
  }

  .log-container {
    height: 300px;
    font-size: 12px;
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* 滚动条样式 */
.log-container::-webkit-scrollbar {
  width: 8px;
}

.log-container::-webkit-scrollbar-track {
  background: #2d2d2d;
  border-radius: 4px;
}

.log-container::-webkit-scrollbar-thumb {
  background: #555;
  border-radius: 4px;
}

.log-container::-webkit-scrollbar-thumb:hover {
  background: #777;
}

/* 动画效果 */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.control-section,
.test-section,
.log-section,
.stats-section {
  animation: fadeIn 0.5s ease-out;
}

/* 加载状态 */
.btn:disabled {
  position: relative;
}

.btn:disabled::after {
  content: '';
  position: absolute;
  width: 16px;
  height: 16px;
  margin: auto;
  border: 2px solid transparent;
  border-top-color: currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>
