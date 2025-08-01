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

## 🌐 端口配置

| 服务 | 端口 | 描述 | 访问地址 |
|------|------|------|----------|
| 客户端前端 | 3001 | 用户前端界面 | http://localhost:3001 |
| 后台管理系统 | 3003 | 管理员界面 | http://localhost:3003 |
| 后端API服务 | 3007 | 服务器API | http://localhost:3007 |

### 端口管理工具
```bash
# 检查端口配置一致性
node scripts/port-config-manager.js check

# 自动修复端口配置问题
node scripts/port-config-manager.js fix

# 查看端口使用情况
node scripts/port-config-manager.js availability
```

⚠️ **重要**: 端口配置由 `port-config.json` 统一管理，请勿随意修改。详见 [端口管理指南](./scripts/PORT_MANAGER_GUIDE.md)

## 📁 项目结构

```
AIMagic/
├── client/                 # 前端项目 (端口: 3001)
│   ├── src/
│   │   ├── components/     # Vue组件
│   │   ├── views/         # 页面组件
│   │   ├── router/        # 路由配置
│   │   ├── services/      # API服务
│   │   ├── utils/         # 工具函数
│   │   └── styles/        # 样式文件
│   ├── docs/              # 前端文档
│   └── public/            # 静态资源
├── admin/                 # 管理后台 (端口: 3003)
│   ├── src/
│   │   ├── components/    # 管理组件
│   │   ├── views/         # 管理页面
│   │   └── utils/         # 工具函数
├── server/                # 后端项目 (端口: 3007)
│   ├── src/
│   │   ├── routes/        # API路由
│   │   ├── middleware/    # 中间件
│   │   ├── scripts/       # 数据库脚本
│   │   └── utils/         # 工具函数
│   └── scripts/           # 部署脚本
├── scripts/               # 项目管理脚本
│   ├── port-config-manager.js    # 端口配置管理
│   └── setup-port-management.js  # 端口管理安装
├── port-config.json       # 端口配置文件
└── docs/                  # 项目文档
    ├── port-management/   # 端口管理文档
    └── README.md          # 文档索引
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

#### 🎯 前后端分离启动 (推荐)

⚠️ **重要**: 必须按顺序启动，先启动后端服务，再启动前端服务

```bash
# 1️⃣ 首先启动后端服务 (端口: 3007)
cd server
npm install  # 首次运行需要安装依赖
npm start

# 2️⃣ 启动前端开发服务器 (端口: 3001)
cd client
npm install  # 首次运行需要安装依赖
npm run dev

# 3️⃣ 启动后台管理系统 (端口: 3003)
cd admin
npm install  # 首次运行需要安装依赖
npm run dev
```

#### 🔐 默认登录信息
- **后台管理系统**: http://localhost:3003
  - 用户名: `admin`
  - 密码: `admin123456`

#### 📋 生产环境部署
各服务应独立部署：
- **后端API**: 部署在服务器或容器中，提供API服务
- **前端客户端**: 构建静态文件，部署到CDN或静态服务器
- **后台管理**: 构建静态文件，部署到内网或受保护的环境

### 访问应用
- **客户端前端**: http://localhost:3001 (用户界面)
- **后台管理系统**: http://localhost:3003 (管理员界面)
- **后端API**: http://localhost:3007 (API服务)

### 🛠️ 常见问题解决

#### 端口被占用
```bash
# 查看端口占用
netstat -ano | findstr :3001  # Windows
lsof -i :3001                 # Linux/Mac

# 终止占用进程
taskkill /PID <进程ID> /F      # Windows
kill -9 <进程ID>               # Linux/Mac
```

#### 依赖安装失败
```bash
# 清除缓存重新安装
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

#### API连接失败
1. 确认后端服务已启动 (http://localhost:3007)
2. 检查防火墙设置
3. 检查代理配置是否正确

#### 健康检查
```bash
# 检查服务状态
curl http://localhost:3007/health  # 后端API
# 浏览器访问前端和后台管理界面
```

## 🔧 端口配置

### 默认端口分配
- **客户端前端**: 3001
- **后台管理系统**: 3003
- **后端API服务**: 3007

### 端口管理命令
```bash
# 检查端口状态
node scripts/port-manager.js status

# 验证并处理端口冲突
node scripts/port-manager.js validate

# 启动单个服务
node scripts/port-manager.js start server
node scripts/port-manager.js start client
node scripts/port-manager.js start admin
```

### 配置文件
- `port-config.json` - 统一端口配置
- [端口管理指南](./scripts/PORT_MANAGER_GUIDE.md) - 详细使用指南

### 🛡️ 配置保护机制
```bash
# 检查端口配置完整性和硬编码问题
node scripts/protect-port-config.js check

# 同步所有配置文件
node scripts/sync-port-config.js sync

# 安装Git钩子保护
node scripts/install-git-hooks.js install
```

## 📖 文档

### 前端开发
- [前端文档中心](./client/docs/README.md) - 完整的前端开发文档索引
- [前端开发原则](./client/docs/FRONTEND_DEVELOPMENT_PRINCIPLES.md)
- [项目概览](./client/docs/PROJECT_OVERVIEW.md)
- [部署指南](./client/docs/DEPLOYMENT_GUIDE.md)
- [SVG图标系统](./client/docs/SVG_ICON_SYSTEM.md)
- [SVG图标迁移指南](./client/docs/SVG_ICONS_MIGRATION.md)
- [统一组件指南](./client/docs/UNIFIED_COMPONENTS_GUIDE.md)

### 系统架构
- [端口管理系统](./scripts/PORT_MANAGER_GUIDE.md)

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

