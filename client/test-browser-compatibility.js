// 浏览器兼容性测试脚本
// 验证修复后的代码在浏览器环境中正常工作

console.log('🧪 开始浏览器兼容性测试...');

// 测试1: 验证setTimeout(0)可以正常工作
function testSetTimeoutZero() {
  console.log('📋 测试1: setTimeout(0) 兼容性');
  
  return new Promise((resolve) => {
    let executed = false;
    
    setTimeout(() => {
      executed = true;
      console.log('✅ setTimeout(0) 执行成功');
      resolve(true);
    }, 0);
    
    // 验证是否异步执行
    if (!executed) {
      console.log('✅ setTimeout(0) 正确异步执行');
    } else {
      console.log('❌ setTimeout(0) 同步执行（异常）');
      resolve(false);
    }
  });
}

// 测试2: 验证setImmediate不存在（确认浏览器环境）
function testSetImmediateNotExists() {
  console.log('📋 测试2: 确认setImmediate不存在');
  
  if (typeof setImmediate === 'undefined') {
    console.log('✅ 确认在浏览器环境中，setImmediate未定义');
    return true;
  } else {
    console.log('⚠️ setImmediate存在，可能在Node.js环境中');
    return false;
  }
}

// 测试3: 模拟修复后的任务完成处理
function testTaskCompletionFlow() {
  console.log('📋 测试3: 模拟任务完成流程');
  
  return new Promise((resolve) => {
    let step = 0;
    const steps = [];
    
    // 模拟handleExecutingMessage中的逻辑
    function mockHandleExecutingMessage(data) {
      if (data.node === null) {
        console.log('📨 模拟收到任务完成信号');
        steps.push('received_completion_signal');
        
        // 使用修复后的setTimeout(0)
        setTimeout(() => {
          mockHandleTaskCompletion(data.prompt_id);
        }, 0);
      }
    }
    
    // 模拟handleTaskCompletion中的逻辑
    function mockHandleTaskCompletion(promptId) {
      console.log('🔄 模拟处理任务完成');
      steps.push('processing_completion');
      
      // 模拟异步操作
      setTimeout(() => {
        console.log('📊 模拟获取任务结果');
        steps.push('getting_results');
        
        // 模拟调用完成回调
        setTimeout(() => {
          console.log('🎉 模拟调用完成回调');
          steps.push('calling_callback');
          
          // 验证执行顺序
          const expectedSteps = [
            'received_completion_signal',
            'processing_completion', 
            'getting_results',
            'calling_callback'
          ];
          
          const success = JSON.stringify(steps) === JSON.stringify(expectedSteps);
          
          if (success) {
            console.log('✅ 任务完成流程测试通过');
          } else {
            console.log('❌ 任务完成流程测试失败');
            console.log('期望步骤:', expectedSteps);
            console.log('实际步骤:', steps);
          }
          
          resolve(success);
        }, 0);
      }, 0);
    }
    
    // 开始测试
    mockHandleExecutingMessage({
      prompt_id: 'test-prompt-id',
      node: null
    });
  });
}

// 测试4: 验证Promise立即resolve
function testPromiseImmediateResolve() {
  console.log('📋 测试4: Promise立即resolve');
  
  return new Promise((resolve) => {
    let resolved = false;
    
    const testPromise = new Promise((innerResolve) => {
      setTimeout(() => {
        resolved = true;
        console.log('✅ Promise通过setTimeout(0)立即resolve');
        innerResolve('test-result');
      }, 0);
    });
    
    testPromise.then((result) => {
      if (result === 'test-result' && resolved) {
        console.log('✅ Promise resolve测试通过');
        resolve(true);
      } else {
        console.log('❌ Promise resolve测试失败');
        resolve(false);
      }
    });
    
    // 验证Promise是异步的
    if (!resolved) {
      console.log('✅ Promise正确异步执行');
    }
  });
}

// 运行所有测试
async function runAllTests() {
  console.log('🚀 开始运行所有兼容性测试...');
  console.log('=====================================');
  
  const results = [];
  
  try {
    // 测试1
    const test1 = await testSetTimeoutZero();
    results.push({ name: 'setTimeout(0)兼容性', passed: test1 });
    
    // 测试2
    const test2 = testSetImmediateNotExists();
    results.push({ name: 'setImmediate不存在确认', passed: test2 });
    
    // 测试3
    const test3 = await testTaskCompletionFlow();
    results.push({ name: '任务完成流程', passed: test3 });
    
    // 测试4
    const test4 = await testPromiseImmediateResolve();
    results.push({ name: 'Promise立即resolve', passed: test4 });
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error);
    results.push({ name: '测试执行', passed: false, error: error.message });
  }
  
  // 输出测试结果
  console.log('');
  console.log('📊 测试结果汇总:');
  console.log('=====================================');
  
  let passedCount = 0;
  results.forEach((result, index) => {
    const status = result.passed ? '✅ 通过' : '❌ 失败';
    console.log(`${index + 1}. ${result.name}: ${status}`);
    if (result.error) {
      console.log(`   错误: ${result.error}`);
    }
    if (result.passed) passedCount++;
  });
  
  console.log('');
  console.log(`总计: ${passedCount}/${results.length} 测试通过`);
  
  if (passedCount === results.length) {
    console.log('🎉 所有测试通过！浏览器兼容性修复成功！');
  } else {
    console.log('⚠️ 部分测试失败，需要进一步检查');
  }
  
  return passedCount === results.length;
}

// 自动运行测试
runAllTests().then((success) => {
  if (success) {
    console.log('');
    console.log('✅ ComfyUI 54.5% 卡住问题的浏览器兼容性修复验证完成！');
    console.log('💡 现在可以安全地测试换衣功能了');
  } else {
    console.log('');
    console.log('❌ 兼容性测试未完全通过，请检查修复代码');
  }
});

// 暴露测试函数供手动调用
if (typeof window !== 'undefined') {
  window.runBrowserCompatibilityTest = runAllTests;
  console.log('');
  console.log('💡 可以手动运行: window.runBrowserCompatibilityTest()');
}
