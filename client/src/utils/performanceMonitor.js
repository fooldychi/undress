// 客户端性能监控工具
class ClientPerformanceMonitor {
  constructor() {
    this.apiCallStats = new Map();
    this.pageLoadStats = new Map();
    this.slowApiThreshold = 2000; // 2秒
    this.enabled = process.env.NODE_ENV === 'development'; // 只在开发环境启用
  }

  // 监控API调用性能
  async monitorApiCall(apiName, apiCall) {
    if (!this.enabled) {
      return apiCall();
    }

    const startTime = performance.now();
    const startMemory = this.getMemoryUsage();
    
    try {
      console.log(`🌐 API调用开始: ${apiName}`);
      const result = await apiCall();
      const duration = performance.now() - startTime;
      const endMemory = this.getMemoryUsage();
      
      this.recordApiStats(apiName, duration, true, endMemory - startMemory);
      
      if (duration > this.slowApiThreshold) {
        console.warn(`🐌 慢API检测 (${duration.toFixed(2)}ms): ${apiName}`);
      } else {
        console.log(`✅ API调用完成 (${duration.toFixed(2)}ms): ${apiName}`);
      }
      
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      this.recordApiStats(apiName, duration, false, 0);
      
      console.error(`❌ API调用失败 (${duration.toFixed(2)}ms): ${apiName}`, error);
      throw error;
    }
  }

  // 监控页面加载性能
  monitorPageLoad(pageName) {
    if (!this.enabled) return;

    const startTime = performance.now();
    
    // 使用 requestIdleCallback 在浏览器空闲时记录性能
    if (window.requestIdleCallback) {
      window.requestIdleCallback(() => {
        const duration = performance.now() - startTime;
        this.recordPageLoadStats(pageName, duration);
        console.log(`📄 页面加载完成 (${duration.toFixed(2)}ms): ${pageName}`);
      });
    } else {
      // 降级方案
      setTimeout(() => {
        const duration = performance.now() - startTime;
        this.recordPageLoadStats(pageName, duration);
        console.log(`📄 页面加载完成 (${duration.toFixed(2)}ms): ${pageName}`);
      }, 0);
    }
  }

  // 获取内存使用情况
  getMemoryUsage() {
    if (performance.memory) {
      return performance.memory.usedJSHeapSize;
    }
    return 0;
  }

  // 记录API统计
  recordApiStats(apiName, duration, success, memoryDelta) {
    if (!this.apiCallStats.has(apiName)) {
      this.apiCallStats.set(apiName, {
        count: 0,
        totalDuration: 0,
        avgDuration: 0,
        maxDuration: 0,
        minDuration: Infinity,
        successCount: 0,
        errorCount: 0,
        totalMemoryDelta: 0
      });
    }

    const stats = this.apiCallStats.get(apiName);
    stats.count++;
    stats.totalDuration += duration;
    stats.avgDuration = stats.totalDuration / stats.count;
    stats.maxDuration = Math.max(stats.maxDuration, duration);
    stats.minDuration = Math.min(stats.minDuration, duration);
    stats.totalMemoryDelta += memoryDelta;
    
    if (success) {
      stats.successCount++;
    } else {
      stats.errorCount++;
    }
  }

  // 记录页面加载统计
  recordPageLoadStats(pageName, duration) {
    if (!this.pageLoadStats.has(pageName)) {
      this.pageLoadStats.set(pageName, {
        count: 0,
        totalDuration: 0,
        avgDuration: 0,
        maxDuration: 0,
        minDuration: Infinity
      });
    }

    const stats = this.pageLoadStats.get(pageName);
    stats.count++;
    stats.totalDuration += duration;
    stats.avgDuration = stats.totalDuration / stats.count;
    stats.maxDuration = Math.max(stats.maxDuration, duration);
    stats.minDuration = Math.min(stats.minDuration, duration);
  }

  // 获取性能报告
  getPerformanceReport() {
    const apiStats = Array.from(this.apiCallStats.entries()).map(([name, data]) => ({
      name,
      type: 'API',
      ...data,
      successRate: (data.successCount / data.count * 100).toFixed(2) + '%'
    }));

    const pageStats = Array.from(this.pageLoadStats.entries()).map(([name, data]) => ({
      name,
      type: 'Page',
      ...data
    }));

    return {
      api: apiStats.sort((a, b) => b.avgDuration - a.avgDuration),
      pages: pageStats.sort((a, b) => b.avgDuration - a.avgDuration)
    };
  }

  // 打印性能报告
  printPerformanceReport() {
    if (!this.enabled) return;

    const report = this.getPerformanceReport();
    
    console.group('📊 客户端性能报告');
    
    if (report.api.length > 0) {
      console.group('🌐 API调用性能');
      report.api.slice(0, 10).forEach(stat => {
        console.log(`${stat.name}:`);
        console.log(`  平均耗时: ${stat.avgDuration.toFixed(2)}ms`);
        console.log(`  最大耗时: ${stat.maxDuration.toFixed(2)}ms`);
        console.log(`  调用次数: ${stat.count}`);
        console.log(`  成功率: ${stat.successRate}`);
      });
      console.groupEnd();
    }

    if (report.pages.length > 0) {
      console.group('📄 页面加载性能');
      report.pages.forEach(stat => {
        console.log(`${stat.name}:`);
        console.log(`  平均加载时间: ${stat.avgDuration.toFixed(2)}ms`);
        console.log(`  最大加载时间: ${stat.maxDuration.toFixed(2)}ms`);
        console.log(`  访问次数: ${stat.count}`);
      });
      console.groupEnd();
    }
    
    console.groupEnd();
  }

  // 监控组件渲染性能
  monitorComponentRender(componentName, renderFn) {
    if (!this.enabled) {
      return renderFn();
    }

    const startTime = performance.now();
    const result = renderFn();
    const duration = performance.now() - startTime;
    
    if (duration > 16) { // 超过一帧的时间（60fps）
      console.warn(`🎨 组件渲染较慢 (${duration.toFixed(2)}ms): ${componentName}`);
    }
    
    return result;
  }

  // 重置统计数据
  resetStats() {
    this.apiCallStats.clear();
    this.pageLoadStats.clear();
    console.log('📊 性能统计数据已重置');
  }

  // 启用/禁用监控
  setEnabled(enabled) {
    this.enabled = enabled;
    console.log(`🔧 性能监控已${enabled ? '启用' : '禁用'}`);
  }
}

// 创建全局实例
const clientPerformanceMonitor = new ClientPerformanceMonitor();

// 导出包装函数
export const monitorApi = (apiName, apiCall) => {
  return clientPerformanceMonitor.monitorApiCall(apiName, apiCall);
};

export const monitorPageLoad = (pageName) => {
  return clientPerformanceMonitor.monitorPageLoad(pageName);
};

export const monitorComponentRender = (componentName, renderFn) => {
  return clientPerformanceMonitor.monitorComponentRender(componentName, renderFn);
};

export const printPerformanceReport = () => {
  return clientPerformanceMonitor.printPerformanceReport();
};

export const resetPerformanceStats = () => {
  return clientPerformanceMonitor.resetStats();
};

export default clientPerformanceMonitor;
