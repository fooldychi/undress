# AI Magic - AI图像处理平台

一个基于Vue3和Node.js的现代化AI图像处理平台，提供换脸、换装等多种AI图像处理服务。

## 🚀 项目特色

### 前端技术栈
- **Vue 3** + **Composition API** - 现代化前端框架
- **Vite** - 快速构建工具
- **Vant UI** - 移动端组件库
- **Vue Router** - 路由管理
- **响应式设计** - 完美适配移动端和桌面端

### 后端技术栈
- **Node.js** + **Express** - 服务端框架
- **MySQL** - 数据库
- **JWT** - 用户认证
- **Multer** - 文件上传
- **Rate Limiting** - 接口限流

### 核心功能
- 🎭 **AI换脸** - 高质量人脸替换
- 👗 **AI换装** - 智能服装替换
- 🎨 **文本生图** - AI图像生成
- 👤 **用户系统** - 注册、登录、个人中心
- 💎 **积分系统** - 积分管理和消费记录
- 🎫 **等级卡系统** - 多种等级卡管理
- 📊 **管理后台** - 完整的后台管理功能

## 📁 项目结构

```
icomfy/
├── client/                 # 前端项目
│   ├── src/
│   │   ├── components/     # Vue组件
│   │   ├── views/         # 页面组件
│   │   ├── router/        # 路由配置
│   │   ├── services/      # API服务
│   │   ├── utils/         # 工具函数
│   │   └── styles/        # 样式文件
│   ├── docs/              # 前端文档
│   └── public/            # 静态资源
├── server/                # 后端项目
│   ├── src/
│   │   ├── routes/        # API路由
│   │   ├── middleware/    # 中间件
│   │   ├── scripts/       # 数据库脚本
│   │   └── utils/         # 工具函数
│   └── scripts/           # 部署脚本
└── docs/                  # 项目文档
```

## 🛠️ 快速开始

### 环境要求
- Node.js >= 16.0.0
- MySQL >= 8.0
- npm 或 yarn

### 安装依赖

```bash
# 安装前端依赖
cd client
npm install

# 安装后端依赖
cd ../server
npm install
```

### 配置环境变量

```bash
# 复制环境变量模板
cp server/.env.example server/.env

# 编辑环境变量
# 配置数据库连接、JWT密钥等
```

### 启动项目

```bash
# 启动后端服务 (端口: 3006)
cd server
npm start

# 启动前端开发服务器 (端口: 3001)
cd client
npm run dev
```

### 访问应用
- 前端应用: http://localhost:3001
- 后端API: http://localhost:3006

## 📖 文档

### 前端开发
- [前端开发原则](./client/docs/FRONTEND_DEVELOPMENT_PRINCIPLES.md)
- [项目概览](./client/docs/PROJECT_OVERVIEW.md)
- [部署指南](./client/docs/DEPLOYMENT_GUIDE.md)

### API文档
- 用户认证: `/api/auth/*`
- 用户管理: `/api/user/*`
- 积分系统: `/api/points/*`
- 等级卡管理: `/api/level-cards/*`
- 图像处理: `/api/image/*`

## 🎨 UI设计规范

### 图标使用规范
| 功能类别 | 图标 | 使用场景 | 对应内容 |
|---------|------|----------|----------|
| 积分相关 | `diamond-o` | 积分显示、积分卡片 | 我的积分、积分信息 |
| 等级卡相关 | `credit-pay` | 等级卡列表、标题 | 我的等级卡、等级卡管理 |
| 用户相关 | `user-o` | 用户头像、个人中心 | 用户信息、个人中心 |
| 记录相关 | `records` | 积分记录、操作历史 | 最近记录、积分记录 |

### 布局原则
- **整行布局**: 重要信息卡片占据整行
- **统一布局**: 等级卡与最近记录使用相同布局风格
- **响应式设计**: 完美适配各种屏幕尺寸

## 🚀 部署

### 生产环境部署
```bash
# 构建前端
cd client
npm run build

# 启动生产服务器
cd ../server
NODE_ENV=production npm start
```

### Docker部署
```bash
# 构建镜像
docker build -t icomfy .

# 运行容器
docker run -p 3006:3006 icomfy
```

## 🤝 贡献

欢迎提交Issue和Pull Request来改进项目。

## 📄 许可证

本项目采用 MIT 许可证。

## 🔗 相关链接

- [Gitee仓库](https://gitee.com/fooldy/icomfy)
- [Vue.js官网](https://vuejs.org/)
- [Vant UI文档](https://vant-contrib.gitee.io/vant/)
- [Express.js官网](https://expressjs.com/)

---

**AI Magic** - 让AI图像处理更简单 ✨

