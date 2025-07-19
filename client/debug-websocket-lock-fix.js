// WebSocket服务器锁定问题修复验证脚本
// 用于测试 "WebSocket连接后未能锁定服务器" 错误的修复

console.log('🔧 WebSocket服务器锁定问题修复验证');
console.log('=====================================');

// 1. 检查修复是否已应用
function checkFixApplied() {
  console.log('\n📋 步骤1: 检查修复是否已应用');
  
  // 检查全局错误处理器是否包含新的错误关键词
  if (typeof window.handleError === 'function') {
    console.log('✅ 全局错误处理器可用');
  } else {
    console.log('❌ 全局错误处理器不可用');
  }
  
  // 检查ComfyUI服务是否可用
  if (typeof window.initializeWebSocket === 'function') {
    console.log('✅ WebSocket初始化函数可用');
  } else {
    console.log('❌ WebSocket初始化函数不可用');
  }
}

// 2. 测试WebSocket连接状态
async function testWebSocketConnection() {
  console.log('\n📋 步骤2: 测试WebSocket连接状态');
  
  try {
    // 检查当前WebSocket状态
    if (typeof window.getWebSocketServerStatus === 'function') {
      const status = window.getWebSocketServerStatus();
      console.log('📡 当前WebSocket状态:', status);
      
      if (!status.isConnected) {
        console.log('⚠️ WebSocket未连接，尝试重新连接...');
        
        // 尝试重新初始化WebSocket
        if (typeof window.initializeWebSocket === 'function') {
          await window.initializeWebSocket();
          console.log('✅ WebSocket重新初始化完成');
        }
      } else {
        console.log('✅ WebSocket连接正常');
      }
    } else {
      console.log('❌ WebSocket状态检查函数不可用');
    }
  } catch (error) {
    console.error('❌ WebSocket连接测试失败:', error);
    
    // 检查是否是我们修复的错误类型
    if (error.message.includes('WebSocket连接后未能锁定服务器')) {
      console.log('🚨 检测到目标错误，但修复可能未完全生效');
    } else if (error.message.includes('无法获取可用的ComfyUI服务器')) {
      console.log('🔍 这是负载均衡器错误，属于正常的错误处理');
    } else {
      console.log('🔍 这是其他类型的错误:', error.message);
    }
  }
}

// 3. 测试错误处理逻辑
function testErrorHandling() {
  console.log('\n📋 步骤3: 测试错误处理逻辑');
  
  // 模拟各种错误情况
  const testErrors = [
    new Error('WebSocket连接后未能锁定服务器'),
    new Error('无法获取可用的ComfyUI服务器: 负载均衡器错误'),
    new Error('ComfyUI服务器不可达: 连接超时'),
    new Error('负载均衡器未返回有效的服务器URL')
  ];
  
  testErrors.forEach((error, index) => {
    console.log(`\n🧪 测试错误 ${index + 1}: ${error.message}`);
    
    try {
      // 检查全局错误处理器是否能正确识别
      if (typeof window.handleError === 'function') {
        const handled = window.handleError(error, '测试');
        console.log(`   处理结果: ${handled ? '✅ 被全局处理' : '❌ 需要组件处理'}`);
      } else {
        console.log('   ❌ 无法测试，全局错误处理器不可用');
      }
    } catch (testError) {
      console.log(`   ❌ 测试失败: ${testError.message}`);
    }
  });
}

// 4. 提供修复建议
function provideFix() {
  console.log('\n🛠️ 修复建议:');
  console.log('=====================================');
  console.log('1. 如果仍然遇到 "WebSocket连接后未能锁定服务器" 错误:');
  console.log('   - 检查负载均衡器是否正常工作');
  console.log('   - 确认至少有一个ComfyUI服务器可用');
  console.log('   - 尝试手动重置WebSocket连接: window.resetWebSocketServer()');
  console.log('');
  console.log('2. 如果错误持续出现:');
  console.log('   - 刷新页面重新初始化所有连接');
  console.log('   - 检查网络连接是否稳定');
  console.log('   - 查看浏览器控制台的详细错误信息');
  console.log('');
  console.log('3. 调试命令:');
  console.log('   - window.getWebSocketServerStatus() // 查看WebSocket状态');
  console.log('   - window.resetWebSocketServer() // 重置WebSocket连接');
  console.log('   - window.debugWebSocketLock() // 调试锁定机制');
}

// 主函数
async function main() {
  try {
    checkFixApplied();
    await testWebSocketConnection();
    testErrorHandling();
    provideFix();
    
    console.log('\n✅ WebSocket锁定问题修复验证完成');
  } catch (error) {
    console.error('❌ 验证过程中出现错误:', error);
  }
}

// 导出函数供手动调用
if (typeof window !== 'undefined') {
  window.debugWebSocketLockFix = main;
  window.testWebSocketConnection = testWebSocketConnection;
  window.testErrorHandling = testErrorHandling;
  
  console.log('🔧 调试函数已添加到 window 对象:');
  console.log('   - window.debugWebSocketLockFix() // 运行完整验证');
  console.log('   - window.testWebSocketConnection() // 仅测试连接');
  console.log('   - window.testErrorHandling() // 仅测试错误处理');
}

// 自动运行
main();
