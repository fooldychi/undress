// ComfyUI配置 - 直连模式
const config = {
  // ComfyUI服务器URL（支持环境变量配置）
  BASE_URL: import.meta.env.VITE_COMFYUI_SERVER_URL || 'https://l9s75ay3rp-8188.cnb.run',
  CLIENT_ID: import.meta.env.VITE_COMFYUI_CLIENT_ID || 'abc1373d4ad648a3a81d0587fbe5534b',

  // ComfyUI官方健康检测端点配置
  HEALTH_CHECK: {
    // 官方端点 - 根据ComfyUI官方文档（按优先级排序）
    ENDPOINTS: [
      '/api/queue',        // 队列状态端点 - 最重要的健康指标
      '/api/system_stats', // 系统状态端点 - 服务器信息
    ],

    // 标准请求头配置 - 最简化配置
    HEADERS: {},

    // 超时配置
    TIMEOUT: 10000, // 10秒

    // 响应验证配置
    VALIDATION: {
      // 队列端点的有效响应特征
      QUEUE_INDICATORS: ['queue_running', 'queue_pending', 'exec_info'],
      // 系统状态端点的有效响应特征
      STATS_INDICATORS: ['system', 'devices', 'python_version'],
    }
  },

  // 获取API URL（直连模式）
  getApiUrl() {
    return this.BASE_URL;
  },

  // 获取健康检测端点列表（按优先级排序）
  getHealthCheckEndpoints() {
    return [...this.HEALTH_CHECK.ENDPOINTS];
  },

  // 验证ComfyUI响应是否有效
  validateResponse(endpoint, data) {
    if (!data || typeof data !== 'object') {
      return false;
    }

    // 验证队列端点响应
    if (endpoint.includes('queue')) {
      return this.HEALTH_CHECK.VALIDATION.QUEUE_INDICATORS.some(
        indicator => data.hasOwnProperty(indicator)
      );
    }

    // 验证系统状态端点响应
    if (endpoint.includes('system_stats')) {
      return this.HEALTH_CHECK.VALIDATION.STATS_INDICATORS.some(
        indicator => data.hasOwnProperty(indicator)
      );
    }

    // 其他端点只要是有效JSON就认为正常
    return true;
  },

  // 解析队列信息
  parseQueueInfo(data) {
    if (!data || typeof data !== 'object') {
      return { running: 0, pending: 0, total: 0 };
    }

    const running = Array.isArray(data.queue_running) ? data.queue_running.length : 0;
    const pending = Array.isArray(data.queue_pending) ? data.queue_pending.length : 0;

    return {
      running,
      pending,
      total: running + pending
    };
  },

  // 解析系统信息
  parseSystemInfo(data) {
    if (!data || !data.system) {
      return null;
    }

    return {
      os: data.system.os,
      comfyui_version: data.system.comfyui_version,
      python_version: data.system.python_version,
      pytorch_version: data.system.pytorch_version,
      ram_total: data.system.ram_total,
      ram_free: data.system.ram_free,
      devices: data.devices || []
    };
  }
};

export default config;