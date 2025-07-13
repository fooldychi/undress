// 服务健康监控工具
const { testConnection } = require('../config/database');
const fs = require('fs').promises;
const path = require('path');

class HealthMonitor {
  constructor() {
    this.isHealthy = true;
    this.lastHealthCheck = Date.now();
    this.healthHistory = [];
    this.maxHistorySize = 100;
    this.checkInterval = 30000; // 30秒检查一次
    this.monitorTimer = null;
    this.alertThreshold = 3; // 连续失败3次后告警
    this.consecutiveFailures = 0;
  }

  // 启动健康监控
  start() {
    console.log('🏥 启动服务健康监控...');
    this.performHealthCheck(); // 立即执行一次
    this.monitorTimer = setInterval(() => {
      this.performHealthCheck();
    }, this.checkInterval);
  }

  // 停止健康监控
  stop() {
    if (this.monitorTimer) {
      clearInterval(this.monitorTimer);
      this.monitorTimer = null;
      console.log('🏥 服务健康监控已停止');
    }
  }

  // 执行健康检查
  async performHealthCheck() {
    const checkTime = Date.now();
    const healthStatus = {
      timestamp: checkTime,
      memory: this.checkMemoryUsage(),
      database: await this.checkDatabaseHealth(),
      uptime: process.uptime(),
      pid: process.pid,
      overall: true
    };

    // 判断整体健康状态
    healthStatus.overall = healthStatus.database.healthy && healthStatus.memory.healthy;

    // 更新健康状态
    this.isHealthy = healthStatus.overall;
    this.lastHealthCheck = checkTime;

    // 记录健康历史
    this.healthHistory.push(healthStatus);
    if (this.healthHistory.length > this.maxHistorySize) {
      this.healthHistory.shift();
    }

    // 处理健康状态变化
    if (!healthStatus.overall) {
      this.consecutiveFailures++;
      console.warn(`⚠️ 健康检查失败 (${this.consecutiveFailures}/${this.alertThreshold})`);
      
      if (this.consecutiveFailures >= this.alertThreshold) {
        await this.handleHealthAlert(healthStatus);
      }
    } else {
      if (this.consecutiveFailures > 0) {
        console.log('✅ 服务健康状态已恢复');
      }
      this.consecutiveFailures = 0;
    }

    // 记录健康检查日志
    await this.logHealthStatus(healthStatus);

    return healthStatus;
  }

  // 检查内存使用情况
  checkMemoryUsage() {
    const usage = process.memoryUsage();
    const formatBytes = (bytes) => Math.round(bytes / 1024 / 1024); // MB

    const memoryStatus = {
      rss: formatBytes(usage.rss),
      heapUsed: formatBytes(usage.heapUsed),
      heapTotal: formatBytes(usage.heapTotal),
      external: formatBytes(usage.external),
      healthy: true,
      warnings: []
    };

    // 内存使用检查
    if (usage.heapUsed > 512 * 1024 * 1024) { // 512MB
      memoryStatus.healthy = false;
      memoryStatus.warnings.push('堆内存使用过高');
    }

    if (usage.rss > 1024 * 1024 * 1024) { // 1GB
      memoryStatus.healthy = false;
      memoryStatus.warnings.push('RSS内存使用过高');
    }

    return memoryStatus;
  }

  // 检查数据库健康状态
  async checkDatabaseHealth() {
    const dbStatus = {
      connected: false,
      responseTime: 0,
      healthy: false,
      error: null
    };

    try {
      const startTime = Date.now();
      const isConnected = await testConnection();
      dbStatus.responseTime = Date.now() - startTime;
      dbStatus.connected = isConnected;
      dbStatus.healthy = isConnected && dbStatus.responseTime < 5000; // 5秒内响应
    } catch (error) {
      dbStatus.error = error.message;
      dbStatus.healthy = false;
    }

    return dbStatus;
  }

  // 处理健康告警
  async handleHealthAlert(healthStatus) {
    console.error('🚨 服务健康告警!');
    console.error('健康状态:', JSON.stringify(healthStatus, null, 2));

    // 记录告警日志
    const alertLog = {
      timestamp: new Date().toISOString(),
      type: 'HEALTH_ALERT',
      consecutiveFailures: this.consecutiveFailures,
      healthStatus
    };

    await this.writeLogFile('alerts.log', JSON.stringify(alertLog) + '\n');

    // 可以在这里添加更多告警处理，如发送邮件、短信等
    // await this.sendAlert(healthStatus);
  }

  // 记录健康状态日志
  async logHealthStatus(healthStatus) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      healthy: healthStatus.overall,
      memory: healthStatus.memory,
      database: healthStatus.database,
      uptime: healthStatus.uptime
    };

    // 只记录异常状态或每10次记录一次正常状态
    if (!healthStatus.overall || this.healthHistory.length % 10 === 0) {
      await this.writeLogFile('health.log', JSON.stringify(logEntry) + '\n');
    }
  }

  // 写入日志文件
  async writeLogFile(filename, content) {
    try {
      const logsDir = path.join(__dirname, '../../logs');
      
      // 确保logs目录存在
      try {
        await fs.access(logsDir);
      } catch {
        await fs.mkdir(logsDir, { recursive: true });
      }

      const logPath = path.join(logsDir, filename);
      await fs.appendFile(logPath, content);
    } catch (error) {
      console.error('写入日志文件失败:', error);
    }
  }

  // 获取健康状态报告
  getHealthReport() {
    const recentHistory = this.healthHistory.slice(-10);
    const healthyCount = recentHistory.filter(h => h.overall).length;
    const healthRate = recentHistory.length > 0 ? (healthyCount / recentHistory.length * 100).toFixed(2) : 100;

    return {
      current: {
        healthy: this.isHealthy,
        lastCheck: new Date(this.lastHealthCheck).toISOString(),
        consecutiveFailures: this.consecutiveFailures
      },
      recent: {
        healthRate: healthRate + '%',
        totalChecks: recentHistory.length,
        healthyChecks: healthyCount
      },
      history: recentHistory
    };
  }

  // 强制执行健康检查
  async forceHealthCheck() {
    return await this.performHealthCheck();
  }
}

// 创建全局实例
const healthMonitor = new HealthMonitor();

module.exports = {
  healthMonitor,
  HealthMonitor
};
