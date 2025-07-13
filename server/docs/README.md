# 服务端文档

## 📚 文档导航

### 🔧 核心文档
- [API文档](./API.md) - 后端API接口文档
- [部署指南](./DEPLOYMENT_GUIDE.md) - 服务端部署指南
- [数据库设计](./DATABASE.md) - 数据库结构和设计

### 🛠️ 开发文档
- [开发环境搭建](./DEVELOPMENT_SETUP.md) - 本地开发环境配置
- [中间件说明](./MIDDLEWARE.md) - 自定义中间件文档
- [服务层架构](./SERVICES.md) - 业务服务层设计

### 📋 运维文档
- [性能优化](./PERFORMANCE.md) - 性能优化指南
- [监控和日志](./MONITORING.md) - 系统监控和日志管理
- [故障排查](./TROUBLESHOOTING.md) - 常见问题和解决方案

## 🏗️ 项目结构

```
server/
├── src/
│   ├── app.js              # 应用入口
│   ├── routes/             # API路由
│   │   ├── auth.js         # 认证相关路由
│   │   ├── user.js         # 用户管理路由
│   │   ├── image.js        # 图像处理路由
│   │   └── admin.js        # 管理后台路由
│   ├── middleware/         # 中间件
│   │   ├── auth.js         # 认证中间件
│   │   ├── upload.js       # 文件上传中间件
│   │   └── rateLimit.js    # 限流中间件
│   ├── services/           # 业务服务
│   │   ├── userService.js  # 用户服务
│   │   ├── imageService.js # 图像处理服务
│   │   └── pointsService.js # 积分服务
│   ├── utils/              # 工具函数
│   │   ├── database.js     # 数据库工具
│   │   ├── logger.js       # 日志工具
│   │   └── validator.js    # 验证工具
│   └── config/             # 配置文件
│       ├── database.js     # 数据库配置
│       └── app.js          # 应用配置
├── scripts/                # 脚本文件
│   ├── init-admin.js       # 初始化管理员
│   ├── init-level-cards.js # 初始化等级卡
│   └── optimize-database.js # 数据库优化
├── sql/                    # SQL脚本
│   ├── create_tables.sql   # 创建表结构
│   └── init_data.sql       # 初始化数据
└── docs/                   # 文档目录
```

## 🚀 技术栈

### 核心框架
- **Node.js** - 运行时环境
- **Express.js** - Web框架
- **MySQL** - 关系型数据库

### 主要依赖
- **jsonwebtoken** - JWT认证
- **bcryptjs** - 密码加密
- **multer** - 文件上传
- **cors** - 跨域处理
- **helmet** - 安全中间件
- **morgan** - 日志中间件
- **rate-limiter-flexible** - 限流

### 开发工具
- **nodemon** - 开发时自动重启
- **jest** - 单元测试
- **supertest** - API测试

## 🔧 快速开始

### 环境要求
- Node.js >= 16.0.0
- MySQL >= 8.0
- npm 或 yarn

### 安装依赖
```bash
cd server
npm install
```

### 环境配置
```bash
# 复制环境变量模板
cp .env.example .env

# 编辑环境变量
# 配置数据库连接、JWT密钥等
```

### 启动服务
```bash
# 开发模式
npm run dev

# 生产模式
npm start

# 测试
npm test
```

## 📊 API概览

### 认证相关
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/logout` - 用户登出

### 用户管理
- `GET /api/user/profile` - 获取用户信息
- `PUT /api/user/profile` - 更新用户信息
- `GET /api/user/points` - 获取积分信息

### 图像处理
- `POST /api/image/face-swap` - AI换脸
- `POST /api/image/clothes-swap` - AI换装
- `POST /api/image/text-to-image` - 文本生图

### 管理后台
- `GET /api/admin/users` - 用户列表
- `GET /api/admin/stats` - 统计数据
- `POST /api/admin/level-cards` - 等级卡管理

## 🔗 相关链接

- [项目主文档](../../README.md)
- [前端文档](../../client/docs/README.md)
- [管理后台文档](../../admin/docs/README.md)

---

**维护者**: 后端开发团队  
**最后更新**: 2024年
