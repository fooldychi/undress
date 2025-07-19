// ComfyUI 54.5% 卡住问题修复验证脚本
// 在浏览器控制台中运行此脚本来验证修复效果

console.log('🔧 ComfyUI 54.5% 卡住问题修复验证脚本');
console.log('=====================================');

// 1. 检查修复后的函数是否正确暴露
function checkGlobalFunctions() {
  console.log('🔍 检查全局调试函数...');
  
  const requiredFunctions = [
    'debugTaskStatus',
    'checkTaskStatusManually', 
    'forceCompleteTask',
    'checkAllPendingTasks',
    'resetWebSocketServer',
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

// 2. 检查当前任务状态
function checkCurrentTaskStatus() {
  console.log('📊 检查当前任务状态...');
  
  if (typeof window.pendingTasks === 'undefined') {
    console.log('❌ pendingTasks 未暴露到全局');
    return;
  }
  
  const taskCount = window.pendingTasks.size;
  console.log(`📋 当前待处理任务数: ${taskCount}`);
  
  if (taskCount > 0) {
    console.log('📝 待处理任务列表:');
    for (const [promptId, task] of window.pendingTasks.entries()) {
      console.log(`  - ${promptId}: ${task.workflowType || 'unknown'} (创建于: ${task.createdAt || 'unknown'})`);
    }
    
    // 如果有卡住的任务，提供解决方案
    console.log('💡 如果任务卡在54.5%，可以尝试以下解决方案:');
    console.log('1. 检查任务状态: window.debugTaskStatus()');
    console.log('2. 手动检查特定任务: window.checkTaskStatusManually("your-prompt-id")');
    console.log('3. 强制完成任务: window.forceCompleteTask("your-prompt-id")');
    console.log('4. 检查所有任务: window.checkAllPendingTasks()');
  } else {
    console.log('✅ 没有待处理任务');
  }
}

// 3. 验证WebSocket连接状态
function checkWebSocketStatus() {
  console.log('🔗 检查WebSocket连接状态...');
  
  if (typeof window.getWebSocketServerStatus === 'function') {
    const status = window.getWebSocketServerStatus();
    console.log('📡 WebSocket状态:', status);
    
    if (!status.isConnected) {
      console.log('⚠️ WebSocket未连接，这可能导致任务状态更新问题');
      console.log('💡 可以尝试重置连接: window.resetWebSocketServer()');
    }
  } else {
    console.log('❌ getWebSocketServerStatus 函数不可用');
  }
}

// 4. 提供修复建议
function provideFix54Point5Suggestions() {
  console.log('🛠️ 54.5% 卡住问题修复建议:');
  console.log('=====================================');
  
  console.log('如果遇到任务卡在54.5%的问题，请按以下步骤操作:');
  console.log('');
  console.log('步骤1: 检查当前状态');
  console.log('  window.debugTaskStatus()');
  console.log('');
  console.log('步骤2: 检查所有待处理任务');
  console.log('  window.checkAllPendingTasks()');
  console.log('');
  console.log('步骤3: 如果任务确实完成但卡住，强制完成');
  console.log('  window.forceCompleteTask("your-prompt-id")');
  console.log('');
  console.log('步骤4: 如果问题持续，重置WebSocket连接');
  console.log('  window.resetWebSocketServer(true)');
  console.log('');
  console.log('修复原理:');
  console.log('- 添加了executed消息处理，确保与官方标准一致');
  console.log('- 优化了任务完成检测，使用立即响应机制');
  console.log('- 移除了可能导致延迟的重试和等待逻辑');
  console.log('- 添加了详细的调试日志和手动修复工具');
}

// 主函数
function runDiagnostics() {
  console.log('🚀 开始运行ComfyUI修复验证...');
  console.log('');
  
  const functionsOK = checkGlobalFunctions();
  console.log('');
  
  if (functionsOK) {
    checkCurrentTaskStatus();
    console.log('');
    
    checkWebSocketStatus();
    console.log('');
  }
  
  provideFix54Point5Suggestions();
  
  console.log('');
  console.log('✅ 诊断完成！');
}

// 自动运行诊断
runDiagnostics();

// 暴露主要函数供手动调用
window.runComfyUIFixDiagnostics = runDiagnostics;
window.checkComfyUITaskStatus = checkCurrentTaskStatus;

console.log('');
console.log('💡 提示: 可以随时运行 window.runComfyUIFixDiagnostics() 来重新检查状态');
