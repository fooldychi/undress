// WebSocket服务器锁定机制诊断脚本
// 在浏览器控制台中运行此脚本

console.log('🔍 开始诊断WebSocket服务器锁定机制...');

// 1. 检查全局函数是否可用
console.log('\n1️⃣ 检查全局函数可用性:');
const requiredFunctions = [
  'getWebSocketServerStatus',
  'debugWebSocketLock',
  'resetWebSocketServer',
  'getApiBaseUrl'
];

requiredFunctions.forEach(funcName => {
  if (typeof window[funcName] === 'function') {
    console.log(`✅ ${funcName} 可用`);
  } else {
    console.log(`❌ ${funcName} 不可用`);
  }
});

// 2. 检查当前WebSocket状态
console.log('\n2️⃣ 检查WebSocket状态:');
try {
  if (typeof window.getWebSocketServerStatus === 'function') {
    const status = window.getWebSocketServerStatus();
    console.log('📊 WebSocket状态:', status);

    // 分析状态
    if (status.lockedServer) {
      console.log(`🔒 已锁定服务器: ${status.lockedServer}`);
      console.log(`🕐 锁定时间: ${new Date(status.lockTimestamp).toLocaleString()}`);
      console.log(`⏱️ 锁定持续: ${Math.round((Date.now() - status.lockTimestamp) / 1000)}秒`);
    } else {
      console.log('⚠️ 没有锁定的服务器');
    }

    if (status.isConnected) {
      console.log('✅ WebSocket已连接');
    } else {
      console.log('❌ WebSocket未连接');
    }

    console.log(`📡 连接状态: ${status.connectionState} (1=OPEN)`);
    console.log(`📊 待处理任务: ${status.pendingTasksCount}`);
  } else {
    console.log('❌ getWebSocketServerStatus 函数不可用');
  }
} catch (error) {
  console.error('❌ 检查WebSocket状态失败:', error);
}

// 3. 测试API基础URL获取
console.log('\n3️⃣ 测试API基础URL获取:');
if (typeof window.getApiBaseUrl === 'function') {
  window.getApiBaseUrl().then(url => {
    console.log(`🔗 当前API基础URL: ${url}`);

    // 检查是否使用了锁定的服务器
    if (typeof window.getWebSocketServerStatus === 'function') {
      const status = window.getWebSocketServerStatus();
      if (status.lockedServer && url === status.lockedServer) {
        console.log('✅ API使用了锁定的服务器');
      } else if (status.lockedServer) {
        console.log('⚠️ API没有使用锁定的服务器');
        console.log(`   锁定的服务器: ${status.lockedServer}`);
        console.log(`   API使用的服务器: ${url}`);
      } else {
        console.log('ℹ️ 没有锁定的服务器，使用负载均衡');
      }
    }
  }).catch(error => {
    console.error('❌ 获取API基础URL失败:', error);
  });
} else {
  console.log('❌ getApiBaseUrl 函数不可用');
}

// 4. 运行详细调试
console.log('\n4️⃣ 运行详细调试:');
if (typeof window.debugWebSocketLock === 'function') {
  try {
    const debugResult = window.debugWebSocketLock();
    console.log('🐛 调试结果:', debugResult);
  } catch (error) {
    console.error('❌ 调试失败:', error);
  }
} else {
  console.log('❌ debugWebSocketLock 函数不可用');
}

// 5. 测试解锁条件检查
console.log('\n5️⃣ 测试解锁条件检查:');
if (typeof window.checkServerUnlockCondition === 'function') {
  try {
    const unlocked = window.checkServerUnlockCondition();
    console.log(`🔓 解锁检查结果: ${unlocked ? '已解锁' : '保持锁定'}`);
  } catch (error) {
    console.error('❌ 解锁检查失败:', error);
  }
} else {
  console.log('❌ checkServerUnlockCondition 函数不可用');
}

// 6. 建议修复步骤
console.log('\n6️⃣ 建议修复步骤:');
console.log('如果发现问题，可以尝试以下步骤:');
console.log('1. 检查解锁条件: window.checkServerUnlockCondition()');
console.log('2. 安全重置(有任务时会提示): window.resetWebSocketServer()');
console.log('3. 强制重置(清理所有任务): window.resetWebSocketServer(true)');
console.log('4. 刷新页面重新建立连接');
console.log('5. 检查网络连接和服务器状态');

console.log('\n🔍 诊断完成 - 新版本支持任务完成后解锁');
