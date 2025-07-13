// 内存管理和泄漏检测工具
const EventEmitter = require('events');

class MemoryManager extends EventEmitter {
  constructor() {
    super();
    this.memorySnapshots = [];
    this.maxSnapshots = 20;
    this.monitorInterval = 60000; // 1分钟检查一次
    this.monitorTimer = null;
    this.gcThreshold = 500 * 1024 * 1024; // 500MB触发GC
    this.leakThreshold = 100 * 1024 * 1024; // 100MB增长认为可能泄漏
    this.isMonitoring = false;
    
    // 跟踪定时器和事件监听器
    this.activeTimers = new Set();
    this.activeIntervals = new Set();
    this.eventListeners = new Map();
  }

  // 启动内存监控
  start() {
    if (this.isMonitoring) {
      return;
    }

    console.log('🧠 启动内存管理监控...');
    this.isMonitoring = true;
    
    // 立即执行一次检查
    this.checkMemoryUsage();
    
    // 定期检查
    this.monitorTimer = setInterval(() => {
      this.checkMemoryUsage();
    }, this.monitorInterval);

    // 监控原生定时器函数
    this.wrapTimerFunctions();
    
    // 监控EventEmitter
    this.wrapEventEmitter();
  }

  // 停止内存监控
  stop() {
    if (!this.isMonitoring) {
      return;
    }

    console.log('🧠 停止内存管理监控...');
    this.isMonitoring = false;
    
    if (this.monitorTimer) {
      clearInterval(this.monitorTimer);
      this.monitorTimer = null;
    }

    // 清理所有跟踪的资源
    this.cleanup();
  }

  // 检查内存使用情况
  checkMemoryUsage() {
    const usage = process.memoryUsage();
    const timestamp = Date.now();
    
    const snapshot = {
      timestamp,
      rss: usage.rss,
      heapUsed: usage.heapUsed,
      heapTotal: usage.heapTotal,
      external: usage.external,
      arrayBuffers: usage.arrayBuffers || 0
    };

    // 添加到快照历史
    this.memorySnapshots.push(snapshot);
    if (this.memorySnapshots.length > this.maxSnapshots) {
      this.memorySnapshots.shift();
    }

    // 检查内存泄漏
    this.detectMemoryLeak(snapshot);
    
    // 检查是否需要触发GC
    if (usage.heapUsed > this.gcThreshold) {
      this.triggerGarbageCollection();
    }

    // 发出内存状态事件
    this.emit('memoryCheck', snapshot);

    return snapshot;
  }

  // 检测内存泄漏
  detectMemoryLeak(currentSnapshot) {
    if (this.memorySnapshots.length < 5) {
      return; // 需要足够的历史数据
    }

    const oldSnapshot = this.memorySnapshots[this.memorySnapshots.length - 5];
    const heapGrowth = currentSnapshot.heapUsed - oldSnapshot.heapUsed;
    const timeSpan = currentSnapshot.timestamp - oldSnapshot.timestamp;

    if (heapGrowth > this.leakThreshold) {
      const growthRate = heapGrowth / (timeSpan / 1000); // 每秒增长
      
      console.warn('⚠️ 检测到可能的内存泄漏:');
      console.warn(`   堆内存增长: ${(heapGrowth / 1024 / 1024).toFixed(2)} MB`);
      console.warn(`   时间跨度: ${(timeSpan / 1000).toFixed(2)} 秒`);
      console.warn(`   增长速率: ${(growthRate / 1024).toFixed(2)} KB/秒`);
      
      this.emit('memoryLeak', {
        growth: heapGrowth,
        timeSpan,
        growthRate,
        current: currentSnapshot,
        previous: oldSnapshot
      });

      // 生成内存报告
      this.generateMemoryReport();
    }
  }

  // 触发垃圾回收
  triggerGarbageCollection() {
    if (global.gc) {
      console.log('🗑️ 触发垃圾回收...');
      const beforeGC = process.memoryUsage();
      global.gc();
      const afterGC = process.memoryUsage();
      
      const freed = beforeGC.heapUsed - afterGC.heapUsed;
      console.log(`✅ 垃圾回收完成，释放内存: ${(freed / 1024 / 1024).toFixed(2)} MB`);
      
      this.emit('garbageCollection', { beforeGC, afterGC, freed });
    } else {
      console.warn('⚠️ 垃圾回收不可用，请使用 --expose-gc 启动参数');
    }
  }

