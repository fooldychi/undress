# 问题排查指南

## 🔍 问题1：前端页面空白

### 可能原因
1. **开发服务器未启动**
2. **JavaScript编译错误**
3. **浏览器缓存问题**
4. **端口冲突**

### 解决步骤

#### 1. 检查开发服务器
```bash
# 启动开发服务器
npm run dev

# 检查端口占用
netstat -ano | findstr :3000
```

#### 2. 检查浏览器控制台
- 打开浏览器开发者工具 (F12)
- 查看Console标签页是否有错误
- 查看Network标签页检查资源加载

#### 3. 清除浏览器缓存
- 硬刷新：Ctrl + F5
- 清除缓存和Cookie
- 尝试无痕模式

#### 4. 检查编译错误
```bash
# 查看终端输出
# 检查是否有编译错误或警告
```

## 🔧 问题2：ComfyUI API调用失败

### 两步API流程
1. **第一步**: `POST /api/upload/image` - 上传图片
2. **第二步**: `POST /api/prompt` - 提交工作流

### 常见问题

#### API地址错误
- ❌ 错误：`https://rihblhikbh-8188.cnb.run`
- ✅ 正确：`https://dzqgp58z0s-8188.cnb.run`

#### 第一步：图片上传失败
```javascript
// 检查上传请求格式
const formData = new FormData()
formData.append('image', blob, filename)
formData.append('type', 'input')
formData.append('subfolder', '')

fetch('https://dzqgp58z0s-8188.cnb.run/api/upload/image', {
  method: 'POST',
  body: formData
})
```

**常见错误**：
- 文件格式不支持
- 文件大小超限
- 网络连接问题
- 服务器不可用

#### 第二步：工作流提交失败
```javascript
// 检查工作流请求格式
const requestBody = {
  client_id: "abc1373d4ad648a3a81d0587fbe5534b",
  prompt: {
    "49": {
      "inputs": {
        "image": "上传后的文件名"
      },
      "class_type": "LoadImage"
    }
    // ... 其他节点
  }
}

fetch('https://dzqgp58z0s-8188.cnb.run/api/prompt', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(requestBody)
})
```

**常见错误**：
- 节点49图片文件名错误
- 工作流JSON格式错误
- client_id格式错误
- 服务器处理能力不足

## 🧪 测试工具

### 1. API测试页面
访问：`http://localhost:3000/api-test`

功能：
- 分步测试两个API
- 实时日志输出
- 完整流程验证

### 2. 调试页面
访问：`http://localhost:3000/debug`

功能：
- 连接测试
- 配置管理
- 详细日志

### 3. 配置管理
- 主页点击 "⚙️ 配置"
- 修改服务器地址
- 测试连接状态

## 🔧 快速修复

### 修复空白页面
```bash
# 1. 重启开发服务器
Ctrl + C  # 停止当前服务器
npm run dev  # 重新启动

# 2. 清除node_modules重新安装
rm -rf node_modules
npm install
npm run dev
```

### 修复API调用
1. **检查配置**：
   - 访问配置页面
   - 确认服务器地址：`https://dzqgp58z0s-8188.cnb.run`
   - 测试连接

2. **使用API测试页面**：
   - 上传测试图片
   - 分步测试API调用
   - 查看详细日志

3. **检查网络**：
   - 确认网络连接
   - 检查防火墙设置
   - 尝试直接访问API地址

## 📋 检查清单

### 前端问题
- [ ] 开发服务器正常启动
- [ ] 浏览器控制台无错误
- [ ] 网络请求正常
- [ ] 缓存已清除

### API问题
- [ ] 服务器地址正确
- [ ] 第一步上传API正常
- [ ] 第二步工作流API正常
- [ ] 节点49图片关联正确

### 配置问题
- [ ] BASE_URL设置正确
- [ ] CLIENT_ID格式正确
- [ ] 超时时间合理
- [ ] 连接测试通过

## 🆘 紧急修复

如果所有方法都失败，尝试以下步骤：

1. **完全重置**：
```bash
# 停止所有进程
# 删除node_modules
# 重新安装依赖
# 重启开发服务器
```

2. **使用备用配置**：
```javascript
// 在配置页面选择"默认配置"
// 或手动设置：
BASE_URL: 'https://dzqgp58z0s-8188.cnb.run'
CLIENT_ID: 'abc1373d4ad648a3a81d0587fbe5534b'
```

3. **检查服务器状态**：
- 访问：`https://dzqgp58z0s-8188.cnb.run/api/system_stats`
- 确认服务器在线

## 📞 获取帮助

1. **查看日志**：
   - 浏览器控制台
   - API测试页面日志
   - 调试页面输出

2. **收集信息**：
   - 错误消息
   - 网络请求详情
   - 配置信息
   - 操作步骤

3. **测试环境**：
   - 浏览器版本
   - 网络环境
   - 操作系统

---

按照这个指南，大部分问题都能得到解决！🚀
