# Imagic 样式统一性指南

## 🎨 设计系统

### 统一的页面布局结构

所有功能页面都遵循相同的布局结构：

```vue
<template>
  <div class="feature-page">
    <div class="container">
      <header class="page-header">
        <router-link to="/" class="back-btn">
          <span class="back-icon">←</span>
          返回首页
        </router-link>
        <h1 class="page-title">
          <span class="page-icon">[图标]</span>
          [页面标题]
        </h1>
        <p class="page-description">[页面描述]</p>
      </header>
      
      <main class="page-content">
        <!-- 页面内容 -->
      </main>
    </div>
  </div>
</template>
```

### 统一的样式类

#### 页面容器
- `.feature-page` - 页面根容器，包含渐变背景
- `.container` - 内容容器，最大宽度1000px
- `.page-header` - 页面头部，居中对齐
- `.page-content` - 主要内容区域

#### 页面头部
- `.back-btn` - 返回按钮，带悬停效果
- `.page-title` - 页面标题，3rem字体大小
- `.page-icon` - 页面图标，右边距16px
- `.page-description` - 页面描述文字

#### 卡片组件
- `.upload-card` / `.input-card` / `.result-card` - 统一的卡片样式
  - 白色半透明背景 `rgba(255, 255, 255, 0.95)`
  - 圆角 `20px`
  - 阴影 `0 20px 40px rgba(0, 0, 0, 0.1)`
  - 毛玻璃效果 `backdrop-filter: blur(10px)`

#### 按钮样式
- `.btn.btn-primary` - 主要按钮，渐变背景
- `.btn-secondary` - 次要按钮，灰色背景
- 统一的悬停效果：`translateY(-2px)`

#### 图片预览
- `.image-preview` - 图片预览容器
- `.preview-image` - 预览图片样式
- `.image-overlay` - 悬停遮罩层

### 颜色系统

```css
:root {
  --primary-color: #667eea;
  --secondary-color: #764ba2;
  --accent-color: #f093fb;
  --text-color: #333;
  --text-light: #666;
  --bg-white: #ffffff;
}
```

### 响应式设计

所有页面都包含移动端适配：

```css
@media (max-width: 768px) {
  .page-title {
    font-size: 2rem;
  }
  
  .result-actions {
    flex-direction: column;
  }
}
```

## ✅ 已统一的页面

### 1. 一键换衣页面 (`ClothesSwap.vue`)
- ✅ 统一的页面布局
- ✅ 统一的卡片样式
- ✅ 统一的按钮样式
- ✅ 统一的图片预览
- ✅ 响应式设计

### 2. 文生图页面 (`TextToImage.vue`)
- ✅ 统一的页面布局
- ✅ 统一的卡片样式
- ✅ 统一的按钮样式
- ✅ 统一的结果展示
- ✅ 响应式设计

### 3. 极速换脸页面 (`FaceSwap.vue`)
- ✅ 统一的页面布局
- ✅ 统一的卡片样式
- ✅ 统一的按钮样式
- ✅ 统一的图片预览
- ✅ 双图片上传布局
- ✅ 响应式设计

## 🎯 设计特点

1. **一致的视觉层次**
   - 页面标题：3rem (移动端2rem)
   - 卡片标题：1.5rem
   - 正文：1rem

2. **统一的间距系统**
   - 页面内边距：20px
   - 卡片内边距：32px
   - 元素间距：16px, 24px, 32px, 40px

3. **一致的交互效果**
   - 悬停动画：`transform: translateY(-2px)`
   - 过渡时间：`var(--transition)` (0.3s ease)
   - 阴影变化：从普通阴影到悬停阴影

4. **统一的加载状态**
   - 加载动画：旋转圆圈
   - 禁用状态：透明度0.6
   - 加载文字：统一格式

## 🔧 维护指南

添加新页面时，请确保：

1. 使用相同的页面结构模板
2. 应用统一的CSS类名
3. 遵循相同的颜色系统
4. 包含响应式设计
5. 保持一致的交互效果

这样可以确保整个应用的视觉一致性和用户体验的连贯性。
