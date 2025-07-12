# AIMagic 后台管理系统

基于 Vue 3 + Element Plus 的现代化后台管理系统，用于管理 AIMagic AI图像处理平台。

## 📚 文档导航

- [📖 开发文档](./docs/README.md) - 完整的开发指南和系统概述
- [🚀 部署指南](./docs/ADMIN_DEPLOYMENT.md) - 详细的部署和配置说明
- [🔧 故障排除](./docs/FIXES_AND_TROUBLESHOOTING.md) - 问题修复和故障排除指南
- [✨ 功能特性](./docs/FEATURES.md) - 详细的功能介绍和特性说明

## 🚀 功能特色

### 核心功能
- **用户管理** - 查看、搜索、启用/禁用用户
- **等级卡管理** - 生成体验卡、查看卡片状态
- **积分记录** - 查看用户积分获得和消费记录
- **系统配置** - 管理系统基础配置和AI服务开关
- **数据统计** - 仪表盘展示关键业务指标

### 技术特色
- **Vue 3** + **Composition API** - 现代化前端框架
- **Element Plus** - 企业级UI组件库
- **Vue Router** - 单页面应用路由
- **Axios** - HTTP请求库
- **响应式设计** - 完美适配桌面端和移动端

## 📁 项目结构

```
admin/
├── src/
│   ├── api/              # API接口
│   │   ├── auth.js       # 认证相关
│   │   ├── users.js      # 用户管理
│   │   ├── cards.js      # 等级卡管理
│   │   ├── points.js     # 积分记录
│   │   └── dashboard.js  # 仪表盘统计
│   ├── components/       # 公共组件
│   ├── router/           # 路由配置
│   ├── utils/            # 工具函数
│   │   ├── auth.js       # 认证工具
│   │   └── request.js    # 请求拦截器
│   ├── views/            # 页面组件
│   │   ├── Login.vue     # 登录页
│   │   ├── Layout.vue    # 布局组件
│   │   ├── Dashboard.vue # 仪表盘
│   │   ├── Users.vue     # 用户管理
│   │   ├── Cards.vue     # 等级卡管理
│   │   ├── Points.vue    # 积分记录
│   │   └── Config.vue    # 系统配置
│   ├── styles/           # 样式文件
│   ├── App.vue           # 根组件
│   └── main.js           # 入口文件
├── index.html            # HTML模板
├── vite.config.js        # Vite配置
└── package.json          # 项目配置
```

## 🛠️ 快速开始

### 环境要求
- Node.js >= 16.0.0
- npm 或 yarn

### 安装依赖
```bash
cd admin
npm install
```

### 启动开发服务器
```bash
npm run dev
```

访问地址: http://localhost:3003

### 构建生产版本
```bash
npm run build
```

## 🔐 认证系统

### 登录流程
1. 用户输入用户名和密码
2. 调用 `/api/admin-auth/login` 接口
3. 成功后保存 token 到 Cookie
4. 后续请求自动携带 token

### 权限控制
- 路由守卫检查登录状态
- API请求自动添加认证头
- token过期自动跳转登录页

### 演示账号
- 用户名: `admin`
- 密码: `admin123456`

## 📊 API接口

### 认证接口
- `POST /api/admin-auth/login` - 管理员登录
- `GET /api/admin-auth/me` - 获取当前管理员信息
- `POST /api/admin-auth/logout` - 管理员登出

### 用户管理
- `GET /api/admin/users` - 获取用户列表
- `GET /api/admin/users/:id` - 获取用户详情
- `PUT /api/admin/users/:id/status` - 更新用户状态

### 等级卡管理
- `GET /api/admin/cards` - 获取等级卡列表
- `POST /api/admin/generate-experience-cards` - 生成体验卡
- `GET /api/admin/experience-cards-stats` - 获取体验卡统计

### 积分记录
- `GET /api/admin/points-logs` - 获取积分记录列表

### 统计数据
- `GET /api/admin/stats` - 获取仪表盘统计数据

## 🎨 UI设计规范

### 色彩方案
- 主色调: `#409eff` (Element Plus 蓝)
- 成功色: `#67c23a`
- 警告色: `#e6a23c`
- 危险色: `#f56c6c`

### 布局规范
- 侧边栏宽度: 200px (展开) / 64px (收起)
- 内容区域最大宽度: 1200px
- 卡片圆角: 8px
- 间距单位: 8px 的倍数

### 响应式断点
- 移动端: < 768px
- 平板端: 768px - 1024px
- 桌面端: > 1024px

## 🔧 开发指南

### 添加新页面
1. 在 `src/views/` 创建 Vue 组件
2. 在 `src/router/index.js` 添加路由
3. 在 `src/api/` 添加对应的API接口
4. 更新侧边栏菜单

### 状态管理
- 使用 Vue 3 Composition API
- 认证状态通过 Cookie 和 localStorage 管理
- 页面状态使用 reactive/ref 管理

### 错误处理
- API请求统一错误处理
- 全局错误边界
- 用户友好的错误提示

## 🚀 部署

### 开发环境
```bash
npm run dev
```

### 生产环境
```bash
npm run build
npm run preview
```

### Docker部署
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3002
CMD ["npm", "run", "preview"]
```

## 📝 更新日志

### v1.0.0 (2024-01-20)
- ✨ 初始版本发布
- 🎯 完整的用户管理功能
- 📊 等级卡和积分管理
- 🎨 现代化UI设计
- 📱 响应式布局支持

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 推送到分支
5. 创建 Pull Request

## 📄 许可证

MIT License

---

**AI Magic Admin** - 让后台管理更简单 ✨

