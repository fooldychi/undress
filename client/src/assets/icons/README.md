# SVG图标管理系统

## 概述

本项目采用统一的SVG图标管理系统，将所有自定义SVG图标集中管理，支持动态加载和主题色适配。

## 目录结构

```
client/src/
├── assets/icons/           # SVG图标文件存储目录
│   ├── undress-woman.svg   # 一键褪衣图标
│   ├── face-swap.svg       # 换脸图标
│   └── README.md           # 本文档
├── components/icons/       # 图标组件目录
│   ├── SvgIcon.vue         # 统一SVG图标组件
│   ├── UndressWomanIcon.vue # 一键褪衣图标组件
│   ├── FaceSwapIcon.vue    # 换脸图标组件
│   └── index.js            # 图标组件导出
└── utils/
    └── iconManager.js      # 图标管理工具
```

## 使用方法

### 1. 使用SvgIcon组件

```vue
<template>
  <!-- 基础使用 -->
  <SvgIcon name="undress-woman" />
  
  <!-- 自定义大小和颜色 -->
  <SvgIcon 
    name="face-swap" 
    :size="32" 
    color="#ff6b6b" 
  />
  
  <!-- 使用CSS变量 -->
  <SvgIcon 
    name="undress-woman" 
    :size="24" 
    color="var(--van-primary-color)" 
  />
</template>

<script setup>
import { SvgIcon } from '@/components/icons'
</script>
```

### 2. 使用专用图标组件

```vue
<template>
  <UndressWomanIcon :size="24" color="#ffffff" />
  <FaceSwapIcon :size="32" color="#8A8AA3" />
</template>

<script setup>
import { UndressWomanIcon, FaceSwapIcon } from '@/components/icons'
</script>
```

### 3. 使用图标管理器

```javascript
import { 
  getSvgIcon, 
  getIconInfo, 
  getAllIcons, 
  registerIcon 
} from '@/utils/iconManager'

// 获取SVG字符串
const svgString = getSvgIcon('undress-woman')

// 获取图标信息
const iconInfo = getIconInfo('undress-woman')
console.log(iconInfo.name) // '一键褪衣'
console.log(iconInfo.category) // 'ai-tools'

// 获取所有图标
const allIcons = getAllIcons()

// 注册新图标
registerIcon('new-icon', {
  name: '新图标',
  category: 'custom',
  svg: '<svg>...</svg>'
})
```

## 添加新图标

### 方法1：添加SVG文件（推荐）

1. 将SVG文件保存到 `client/src/assets/icons/` 目录
2. 确保SVG使用 `fill="currentColor"` 以支持动态颜色
3. 在 `iconManager.js` 中注册图标信息

### 方法2：直接在代码中注册

```javascript
import { registerIcon } from '@/utils/iconManager'

registerIcon('my-icon', {
  name: '我的图标',
  category: 'custom',
  svg: `<svg width="24" height="24" viewBox="0 0 24 24">
    <path d="..." fill="currentColor"/>
  </svg>`
})
```

## 图标规范

### SVG格式要求

1. **viewBox**: 使用标准的viewBox，如 `0 0 1024 1024` 或 `0 0 24 24`
2. **fill属性**: 使用 `fill="currentColor"` 以支持动态颜色
3. **尺寸**: SVG本身不设置固定width/height，由组件控制
4. **优化**: 移除不必要的属性和注释，保持代码简洁

### 命名规范

- 使用kebab-case命名：`icon-name`
- 名称要有意义，避免使用数字开头
- 相同功能的图标使用一致的前缀

### 示例SVG格式

```svg
<svg width="24" height="24" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg">
  <path d="M..." fill="currentColor"/>
  <path d="M..." fill="currentColor"/>
</svg>
```

## 主题适配

图标系统支持主题色适配：

```css
/* 使用CSS变量 */
.icon-primary {
  color: var(--van-primary-color);
}

.icon-success {
  color: var(--van-success-color);
}

.icon-warning {
  color: var(--van-warning-color);
}
```

## 性能优化

1. **按需加载**: 只加载使用的图标
2. **缓存机制**: 图标内容会被缓存，避免重复加载
3. **体积优化**: SVG代码经过优化，移除冗余信息

## 迁移指南

从旧的图标系统迁移：

1. 将内联SVG代码提取到独立的SVG文件
2. 更新组件引用，使用新的SvgIcon组件
3. 在iconManager.js中注册图标信息
4. 测试图标显示和颜色适配

## 故障排除

### 图标不显示
- 检查图标名称是否正确
- 确认图标已在iconManager.js中注册
- 检查SVG格式是否正确

### 颜色不生效
- 确保SVG使用 `fill="currentColor"`
- 检查CSS color属性是否正确设置
- 避免SVG中硬编码颜色值
