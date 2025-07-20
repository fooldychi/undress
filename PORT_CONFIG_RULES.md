# AIMagic 项目端口配置规则

## 📋 标准端口分配

| 服务 | 端口 | 描述 | URL |
|------|------|------|-----|
| 客户端前端 | 3001 | 用户前端界面 | http://localhost:3001 |
| 后台管理系统 | 3003 | 管理员界面 | http://localhost:3003 |
| 后端API服务 | 3007 | 服务器API | http://localhost:3007 |

## 🔒 端口配置锁定机制

### 配置文件位置
- **主配置**: `port-config.json` - 项目端口配置的唯一真实来源
- **环境配置**: `server/.env` - 服务器环境变量
- **前端配置**: `client/vite.config.js`, `admin/vite.config.js` - Vite开发服务器配置

### 配置管理工具
```bash
# 检查端口配置一致性
node scripts/port-config-manager.js check

# 自动修复端口配置问题
node scripts/port-config-manager.js fix

# 生成详细配置报告
node scripts/port-config-manager.js report

# 检查端口可用性
node scripts/port-config-manager.js availability
```

## 📝 端口配置修改流程

### ⚠️ 重要原则
1. **禁止随意修改端口配置**
2. **所有端口变更必须经过团队讨论**
3. **修改前必须运行配置检查**
4. **修改后必须验证所有服务正常运行**

### 正确的修改流程

#### 1. 提出修改需求
- 在团队会议或聊天群中提出端口修改需求
- 说明修改原因（端口冲突、部署需求等）
- 获得团队成员同意

#### 2. 修改配置
```bash
# 1. 修改主配置文件
vim port-config.json

# 2. 运行自动修复，同步所有配置文件
node scripts/port-config-manager.js fix

# 3. 验证配置一致性
node scripts/port-config-manager.js check
```

#### 3. 测试验证
```bash
# 启动所有服务，确保正常运行
npm run start:all

# 或分别启动各服务
cd client && npm run dev    # 应该在新端口启动
cd admin && npm run dev     # 应该在新端口启动  
cd server && npm start      # 应该在新端口启动
```

#### 4. 提交变更
```bash
# 提交所有相关文件
git add port-config.json server/.env client/vite.config.js admin/vite.config.js
git add PORT_CONFIG_CHANGELOG.md
git commit -m "feat: 更新端口配置 - [原因]"
```

## 🚫 禁止的操作

### ❌ 直接修改配置文件
```bash
# 错误做法 - 直接修改单个配置文件
vim server/.env              # ❌ 不要这样做
vim client/vite.config.js    # ❌ 不要这样做
```

### ❌ 临时端口修改
```bash
# 错误做法 - 临时修改端口启动
npm run dev -- --port 3002   # ❌ 不要这样做
PORT=3008 npm start          # ❌ 不要这样做
```

### ❌ 跳过验证步骤
- 修改后不运行配置检查
- 不测试所有服务是否正常启动
- 不更新文档和日志

## 🔧 故障排除

### 端口被占用
```bash
# 检查端口占用情况
node scripts/port-config-manager.js availability

# Windows 查看端口占用
netstat -ano | findstr :3007

# 终止占用进程
taskkill /PID <进程ID> /F
```

### 配置不一致
```bash
# 检查配置问题
node scripts/port-config-manager.js check

# 自动修复
node scripts/port-config-manager.js fix

# 手动检查配置文件
cat server/.env
cat client/vite.config.js
cat admin/vite.config.js
```

### 服务启动失败
1. 检查端口是否被占用
2. 验证配置文件语法正确
3. 检查环境变量是否正确设置
4. 查看服务启动日志

## 📊 监控和日志

### 配置变更日志
- **位置**: `PORT_CONFIG_CHANGELOG.md`
- **内容**: 记录所有端口配置变更的时间、原因、修改内容
- **维护**: 自动生成，无需手动编辑

### 定期检查
建议每周运行一次配置检查：
```bash
# 添加到 crontab 或定期任务
node scripts/port-config-manager.js check
```

## 🤝 团队协作规范

### 开发环境设置
1. 克隆项目后，首先运行配置检查
2. 如有配置问题，运行自动修复
3. 确保所有服务在标准端口正常启动

### 代码审查要求
- PR 中如包含端口配置修改，必须说明原因
- 审查者需要验证配置的一致性
- 合并前必须确保所有配置检查通过

### 部署注意事项
- 生产环境可能使用不同端口
- 部署脚本需要正确处理端口配置
- 环境变量优先级高于配置文件

## 📞 联系和支持

如遇到端口配置相关问题：
1. 首先查阅本文档
2. 运行诊断工具
3. 在团队群中寻求帮助
4. 记录问题和解决方案，完善文档

---

**最后更新**: 2025-01-20  
**维护者**: AIMagic 开发团队
