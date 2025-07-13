# 统一图片处理组件系统使用指南

## 概述

本系统提供了一套统一的图片处理组件，采用换脸面板的设计风格，实现了组件描述与模板的分离，支持单图和多图上传，为后续自定义化做好了准备。

## 核心组件

### 1. UnifiedImageProcessingTemplate
统一的图片处理模板组件，支持各种图片处理功能。

**特性：**
- 基于配置驱动的界面生成
- 支持图片上传和文本输入
- 统一的处理流程和状态管理
- 可配置的结果展示方式

**使用方式：**
```vue
<UnifiedImageProcessingTemplate
  function-id="clothes-swap"
  :title-icon="UndressWomanIcon"
  title-icon-color="var(--van-primary-color)"
  :is-processing="isLoading"
  :progress="progressPercent"
  :result-data="resultImage"
  @process="processImage"
  @upload-change="handleUploadChange"
/>
```

### 2. UnifiedImageUploadPanel
统一的图片上传面板，采用换脸面板的设计风格。

**特性：**
- 支持单图和多图上传
- 统一的状态显示和提示信息
- 可配置的上传参数
- 响应式设计

### 3. SingleImageUpload
单图上传子组件。

**特性：**
- 拖拽上传支持
- 图片预览和编辑
- 文件信息显示
- 错误处理

### 4. MultiImageUpload
多图上传子组件。

**特性：**
- 网格布局显示
- 批量操作支持
- 拖拽排序（可选）
- 数量限制管理

## 配置系统

### 功能配置文件
位置：`src/config/imageProcessingConfigs.js`

**配置结构：**
```javascript
{
  id: 'clothes-swap',
  title: '一键褪衣',
  description: '上传人物照片，AI智能移除服装',
  processButtonText: '开始处理',
  processingTitle: '正在处理图片...',
  processingDescription: '请耐心等待，处理时间可能需要几分钟',

  // 上传面板配置
  uploadPanels: [
    {
      id: 'main-image',
      title: '人物照片',
      icon: 'photograph',
      iconColor: 'var(--van-primary-color)',
      uploadType: 'single',
      minCount: 1,
      maxCount: 1,
      uploadText: '选择人物照片',
      tips: ['支持 JPG、PNG 格式', '建议尺寸 512x512 以上']
    }
  ],



  // 结果配置
  resultConfig: {
    showComparison: true,
    comparisonType: 'slider',
    downloadEnabled: true,
    resetEnabled: true
  }
}
```

### 配置类型

**上传类型：**
- `single`: 单图上传
- `multi`: 多图上传

**对比类型：**
- `slider`: 滑动对比
- `side-by-side`: 并排对比
- `none`: 无对比

## 使用示例

### 1. 一键褪衣功能
```vue
<template>
  <UnifiedImageProcessingTemplate
    function-id="clothes-swap"
    :title-icon="UndressWomanIcon"
    :is-processing="isLoading"
    :result-data="resultImage"
    @process="processImage"
    @upload-change="handleUploadChange"
  />
</template>

<script setup>
import { ref } from 'vue'
import { UnifiedImageProcessingTemplate } from '../components/mobile'
import { UndressWomanIcon } from '../components/icons'

const isLoading = ref(false)
const resultImage = ref(null)
const selectedImage = ref(null)

const handleUploadChange = (panelId, data) => {
  if (panelId === 'main-image') {
    selectedImage.value = data
  }
}

const processImage = async () => {
  // 处理逻辑
}
</script>
```

### 2. 极速换脸功能
```vue
<template>
  <UnifiedImageProcessingTemplate
    function-id="face-swap"
    :title-icon="FaceSwapIcon"
    :is-processing="isLoading"
    :result-data="resultImage"
    @process="processImages"
    @upload-change="handleUploadChange"
  />
</template>

<script setup>
import { ref } from 'vue'
import { UnifiedImageProcessingTemplate } from '../components/mobile'
import { FaceSwapIcon } from '../components/icons'

const isLoading = ref(false)
const resultImage = ref(null)
const facePhotos = ref([])
const targetImage = ref(null)

const handleUploadChange = (panelId, data) => {
  if (panelId === 'face-photos') {
    facePhotos.value = data
  } else if (panelId === 'target-image') {
    targetImage.value = data
  }
}

const processImages = async () => {
  // 处理逻辑
}
</script>
```

### 3. 文生图功能
```vue
<template>
  <UnifiedImageProcessingTemplate
    function-id="text-to-image"
    title-icon-name="photo-o"
    :is-processing="isLoading"
    :result-data="resultImage"
    @process="generateImage"
    @input-change="handleInputChange"
  />
</template>

<script setup>
import { ref } from 'vue'
import { UnifiedImageProcessingTemplate } from '../components/mobile'

const isLoading = ref(false)
const resultImage = ref(null)
const prompt = ref('')

const handleInputChange = (panelId, data) => {
  if (panelId === 'text-prompt') {
    prompt.value = data
  }
}

const generateImage = async () => {
  // 处理逻辑
}
</script>
```

## 自定义配置

### 添加新功能
1. 在 `imageProcessingConfigs.js` 中添加新的配置
2. 创建对应的Vue组件
3. 实现处理逻辑

### 修改现有功能
1. 更新配置文件中的相应配置
2. 如需要，调整组件逻辑

### 后台管理集成
配置系统已为后台管理做好准备：
- 提供了 `fetchImageProcessingConfigFromAPI()` 函数
- 支持动态配置更新
- 包含管理员相关字段

## 最佳实践

1. **配置优先**：尽量通过配置而不是代码来控制界面
2. **组件复用**：使用统一组件而不是重复开发
3. **状态管理**：合理使用模板提供的状态管理
4. **错误处理**：实现完善的错误处理机制
5. **性能优化**：注意图片处理的性能影响

## 迁移指南

### 从旧组件迁移
1. 替换组件导入
2. 更新配置格式
3. 调整事件处理
4. 测试功能完整性

### 注意事项
- 保持向后兼容性
- 逐步迁移，避免一次性大改
- 充分测试各种场景

## 故障排除

### 常见问题
1. **配置加载失败**：检查配置文件格式和API连接
2. **上传失败**：检查文件大小和格式限制
3. **样式异常**：检查CSS变量和主题设置
4. **功能异常**：检查事件处理和数据流

### 调试技巧
- 使用浏览器开发者工具
- 检查控制台错误信息
- 验证配置数据结构
- 测试各种输入场景
