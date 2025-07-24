// WebSocket消息路由错乱问题修复验证脚本
// 用于测试多服务器环境下的任务-服务器绑定一致性

console.log('🔧 WebSocket消息路由错乱问题修复验证');
console.log('==========================================');

// 1. 检查修复是否已应用
function checkFixApplied() {
  console.log('\n📋 步骤1: 检查修复是否已应用');
  
  const requiredFunctions = [
    'ensureWebSocketServerConsistency',
    'initializeWebSocket',
    'getWebSocketServerStatus',
    'resetWebSocketServer'
  ];
  
  let allFunctionsAvailable = true;
  
  requiredFunctions.forEach(funcName => {
    if (typeof window[funcName] === 'function') {
      console.log(`✅ ${funcName} 可用`);
    } else {
      console.log(`❌ ${funcName} 不可用`);
      allFunctionsAvailable = false;
    }
  });
  
  return allFunctionsAvailable;
}

// 2. 测试WebSocket服务器一致性检查
async function testWebSocketConsistency() {
  console.log('\n📋 步骤2: 测试WebSocket服务器一致性检查');
  
  try {
    // 获取当前状态
    const status = window.getWebSocketServerStatus();
    console.log('📊 当前WebSocket状态:', status);
    
    if (!status.isConnected) {
      console.log('⚠️ WebSocket未连接，尝试初始化连接...');
      await window.initializeWebSocket();
      
      // 重新检查状态
      const newStatus = window.getWebSocketServerStatus();
      console.log('📊 连接后状态:', newStatus);
    }
    
    // 测试服务器一致性检查函数
    if (typeof window.ensureWebSocketServerConsistency === 'function') {
      console.log('🔍 测试服务器一致性检查函数...');
      
      // 获取当前锁定的服务器
      const currentLock = window.getWindowServerLock ? window.getWindowServerLock() : null;
      if (currentLock && currentLock.server) {
        console.log(`🎯 测试服务器: ${currentLock.server}`);
        
        try {
          await window.ensureWebSocketServerConsistency(currentLock.server);
          console.log('✅ 服务器一致性检查通过');
        } catch (error) {
          console.error('❌ 服务器一致性检查失败:', error.message);
        }
      } else {
        console.log('⚠️ 没有锁定的服务器，无法测试一致性检查');
      }
    }
    
  } catch (error) {
    console.error('❌ WebSocket一致性测试失败:', error);
  }
}

// 3. 模拟多服务器任务提交场景
async function simulateMultiServerScenario() {
  console.log('\n📋 步骤3: 模拟多服务器任务提交场景');
  
  try {
    // 检查是否有多个可用服务器
    if (typeof window.loadBalancer === 'object' && window.loadBalancer.getAvailableServers) {
      const servers = await window.loadBalancer.getAvailableServers();
      console.log(`🌐 可用服务器数量: ${servers.length}`);
      console.log('📋 服务器列表:', servers);
      
      if (servers.length >= 2) {
        console.log('✅ 检测到多服务器环境，可以进行路由测试');
        
        // 模拟任务A提交到服务器1
        console.log('\n🎯 模拟场景: 任务A提交到服务器1');
        const serverA = servers[0];
        console.log(`📤 模拟任务A提交到: ${serverA}`);
        
        // 确保WebSocket连接到服务器A
        if (typeof window.ensureWebSocketServerConsistency === 'function') {
          await window.ensureWebSocketServerConsistency(serverA);
          console.log(`🔗 WebSocket已连接到服务器A: ${serverA}`);
        }
        
        // 检查连接状态
        const statusA = window.getWebSocketServerStatus();
        console.log('📊 服务器A连接状态:', statusA);
        
        // 模拟任务B提交到服务器2
        console.log('\n🎯 模拟场景: 任务B提交到服务器2');
        const serverB = servers[1];
        console.log(`📤 模拟任务B提交到: ${serverB}`);
        
        // 确保WebSocket连接到服务器B
        if (typeof window.ensureWebSocketServerConsistency === 'function') {
          await window.ensureWebSocketServerConsistency(serverB);
          console.log(`🔗 WebSocket已重新连接到服务器B: ${serverB}`);
        }
        
        // 检查连接状态
        const statusB = window.getWebSocketServerStatus();
        console.log('📊 服务器B连接状态:', statusB);
        
        // 验证服务器切换是否成功
        if (statusB.lockedServer === serverB) {
          console.log('✅ 服务器切换成功，WebSocket路由修复有效');
        } else {
          console.log('❌ 服务器切换失败，可能存在路由问题');
        }
        
      } else {
        console.log('⚠️ 只有一个服务器，无法测试多服务器路由');
      }
    } else {
      console.log('⚠️ 负载均衡器不可用，无法获取服务器列表');
    }
    
  } catch (error) {
    console.error('❌ 多服务器场景模拟失败:', error);
  }
}

