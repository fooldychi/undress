// 简单的稳定性测试
const http = require('http');

class SimpleStabilityTest {
  constructor() {
    this.baseUrl = 'http://localhost:3007';
    this.testDuration = 30000; // 30秒
    this.requestInterval = 1000; // 1秒
    this.stats = {
      total: 0,
      success: 0,
      failed: 0,
      responseTimes: []
    };
  }

  async start() {
    console.log('🧪 开始简单稳定性测试...');
    console.log(`📍 目标: ${this.baseUrl}/health`);
    console.log(`⏱️ 测试时长: ${this.testDuration / 1000}秒`);
    console.log(`🔄 请求间隔: ${this.requestInterval / 1000}秒`);
    console.log('');

    const startTime = Date.now();
    const endTime = startTime + this.testDuration;

    while (Date.now() < endTime) {
      await this.makeRequest();
      await this.sleep(this.requestInterval);
    }

    this.generateReport();
  }

  async makeRequest() {
    return new Promise((resolve) => {
      const startTime = Date.now();
      
      const req = http.get(`${this.baseUrl}/health`, {
        timeout: 5000
      }, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          const responseTime = Date.now() - startTime;
          this.stats.total++;
          this.stats.responseTimes.push(responseTime);
          
          if (res.statusCode === 200) {
            this.stats.success++;
            console.log(`✅ 请求 ${this.stats.total}: ${responseTime}ms`);
          } else {
            this.stats.failed++;
            console.log(`❌ 请求 ${this.stats.total}: ${responseTime}ms (状态码: ${res.statusCode})`);
          }
          
          resolve();
        });
      });

      req.on('error', (error) => {
        const responseTime = Date.now() - startTime;
        this.stats.total++;
        this.stats.failed++;
        this.stats.responseTimes.push(responseTime);
        console.log(`❌ 请求 ${this.stats.total}: ${responseTime}ms (错误: ${error.message})`);
        resolve();
      });

      req.on('timeout', () => {
        const responseTime = Date.now() - startTime;
        this.stats.total++;
        this.stats.failed++;
        this.stats.responseTimes.push(responseTime);
        console.log(`⏰ 请求 ${this.stats.total}: ${responseTime}ms (超时)`);
        req.destroy();
        resolve();
      });
    });
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  generateReport() {
    console.log('\n🎯 稳定性测试报告');
    console.log('=' * 40);
    
    const successRate = (this.stats.success / this.stats.total * 100).toFixed(2);
    const avgResponseTime = this.stats.responseTimes.reduce((a, b) => a + b, 0) / this.stats.responseTimes.length;
    
    console.log(`📊 测试结果:`);
    console.log(`   总请求数: ${this.stats.total}`);
    console.log(`   成功请求: ${this.stats.success}`);
    console.log(`   失败请求: ${this.stats.failed}`);
    console.log(`   成功率: ${successRate}%`);
    console.log(`   平均响应时间: ${avgResponseTime.toFixed(2)}ms`);
    
    if (this.stats.responseTimes.length > 0) {
      const sorted = this.stats.responseTimes.sort((a, b) => a - b);
      const min = sorted[0];
      const max = sorted[sorted.length - 1];
      
      console.log(`   最快响应: ${min}ms`);
      console.log(`   最慢响应: ${max}ms`);
    }
    
    console.log('');
    
    // 稳定性评估
    if (successRate >= 95) {
      console.log('🎉 稳定性评估: 优秀 - 服务非常稳定');
    } else if (successRate >= 90) {
      console.log('✅ 稳定性评估: 良好 - 服务稳定');
    } else if (successRate >= 80) {
      console.log('⚠️ 稳定性评估: 一般 - 需要关注');
    } else {
      console.log('❌ 稳定性评估: 差 - 需要修复');
    }
    
    console.log('=' * 40);
  }
}

// 运行测试
const test = new SimpleStabilityTest();
test.start().catch(console.error);
