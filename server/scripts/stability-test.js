// 服务稳定性测试工具
const http = require('http');
const { performance } = require('perf_hooks');

class StabilityTester {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || 'http://localhost:3007';
    this.concurrency = options.concurrency || 10;
    this.duration = options.duration || 300000; // 5分钟
    this.requestInterval = options.requestInterval || 1000; // 1秒
    this.endpoints = options.endpoints || [
      '/health',
      '/api/auth/me',
      '/api/points/user',
      '/api/level-cards/my-cards'
    ];
    
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      timeouts: 0,
      errors: {},
      responseTimes: [],
      startTime: 0,
      endTime: 0
    };
    
    this.isRunning = false;
    this.workers = [];
  }

  // 开始稳定性测试
  async start() {
    console.log('🧪 开始服务稳定性测试...');
    console.log(`📍 目标服务: ${this.baseUrl}`);
    console.log(`⚡ 并发数: ${this.concurrency}`);
    console.log(`⏱️ 测试时长: ${this.duration / 1000}秒`);
    console.log(`🔄 请求间隔: ${this.requestInterval}ms`);
    console.log(`📋 测试端点: ${this.endpoints.join(', ')}`);
    console.log('');

    this.isRunning = true;
    this.stats.startTime = Date.now();

    // 启动多个并发工作器
    for (let i = 0; i < this.concurrency; i++) {
      this.workers.push(this.startWorker(i));
    }

    // 定期打印统计信息
    const statsInterval = setInterval(() => {
      this.printStats();
    }, 10000); // 每10秒打印一次

    // 等待测试完成
    setTimeout(() => {
      this.stop();
      clearInterval(statsInterval);
    }, this.duration);

    // 等待所有工作器完成
    await Promise.all(this.workers);
    
    this.generateReport();
  }

  // 启动工作器
  async startWorker(workerId) {
    console.log(`🔧 启动工作器 ${workerId}`);
    
    while (this.isRunning) {
      try {
        const endpoint = this.endpoints[Math.floor(Math.random() * this.endpoints.length)];
        await this.makeRequest(endpoint, workerId);
        
        // 等待指定间隔
        await new Promise(resolve => setTimeout(resolve, this.requestInterval));
      } catch (error) {
        console.error(`❌ 工作器 ${workerId} 错误:`, error.message);
      }
    }
    
    console.log(`✅ 工作器 ${workerId} 已停止`);
  }

  // 发起请求
  async makeRequest(endpoint, workerId) {
    return new Promise((resolve) => {
      const startTime = performance.now();
      const url = `${this.baseUrl}${endpoint}`;
      
      const req = http.get(url, {
        timeout: 10000 // 10秒超时
      }, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          const endTime = performance.now();
          const responseTime = endTime - startTime;
          
          this.stats.totalRequests++;
          this.stats.responseTimes.push(responseTime);
          
          if (res.statusCode >= 200 && res.statusCode < 300) {
            this.stats.successfulRequests++;
          } else {
            this.stats.failedRequests++;
            this.recordError(`HTTP_${res.statusCode}`, `Status: ${res.statusCode}`);
          }
          
          resolve();
        });
      });

      req.on('error', (error) => {
        this.stats.totalRequests++;
        this.stats.failedRequests++;
        this.recordError(error.code || 'UNKNOWN_ERROR', error.message);
        resolve();
      });

      req.on('timeout', () => {
        this.stats.totalRequests++;
        this.stats.timeouts++;
        this.recordError('TIMEOUT', 'Request timeout');
        req.destroy();
        resolve();
      });
    });
  }

  // 记录错误
  recordError(code, message) {
    if (!this.stats.errors[code]) {
      this.stats.errors[code] = {
        count: 0,
        messages: new Set()
      };
    }
    
    this.stats.errors[code].count++;
    this.stats.errors[code].messages.add(message);
  }

  // 停止测试
  stop() {
    console.log('🛑 停止稳定性测试...');
    this.isRunning = false;
    this.stats.endTime = Date.now();
  }

  // 打印统计信息
  printStats() {
    const elapsed = (Date.now() - this.stats.startTime) / 1000;
    const rps = (this.stats.totalRequests / elapsed).toFixed(2);
    const successRate = (this.stats.successfulRequests / this.stats.totalRequests * 100).toFixed(2);
    
    console.log('\n📊 实时统计:');
    console.log(`⏱️ 运行时间: ${elapsed.toFixed(2)}秒`);
    console.log(`📈 总请求数: ${this.stats.totalRequests}`);
    console.log(`✅ 成功请求: ${this.stats.successfulRequests}`);
    console.log(`❌ 失败请求: ${this.stats.failedRequests}`);
    console.log(`⏰ 超时请求: ${this.stats.timeouts}`);
    console.log(`🎯 成功率: ${successRate}%`);
    console.log(`⚡ 请求速率: ${rps} RPS`);
    
    if (this.stats.responseTimes.length > 0) {
      const avgResponseTime = this.stats.responseTimes.reduce((a, b) => a + b, 0) / this.stats.responseTimes.length;
      console.log(`📊 平均响应时间: ${avgResponseTime.toFixed(2)}ms`);
    }
  }

  // 生成测试报告
  generateReport() {
    console.log('\n🎯 稳定性测试报告');
    console.log('=' * 60);
    
    const totalTime = (this.stats.endTime - this.stats.startTime) / 1000;
    const rps = (this.stats.totalRequests / totalTime).toFixed(2);
    const successRate = (this.stats.successfulRequests / this.stats.totalRequests * 100).toFixed(2);
    
    console.log(`📊 测试概览:`);
    console.log(`   测试时长: ${totalTime.toFixed(2)}秒`);
    console.log(`   总请求数: ${this.stats.totalRequests}`);
    console.log(`   成功请求: ${this.stats.successfulRequests}`);
    console.log(`   失败请求: ${this.stats.failedRequests}`);
    console.log(`   超时请求: ${this.stats.timeouts}`);
    console.log(`   成功率: ${successRate}%`);
    console.log(`   平均RPS: ${rps}`);
    console.log('');

    // 响应时间统计
    if (this.stats.responseTimes.length > 0) {
      const sorted = this.stats.responseTimes.sort((a, b) => a - b);
      const avg = sorted.reduce((a, b) => a + b, 0) / sorted.length;
      const p50 = sorted[Math.floor(sorted.length * 0.5)];
      const p90 = sorted[Math.floor(sorted.length * 0.9)];
      const p95 = sorted[Math.floor(sorted.length * 0.95)];
      const p99 = sorted[Math.floor(sorted.length * 0.99)];
      
      console.log(`📈 响应时间统计:`);
      console.log(`   平均值: ${avg.toFixed(2)}ms`);
      console.log(`   P50: ${p50.toFixed(2)}ms`);
      console.log(`   P90: ${p90.toFixed(2)}ms`);
      console.log(`   P95: ${p95.toFixed(2)}ms`);
      console.log(`   P99: ${p99.toFixed(2)}ms`);
      console.log(`   最小值: ${sorted[0].toFixed(2)}ms`);
      console.log(`   最大值: ${sorted[sorted.length - 1].toFixed(2)}ms`);
      console.log('');
    }

    // 错误统计
    if (Object.keys(this.stats.errors).length > 0) {
      console.log(`❌ 错误统计:`);
      for (const [code, error] of Object.entries(this.stats.errors)) {
        console.log(`   ${code}: ${error.count}次`);
        for (const message of error.messages) {
          console.log(`     - ${message}`);
        }
      }
      console.log('');
    }

    // 稳定性评估
    console.log(`🎯 稳定性评估:`);
    if (successRate >= 99) {
      console.log('   ✅ 优秀 - 服务非常稳定');
    } else if (successRate >= 95) {
      console.log('   ✅ 良好 - 服务稳定');
    } else if (successRate >= 90) {
      console.log('   ⚠️ 一般 - 服务基本稳定，建议优化');
    } else {
      console.log('   ❌ 差 - 服务不稳定，需要立即修复');
    }
    
    console.log('=' * 60);
  }
}

// 如果直接运行此脚本，开始测试
if (require.main === module) {
  const tester = new StabilityTester({
    duration: 60000, // 1分钟测试
    concurrency: 5,
    requestInterval: 500
  });
  
  tester.start().catch(console.error);
}

module.exports = StabilityTester;
