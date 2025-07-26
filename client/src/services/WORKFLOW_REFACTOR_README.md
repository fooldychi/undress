# ComfyUI 工作流重构架构说明

## 🎯 重构目标

本次重构旨在解决以下问题：
1. **消除重复代码**：`processUndressImage` 和 `processFaceSwapImage` 中的大量重复逻辑
2. **提高可扩展性**：支持通过配置驱动的方式添加新工作流
3. **统一错误处理**：所有工作流使用相同的错误处理和进度回调机制
4. **保持向后兼容**：现有API接口保持不变

## 🏗️ 新架构概览

### 核心组件

1. **WorkflowConfigManager** - 工作流配置管理器
2. **UniversalWorkflowProcessor** - 通用工作流处理器
3. **processWorkflowUniversal** - 统一工作流处理入口

### 架构图

```
┌─────────────────────────────────────────────────────────────┐
│                    应用层 (Application Layer)                │
├─────────────────────────────────────────────────────────────┤
│  processUndressImage()  │  processFaceSwapImage()  │ 新工作流  │
├─────────────────────────────────────────────────────────────┤
│                processWorkflowUniversal()                   │
├─────────────────────────────────────────────────────────────┤
│              UniversalWorkflowProcessor                     │
│  ┌─────────────┬─────────────┬─────────────┬─────────────┐  │
│  │  预检查阶段  │  输入处理    │  工作流构建  │  执行&后处理 │  │
│  └─────────────┴─────────────┴─────────────┴─────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                WorkflowConfigManager                        │
│  ┌─────────────────┬─────────────────┬─────────────────┐    │
│  │   内置工作流     │   数据库工作流   │   动态注册      │    │
│  └─────────────────┴─────────────────┴─────────────────┘    │
├─────────────────────────────────────────────────────────────┤
│                    基础设施层 (Infrastructure)               │
│  WebSocket管理 │ 服务器管理 │ 图片处理 │ 积分管理 │ 任务管理  │
└─────────────────────────────────────────────────────────────┘
```

## 🔧 使用方法

### 1. 现有工作流（向后兼容）

```javascript
// 一键褪衣 - API保持不变
const result = await processUndressImage(base64Image, onProgress)

// 极速换脸 - API保持不变  
const result = await processFaceSwapImage({
  facePhotos: [photo1, photo2, photo3, photo4],
  targetImage: targetImage,
  onProgress: onProgress
})
```

### 2. 使用通用处理器

```javascript
// 直接使用通用处理器
const result = await processWorkflowUniversal('undress', {
  mainImage: base64Image
}, onProgress)

const result = await processWorkflowUniversal('faceswap', {
  facePhoto1: photo1,
  facePhoto2: photo2,
  facePhoto3: photo3,
  facePhoto4: photo4,
  targetImage: targetImage
}, onProgress)
```

### 3. 添加新工作流

#### 方法1：代码注册

```javascript
import { workflowConfigManager } from './services/comfyui.js'

// 注册新工作流配置
workflowConfigManager.registerWorkflow('upscale', {
  type: 'upscale',
  displayName: '图像超分辨率',
  pointsCost: 10,
  checkServer: true,
  randomizeSeed: false,
  workflowTemplate: upscaleWorkflowJson,
  inputSchema: {
    sourceImage: {
      type: 'image',
      required: true,
      description: '源图片'
    }
  },
  inputMapping: {
    sourceImage: 'sourceImage'
  }
})

// 使用新工作流
const result = await processWorkflowUniversal('upscale', {
  sourceImage: base64Image
}, onProgress)
```

#### 方法2：数据库配置（推荐）

1. 在数据库中配置工作流信息
2. 直接使用，系统会自动加载配置

```javascript
// 系统会自动从数据库加载配置
const result = await processWorkflowUniversal('custom_workflow', {
  inputImage: base64Image,
  parameter1: 'value'
}, onProgress)
```

## 📋 工作流配置格式

```javascript
{
  type: 'workflow_type',           // 工作流类型标识
  displayName: '显示名称',          // 用户友好的名称
  pointsCost: 20,                  // 积分消耗
  checkServer: true,               // 是否检查服务器状态
  randomizeSeed: true,             // 是否随机化种子
  workflowTemplate: {...},         // ComfyUI工作流JSON
  inputSchema: {                   // 输入参数定义
    paramName: {
      type: 'image|number|string', // 参数类型
      required: true,              // 是否必需
      description: '参数描述'       // 参数说明
    }
  },
  inputMapping: {                  // 输入参数到节点的映射
    paramName: 'nodeKey'
  },
  outputMapping: {                 // 输出节点映射
    primary: 'primary',
    secondary: 'secondary'
  }
}
```

## 🔄 处理流程

### 通用处理流程

1. **预检查阶段**
   - 服务器状态检查
   - 积分验证

2. **输入处理阶段**
   - 参数验证
   - 图片上传
   - 格式转换

3. **工作流构建阶段**
   - 加载工作流模板
   - 设置输入节点
   - 随机化种子（如需要）

4. **执行阶段**
   - 提交工作流
   - 等待任务完成
   - 实时进度更新

5. **后处理阶段**
   - 获取结果图片
   - 构建额外图片URL
   - 扣除积分
   - 返回结果

## 🎨 扩展示例

查看 `client/src/examples/workflow-extension-example.js` 了解如何：
- 添加图像超分辨率工作流
- 添加风格转换工作流
- 从数据库动态加载工作流

## 🔧 技术细节

### 关键类和函数

- `WorkflowConfigManager`: 管理所有工作流配置
- `UniversalWorkflowProcessor`: 执行通用处理逻辑
- `processWorkflowUniversal()`: 统一入口函数
- `workflowConfigManager`: 全局配置管理器实例

### 向后兼容性

- 所有现有API保持不变
- 内部实现重构为使用通用处理器
- 保留传统实现作为备用（`processUndressImageLegacy`）

### 错误处理

- 统一的错误处理机制
- 详细的错误日志
- 用户友好的错误消息

### 进度回调

- 标准化的进度报告格式
- 细粒度的进度更新
- 支持自定义进度处理

## 🚀 未来扩展

1. **可视化工作流编辑器**：基于配置驱动架构构建
2. **工作流市场**：用户可以分享和下载工作流配置
3. **A/B测试**：支持同一工作流的多个版本
4. **性能优化**：工作流缓存和预加载
5. **监控和分析**：工作流执行统计和性能分析

## 📝 迁移指南

### 对于现有代码
- 无需修改，保持现有调用方式
- 可选择性地迁移到通用处理器

### 对于新功能
- 优先使用通用处理器
- 通过配置而非代码添加新工作流
- 利用数据库配置实现动态管理

## 🔍 调试和故障排除

### 常见问题

1. **工作流配置不存在**
   - 检查配置是否正确注册
   - 验证数据库配置是否正确

2. **节点映射错误**
   - 检查 `inputMapping` 配置
   - 验证工作流JSON中的节点ID

3. **图片上传失败**
   - 检查图片格式是否正确
   - 验证服务器连接状态

### 调试技巧

- 启用详细日志：所有关键步骤都有日志输出
- 使用浏览器开发者工具查看网络请求
- 检查WebSocket连接状态
