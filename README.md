# Imagic - AI图像处理应用

基于Vue 3和ComfyUI工作流的AI图像处理平台，提供一键换衣、文生图和极速换脸三大核心功能。

## 🌟 功能特性

- **一键褪衣** 👤 - 智能识别人物轮廓，快速移除照片中的服装
- **文生图** 🖼️ - 通过自然语言描述，AI生成高质量的创意图像
- **极速换脸** 😀 - 精准面部识别技术，实现自然的人脸替换效果

## 🚀 快速开始

### 环境要求

- Node.js 16+
- npm 或 yarn
- ComfyUI服务器（用于AI处理）

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

应用将在 http://localhost:3000 启动

### 构建生产版本

```bash
npm run build
```

## 🔧 配置

### ComfyUI API配置

在 `src/services/api.js` 中配置你的ComfyUI服务器：

```javascript
const API_CONFIG = {
  BASE_URL: 'http://your-comfyui-server:8188',
  API_KEY: 'your-api-key', // 如果需要
  TIMEOUT: 300000
}
```

### 开发模式

在开发模式下，应用使用模拟API响应，无需真实的ComfyUI服务器。

## 📁 项目结构

```
imagic/
├── src/
│   ├── components/      # Vue组件
│   │   ├── icons/       # 自定义图标组件
│   │   │   ├── UndressWomanIcon.vue # 褪衣图标
│   │   │   ├── FaceSwapIcon.vue     # 换脸图标
│   │   │   └── index.js             # 图标管理
│   │   ├── ImageUpload.vue          # 图片上传组件
│   │   ├── ProcessingStatus.vue     # 处理状态组件
│   │   └── ImageComparison.vue      # 图片对比组件
│   ├── views/           # 页面组件
│   │   ├── HomePage.vue     # 主页
│   │   ├── ClothesSwap.vue  # 一键褪衣
│   │   ├── TextToImage.vue  # 文生图
│   │   └── FaceSwap.vue     # 极速换脸
│   ├── services/        # API服务
│   │   ├── api.js       # 通用API
│   │   └── comfyui.js   # ComfyUI API
│   ├── workflows/       # ComfyUI工作流
│   │   ├── undress.json # 褪衣工作流
│   │   └── faceswap2.0.json # 换脸工作流
│   ├── router/          # 路由配置
│   ├── App.vue          # 根组件
│   ├── main.js          # 入口文件
│   └── style.css        # 全局样式
├── docs/                # 文档目录
│   └── archive/         # 历史文档归档
├── public/              # 静态资源
├── proxy-server.js      # 代理服务器
├── package.json         # 项目配置
└── vite.config.js       # Vite配置
```

## 📚 文档归档

项目的历史文档和修复记录已归档到 `docs/archive/` 目录中，包括：
- 关键问题修复总结
- UI组件迁移文档
- 部署和构建文档
- 技术决策记录

这些文档对于了解项目历史、问题排查和新开发者了解项目具有重要价值。

## 🎨 技术栈

- **前端框架**: Vue 3 (Composition API)
- **构建工具**: Vite
- **路由**: Vue Router 4
- **UI组件库**: Vant UI (移动端优化)
- **图标**: Lucide Vue Next + 自定义SVG图标
- **样式**: 原生CSS + CSS变量 + 暗色主题
- **AI后端**: ComfyUI

## 🔌 ComfyUI集成

### 真实工作流集成

**一键换衣功能已集成真实的ComfyUI工作流！**

- **工作流文件**: `src/workflows/undress.json`
- **ComfyUI服务器**: `https://rihblhikbh-8188.cnb.run`
- **处理流程**:
  1. 上传图片到ComfyUI服务器
  2. 动态配置工作流（节点49）
  3. 提交任务并监控状态
  4. 获取处理结果

### API端点

- **一键换衣**: 使用真实ComfyUI工作流处理
- **文生图**: 开发模式模拟响应
- **换脸**: 开发模式模拟响应

### 测试ComfyUI集成

访问 `http://localhost:3000?test=true` 运行自动测试套件。

## 🎯 使用说明

### 一键换衣
1. 上传包含人物的照片
2. 点击"开始换衣"
3. 等待AI处理完成
4. 下载处理结果

### 文生图
1. 输入详细的图像描述
2. 选择图像尺寸和风格
3. 点击"生成图像"
4. 下载生成的图片

### 极速换脸
1. 上传源脸部图片（要替换的脸）
2. 上传目标图片（被替换脸部的图片）
3. 选择处理选项
4. 点击"开始换脸"
5. 下载换脸结果

## 🚀 快速开始

### 📋 环境要求

- Node.js 16+
- npm 或 yarn

### 🔧 安装依赖

```bash
npm install
```

### 🏃‍♂️ 启动开发服务器

```bash
# 启动前端开发服务器
npm run dev

# 启动代理服务器（解决CORS问题）
npm run proxy

# 同时启动前端和代理服务器（推荐）
npm run dev:full
```

## 🌐 部署

### GitHub Pages 部署

项目已配置好 GitHub Pages 自动部署：

```bash
# 推送到 main 分支自动部署
git push origin main

# 手动构建和部署
npm run build:github
npm run deploy
```

**在线访问**：https://fooldychi.github.io/undress/

详细部署指南请查看：[GITHUB_PAGES_SETUP.md](./GITHUB_PAGES_SETUP.md)

## 🛠️ 开发指南

### 添加新功能

1. 在 `src/views/` 创建新的页面组件
2. 在 `src/router/index.js` 添加路由
3. 在 `src/services/api.js` 添加对应的API方法
4. 在主页添加功能入口

### 自定义样式

项目使用CSS变量进行主题配置，在 `src/style.css` 中修改：

```css
:root {
  --primary-color: #667eea;
  --secondary-color: #764ba2;
  --accent-color: #f093fb;
  /* ... */
}
```

## 📝 许可证

MIT License

## 🤝 贡献

欢迎提交Issue和Pull Request！

## 📞 支持

如有问题，请提交Issue或联系开发团队。
