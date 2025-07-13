// 性能监控工具
const { query } = require('../config/database');

class PerformanceMonitor {
  constructor() {
    this.slowQueryThreshold = 1000; // 1秒
    this.queryStats = new Map();
  }

  // 包装数据库查询，添加性能监控
  async monitorQuery(sql, params = [], description = '') {
    const startTime = Date.now();
    const queryId = this.generateQueryId(sql);
    
    try {
      console.log(`🔍 执行查询: ${description || queryId}`);
      const result = await query(sql, params);
      const duration = Date.now() - startTime;
      
      // 记录查询统计
      this.recordQueryStats(queryId, duration, true, description);
      
      // 检查是否为慢查询
      if (duration > this.slowQueryThreshold) {
        console.warn(`🐌 慢查询检测 (${duration}ms): ${description || queryId}`);
        console.warn(`SQL: ${sql}`);
        console.warn(`参数: ${JSON.stringify(params)}`);
      } else {
        console.log(`✅ 查询完成 (${duration}ms): ${description || queryId}`);
      }
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.recordQueryStats(queryId, duration, false, description);
      
      console.error(`❌ 查询失败 (${duration}ms): ${description || queryId}`);
      console.error(`SQL: ${sql}`);
      console.error(`参数: ${JSON.stringify(params)}`);
      console.error(`错误: ${error.message}`);
      
      throw error;
    }
  }

  // 生成查询ID
  generateQueryId(sql) {
    // 简化SQL语句，移除参数占位符和多余空格
    return sql.replace(/\?/g, 'PARAM')
              .replace(/\s+/g, ' ')
              .trim()
              .substring(0, 50) + '...';
  }

  // 记录查询统计
  recordQueryStats(queryId, duration, success, description) {
    if (!this.queryStats.has(queryId)) {
      this.queryStats.set(queryId, {
        description,
        count: 0,
        totalDuration: 0,
        avgDuration: 0,
        maxDuration: 0,
        minDuration: Infinity,
        successCount: 0,
        errorCount: 0
      });
    }

    const stats = this.queryStats.get(queryId);
    stats.count++;
    stats.totalDuration += duration;
    stats.avgDuration = stats.totalDuration / stats.count;
    stats.maxDuration = Math.max(stats.maxDuration, duration);
    stats.minDuration = Math.min(stats.minDuration, duration);
    
    if (success) {
      stats.successCount++;
    } else {
      stats.errorCount++;
    }
  }

  // 获取查询统计报告
  getQueryStats() {
    const stats = Array.from(this.queryStats.entries()).map(([queryId, data]) => ({
      queryId,
      ...data,
      successRate: (data.successCount / data.count * 100).toFixed(2) + '%'
    }));

    // 按平均执行时间排序
    stats.sort((a, b) => b.avgDuration - a.avgDuration);
    
    return stats;
  }

  // 打印性能报告
  printPerformanceReport() {
    console.log('\n📊 数据库查询性能报告');
    console.log('=' * 50);
    
    const stats = this.getQueryStats();
    
    if (stats.length === 0) {
      console.log('暂无查询统计数据');
      return;
    }

    console.log(`总查询数: ${stats.reduce((sum, s) => sum + s.count, 0)}`);
    console.log(`慢查询数: ${stats.filter(s => s.avgDuration > this.slowQueryThreshold).length}`);
    console.log('');

    // 显示前10个最慢的查询
    console.log('🐌 最慢的查询 (前10个):');
    stats.slice(0, 10).forEach((stat, index) => {
      console.log(`${index + 1}. ${stat.description || stat.queryId}`);
      console.log(`   平均耗时: ${stat.avgDuration.toFixed(2)}ms`);
      console.log(`   最大耗时: ${stat.maxDuration}ms`);
      console.log(`   执行次数: ${stat.count}`);
      console.log(`   成功率: ${stat.successRate}`);
      console.log('');
    });
  }

  // 重置统计数据
  resetStats() {
    this.queryStats.clear();
    console.log('📊 查询统计数据已重置');
  }

  // 设置慢查询阈值
  setSlowQueryThreshold(threshold) {
    this.slowQueryThreshold = threshold;
    console.log(`🔧 慢查询阈值已设置为: ${threshold}ms`);
  }
}

// 创建全局实例
const performanceMonitor = new PerformanceMonitor();

// 包装常用的数据库查询函数
const monitoredQueries = {
  // 获取用户信息
  getUserById: async (userId) => {
    return performanceMonitor.monitorQuery(
      'SELECT id, username, status, created_at, last_login FROM users WHERE id = ?',
      [userId],
      '获取用户信息'
    );
  },

  // 获取用户积分
  getUserPoints: async (userId) => {
    return performanceMonitor.monitorQuery(
      'SELECT COALESCE(SUM(remaining_points), 0) as total_points FROM level_cards WHERE bound_user_id = ?',
      [userId],
      '获取用户总积分'
    );
  },

  // 获取用户等级卡
  getUserLevelCards: async (userId) => {
    return performanceMonitor.monitorQuery(
      `SELECT lc.id, lc.card_number, lc.remaining_points, lc.bound_at,
              ct.name as type_name, ct.icon, ct.points as total_points, ct.price
       FROM level_cards lc
       JOIN card_types ct ON lc.type_id = ct.id
       WHERE lc.bound_user_id = ?
       ORDER BY lc.bound_at DESC`,
      [userId],
      '获取用户等级卡列表'
    );
  },

  // 获取用户积分记录
  getUserPointLogs: async (userId, limit = 20, offset = 0) => {
    return performanceMonitor.monitorQuery(
      `SELECT action_type, points_amount, description, url, created_at
       FROM point_logs
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, limit, offset],
      '获取用户积分记录'
    );
  }
};

module.exports = {
  performanceMonitor,
  monitoredQueries
};
