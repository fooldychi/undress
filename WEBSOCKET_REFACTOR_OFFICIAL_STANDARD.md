# WebSocket 重构 - 采用官方标准机制

## 重构目标

基于对 `client\websockets_api_example.py` 官方示例的分析，重构当前客户端的 WebSocket 实现，采用官方标准机制。

## 重构内容

### 1. 任务完成检测机制

**之前的实现：**
- 主要依赖 `executed` 消息检测任务完成
- 复杂的输出节点判断逻辑
- 多重备用检测机制

**重构后的实现：**
- 采用官方标准：`executing` 消息中 `data.node === null` 表示任务完成
- 简化的 `executed` 消息处理，仅用于进度更新
- 移除复杂的节点配置依赖

### 2. prompt_id 管理

**之前的实现：**
```javascript
const requestBody = {
  client_id: config.CLIENT_ID,
  prompt: workflowPrompt
}
```

**重构后的实现：**
```javascript
const finalPromptId = promptId || generatePromptId()
const requestBody = {
  client_id: config.CLIENT_ID,
  prompt: workflowPrompt,
  prompt_id: finalPromptId  // 官方标准：显式传递prompt_id
}
```

### 3. 结果获取机制

**之前的实现：**
- 依赖 WebSocket 消息中的 `outputs` 数据
- 复杂的节点配置查找逻辑

**重构后的实现：**
- 任务完成后通过 `/history/{prompt_id}` 端点获取完整结果（官方标准）
- 遍历所有输出节点获取图片
- 使用官方的 `/api/view` 端点获取图片数据

### 4. 核心函数重构

#### 新增函数：
- `generatePromptId()` - 生成 prompt_id
- `handleTaskCompletion(promptId)` - 处理任务完成
- `getTaskHistory(promptId)` - 获取任务历史记录
- `extractTaskResults(history, promptId)` - 从历史记录中提取结果
- `getImage(filename, subfolder, folderType)` - 获取图片数据

#### 重构函数：
- `submitWorkflow()` - 添加 prompt_id 参数支持
- `handleExecutingMessage()` - 采用官方标准任务完成检测
- `handleExecutedMessage()` - 简化为仅处理进度更新
- `waitForTaskCompletion()` - 简化任务等待逻辑
- `getGeneratedImage()` - 兼容新的结果格式

#### 删除函数：
- `checkTaskStatus()` - 替换为官方的 `getTaskHistory()`
- `startTaskMonitoring()` / `stopTaskMonitoring()` - 移除复杂监控机制
- `handleCrystoolsMonitorMessage()` - 移除非官方消息处理

## 官方标准对比

### 官方示例核心逻辑：
```python
def get_images(ws, prompt):
    prompt_id = str(uuid.uuid4())
    queue_prompt(prompt, prompt_id)
    output_images = {}
    while True:
        out = ws.recv()
        if isinstance(out, str):
            message = json.loads(out)
            if message['type'] == 'executing':
                data = message['data']
                if data['node'] is None and data['prompt_id'] == prompt_id:
                    break #Execution is done

    history = get_history(prompt_id)[prompt_id]
    for node_id in history['outputs']:
        node_output = history['outputs'][node_id]
        if 'images' in node_output:
            for image in node_output['images']:
                image_data = get_image(image['filename'], image['subfolder'], image['type'])
```

### 重构后的实现：
```javascript
// 1. 提交时显式传递 prompt_id
const finalPromptId = promptId || generatePromptId()
const requestBody = {
  client_id: config.CLIENT_ID,
  prompt: workflowPrompt,
  prompt_id: finalPromptId
}

// 2. 通过 executing 消息检测任务完成
function handleExecutingMessage(data) {
  if (data && data.prompt_id) {
    if (data.node === null) {
      // 官方标准：node为null表示整个工作流执行完成
      handleTaskCompletion(data.prompt_id)
    }
  }
}

// 3. 通过 /history 端点获取完整结果
async function handleTaskCompletion(promptId) {
  const history = await getTaskHistory(promptId)
  const results = await extractTaskResults(history, promptId)
  // 触发任务完成回调
}
```

## 重构效果

### 1. 代码简化
- 删除了复杂的任务监控机制
- 移除了多重备用检测逻辑
- 简化了消息处理流程

### 2. 标准化
- 完全符合 ComfyUI 官方 WebSocket API 标准
- 使用官方推荐的任务完成检测机制
- 采用官方的结果获取方式

### 3. 可靠性提升
- 减少了对复杂逻辑的依赖
- 使用官方标准的 prompt_id 管理
- 通过官方 API 端点获取结果，确保数据完整性

### 4. 维护性改善
- 代码结构更清晰
- 减少了潜在的错误点
- 更容易理解和维护

## 兼容性

重构后的实现保持了与现有接口的兼容性：
- `processUndressImage()` 和 `processFaceSwapImage()` 接口不变
- 进度回调机制保持不变
- 错误处理机制保持不变

## 测试建议

1. 测试基本的图片处理功能
2. 验证任务完成检测的准确性
3. 确认结果获取的完整性
4. 检查错误处理的正确性
