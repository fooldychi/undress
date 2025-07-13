// 性能测试工具
import { authApi, pointsApi, levelCardApi } from '../services/api.js';

class PerformanceTest {
  constructor() {
    this.results = [];
  }

  // 测试API响应时间
  async testApiPerformance(apiName, apiCall, iterations = 5) {
    console.log(`🧪 开始测试 ${apiName} (${iterations} 次)`);
    
    const times = [];
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();
      
      try {
        await apiCall();
        const duration = performance.now() - startTime;
        times.push(duration);
        successCount++;
        console.log(`  第 ${i + 1} 次: ${duration.toFixed(2)}ms ✅`);
      } catch (error) {
        const duration = performance.now() - startTime;
        times.push(duration);
        errorCount++;
        console.log(`  第 ${i + 1} 次: ${duration.toFixed(2)}ms ❌ (${error.message})`);
      }
    }

    const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const successRate = (successCount / iterations * 100).toFixed(2);

    const result = {
      apiName,
      iterations,
      avgTime: avgTime.toFixed(2),
      minTime: minTime.toFixed(2),
      maxTime: maxTime.toFixed(2),
      successCount,
      errorCount,
      successRate: successRate + '%'
    };

    this.results.push(result);
    
    console.log(`📊 ${apiName} 测试结果:`);
    console.log(`  平均响应时间: ${result.avgTime}ms`);
    console.log(`  最快响应时间: ${result.minTime}ms`);
    console.log(`  最慢响应时间: ${result.maxTime}ms`);
    console.log(`  成功率: ${result.successRate}`);
    console.log('');

    return result;
  }

  // 测试个人中心加载性能
  async testProfileLoadPerformance() {
    console.log('🏠 测试个人中心加载性能');
    
    if (!authApi.isLoggedIn()) {
      console.log('❌ 用户未登录，无法测试个人中心');
      return null;
    }

    const startTime = performance.now();
    
    try {
      // 模拟个人中心的并发请求
      const promises = [
        authApi.getCurrentUser(),
        pointsApi.getUserPoints(),
        levelCardApi.getMyCards(),
        pointsApi.getPointsHistory(1, 3, true)
      ];

      const results = await Promise.allSettled(promises);
      const duration = performance.now() - startTime;
      
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      const errorCount = results.filter(r => r.status === 'rejected').length;
      
      console.log(`📊 个人中心加载测试结果:`);
      console.log(`  总加载时间: ${duration.toFixed(2)}ms`);
      console.log(`  成功请求: ${successCount}/4`);
      console.log(`  失败请求: ${errorCount}/4`);
      
      if (errorCount > 0) {
        console.log('  失败详情:');
        results.forEach((result, index) => {
          if (result.status === 'rejected') {
            const apiNames = ['用户信息', '积分信息', '等级卡', '最近记录'];
            console.log(`    ${apiNames[index]}: ${result.reason.message}`);
          }
        });
      }

      return {
        totalTime: duration.toFixed(2),
        successCount,
        errorCount,
        successRate: (successCount / 4 * 100).toFixed(2) + '%'
      };
    } catch (error) {
      console.error('❌ 个人中心加载测试失败:', error);
      return null;
    }
  }

  // 测试缓存效果
  async testCachePerformance() {
    console.log('💾 测试缓存效果');
    
    if (!authApi.isLoggedIn()) {
      console.log('❌ 用户未登录，无法测试缓存');
      return null;
    }

    // 第一次请求（无缓存）
    console.log('第一次请求（无缓存）:');
    const firstResult = await this.testApiPerformance('积分信息', () => pointsApi.getUserPoints(), 1);
    
    // 等待一小段时间
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // 第二次请求（可能有缓存）
    console.log('第二次请求（可能有缓存）:');
    const secondResult = await this.testApiPerformance('积分信息', () => pointsApi.getUserPoints(), 1);
    
    const improvement = ((firstResult.avgTime - secondResult.avgTime) / firstResult.avgTime * 100).toFixed(2);
    
    console.log(`📊 缓存效果分析:`);
    console.log(`  首次请求: ${firstResult.avgTime}ms`);
    console.log(`  二次请求: ${secondResult.avgTime}ms`);
    console.log(`  性能提升: ${improvement}%`);
    
    return {
      firstTime: firstResult.avgTime,
      secondTime: secondResult.avgTime,
      improvement: improvement + '%'
    };
  }

  // 运行完整的性能测试套件
  async runFullTest() {
    console.log('🚀 开始完整性能测试');
    console.log('='.repeat(50));
    
    const testResults = {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      results: {}
    };

    // 测试个人中心加载
    testResults.results.profileLoad = await this.testProfileLoadPerformance();
    
    // 测试各个API的性能
    if (authApi.isLoggedIn()) {
      testResults.results.userInfo = await this.testApiPerformance(
        '用户信息API', 
        () => authApi.getCurrentUser(), 
        3
      );
      
      testResults.results.pointsInfo = await this.testApiPerformance(
        '积分信息API', 
        () => pointsApi.getUserPoints(), 
        3
      );
      
      testResults.results.levelCards = await this.testApiPerformance(
        '等级卡API', 
        () => levelCardApi.getMyCards(), 
        3
      );
      
      testResults.results.pointsHistory = await this.testApiPerformance(
        '积分记录API', 
        () => pointsApi.getPointsHistory(1, 5, true), 
        3
      );
      
      // 测试缓存效果
      testResults.results.cache = await this.testCachePerformance();
    } else {
      console.log('⚠️ 用户未登录，跳过需要认证的API测试');
    }

    console.log('🎉 性能测试完成');
    console.log('='.repeat(50));
    
    return testResults;
  }

  // 生成性能报告
  generateReport(testResults) {
    console.log('📋 性能测试报告');
    console.log('='.repeat(50));
    console.log(`测试时间: ${testResults.timestamp}`);
    console.log(`浏览器: ${testResults.userAgent}`);
    console.log('');

    if (testResults.results.profileLoad) {
      const profile = testResults.results.profileLoad;
      console.log('🏠 个人中心加载性能:');
      console.log(`  总加载时间: ${profile.totalTime}ms`);
      console.log(`  成功率: ${profile.successRate}`);
      console.log('');
    }

    console.log('🌐 API性能统计:');
    Object.entries(testResults.results).forEach(([key, result]) => {
      if (result && result.apiName) {
        console.log(`  ${result.apiName}:`);
        console.log(`    平均响应时间: ${result.avgTime}ms`);
        console.log(`    成功率: ${result.successRate}`);
      }
    });

    if (testResults.results.cache) {
      const cache = testResults.results.cache;
      console.log('');
      console.log('💾 缓存效果:');
      console.log(`  性能提升: ${cache.improvement}`);
    }

    console.log('='.repeat(50));
  }
}

// 导出测试工具
export default PerformanceTest;

// 便捷函数
export const runPerformanceTest = async () => {
  const tester = new PerformanceTest();
  const results = await tester.runFullTest();
  tester.generateReport(results);
  return results;
};

export const testProfileLoad = async () => {
  const tester = new PerformanceTest();
  return await tester.testProfileLoadPerformance();
};
