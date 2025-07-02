# ComfyUI 工作流集成说明

## 🔧 集成概述

本项目已成功集成了ComfyUI的一键换衣工作流，实现了从前端上传图片到ComfyUI处理并返回结果的完整流程。

### ✅ 问题修复

**原问题分析:**
1. ❌ 错误使用了 `/upload/image` 接口而非 `/api/prompt`
2. ❌ 参数格式不正确，缺少正确的client_id和prompt结构
3. ❌ 图片处理流程混乱

**修复方案:**
1. ✅ 正确的两步流程：先上传图片获取文件名，再提交工作流
2. ✅ 使用正确的API格式：`{client_id, prompt: {工作流JSON}}`
3. ✅ 节点49正确关联用户上传的图片文件名

## 📋 工作流分析

### 工作流文件
- **位置**: `src/workflows/undress.json`
- **类型**: 一键换衣工作流
- **关键节点**: 节点49 (LoadImage) - 用户上传的图片将关联到此节点

### 工作流特性
- **语义分割**: 使用GroundingDINO + SAM进行精确的服装和人体分割
- **姿态检测**: DW姿态预处理器保持人体姿态一致性
- **局部重绘**: BrushNet技术实现高质量的局部图像生成
- **图像融合**: 智能融合原图和生成内容

## 🚀 API集成

### ComfyUI服务配置
```javascript
const COMFYUI_CONFIG = {
  BASE_URL: 'https://rihblhikbh-8188.cnb.run',
  CLIENT_ID: 'abc1373d4ad648a3a81d0587fbe5534b',
  TIMEOUT: 300000 // 5分钟
}
```

### 正确的处理流程
1. **图片上传**: `POST /upload/image` - 上传base64图片到ComfyUI服务器，获取文件名
2. **工作流配置**: 将获取的文件名设置到节点49的image输入
3. **任务提交**: `POST /api/prompt` - 提交完整工作流JSON
4. **状态监控**: 轮询 `/api/history/{prompt_id}` 直到任务完成
5. **结果获取**: 下载生成的图片并转换为base64返回

### API调用示例
```javascript
// 1. 上传图片
const formData = new FormData()
formData.append('image', imageBlob, 'filename.jpg')
const uploadResponse = await fetch('/upload/image', { method: 'POST', body: formData })
const { name: imageName } = await uploadResponse.json()

// 2. 提交工作流
const workflow = { ...undressWorkflow }
workflow['49'].inputs.image = imageName
const promptResponse = await fetch('/api/prompt', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    client_id: 'abc1373d4ad648a3a81d0587fbe5534b',
    prompt: workflow
  })
})
```

## 📁 文件结构

```
src/
├── services/
│   ├── api.js          # 主API服务
│   └── comfyui.js      # ComfyUI专用服务
├── workflows/
│   └── undress.json    # 换衣工作流定义
├── utils/
│   └── workflowTest.js # 测试工具
└── views/
    └── ClothesSwap.vue # 换衣页面
```

## 🔍 关键函数

### `processUndressImage(base64Image)`
主要的换衣处理函数，完整的处理流程：

```javascript
import { processUndressImage } from './services/comfyui.js'

const result = await processUndressImage(userImageBase64)
if (result.success) {
  console.log('处理成功:', result.resultImage)
} else {
  console.error('处理失败:', result.error)
}
```

### `uploadImageToComfyUI(base64Image)`
上传图片到ComfyUI服务器：
- 将base64转换为FormData
- 上传到 `/upload/image` 端点
- 返回服务器上的文件名

### `createUndressWorkflowPrompt(imageName)`
创建工作流提示词：
- 深拷贝原始工作流
- 设置节点49的图片输入
- 随机化种子值

## 🧪 测试功能

### 调试页面
访问 `http://localhost:3000/debug` 进入可视化调试界面，包含：

1. **API连接测试** - 验证ComfyUI服务器状态
2. **图片上传测试** - 测试文件上传功能
3. **工作流提交测试** - 验证工作流提交
4. **完整流程测试** - 端到端测试换衣功能
5. **实时日志输出** - 查看详细的处理日志

### 自动测试
在开发环境中，访问 `http://localhost:3000?test=true` 会自动运行测试套件。

### 手动测试
```javascript
import { runAllTests } from './utils/workflowTest.js'

// 运行所有测试
const results = await runAllTests()
console.log(results)
```

### 测试项目
- **连接测试**: 验证ComfyUI服务器连接
- **上传测试**: 测试图片上传功能
- **工作流测试**: 测试工作流提交
- **完整流程测试**: 端到端测试

## ⚙️ 配置说明

### 环境变量
可以通过环境变量覆盖默认配置：
```bash
VITE_COMFYUI_BASE_URL=https://your-comfyui-server.com
VITE_COMFYUI_CLIENT_ID=your-client-id
```

### 工作流自定义
要使用不同的工作流：
1. 将新的工作流JSON文件放入 `src/workflows/`
2. 在 `comfyui.js` 中导入并使用
3. 确保正确设置图片输入节点

## 🔧 故障排除

### 常见问题

1. **连接失败**
   - 检查ComfyUI服务器是否运行
   - 验证URL和端口是否正确
   - 确认网络连接

2. **上传失败**
   - 检查图片格式是否支持
   - 验证文件大小限制
   - 确认服务器存储空间

3. **工作流执行失败**
   - 检查工作流JSON格式
   - 验证所需模型是否已加载
   - 查看ComfyUI服务器日志

4. **超时问题**
   - 增加TIMEOUT配置
   - 检查服务器性能
   - 优化工作流复杂度

### 调试技巧

1. **启用详细日志**
   ```javascript
   console.log('开始处理换衣请求...')
   ```

2. **检查网络请求**
   - 使用浏览器开发者工具
   - 查看Network标签页
   - 检查请求和响应

3. **验证工作流**
   - 在ComfyUI界面中手动测试工作流
   - 确认所有节点连接正确
   - 验证输入输出格式

## 📈 性能优化

### 建议
1. **图片预处理**: 在上传前调整图片大小
2. **缓存机制**: 缓存常用的工作流结果
3. **并发控制**: 限制同时处理的任务数量
4. **错误重试**: 实现自动重试机制

### 监控
- 监控API响应时间
- 跟踪成功/失败率
- 记录用户使用模式

## 🔄 更新工作流

要更新或添加新的工作流：

1. **导出工作流**: 从ComfyUI界面导出JSON
2. **放置文件**: 保存到 `src/workflows/` 目录
3. **更新服务**: 修改 `comfyui.js` 中的导入和处理逻辑
4. **测试验证**: 运行测试确保正常工作

## 📞 支持

如有问题，请：
1. 查看浏览器控制台错误信息
2. 检查ComfyUI服务器日志
3. 运行测试套件诊断问题
4. 提交Issue并附上详细信息
