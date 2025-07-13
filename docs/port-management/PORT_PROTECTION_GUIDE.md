# AIMagic 端口配置保护指南

## 🛡️ 概述

为了防止端口配置被意外修改导致的系统混乱，我们实施了多层保护机制，确保端口配置的一致性和稳定性。

## 🚨 解决的问题

### 1. Agent修改脚本问题
**问题**: 端口管理脚本可能被AI Agent或其他自动化工具意外修改
**解决方案**: 
- 文件完整性校验
- Git钩子保护
- 修改检测和警告

### 2. 硬编码端口问题
**问题**: 代码中存在硬编码的端口号，导致配置不一致
**解决方案**:
- 自动检测硬编码端口
- 使用环境变量替代硬编码
- 配置文件集中管理

## 🔧 保护机制

### 1. 文件完整性保护
**工具**: `scripts/protect-port-config.js`

**功能**:
- 生成和验证文件MD5校验和
- 检测端口管理脚本的修改
- 自动发现硬编码端口问题

**使用方法**:
```bash
# 检查文件完整性和硬编码端口
node scripts/protect-port-config.js check

# 仅检查硬编码端口
node scripts/protect-port-config.js hardcode

# 更新校验和基线
node scripts/protect-port-config.js update

# 自动修复硬编码端口
node scripts/protect-port-config.js fix
```

### 2. 配置同步保护
**工具**: `scripts/sync-port-config.js`

**功能**:
- 验证所有配置文件的端口一致性
- 同步环境变量文件
- 检查Vite配置文件
- 验证package.json脚本

**使用方法**:
```bash
# 同步所有配置文件
node scripts/sync-port-config.js sync

# 验证配置一致性
node scripts/sync-port-config.js validate

# 显示当前配置状态
node scripts/sync-port-config.js status
```

### 3. Git钩子保护
**工具**: `scripts/install-git-hooks.js`

**功能**:
- pre-commit钩子：提交前检查端口配置
- commit-msg钩子：要求端口配置修改说明
- 防止意外提交有问题的配置

**使用方法**:
```bash
# 安装Git钩子
node scripts/install-git-hooks.js install

# 检查钩子状态
node scripts/install-git-hooks.js status

# 卸载钩子
node scripts/install-git-hooks.js uninstall
```

## 📁 受保护的文件

### 核心配置文件
- `port-config.json` - 主端口配置文件
- `.env.example` - 环境变量模板

### 端口管理脚本
- `scripts/port-manager.js` - 端口管理核心工具
- `scripts/start-with-port-management.js` - 启动管理器
- `start-managed.js` - 快速启动脚本
- `start-managed.bat` - Windows启动脚本
- `start-managed.sh` - Linux/Mac启动脚本

### 项目配置文件
- `client/vite.config.js` - 客户端构建配置
- `admin/vite.config.js` - 管理后台构建配置
- `client/package.json` - 客户端依赖配置
- `admin/package.json` - 管理后台依赖配置
- `server/package.json` - 服务端依赖配置

## 🔍 硬编码端口检测

### 检测范围
- JavaScript/TypeScript文件中的端口号
- 配置文件中的端口设置
- 环境变量文件中的端口定义
- package.json脚本中的端口参数

### 检测规则
```javascript
// 会被检测到的硬编码端口示例
const port = 3001;  // ❌ 硬编码
app.listen(3007);   // ❌ 硬编码
fetch('http://localhost:3003/api'); // ❌ 硬编码

// 推荐的做法
const port = process.env.PORT || 3001;  // ✅ 使用环境变量
app.listen(process.env.SERVER_PORT);    // ✅ 使用环境变量
fetch(`${process.env.API_BASE_URL}/api`); // ✅ 使用环境变量
```

## ⚠️ 警告和错误处理

### 文件修改警告
当检测到端口管理脚本被修改时：
```
⚠️  警告: 端口管理脚本已被修改!
文件: scripts/port-manager.js
预期MD5: abc123...
实际MD5: def456...

请检查修改是否为预期行为。
如果修改是正确的，请运行: node scripts/protect-port-config.js update
```

### 硬编码端口警告
当检测到硬编码端口时：
```
🚨 发现硬编码端口:
文件: client/src/api/config.js
行号: 15
内容: const API_URL = 'http://localhost:3007'

建议修改为: const API_URL = process.env.VITE_API_URL
```

### 配置不一致错误
当配置文件不一致时：
```
❌ 端口配置不一致:
port-config.json: client.port = 3001
client/vite.config.js: server.port = 3000

请运行同步命令: node scripts/sync-port-config.js sync
```

## 🔄 自动修复功能

### 硬编码端口修复
```bash
# 自动修复硬编码端口
node scripts/protect-port-config.js fix
```

修复规则：
- 将硬编码端口替换为环境变量
- 更新相关的环境变量文件
- 保持代码功能不变

### 配置同步修复
```bash
# 自动同步配置文件
node scripts/sync-port-config.js sync
```

同步内容：
- 更新Vite配置文件的端口设置
- 同步环境变量文件
- 更新package.json脚本中的端口参数

## 📋 最佳实践

### 开发规范
1. **避免硬编码端口**: 始终使用环境变量
2. **定期检查**: 定期运行保护脚本检查配置
3. **提交前验证**: 确保Git钩子正常工作
4. **文档更新**: 端口配置变更时更新相关文档

### 团队协作
1. **统一工具**: 所有团队成员使用相同的端口管理工具
2. **配置共享**: 确保所有人使用相同的端口配置
3. **变更通知**: 端口配置变更时及时通知团队
4. **问题反馈**: 发现问题及时反馈和修复

## 🔗 相关文档

- [端口管理指南](./PORT_MANAGER_GUIDE.md)
- [项目启动指南](../../STARTUP_GUIDE.md)
- [部署指南](../../client/docs/DEPLOYMENT_GUIDE.md)

---

**维护者**: AIMagic 开发团队  
**最后更新**: 2024年
