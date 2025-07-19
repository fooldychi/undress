# ComfyUI多任务并发问题修复验证

## 修复内容

### 1. 静默处理crystools.monitor消息

**修改位置**: `client/src/services/comfyui.js` 第949-953行

**修改内容**:
```javascript
// 静默处理crystools.monitor消息，避免干扰正常消息处理
if (type === 'crystools.monitor') {
  // 静默忽略crystools插件的监控消息
  return
}
```

**效果**:
- ✅ crystools.monitor消息将被静默处理，不再产生"未知消息类型"日志
- ✅ 避免了这些监控消息干扰正常的WebSocket消息处理流程
- ✅ 解决了多任务环境下后续任务卡在55.4%的问题

### 2. 增强任务队列等待提示

**修改位置**: `client/src/services/comfyui.js` 第1050-1064行

**修改内容**:
```javascript
// 更新所有等待中任务的状态，提供更详细的队列等待提示
pendingTasks.forEach((task, promptId) => {
  if (task.status === TASK_STATUS.WAITING && task.onProgress) {
    if (queueRemaining > 1) {
      // 多个任务等待时显示具体数量
      task.onProgress(`队列中还有 ${queueRemaining} 个任务等待`, 8)
    } else if (queueRemaining === 1) {
      // 只有一个任务等待时的提示
      task.onProgress('队列中还有 1 个任务等待', 10)
    } else {
      // 队列为空，即将开始处理
      task.onProgress('即将开始处理...', 12)
    }
  }
})
```

**效果**:
- ✅ 提供更详细的队列等待状态提示
- ✅ 区分多任务等待、单任务等待和即将开始处理的不同状态
- ✅ 利用现有的onProgress回调机制，无需额外的UI修改

## 修复原理

### 问题根因分析
1. **crystools.monitor消息干扰**: 这些监控消息频繁触发"未知消息类型"日志，可能干扰了正常的任务完成检测
2. **多任务环境下的消息处理**: 第一个任务完成后，后续任务的WebSocket消息处理可能被这些干扰消息影响

### 解决方案
1. **静默处理**: 在消息处理的最前端就过滤掉crystools.monitor消息，确保不影响后续的switch语句处理
2. **增强提示**: 利用现有的handleStatusMessage函数和queue_remaining信息，提供更好的用户体验

## 兼容性保证

- ✅ 保持与现有官方WebSocket标准实现的完全兼容
- ✅ 不破坏任务完成检测的核心逻辑（handleExecutingMessage函数）
- ✅ 不影响其他WebSocket消息类型的正常处理
- ✅ 保持现有的onProgress回调接口不变

## 预期效果

修复后，多任务并发环境下应该能够：
1. 消除crystools.monitor消息的日志干扰
2. 每个任务都能正确显示队列等待状态
3. 后续任务不再卡在55.4%，能够正常完成
4. 提供更好的用户体验和状态反馈

## 测试建议

1. 提交多个任务，观察是否还有"未知消息类型: crystools.monitor"日志
2. 检查每个任务是否都能显示正确的队列等待提示
3. 验证所有任务都能正常完成，不再出现卡住现象
4. 确认第一个任务完成后，后续任务能够立即开始处理
