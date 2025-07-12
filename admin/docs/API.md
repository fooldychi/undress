# 后台管理系统 API 文档

## 🔐 认证接口

### 管理员登录
```http
POST /api/admin-auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123456"
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "token": "jwt_token_here",
    "user": {
      "id": 1,
      "username": "admin",
      "role": "admin"
    }
  }
}
```

### 获取当前管理员信息
```http
GET /api/admin-auth/me
Authorization: Bearer {token}
```

### 管理员登出
```http
POST /api/admin-auth/logout
Authorization: Bearer {token}
```

## 👥 用户管理接口

### 获取用户列表
```http
GET /api/admin/users?page=1&limit=10&search=keyword
Authorization: Bearer {token}
```

**查询参数**:
- `page`: 页码（默认1）
- `limit`: 每页数量（默认10）
- `search`: 搜索关键词（可选）

**响应**:
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": 1,
        "username": "user1",
        "email": "user1@example.com",
        "status": "active",
        "created_at": "2024-01-01T00:00:00Z",
        "points": 100,
        "bound_cards": 2
      }
    ],
    "total": 50,
    "page": 1,
    "limit": 10
  }
}
```

### 获取用户详情
```http
GET /api/admin/users/{id}
Authorization: Bearer {token}
```

### 更新用户状态
```http
PUT /api/admin/users/{id}/status
Authorization: Bearer {token}
Content-Type: application/json

{
  "status": "active" // 或 "inactive"
}
```

## 🎫 等级卡管理接口

### 获取等级卡列表
```http
GET /api/admin/cards?page=1&limit=10
Authorization: Bearer {token}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "cards": [
      {
        "id": 1,
        "card_number": "CARD001",
        "type": "experience",
        "points": 50,
        "status": "active",
        "bound_user": {
          "id": 1,
          "username": "user1"
        },
        "created_at": "2024-01-01T00:00:00Z"
      }
    ],
    "total": 100,
    "page": 1,
    "limit": 10
  }
}
```

### 生成体验卡
```http
POST /api/admin/generate-experience-cards
Authorization: Bearer {token}
Content-Type: application/json

{
  "count": 10,
  "points": 50
}
```

### 获取体验卡统计
```http
GET /api/admin/experience-cards-stats
Authorization: Bearer {token}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "total": 100,
    "used": 30,
    "unused": 70,
    "generated_today": 10
  }
}
```

### 解绑等级卡
```http
PUT /api/admin/cards/{id}/unbind
Authorization: Bearer {token}
```

### 更新等级卡状态
```http
PUT /api/admin/cards/{id}/status
Authorization: Bearer {token}
Content-Type: application/json

{
  "status": "active" // 或 "inactive"
}
```

## 💰 积分记录接口

### 获取积分记录列表
```http
GET /api/admin/points-logs?page=1&limit=10&user_id=1&type=consume
Authorization: Bearer {token}
```

**查询参数**:
- `page`: 页码（默认1）
- `limit`: 每页数量（默认10）
- `user_id`: 用户ID（可选）
- `type`: 记录类型 - `earn`(获得) 或 `consume`(消费)（可选）

**响应**:
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": 1,
        "user_id": 1,
        "username": "user1",
        "type": "consume",
        "points": -10,
        "description": "AI图像生成",
        "result_url": "http://example.com/result.jpg",
        "created_at": "2024-01-01T00:00:00Z"
      }
    ],
    "total": 200,
    "page": 1,
    "limit": 10
  }
}
```

## 📊 统计数据接口

### 获取仪表盘统计数据
```http
GET /api/admin/stats
Authorization: Bearer {token}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "users": {
      "total": 1000,
      "active": 800,
      "new_today": 10
    },
    "cards": {
      "total": 500,
      "bound": 300,
      "experience": 200
    },
    "points": {
      "total_earned": 50000,
      "total_consumed": 30000,
      "today_consumed": 500
    },
    "activity": {
      "active_users_today": 50,
      "api_calls_today": 200
    }
  }
}
```

## ⚙️ 系统配置接口

### 获取系统配置
```http
GET /api/admin/config
Authorization: Bearer {token}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "ai_service": {
      "enabled": true,
      "api_key": "***",
      "endpoint": "https://api.example.com"
    },
    "comfyui": {
      "enabled": true,
      "server_url": "http://localhost:8188",
      "timeout": 30000
    },
    "jwt": {
      "secret": "***",
      "expires_in": "24h"
    },
    "database": {
      "host": "localhost",
      "port": 3306,
      "database": "aimagic"
    }
  }
}
```

### 更新系统配置
```http
PUT /api/admin/config
Authorization: Bearer {token}
Content-Type: application/json

{
  "ai_service": {
    "enabled": true,
    "api_key": "new_api_key",
    "endpoint": "https://api.example.com"
  },
  "comfyui": {
    "enabled": true,
    "server_url": "http://localhost:8188",
    "timeout": 30000
  }
}
```

### 测试配置连接
```http
POST /api/admin/config/test
Authorization: Bearer {token}
Content-Type: application/json

{
  "type": "database" // 或 "comfyui", "ai_service"
}
```

## 🚨 错误响应格式

所有API在出错时都会返回统一的错误格式：

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述信息",
    "details": "详细错误信息（可选）"
  }
}
```

### 常见错误码

- `UNAUTHORIZED`: 未授权访问
- `FORBIDDEN`: 权限不足
- `NOT_FOUND`: 资源不存在
- `VALIDATION_ERROR`: 参数验证失败
- `INTERNAL_ERROR`: 服务器内部错误
- `DATABASE_ERROR`: 数据库操作失败

## 🔧 请求头要求

所有需要认证的API请求都必须包含以下请求头：

```http
Authorization: Bearer {jwt_token}
Content-Type: application/json
```

## 📝 注意事项

1. 所有时间字段都使用 ISO 8601 格式
2. 分页从第1页开始
3. 默认每页返回10条记录，最大100条
4. JWT Token 有效期为24小时
5. 敏感信息（如密码、密钥）在响应中会被脱敏处理
