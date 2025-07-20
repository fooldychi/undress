// 🔧 极速换脸多窗口多任务修复验证脚本
// 在浏览器控制台中运行此脚本来验证修复效果

console.log('🔧 极速换脸多窗口多任务修复验证脚本');
console.log('==========================================');

// 1. 检查修复后的调试函数是否正确暴露
function checkDebugFunctions() {
  console.log('🔍 检查调试函数...');
  
  const requiredFunctions = [
    'debugTaskStatus',
    'debugFaceSwapTasks',
    'checkTaskStatusManually', 
    'forceCompleteTask',
    'checkAllPendingTasks',
    'pendingTasks'
  ];
  
  const missing = [];
  const available = [];
  
  requiredFunctions.forEach(funcName => {
    if (typeof window[funcName] !== 'undefined') {
      available.push(funcName);
    } else {
      missing.push(funcName);
    }
  });
  
  console.log('✅ 可用函数:', available);
  if (missing.length > 0) {
    console.log('❌ 缺失函数:', missing);
  }
  
  return missing.length === 0;
}

// 2. 检查当前换脸任务状态
function checkFaceSwapTaskStatus() {
  console.log('👤 检查当前换脸任务状态...');
  
  if (typeof window.debugFaceSwapTasks === 'function') {
    window.debugFaceSwapTasks();
  } else {
    console.log('❌ debugFaceSwapTasks 函数不可用');
    return;
  }
  
  if (typeof window.pendingTasks === 'undefined') {
    console.log('❌ pendingTasks 未暴露到全局');
    return;
  }
  
  const faceSwapTasks = Array.from(window.pendingTasks.entries())
    .filter(([_, task]) => task.workflowType === 'faceswap');
  
  console.log(`👤 当前换脸任务数: ${faceSwapTasks.length}`);
  
  if (faceSwapTasks.length > 0) {
    console.log('📝 换脸任务详情:');
    faceSwapTasks.forEach(([promptId, task]) => {
      console.log(`  - ${promptId}:`, {
        状态: task.status,
        类型: task.workflowType,
        窗口: task.windowId,
        服务器: task.executionServer,
        有进度回调: !!task.onProgress,
        创建时间: task.createdAt
      });
    });
    
    // 如果有卡住的任务，提供解决方案
    console.log('💡 如果换脸任务卡住，可以尝试以下解决方案:');
    console.log('1. 检查换脸任务状态: window.debugFaceSwapTasks()');
    console.log('2. 手动检查特定任务: window.checkTaskStatusManually("your-prompt-id")');
    console.log('3. 强制完成任务: window.forceCompleteTask("your-prompt-id")');
    console.log('4. 检查所有任务: window.checkAllPendingTasks()');
  } else {
    console.log('✅ 没有待处理的换脸任务');
  }
}

// 3. 检查窗口隔离机制
function checkWindowIsolation() {
  console.log('🪟 检查窗口隔离机制...');
  
  if (typeof window.getWindowInfo === 'function') {
    const windowInfo = window.getWindowInfo();
    console.log('🪟 当前窗口信息:', windowInfo);
    
    if (windowInfo.windowId && windowInfo.clientId) {
      console.log('✅ 窗口隔离机制正常');
    } else {
      console.log('❌ 窗口隔离机制异常');
    }
  } else {
    console.log('❌ getWindowInfo 函数不可用');
  }
}

// 4. 检查WebSocket连接状态
function checkWebSocketStatus() {
  console.log('🔗 检查WebSocket连接状态...');
  
  if (typeof window.getWebSocketServerStatus === 'function') {
    const status = window.getWebSocketServerStatus();
    console.log('🔗 WebSocket状态:', status);
    
    if (status.connected) {
      console.log('✅ WebSocket连接正常');
    } else {
      console.log('❌ WebSocket连接异常');
    }
  } else {
    console.log('❌ getWebSocketServerStatus 函数不可用');
  }
}

// 5. 模拟多窗口换脸任务测试
function simulateMultiWindowFaceSwapTest() {
  console.log('🧪 模拟多窗口换脸任务测试...');
  
  // 检查是否有换脸任务正在运行
  if (typeof window.pendingTasks !== 'undefined') {
    const faceSwapTasks = Array.from(window.pendingTasks.entries())
      .filter(([_, task]) => task.workflowType === 'faceswap');
    
    if (faceSwapTasks.length > 0) {
      console.log('⚠️ 检测到正在运行的换脸任务，建议等待完成后再测试');
      return;
    }
  }
  
  console.log('💡 要测试多窗口换脸功能，请：');
  console.log('1. 打开多个浏览器窗口/标签页');
  console.log('2. 在每个窗口中同时提交换脸任务');
  console.log('3. 观察控制台日志，确认每个任务都能正确完成');
  console.log('4. 使用 window.debugFaceSwapTasks() 监控任务状态');
}

// 主函数：运行所有检查
function runAllChecks() {
  console.log('🚀 开始运行所有检查...\n');
  
  const functionsOk = checkDebugFunctions();
  console.log('');
  
  if (functionsOk) {
    checkFaceSwapTaskStatus();
    console.log('');
    
    checkWindowIsolation();
    console.log('');
    
    checkWebSocketStatus();
    console.log('');
    
    simulateMultiWindowFaceSwapTest();
  }
  
  console.log('\n🎯 修复要点总结:');
  console.log('1. 修复了换脸任务的进度回调传递问题');
  console.log('2. 统一了换脸和褪衣的进度处理逻辑');
  console.log('3. 避免了任务重复注册导致的冲突');
  console.log('4. 增强了多窗口任务隔离机制');
  console.log('5. 添加了专门的换脸任务调试工具');
  
  console.log('\n💡 如果仍有问题，请：');
  console.log('1. 检查浏览器控制台是否有错误信息');
  console.log('2. 使用 window.debugFaceSwapTasks() 查看任务状态');
  console.log('3. 尝试刷新页面重新建立WebSocket连接');
  console.log('4. 确认多个窗口使用的是同一个ComfyUI服务器');
}

// 自动运行检查
runAllChecks();

// 暴露函数到全局，方便手动调用
window.testFaceSwapFix = {
  runAllChecks,
  checkDebugFunctions,
  checkFaceSwapTaskStatus,
  checkWindowIsolation,
  checkWebSocketStatus,
  simulateMultiWindowFaceSwapTest
};

console.log('\n🔧 测试函数已暴露到 window.testFaceSwapFix');
