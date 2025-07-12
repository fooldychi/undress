# AI图像处理平台 - 前端

基于Vue 3的现代化AI图像处理平台前端应用，提供直观的用户界面和流畅的交互体验。

## ✨ 功能特性

- 🎨 **AI图像处理**: 一键褪衣、文生图、极速换脸等AI功能
- 👤 **用户系统**: 完整的用户认证和个人中心管理
- 💎 **积分系统**: 灵活的积分管理和等级卡绑定机制
- 📱 **响应式设计**: 完美适配桌面端和移动端
- 🎯 **现代化UI**: 统一的设计系统和优雅的交互体验

## 🛠️ 技术栈

- **框架**: Vue 3 + Composition API
- **路由**: Vue Router 4
- **UI组件**: Vant 4
- **构建工具**: Vite
- **样式**: CSS3 + CSS变量系统
- **图标**: Vant Icons

## 🚀 快速开始

### 环境要求
- Node.js >= 16
- npm >= 8

### 安装与运行

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build
```

应用将在 http://localhost:3001 启动

## 📁 项目结构

```
client/
├── src/
│   ├── components/          # 可复用组件
│   │   ├── TopNavigation.vue    # 顶部导航
│   │   ├── AuthModal.vue        # 认证弹窗
│   │   ├── RecordItem.vue       # 记录项
│   │   └── ResultModal.vue      # 结果查看弹窗
│   ├── views/              # 页面组件
│   │   ├── HomePage.vue         # 首页
│   │   ├── Profile.vue          # 个人中心
│   │   ├── ClothesSwap.vue      # 一键褪衣
│   │   ├── TextToImage.vue      # 文生图
│   │   └── FaceSwap.vue         # 极速换脸
│   ├── services/           # API服务层
│   ├── router/             # 路由配置
│   └── styles/             # 全局样式
├── public/                 # 静态资源
└── docs/                   # 项目文档
```

## 📋 开发规范

### 核心原则
1. **设计系统统一** - 使用CSS变量确保视觉一致性
2. **组件化开发** - 可复用、单一职责的组件设计
3. **图标使用规范** - 严格按功能分类使用图标
4. **用户体验优先** - 响应式设计和友好的交互反馈
5. **代码质量标准** - 遵循Vue 3最佳实践

详细规范请参考：[前端开发原则](./docs/FRONTEND_DEVELOPMENT_PRINCIPLES.md)

### 图标使用规范
| 功能类别 | 图标 | 使用场景 |
|---------|------|----------|
| 积分相关 | `diamond-o` | 积分显示、积分卡片 |
| 等级卡相关 | `credit-pay` | 等级卡列表、标题 |
| 用户相关 | `user-o` | 用户头像、个人中心 |
| 记录相关 | `records` | 积分记录、操作历史 |

## 🔌 API集成

| API类别 | 端点 | 功能 |
|---------|------|------|
| 认证API | `/api/auth/*` | 登录、注册、登出 |
| 用户API | `/api/user/*` | 用户信息管理 |
| 积分API | `/api/points/*` | 积分查询和记录 |
| 等级卡API | `/api/level-cards/*` | 等级卡管理 |
| 图像处理API | `/api/image/*` | AI图像处理功能 |

## 📦 部署

### 生产环境部署
```bash
# 构建项目
npm run build

# 部署dist目录到Web服务器
```

详细部署说明：[部署指南](./docs/DEPLOYMENT_GUIDE.md)

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 遵循开发规范进行开发
4. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
5. 推送到分支 (`git push origin feature/AmazingFeature`)
6. 开启 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情