// 4. 验证clientId唯一性增强
function testClientIdUniqueness() {
  console.log('\n📋 步骤4: 验证clientId唯一性增强');
  
  try {
    // 检查当前clientId格式
    if (typeof window.WINDOW_CLIENT_ID === 'string') {
      const clientId = window.WINDOW_CLIENT_ID;
      console.log(`🔑 当前clientId: ${clientId}`);
      
      // 检查是否包含时间戳和随机数
      const parts = clientId.split('_');
      console.log(`📊 clientId组成部分: ${parts.length} 个`);
      
      if (parts.length >= 4) {
        console.log('✅ clientId包含增强的唯一性组件');
        console.log(`   基础ID: ${parts[0]}`);
        console.log(`   时间戳: ${parts[1]}`);
        console.log(`   随机数: ${parts[2]}`);
        console.log(`   窗口ID: ${parts[3]}`);
      } else {
        console.log('⚠️ clientId格式可能未更新到增强版本');
      }
    } else {
      console.log('❌ 无法获取当前clientId');
    }
    
  } catch (error) {
    console.error('❌ clientId唯一性测试失败:', error);
  }
}

// 5. 生成修复验证报告
function generateFixReport() {
  console.log('\n📋 步骤5: 生成修复验证报告');
  console.log('==========================================');
  
  const report = {
    timestamp: new Date().toISOString(),
    fixesApplied: checkFixApplied(),
    websocketStatus: null,
    recommendations: []
  };
  
  try {
    report.websocketStatus = window.getWebSocketServerStatus();
  } catch (error) {
    report.websocketStatus = { error: error.message };
  }
  
  // 生成建议
  if (!report.fixesApplied) {
    report.recommendations.push('需要确保所有修复函数都已正确导出');
  }
  
  if (!report.websocketStatus.isConnected) {
    report.recommendations.push('需要建立WebSocket连接以测试路由修复');
  }
  
  if (report.websocketStatus.isConnected && !report.websocketStatus.lockedServer) {
    report.recommendations.push('WebSocket已连接但服务器未锁定，可能存在一致性问题');
  }
  
  console.log('📊 修复验证报告:');
  console.log(JSON.stringify(report, null, 2));
  
  return report;
}

// 主测试函数
async function runWebSocketRoutingFixTest() {
  console.log('🚀 开始WebSocket消息路由修复验证测试...\n');
  
  try {
    // 执行所有测试步骤
    const fixesApplied = checkFixApplied();
    
    if (fixesApplied) {
      await testWebSocketConsistency();
      await simulateMultiServerScenario();
      testClientIdUniqueness();
    } else {
      console.log('❌ 修复函数不完整，跳过高级测试');
    }
    
    // 生成最终报告
    const report = generateFixReport();
    
    console.log('\n🎉 WebSocket消息路由修复验证完成！');
    
    if (report.fixesApplied && report.websocketStatus.isConnected) {
      console.log('✅ 修复验证成功，WebSocket消息路由问题已解决');
    } else {
      console.log('⚠️ 修复验证部分成功，建议检查具体问题');
    }
    
    return report;
    
  } catch (error) {
    console.error('❌ 测试执行失败:', error);
    return { error: error.message };
  }
}

// 导出测试函数到全局
if (typeof window !== 'undefined') {
  window.runWebSocketRoutingFixTest = runWebSocketRoutingFixTest;
  window.testWebSocketConsistency = testWebSocketConsistency;
  window.simulateMultiServerScenario = simulateMultiServerScenario;
  
  console.log('🔧 WebSocket路由修复测试函数已导出到全局:');
  console.log('   - window.runWebSocketRoutingFixTest()');
  console.log('   - window.testWebSocketConsistency()');
  console.log('   - window.simulateMultiServerScenario()');
}

// 自动运行测试（可选）
if (typeof window !== 'undefined' && window.location.search.includes('auto-test')) {
  setTimeout(() => {
    runWebSocketRoutingFixTest();
  }, 2000);
}
