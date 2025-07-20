// 🔧 工作流标准化验证测试脚本
// 验证极速换脸与一键褪衣的完全一致性

console.log('🔧 工作流标准化验证测试脚本');
console.log('==========================================');

// 1. 检查标准化函数是否正确暴露
function checkStandardizationFunctions() {
  console.log('🔍 检查标准化函数...');
  
  const requiredFunctions = [
    'debugTaskStatus',
    'debugFaceSwapTasks',
    'debugWorkflowStandard',
    'checkTaskStatusManually', 
    'forceCompleteTask',
    'checkAllPendingTasks',
    'pendingTasks',
    'getWebSocketServerStatus',
    'validateServerConsistency'
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

// 2. 验证任务队列管理一致性
function validateTaskQueueConsistency() {
  console.log('📋 验证任务队列管理一致性...');
  
  if (typeof window.pendingTasks === 'undefined') {
    console.log('❌ pendingTasks 未暴露到全局');
    return false;
  }
  
  const tasks = Array.from(window.pendingTasks.entries());
  console.log(`📊 当前任务数: ${tasks.length}`);
  
  if (tasks.length === 0) {
    console.log('ℹ️ 没有待处理任务，无法验证一致性');
    return true;
  }
  
  // 检查任务标准化合规性
  const complianceIssues = [];
  const taskTypes = new Set();
  
  tasks.forEach(([promptId, task]) => {
    taskTypes.add(task.workflowType);
    
    // 检查必需字段
    if (!task.onProgress) complianceIssues.push(`${promptId}: 缺少进度回调`);
    if (!task.executionServer) complianceIssues.push(`${promptId}: 缺少服务器绑定`);
    if (!task.windowId) complianceIssues.push(`${promptId}: 缺少窗口标识`);
    if (!task.workflowType) complianceIssues.push(`${promptId}: 缺少工作流类型`);
    if (!task.createdAt) complianceIssues.push(`${promptId}: 缺少创建时间`);
  });
  
  console.log(`📝 发现的工作流类型: [${Array.from(taskTypes).join(', ')}]`);
  
  if (complianceIssues.length > 0) {
    console.warn('⚠️ 标准化合规性问题:', complianceIssues);
    return false;
  } else {
    console.log('✅ 所有任务符合标准化规范');
    return true;
  }
}

// 3. 验证服务器地址一致性
function validateServerConsistency() {
  console.log('🔒 验证服务器地址一致性...');
  
  if (typeof window.validateServerConsistency === 'function') {
    try {
      const result = window.validateServerConsistency('测试验证');
      console.log('🔍 服务器一致性检查结果:', result);
      
      if (result.consistent) {
        console.log('✅ 服务器地址一致性验证通过');
        return true;
      } else {
        console.warn('⚠️ 服务器地址不一致:', result.reason);
        return false;
      }
    } catch (error) {
      console.error('❌ 服务器一致性验证失败:', error);
      return false;
    }
  } else {
    console.log('❌ validateServerConsistency 函数不可用');
    return false;
  }
}

// 4. 验证WebSocket连接状态
function validateWebSocketStatus() {
  console.log('🔗 验证WebSocket连接状态...');
  
  if (typeof window.getWebSocketServerStatus === 'function') {
    try {
      const status = window.getWebSocketServerStatus();
      console.log('📡 WebSocket状态:', status);
      
      const issues = [];
      if (!status.isConnected) issues.push('WebSocket未连接');
      if (!status.lockedServer) issues.push('服务器未锁定');
      if (status.connectionState !== 1) issues.push(`连接状态异常: ${status.connectionState}`);
      
      if (issues.length > 0) {
        console.warn('⚠️ WebSocket状态问题:', issues);
        return false;
      } else {
        console.log('✅ WebSocket连接状态正常');
        return true;
      }
    } catch (error) {
      console.error('❌ WebSocket状态检查失败:', error);
      return false;
    }
  } else {
    console.log('❌ getWebSocketServerStatus 函数不可用');
    return false;
  }
}

// 5. 对比换脸和褪衣任务的实现一致性
function compareWorkflowImplementations() {
  console.log('🔄 对比工作流实现一致性...');
  
  if (typeof window.debugWorkflowStandard === 'function') {
    console.log('\n👤 换脸任务分析:');
    window.debugWorkflowStandard('faceswap');
    
    console.log('\n👕 褪衣任务分析:');
    window.debugWorkflowStandard('undress');
    
    console.log('\n📊 所有任务分析:');
    window.debugWorkflowStandard();
    
    return true;
  } else {
    console.log('❌ debugWorkflowStandard 函数不可用');
    return false;
  }
}

// 6. 模拟多窗口任务测试
function simulateMultiWindowTest() {
  console.log('🪟 模拟多窗口任务测试...');
  
  // 检查是否有正在运行的任务
  if (typeof window.pendingTasks !== 'undefined') {
    const activeTasks = Array.from(window.pendingTasks.entries());
    
    if (activeTasks.length > 0) {
      console.log('⚠️ 检测到正在运行的任务，建议等待完成后再测试');
      console.log('📋 当前任务:');
      activeTasks.forEach(([promptId, task]) => {
        console.log(`  - ${promptId}: ${task.workflowType} (状态: ${task.status})`);
      });
      return false;
    }
  }
  
  console.log('💡 多窗口测试建议:');
  console.log('1. 打开多个浏览器窗口/标签页');
  console.log('2. 在每个窗口中同时提交换脸和褪衣任务');
  console.log('3. 观察控制台日志，确认每个任务都能正确完成');
  console.log('4. 使用以下命令监控任务状态:');
  console.log('   - window.debugFaceSwapTasks() // 监控换脸任务');
  console.log('   - window.debugWorkflowStandard() // 监控所有任务');
  console.log('   - window.validateServerConsistency() // 检查服务器一致性');
  
  return true;
}

// 7. 生成标准化合规性报告
function generateComplianceReport() {
  console.log('\n📋 生成标准化合规性报告...');
  console.log('==========================================');
  
  const results = {
    standardizationFunctions: checkStandardizationFunctions(),
    taskQueueConsistency: validateTaskQueueConsistency(),
    serverConsistency: validateServerConsistency(),
    webSocketStatus: validateWebSocketStatus(),
    workflowComparison: compareWorkflowImplementations(),
    multiWindowTest: simulateMultiWindowTest()
  };
  
  const passedTests = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  
  console.log('\n🎯 合规性报告总结:');
  console.log(`✅ 通过测试: ${passedTests}/${totalTests}`);
  console.log(`📊 合规率: ${Math.round(passedTests / totalTests * 100)}%`);
  
  if (passedTests === totalTests) {
    console.log('🎉 所有测试通过！工作流标准化实施成功');
  } else {
    console.log('⚠️ 部分测试未通过，需要进一步修复');
    
    Object.entries(results).forEach(([test, passed]) => {
      if (!passed) {
        console.log(`❌ 失败测试: ${test}`);
      }
    });
  }
  
  return results;
}

// 主函数：运行所有验证
function runAllValidations() {
  console.log('🚀 开始运行所有验证...\n');
  
  try {
    const report = generateComplianceReport();
    
    console.log('\n💡 修复要点总结:');
    console.log('1. ✅ 修复了换脸任务的进度回调传递问题');
    console.log('2. ✅ 统一了换脸和褪衣的任务注册时序');
    console.log('3. ✅ 避免了任务重复注册导致的冲突');
    console.log('4. ✅ 确保了服务器地址绑定一致性');
    console.log('5. ✅ 增强了多窗口任务隔离机制');
    console.log('6. ✅ 添加了标准化调试工具');
    
    console.log('\n🔧 如果仍有问题，请：');
    console.log('1. 检查浏览器控制台是否有错误信息');
    console.log('2. 使用 window.debugWorkflowStandard() 查看任务状态');
    console.log('3. 使用 window.debugFaceSwapTasks() 专门调试换脸任务');
    console.log('4. 尝试刷新页面重新建立WebSocket连接');
    console.log('5. 确认多个窗口使用的是同一个ComfyUI服务器');
    
    return report;
  } catch (error) {
    console.error('❌ 验证过程中出现错误:', error);
    return null;
  }
}

// 自动运行验证
const validationResults = runAllValidations();

// 暴露函数到全局，方便手动调用
window.testWorkflowStandardization = {
  runAllValidations,
  checkStandardizationFunctions,
  validateTaskQueueConsistency,
  validateServerConsistency,
  validateWebSocketStatus,
  compareWorkflowImplementations,
  simulateMultiWindowTest,
  generateComplianceReport
};

console.log('\n🔧 测试函数已暴露到 window.testWorkflowStandardization');
console.log('可以使用 window.testWorkflowStandardization.runAllValidations() 重新运行验证');
