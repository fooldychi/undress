# 统一组件系统 - 使用说明

## 🎉 迁移完成

所有图片处理页面已成功迁移到新的统一组件系统！现在所有功能都使用相同的设计风格和交互方式。

## 📁 新的文件结构

```
src/
├── components/
│   ├── common/                              # 通用组件
│   │   ├── UnifiedImageUploadPanel.vue     # 统一上传面板
│   │   ├── SingleImageUpload.vue           # 单图上传
│   │   └── MultiImageUpload.vue            # 多图上传
│   └── templates/                           # 模板组件
│       └── UnifiedImageProcessingTemplate.vue  # 统一处理模板
├── config/
│   └── imageProcessingConfigs.js           # 功能配置
├── views/                                   # 页面组件 (已更新)
│   ├── ClothesSwap.vue                     # 一键褪衣
│   ├── FaceSwap.vue                        # 极速换脸
│   └── TextToImage.vue                     # 文生图
└── docs/                                    # 文档
    ├── UNIFIED_COMPONENTS_GUIDE.md         # 详细使用指南
    └── COMPONENT_MIGRATION_SUMMARY.md      # 迁移总结
```

## 🚀 快速开始

### 1. 启动开发服务器
```bash
cd client
npm run dev
```

### 2. 访问页面
- 一键褪衣: http://localhost:5173/clothes-swap
- 极速换脸: http://localhost:5173/face-swap  
- 文生图: http://localhost:5173/text-to-image

## 🔧 主要改进

### ✅ 统一设计风格
- 所有页面采用换脸面板的深色主题设计
- 一致的视觉效果和交互体验
- 响应式布局适配各种设备

### ✅ 组件化架构
- 可复用的上传组件
- 统一的处理流程
- 模块化的功能组织

### ✅ 配置化管理
- 功能描述与组件分离
- 支持动态配置更新
- 为后台管理做好准备

## 📖 使用示例

### 创建新的图片处理功能

1. **添加配置**
```javascript
// src/config/imageProcessingConfigs.js
export const configs = {
  'my-new-feature': {
    id: 'my-new-feature',
    title: '我的新功能',
    description: '功能描述',
    uploadPanels: [{
      id: 'input-image',
      title: '输入图片',
      uploadType: 'single',
      maxCount: 1
    }]
  }
}
```

2. **创建页面组件**
```vue
<template>
  <UnifiedImageProcessingTemplate
    function-id="my-new-feature"
    :title-icon="MyIcon"
    :is-processing="isLoading"
    :result-data="resultImage"
    @process="processImage"
    @upload-change="handleUploadChange"
  />
</template>

<script setup>
import { ref } from 'vue'
import { UnifiedImageProcessingTemplate } from '../components/mobile'

const isLoading = ref(false)
const resultImage = ref(null)
const inputImage = ref(null)

const handleUploadChange = (panelId, data) => {
  if (panelId === 'input-image') {
    inputImage.value = data
  }
}

const processImage = async () => {
  // 处理逻辑
}
</script>
```

## 🎨 自定义样式

### 组件级别自定义
```vue
<style scoped>
:deep(.unified-image-upload-panel) {
  /* 自定义上传面板样式 */
}

:deep(.single-image-upload) {
  /* 自定义单图上传样式 */
}
</style>
```

### 全局样式变量
```css
:root {
  --van-primary-color: #1989fa;
  --van-success-color: #07c160;
  --van-warning-color: #ff976a;
}
```

## 🔍 调试和验证

### 验证组件导入
```javascript
// 在浏览器控制台运行
import('./src/verify-components.js').then(module => {
  module.runVerification()
})
```

### 检查配置
```javascript
// 验证配置是否正确加载
import { getImageProcessingConfig } from './src/config/imageProcessingConfigs.js'
console.log(getImageProcessingConfig('clothes-swap'))
```

## 📚 详细文档

- **[统一组件使用指南](./docs/UNIFIED_COMPONENTS_GUIDE.md)** - 详细的API文档和使用示例
- **[迁移总结](./docs/COMPONENT_MIGRATION_SUMMARY.md)** - 完整的迁移过程和技术细节

## 🐛 常见问题

### Q: 页面显示空白怎么办？
A: 检查浏览器控制台是否有错误信息，确保所有依赖都正确安装。

### Q: 上传功能不工作？
A: 确认配置文件中的uploadPanels设置正确，检查事件处理函数是否正确绑定。

### Q: 样式显示异常？
A: 检查CSS变量是否正确设置，确认深色主题样式是否正确加载。

## 🚀 下一步计划

1. **后台管理集成** - 实现配置的可视化管理
2. **更多功能支持** - 添加新的图片处理功能
3. **性能优化** - 进一步优化组件性能
4. **测试完善** - 添加自动化测试

## 💡 贡献指南

1. 遵循现有的组件设计模式
2. 使用配置文件管理功能描述
3. 保持代码风格一致
4. 添加必要的文档说明

---

🎉 **恭喜！** 您现在可以使用全新的统一组件系统了！如有任何问题，请查看详细文档或联系开发团队。
