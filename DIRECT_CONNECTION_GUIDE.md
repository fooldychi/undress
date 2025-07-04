# ComfyUI 直连模式使用指南

## 🎯 概述

本项目已配置为直连模式，直接连接到ComfyUI服务器，无需代理。这要求ComfyUI服务器已经配置了正确的CORS头。

## 🔧 ComfyUI服务器配置

### 方法1：启动参数（推荐）

在启动ComfyUI时添加CORS参数：

```bash
python main.py --cors-allow-origins=http://localhost:3001,https://fooldychi.github.io
```

### 方法2：环境变量

```bash
export CORS_ALLOW_ORIGINS=http://localhost:3001,https://fooldychi.github.io
python main.py
```

### 方法3：修改源码

如果上述方法不支持，可以修改ComfyUI的源码添加CORS支持。

## 🚀 本地开发

1. **克隆项目**
   ```bash
   git clone https://github.com/fooldychi/undress.git
   cd undress
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **配置服务器地址**

   编辑 `src/config/comfyui.config.js`：
   ```javascript
   const config = {
     BASE_URL: 'https://your-comfyui-server.com',
     CLIENT_ID: 'your-client-id'
   };
   ```

4. **启动开发服务器**
   ```bash
   npm run dev
   ```

5. **访问应用**

   打开 http://localhost:3001/

## 🧪 测试连接

访问测试页面验证连接：http://localhost:3001/test-direct-connection.html

测试功能包括：
- ✅ 基本连接测试
- ✅ 图片上传测试
- ✅ 工作流提交测试

## 📱 应用配置

在应用中点击 ⚙️ 配置按钮，可以设置：

- **ComfyUI服务器地址**: 你的ComfyUI服务器URL
- **客户端ID**: 用于标识客户端的唯一ID
- **请求超时**: API请求的超时时间（秒）

## 🔍 故障排除

### 1. CORS错误

如果遇到CORS错误：
```
Access to fetch at 'xxx' from origin 'xxx' has been blocked by CORS policy
```

**解决方案**：
- 确保ComfyUI服务器启动时包含了正确的CORS参数
- 检查服务器地址是否正确
- 确认服务器正在运行

### 2. 连接超时

**可能原因**：
- 服务器地址错误
- 网络连接问题
- 服务器未运行

**解决方案**：
- 检查服务器地址
- 确认服务器状态
- 增加超时时间

### 3. 上传失败

**可能原因**：
- 图片格式不支持
- 文件过大
- 服务器存储空间不足

**解决方案**：
- 使用支持的图片格式（PNG, JPG, WEBP）
- 压缩图片大小
- 检查服务器存储空间

## 📦 生产部署

### 构建项目

```bash
npm run build:github
```

### 部署到GitHub Pages

```bash
# 切换到gh-pages分支
git checkout gh-pages

# 复制构建文件
cp -r dist/* .

# 提交并推送
git add .
git commit -m "Deploy to GitHub Pages"
git push origin gh-pages
```

## 🔗 相关链接

- **在线版本**: https://fooldychi.github.io/undress/
- **连接测试页面**: https://fooldychi.github.io/undress/test-direct-connection.html
- **GitHub仓库**: https://github.com/fooldychi/undress
- **ComfyUI官网**: https://github.com/comfyanonymous/ComfyUI

## 🎉 部署状态

✅ **已成功部署到GitHub Pages！**

- 主应用: https://fooldychi.github.io/undress/
- 测试工具: https://fooldychi.github.io/undress/test-direct-connection.html
- 部署时间: 2025年7月4日
- 版本: 直连模式 v2.0

## 📝 注意事项

1. **安全性**: 确保ComfyUI服务器的安全配置
2. **性能**: 直连模式性能最佳，延迟最低
3. **兼容性**: 需要ComfyUI支持CORS或在同域名下部署
4. **网络**: 确保客户端能够访问ComfyUI服务器

## 🆘 获取帮助

如果遇到问题：

1. 查看浏览器控制台错误信息
2. 使用测试页面验证连接
3. 检查ComfyUI服务器日志
4. 确认网络连接状态

---

**提示**: 直连模式已删除所有代理相关代码，简化了架构，提高了性能和可靠性。
