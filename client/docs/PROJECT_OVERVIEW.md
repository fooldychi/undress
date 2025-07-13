# 项目概览

## 项目简介

AI Magic 是一个基于Vue 3的现代化前端应用，为用户提供AI图像处理服务，包括一键褪衣、文生图、极速换脸等功能。

## 核心功能

### 1. 用户系统
- **用户认证**: 注册、登录、登出
- **个人中心**: 用户信息管理、积分查看、操作记录
- **状态同步**: 实时的登录状态同步机制

### 2. 积分系统
- **积分管理**: 积分查询、消费记录、充值记录
- **等级卡系统**: 等级卡绑定、积分充值、卡片管理
- **消费控制**: 基于积分的功能访问控制

### 3. AI图像处理
- **一键褪衣**: 智能服装移除功能
- **极速换脸**: 人脸替换技术

## 技术架构

### 前端技术栈
```
Vue 3 (Composition API)
├── Vue Router 4          # 路由管理
├── Vant 4               # UI组件库
├── Vite                 # 构建工具
└── CSS Variables        # 样式系统
```

### 核心组件
- **TopNavigation**: 顶部导航栏，包含积分显示和用户状态
- **AuthModal**: 统一的登录注册弹窗
- **RecordItem**: 积分记录项组件
- **ResultModal**: 结果查看弹窗

### 页面结构
- **HomePage**: 主页，功能入口
- **Profile**: 个人中心，用户信息管理
- **ClothesSwap**: 一键褪衣功能页面
- **TextToImage**: 文生图功能页面
- **FaceSwap**: 极速换脸功能页面

## 设计系统

### CSS变量系统
```css
:root {
  --primary-color: #6366f1;    # 主色调
  --bg-primary: #0f0f23;       # 主背景
  --bg-card: #16213e;          # 卡片背景
  --text-color: #e2e8f0;       # 主文字颜色
  --border-color: #334155;     # 边框颜色
}
```

### 图标规范
- **积分相关**: `diamond-o`
- **等级卡相关**: `credit-pay`
- **用户相关**: `user-o`
- **记录相关**: `records`

## API接口

### 认证相关
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/logout` - 用户登出

### 用户相关
- `GET /api/user/info` - 获取用户信息
- `PUT /api/user/info` - 更新用户信息

### 积分相关
- `GET /api/points/status` - 获取积分状态
- `GET /api/points/records` - 获取积分记录

### 等级卡相关
- `GET /api/level-cards/my` - 获取我的等级卡
- `POST /api/level-cards/bind` - 绑定等级卡

### 图像处理相关
- `POST /api/image/clothes-swap` - 一键褪衣
- `POST /api/image/text-to-image` - 文生图
- `POST /api/image/face-swap` - 极速换脸

## 开发规范

### 组件开发
1. 使用Vue 3 Composition API
2. 遵循单一职责原则
3. 确保组件可复用性
4. 实现响应式设计

### 样式规范
1. 使用CSS变量确保一致性
2. 遵循BEM命名规范
3. 优先使用flex和grid布局
4. 确保移动端适配

### 代码质量
1. 使用TypeScript类型检查
2. 遵循ESLint规则
3. 编写有意义的注释
4. 进行单元测试

## 部署流程

### 开发环境
```bash
npm install
npm run dev
```

### 生产环境
```bash
npm run build
# 部署dist目录到Web服务器
```

## 项目结构

```
client/
├── src/
│   ├── components/      # 可复用组件
│   ├── views/          # 页面组件
│   ├── services/       # API服务
│   ├── router/         # 路由配置
│   ├── styles/         # 全局样式
│   └── utils/          # 工具函数
├── public/             # 静态资源
├── docs/               # 项目文档
└── package.json        # 项目配置
```

## 关键特性

### 1. 状态管理
- 使用Vue 3 Composition API进行状态管理
- 实现跨组件的状态同步
- 登录状态的实时更新机制

### 2. 用户体验
- 统一的设计语言
- 流畅的页面切换
- 友好的错误处理
- 完善的加载状态

### 3. 性能优化
- 组件懒加载
- 图片优化
- 代码分割
- 缓存策略

### 4. 安全性
- JWT Token认证
- 前端路由守卫
- API请求拦截
- 用户输入验证

## 维护指南

### 代码维护
1. 定期更新依赖包
2. 监控性能指标
3. 修复安全漏洞
4. 优化用户体验

### 文档维护
1. 更新API文档
2. 维护开发规范
3. 记录重要变更
4. 提供使用指南

---

本文档提供了项目的整体概览，详细的开发规范请参考 [前端开发原则](./FRONTEND_DEVELOPMENT_PRINCIPLES.md)。

