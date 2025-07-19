// WebSocket服务器一致性测试脚本
// 在浏览器控制台中运行此脚本来验证修复效果

console.log('🧪 开始WebSocket服务器一致性测试...');

async function testServerConsistency() {
  console.log('\n=== WebSocket服务器一致性测试 ===');
  
  try {
    // 1. 检查基础状态
    console.log('\n1️⃣ 检查基础状态:');
    const status = window.getWebSocketServerStatus();
    console.log('📊 WebSocket状态:', status);
    
    if (!status.lockedServer) {
      console.log('⚠️ 没有锁定的服务器，尝试初始化WebSocket连接...');
      // 这里可以触发一个简单的API调用来初始化连接
      return;
    }
    
    // 2. 测试API基础URL一致性
    console.log('\n2️⃣ 测试API基础URL一致性:');
    const apiUrl = await window.getApiBaseUrl();
    const normalizedLocked = status.lockedServer.replace(/\/$/, '');
    const normalizedApi = apiUrl.replace(/\/$/, '');
    
    if (normalizedLocked === normalizedApi) {
      console.log('✅ API基础URL与锁定服务器一致');
      console.log(`   服务器: ${normalizedApi}`);
    } else {
      console.log('❌ API基础URL与锁定服务器不一致！');
      console.log(`   锁定服务器: ${normalizedLocked}`);
      console.log(`   API服务器: ${normalizedApi}`);
    }
    
    // 3. 测试服务器一致性验证函数
    console.log('\n3️⃣ 测试服务器一致性验证函数:');
    const validation = await window.validateServerConsistency('测试');
    console.log('🔍 一致性验证结果:', validation);
    
    // 4. 模拟多个API调用的一致性
    console.log('\n4️⃣ 模拟多个API调用的一致性:');
    const urls = [];
    for (let i = 0; i < 5; i++) {
      const url = await window.getApiBaseUrl();
      urls.push(url);
    }
    
    const uniqueUrls = [...new Set(urls)];
    if (uniqueUrls.length === 1) {
      console.log('✅ 多次API调用返回相同服务器');
      console.log(`   服务器: ${uniqueUrls[0]}`);
    } else {
      console.log('❌ 多次API调用返回不同服务器！');
      console.log('   返回的服务器:', uniqueUrls);
    }
    
    // 5. 检查待处理任务对锁定的影响
    console.log('\n5️⃣ 检查待处理任务对锁定的影响:');
    console.log(`📊 当前待处理任务数: ${status.pendingTasksCount}`);
    
    if (status.pendingTasksCount > 0) {
      console.log('🔒 有待处理任务，服务器应该保持锁定');
      
      // 测试解锁条件
      const unlockResult = window.checkServerUnlockCondition();
      if (!unlockResult) {
        console.log('✅ 解锁检查正确：有任务时不解锁');
      } else {
        console.log('❌ 解锁检查错误：有任务时仍然解锁了');
      }
    } else {
      console.log('ℹ️ 没有待处理任务');
    }
    
    // 6. 总结测试结果
    console.log('\n6️⃣ 测试总结:');
    const allConsistent = validation.consistent && uniqueUrls.length === 1;
    
    if (allConsistent) {
      console.log('🎉 服务器一致性测试通过！');
      console.log('✅ 所有API调用都使用相同的锁定服务器');
      console.log('✅ 服务器锁定机制工作正常');
    } else {
      console.log('⚠️ 服务器一致性测试发现问题：');
      if (!validation.consistent) {
        console.log('   - API基础URL与锁定服务器不一致');
      }
      if (uniqueUrls.length > 1) {
        console.log('   - 多次API调用返回不同服务器');
      }
    }
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error);
  }
}

// 运行测试
testServerConsistency();

// 提供手动测试函数
window.testServerConsistency = testServerConsistency;
console.log('\n💡 测试函数已暴露到全局: window.testServerConsistency()');
console.log('💡 可以随时运行 window.testServerConsistency() 来重新测试');

// 提供快速修复建议
console.log('\n🔧 如果发现问题，可以尝试以下修复步骤:');
console.log('1. 检查详细状态: window.debugWebSocketLock()');
console.log('2. 验证一致性: await window.validateServerConsistency()');
console.log('3. 安全重置: window.resetWebSocketServer()');
console.log('4. 强制重置: window.resetWebSocketServer(true)');
console.log('5. 刷新页面重新初始化');
