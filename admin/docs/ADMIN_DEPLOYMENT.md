# AIMagic 后台管理系统部署指南

## 📋 系统概述

AIMagic 后台管理系统是一个基于 Vue3 + Element Plus 的现代化管理界面，用于管理用户、等级卡、积分记录和系统配置。

## 🚀 快速部署

### 1. 环境要求

- Node.js 16+
- npm 或 yarn
- MySQL 数据库
- 已部署的 AIMagic 后端服务

### 2. 克隆项目

```bash
git clone [your-repository-url]
cd AIMagic
```

### 3. 后端服务启动

```bash
# 进入后端目录
cd server

# 安装依赖（如果还没安装）
npm install

# 启动后端服务
npm start
# 或使用批处理文件
start.bat
```

后端服务将运行在：`http://localhost:3007`

### 4. 前端管理系统启动

```bash
# 进入管理后台目录
cd admin

# 安装依赖
npm install

# 启动开发服务器
npm run dev
# 或使用批处理文件
start.bat
```

前端管理系统将运行在：`http://localhost:3003`

## 🔑 登录信息

- **访问地址**: http://localhost:3003
- **管理员账号**: admin
- **管理员密码**: admin123456

## 📊 功能模块

### 1. 仪表盘 (Dashboard)
- 系统统计数据展示
- 用户数量、等级卡数量、积分统计
- 今日活跃用户数据

### 2. 用户管理 (Users)
- 用户列表查看和搜索
- 用户状态管理（激活/禁用）
- 用户详细信息查看
- 用户绑定卡片和积分统计

### 3. 等级卡管理 (Cards)
- 等级卡列表查看
- 体验卡生成功能
- 卡片状态和类型管理
- 卡片积分信息

### 4. 积分记录 (Points)
- 积分消费和获得记录
- 按用户和类型筛选
- 积分流水详细信息

### 5. 系统配置 (Config)
- AI 服务配置
- ComfyUI 配置
- JWT 配置
- 数据库连接测试

## 🔧 技术架构

### 前端技术栈
- **框架**: Vue 3 + Composition API
- **构建工具**: Vite
- **UI 组件库**: Element Plus
- **路由**: Vue Router 4
- **HTTP 客户端**: Axios
- **样式**: SCSS

### 后端集成
- **API 基础路径**: `/api`
- **认证方式**: JWT Bearer Token
- **数据格式**: JSON
- **跨域处理**: CORS 配置

## 📁 项目结构

```
admin/
├── src/
│   ├── api/           # API 接口定义
│   │   ├── auth.js    # 认证相关
│   │   ├── users.js   # 用户管理
│   │   ├── cards.js   # 等级卡管理
│   │   ├── points.js  # 积分记录
│   │   ├── config.js  # 系统配置
│   │   └── dashboard.js # 仪表盘
│   ├── views/         # 页面组件
│   │   ├── Login.vue  # 登录页
│   │   ├── Layout.vue # 布局组件
│   │   ├── Dashboard.vue # 仪表盘
│   │   ├── Users.vue  # 用户管理
│   │   ├── Cards.vue  # 等级卡管理
│   │   ├── Points.vue # 积分记录
│   │   └── Config.vue # 系统配置
│   ├── utils/         # 工具函数
│   │   ├── auth.js    # 认证工具
│   │   └── request.js # HTTP 请求配置
│   ├── router/        # 路由配置
│   └── styles/        # 样式文件
├── package.json       # 依赖配置
├── vite.config.js     # Vite 配置
└── start.bat          # Windows 启动脚本
```

## 🔒 安全说明

1. **认证机制**: 使用 JWT Token 进行身份验证
2. **权限控制**: 管理员权限验证
3. **CORS 配置**: 限制跨域访问
4. **密码安全**: 建议修改默认管理员密码

## 🐛 故障排除

### 1. 登录失败
- 检查后端服务是否正常运行
- 确认数据库连接正常
- 验证管理员账户是否存在

### 2. API 调用失败
- 检查 CORS 配置
- 确认前端代理设置
- 验证后端 API 路径

### 3. 页面加载错误
- 清除浏览器缓存
- 检查前端服务器状态
- 查看控制台错误信息

## 📞 技术支持

如遇到问题，请检查：
1. 后端服务日志
2. 前端控制台错误
3. 网络连接状态
4. 数据库连接状态

---

**部署完成后，您就可以通过现代化的管理界面来管理 AIMagic 系统了！** 🎉
