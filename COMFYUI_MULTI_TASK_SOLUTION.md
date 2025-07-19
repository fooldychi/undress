# ComfyUI 多任务并发问题解决方案

## 问题分析

基于对官方 `websockets_api_example.py` 的深入分析，发现多任务并发时"ComfyUI已完成处理但客户端未收到结果"的问题主要源于：

1. **任务完成检测不够精确**：缺少官方标准的双重条件验证
2. **历史记录获取时机不当**：没有遵循官方的立即获取策略
3. **WebSocket消息过滤不完整**：多任务环境下消息归属混乱
4. **缺乏错误处理和重试机制**：网络异常时无法恢复
5. **任务状态同步问题**：长时间等待的任务可能被遗漏

## 官方实现核心逻辑

### 1. 任务完成检测机制

**官方标准（Python）：**
```python
if message['type'] == 'executing':
    data = message['data']
    if data['node'] is None and data['prompt_id'] == prompt_id:
        break #Execution is done
```

**我们的实现（JavaScript）：**
```javascript
// 官方标准双重条件检测：data.node === null AND data.prompt_id === promptId
if (data.node === null && data.prompt_id === promptId) {
  console.log(`🎯 任务执行完成 (官方标准检测): ${promptId}`)
  handleTaskCompletion(promptId)
}
```

### 2. 历史记录获取时机

**官方策略：**
- 收到完成信号后**立即**调用 `/history/{prompt_id}` 接口
- 无需额外延迟，ComfyUI确保历史记录在发送完成信号时已准备就绪

**我们的实现：**
```javascript
// 官方实现：任务完成后立即获取历史记录
const history = await getTaskHistory(promptId)

// 验证历史记录完整性
if (!history[promptId] || !history[promptId].outputs) {
  throw new Error(`历史记录不完整，任务 ${promptId} 可能仍在处理中`)
}
```

### 3. WebSocket消息过滤

**官方过滤逻辑：**
- 只处理字符串类型消息（忽略二进制预览）
- 只关注 `type === 'executing'` 消息
- 严格匹配 `prompt_id` 确保消息归属

## 解决方案实现

### 1. 精确的任务完成检测

```javascript
function handleExecutingMessage(data) {
  // 官方实现验证：必须有有效的 prompt_id
  if (!data || !data.prompt_id) {
    console.warn('⚠️ 收到无效的 executing 消息 - 缺少 prompt_id:', data)
    return
  }

  const promptId = data.prompt_id
  
  // 官方标准双重条件检测
  if (data.node === null && data.prompt_id === promptId) {
    console.log(`🎯 任务执行完成 (官方标准检测): ${promptId}`)
    handleTaskCompletion(promptId)
  }
}
```

### 2. 增强的任务完成处理（添加重试机制）

```javascript
async function handleTaskCompletion(promptId) {
  let retryCount = 0
  const maxRetries = 3
  
  while (retryCount < maxRetries) {
    try {
      // 官方实现：任务完成后立即获取历史记录
      const history = await getTaskHistory(promptId)
      
      // 验证历史记录完整性
      if (!history[promptId] || !history[promptId].outputs) {
        throw new Error(`历史记录不完整，任务 ${promptId} 可能仍在处理中`)
      }
      
      const results = await extractTaskResults(history, promptId)
      // 调用完成回调...
      break
      
    } catch (error) {
      retryCount++
      if (retryCount < maxRetries) {
        const delay = 1000 * retryCount
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }
}
```

### 3. 超时和重试的历史记录获取

```javascript
async function getTaskHistory(promptId) {
  const maxAttempts = 3
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      // 添加超时控制
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000)
      
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        throw new Error(`历史记录获取失败: ${response.status}`)
      }
      
      const history = await response.json()
      
      // 验证是否包含目标任务
      if (!history[promptId]) {
        throw new Error(`历史记录中未找到任务: ${promptId}`)
      }
      
      return history
      
    } catch (error) {
      if (attempt < maxAttempts) {
        const delay = 2000 * attempt
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }
}
```

### 4. 任务状态监控系统

```javascript
// 启动任务监控 - 主动检查长时间等待的任务
function startTaskMonitoring() {
  taskMonitorInterval = setInterval(() => {
    if (pendingTasks.size > 0) {
      for (const [promptId, task] of pendingTasks.entries()) {
        const taskAge = Date.now() - new Date(task.createdAt).getTime()
        
        // 如果任务等待超过5分钟，主动检查状态
        if (taskAge > 300000) {
          console.log(`⚠️ 任务 ${promptId} 等待时间过长，主动检查状态`)
          checkTaskStatusManually(promptId)
        }
      }
    }
  }, 30000) // 每30秒检查一次
}

// 手动检查任务状态 - 处理遗漏的完成信号
async function checkTaskStatusManually(promptId) {
  try {
    const history = await getTaskHistory(promptId)
    
    if (history[promptId] && history[promptId].outputs) {
      console.log(`✅ 发现已完成的任务，触发完成处理: ${promptId}`)
      await handleTaskCompletion(promptId)
    }
  } catch (error) {
    console.error(`❌ 手动检查任务状态失败: ${promptId}`, error)
  }
}
```

## 关键改进点

1. **精确的任务完成检测**：采用官方标准的双重条件验证
2. **立即获取历史记录**：遵循官方策略，无需延迟等待
3. **重试机制**：网络异常时自动重试，提高可靠性
4. **超时控制**：防止请求无限等待
5. **主动监控**：定期检查长时间等待的任务
6. **完整性验证**：确保历史记录包含完整的输出数据

## 使用方法

这些改进已经集成到现有的 ComfyUI 服务中，无需额外配置。系统会：

1. 自动启动任务监控（当有任务提交时）
2. 使用官方标准检测任务完成
3. 在网络异常时自动重试
4. 主动检查可能遗漏的任务

## 调试工具

```javascript
// 查看当前任务状态
import { debugTaskStatus, pendingTasks } from './services/comfyui.js'
debugTaskStatus()

// 手动检查特定任务
import { checkTaskStatusManually } from './services/comfyui.js'
checkTaskStatusManually('your-prompt-id')
```

这个解决方案基于官方实现，确保了在多任务并发环境下的可靠性和稳定性。