  // 包装定时器函数以跟踪
  wrapTimerFunctions() {
    const originalSetTimeout = global.setTimeout;
    const originalSetInterval = global.setInterval;
    const originalClearTimeout = global.clearTimeout;
    const originalClearInterval = global.clearInterval;

    global.setTimeout = (callback, delay, ...args) => {
      const timer = originalSetTimeout(callback, delay, ...args);
      this.activeTimers.add(timer);
      return timer;
    };

    global.setInterval = (callback, delay, ...args) => {
      const interval = originalSetInterval(callback, delay, ...args);
      this.activeIntervals.add(interval);
      return interval;
    };

    global.clearTimeout = (timer) => {
      this.activeTimers.delete(timer);
      return originalClearTimeout(timer);
    };

    global.clearInterval = (interval) => {
      this.activeIntervals.delete(interval);
      return originalClearInterval(interval);
    };
  }

  // 包装EventEmitter以跟踪监听器
  wrapEventEmitter() {
    const originalAddListener = EventEmitter.prototype.addListener;
    const originalRemoveListener = EventEmitter.prototype.removeListener;

    EventEmitter.prototype.addListener = function(event, listener) {
      if (!this._memoryManagerTracked) {
        this._memoryManagerTracked = true;
        const listeners = this.eventListeners || new Map();
        this.eventListeners = listeners;
      }
      
      return originalAddListener.call(this, event, listener);
    };

    EventEmitter.prototype.removeListener = function(event, listener) {
      return originalRemoveListener.call(this, event, listener);
    };
  }

  // 生成内存报告
  generateMemoryReport() {
    const current = process.memoryUsage();
    const formatBytes = (bytes) => (bytes / 1024 / 1024).toFixed(2) + ' MB';

    console.log('\n📊 内存使用报告:');
    console.log('=' * 50);
    console.log(`RSS: ${formatBytes(current.rss)}`);
    console.log(`Heap Used: ${formatBytes(current.heapUsed)}`);
    console.log(`Heap Total: ${formatBytes(current.heapTotal)}`);
    console.log(`External: ${formatBytes(current.external)}`);
    console.log(`Array Buffers: ${formatBytes(current.arrayBuffers || 0)}`);
    console.log('');
    console.log(`活跃定时器: ${this.activeTimers.size}`);
    console.log(`活跃间隔器: ${this.activeIntervals.size}`);
    console.log('');

    // 显示内存趋势
    if (this.memorySnapshots.length >= 2) {
      const oldest = this.memorySnapshots[0];
      const newest = this.memorySnapshots[this.memorySnapshots.length - 1];
      const growth = newest.heapUsed - oldest.heapUsed;
      const timeSpan = newest.timestamp - oldest.timestamp;
      
      console.log('📈 内存趋势:');
      console.log(`时间跨度: ${(timeSpan / 1000 / 60).toFixed(2)} 分钟`);
      console.log(`堆内存变化: ${(growth / 1024 / 1024).toFixed(2)} MB`);
      console.log(`平均增长率: ${(growth / timeSpan * 1000 / 1024).toFixed(2)} KB/秒`);
    }
    
    console.log('=' * 50);
  }

  // 清理资源
  cleanup() {
    console.log('🧹 清理内存管理器资源...');
    
    // 清理跟踪的定时器
    for (const timer of this.activeTimers) {
      clearTimeout(timer);
    }
    this.activeTimers.clear();
    
    // 清理跟踪的间隔器
    for (const interval of this.activeIntervals) {
      clearInterval(interval);
    }
    this.activeIntervals.clear();
    
    // 清理事件监听器映射
    this.eventListeners.clear();
    
    console.log('✅ 内存管理器资源清理完成');
  }

  // 获取内存统计
  getMemoryStats() {
    const current = process.memoryUsage();
    
    return {
      current,
      snapshots: this.memorySnapshots,
      activeTimers: this.activeTimers.size,
      activeIntervals: this.activeIntervals.size,
      isMonitoring: this.isMonitoring
    };
  }

  // 强制内存检查
  forceMemoryCheck() {
    return this.checkMemoryUsage();
  }
}

// 创建全局实例
const memoryManager = new MemoryManager();

module.exports = {
  memoryManager,
  MemoryManager
};
