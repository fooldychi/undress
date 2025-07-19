// ComfyUI 服务器一致性和 Prompt ID 跟踪测试脚本
// 在浏览器控制台中运行此脚本来测试跟踪功能

console.log('🔍 开始 ComfyUI 跟踪测试...');

// 测试函数：检查跟踪功能是否正常工作
async function testTracking() {
  console.log('📊 ===== ComfyUI 跟踪功能测试 =====');
  
  try {
    // 1. 检查全局函数是否可用
    console.log('1️⃣ 检查全局调试函数...');
    const globalFunctions = [
      'getWebSocketServerStatus',
      'resetWebSocketServer', 
      'debugWebSocketLock',
      'getApiBaseUrl',
      'validateServerConsistency'
    ];
    
    for (const funcName of globalFunctions) {
      if (window[funcName]) {
        console.log(`✅ ${funcName} 可用`);
      } else {
        console.log(`❌ ${funcName} 不可用`);
      }
    }
    
    // 2. 获取当前 WebSocket 状态
    console.log('\n2️⃣ 获取当前 WebSocket 状态...');
    if (window.getWebSocketServerStatus) {
      const status = window.getWebSocketServerStatus();
      console.log('📊 WebSocket 状态:', JSON.stringify(status, null, 2));
    }
    
    // 3. 测试服务器一致性验证
    console.log('\n3️⃣ 测试服务器一致性验证...');
    if (window.validateServerConsistency) {
      try {
        const consistency = await window.validateServerConsistency('测试调用');
        console.log('🔍 服务器一致性结果:', JSON.stringify(consistency, null, 2));
      } catch (error) {
        console.log('⚠️ 服务器一致性验证失败:', error.message);
      }
    }
    
    // 4. 调试 WebSocket 锁定机制
    console.log('\n4️⃣ 调试 WebSocket 锁定机制...');
    if (window.debugWebSocketLock) {
      const lockInfo = window.debugWebSocketLock();
      console.log('🔒 WebSocket 锁定信息:', JSON.stringify(lockInfo, null, 2));
    }
    
    // 5. 测试 Prompt ID 生成
    console.log('\n5️⃣ 测试 Prompt ID 生成...');
    if (window.generatePromptId) {
      const promptId1 = window.generatePromptId();
      const promptId2 = window.generatePromptId();
      console.log(`🆔 生成的 Prompt ID 1: ${promptId1}`);
      console.log(`🆔 生成的 Prompt ID 2: ${promptId2}`);
      console.log(`🔍 ID 唯一性检查: ${promptId1 !== promptId2 ? '✅ 通过' : '❌ 失败'}`);
    }
    
    console.log('\n✅ 跟踪功能测试完成');
    
  } catch (error) {
    console.error('❌ 跟踪测试失败:', error);
  }
}

// 测试函数：模拟完整的任务流程
async function testFullWorkflow() {
  console.log('\n🚀 ===== 完整工作流程跟踪测试 =====');
  
  try {
    // 1. 初始化 WebSocket 连接
    console.log('1️⃣ 初始化 WebSocket 连接...');
    if (window.initializeWebSocket) {
      await window.initializeWebSocket();
      console.log('✅ WebSocket 连接初始化完成');
    }
    
    // 2. 检查连接后的状态
    console.log('\n2️⃣ 检查连接后的状态...');
    if (window.getWebSocketServerStatus) {
      const status = window.getWebSocketServerStatus();
      console.log('📊 连接后状态:', JSON.stringify(status, null, 2));
    }
    
    // 3. 模拟任务提交
    console.log('\n3️⃣ 模拟任务提交...');
    const promptId = window.generatePromptId ? window.generatePromptId() : 'test-prompt-id';
    console.log(`🆔 模拟任务 Prompt ID: ${promptId}`);
    
    // 4. 验证服务器一致性
    console.log('\n4️⃣ 验证任务提交时的服务器一致性...');
    if (window.validateServerConsistency) {
      const consistency = await window.validateServerConsistency('任务提交');
      console.log('🔍 任务提交时服务器一致性:', JSON.stringify(consistency, null, 2));
    }
    
    console.log('\n✅ 完整工作流程测试完成');
    
  } catch (error) {
    console.error('❌ 完整工作流程测试失败:', error);
  }
}

// 监控函数：持续监控服务器状态变化
function startStatusMonitoring(intervalMs = 5000) {
  console.log(`📊 开始状态监控 (间隔: ${intervalMs}ms)...`);
  
  let lastStatus = null;
  
  const monitor = setInterval(() => {
    if (window.getWebSocketServerStatus) {
      const currentStatus = window.getWebSocketServerStatus();
      
      // 检查状态是否发生变化
      if (JSON.stringify(currentStatus) !== JSON.stringify(lastStatus)) {
        console.log('🔄 状态变化检测到:');
        console.log('📊 当前状态:', JSON.stringify(currentStatus, null, 2));
        
        if (lastStatus) {
          console.log('📊 上次状态:', JSON.stringify(lastStatus, null, 2));
        }
        
        lastStatus = currentStatus;
      }
    }
  }, intervalMs);
  
  // 返回停止监控的函数
  return () => {
    clearInterval(monitor);
    console.log('⏹️ 状态监控已停止');
  };
}

// 导出测试函数到全局
window.testTracking = testTracking;
window.testFullWorkflow = testFullWorkflow;
window.startStatusMonitoring = startStatusMonitoring;

console.log('🔧 跟踪测试函数已加载到全局:');
console.log('   - window.testTracking() - 测试跟踪功能');
console.log('   - window.testFullWorkflow() - 测试完整工作流程');
console.log('   - window.startStatusMonitoring() - 开始状态监控');

// 自动运行基础测试
console.log('\n🚀 自动运行基础跟踪测试...');
testTracking();
