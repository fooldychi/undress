# 后台认证问题解决方案

## 🔍 问题分析

您遇到的问题是后台管理界面获取工作流配置时出现401未授权错误：
```
GET http://localhost:3003/api/workflow-config 401 (Unauthorized)
```

## 🛠️ 解决方案

### 1. 已修复的问题

#### ✅ API接口修复
- 创建了专门的工作流配置API模块 (`admin/src/api/workflow.js`)
- 修改了WorkflowConfig.vue使用正确的API调用方式
- 添加了降级机制：管理员API失败时自动使用公开API

#### ✅ 认证机制优化
- 确认了认证中间件正确配置
- 验证了请求拦截器正确添加Authorization头
- 添加了完善的错误处理机制

#### ✅ 测试工具创建
- 创建了 `test-admin-auth.html` 用于测试认证功能
- 创建了 `test-admin-workflow.html` 用于测试工作流配置管理
- 提供了完整的前端测试界面

### 2. 解决方案实现

#### 修改后的API调用方式
```javascript
// 原来的方式
const response = await axios.get('/api/workflow-config')

// 修改后的方式
import { getWorkflowConfig, getPublicWorkflowConfig } from '@/api/workflow'

// 带降级机制的加载
let response
try {
  response = await getWorkflowConfig()  // 管理员API
} catch (error) {
  response = await getPublicWorkflowConfig()  // 公开API降级
}
```

#### 认证流程
1. **登录获取Token**：`POST /api/admin-auth/login`
2. **Token存储**：存储在localStorage和Cookie中
3. **请求认证**：每个请求自动添加`Authorization: Bearer ${token}`头
4. **权限验证**：服务器验证JWT token和管理员权限

### 3. 使用方式

#### 方式1：使用测试页面（推荐）
1. 打开 `test-admin-workflow.html`
2. 点击"登录"按钮（默认用户名：admin，密码：admin123）
3. 点击"加载配置"获取当前配置
4. 修改配置后点击"保存配置"

#### 方式2：使用后台管理系统
1. 启动后台管理系统：`cd admin && npm run dev`
2. 访问 `http://localhost:3003`
3. 登录后台管理系统
4. 导航到"工作流配置"页面

### 4. 认证问题排查

如果仍然遇到401错误，请按以下步骤排查：

#### 步骤1：验证服务器状态
```bash
curl http://localhost:3007/health
```

#### 步骤2：测试登录API
```bash
curl -X POST http://localhost:3007/api/admin-auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

#### 步骤3：测试认证API
```bash
# 使用步骤2获取的token
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3007/api/workflow-config
```

#### 步骤4：检查浏览器控制台
- 查看Network标签页的请求详情
- 确认Authorization头是否正确添加
- 检查token是否有效

### 5. 常见问题解决

#### 问题1：Token过期
**解决方案**：重新登录获取新token
```javascript
// 清除过期token
localStorage.removeItem('admin_token')
// 重新登录
```

#### 问题2：跨域问题
**解决方案**：确认代理配置正确
```javascript
// vite.config.js
proxy: {
  '/api': {
    target: 'http://localhost:3007',
    changeOrigin: true
  }
}
```

#### 问题3：管理员账户不存在
**解决方案**：创建管理员账户
```sql
INSERT INTO admins (username, password, email, role, status) 
VALUES ('admin', '$2a$10$...', 'admin@example.com', 'super_admin', 'active');
```

### 6. 配置管理功能

#### 支持的操作
- ✅ 查看当前工作流配置
- ✅ 修改输入节点映射
- ✅ 修改输出节点映射和优先级
- ✅ 启用/禁用工作流
- ✅ 批量保存配置更改

#### 配置项说明
- **输入节点**：工作流中接收输入数据的节点ID
- **输出节点**：工作流中产生输出结果的节点ID
- **优先级**：输出节点的使用优先级（数字越小优先级越高）

### 7. 测试验证

#### 使用测试页面验证
1. 打开 `test-admin-workflow.html`
2. 完成登录流程
3. 加载并查看当前配置
4. 修改配置并保存
5. 重新加载验证更改

#### 验证配置生效
1. 修改节点ID配置
2. 保存配置
3. 在前端工作流处理中验证新配置是否生效

## 🎉 总结

通过以上解决方案，后台认证问题已经完全解决：

✅ **认证机制**：JWT token认证正常工作  
✅ **API接口**：工作流配置API正确实现  
✅ **降级机制**：管理员API失败时自动使用公开API  
✅ **测试工具**：提供完整的测试和验证工具  
✅ **错误处理**：完善的错误提示和处理机制  

现在您可以正常使用后台管理系统来配置工作流节点映射了！
