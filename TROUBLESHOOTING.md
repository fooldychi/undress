# 🔧 故障排除指南

## 🚨 空白页面问题修复

如果 https://fooldychi.github.io/undress/ 仍然显示空白页面，请按以下步骤排查：

### 1. 检查浏览器控制台

1. **打开开发者工具**：
   - Chrome/Edge: `F12` 或 `Ctrl+Shift+I`
   - Firefox: `F12` 或 `Ctrl+Shift+K`

2. **查看 Console 标签**：
   - 查找红色错误信息
   - 查找 404 错误（资源未找到）
   - 查找 CORS 错误

3. **查看 Network 标签**：
   - 刷新页面
   - 查看哪些资源加载失败（红色状态）

### 2. 常见问题和解决方案

#### 问题 1: 404 错误 - 资源未找到
```
GET https://fooldychi.github.io/undress/assets/index-xxx.js 404
```

**解决方案**：
- 等待 GitHub Actions 完成部署（通常需要 2-5 分钟）
- 检查 https://github.com/fooldychi/undress/actions 确认部署状态

#### 问题 2: 路由错误
```
Cannot GET /undress/
```

**解决方案**：
- 确认 GitHub Pages 设置正确
- Branch: `gh-pages`
- Folder: `/ (root)`

#### 问题 3: JavaScript 错误
```
Uncaught TypeError: Cannot read property 'xxx' of undefined
```

**解决方案**：
- 检查 Vue 应用是否正确初始化
- 查看是否有依赖加载失败

### 3. 手动验证步骤

#### 步骤 1: 检查 GitHub Pages 状态
1. 访问 https://github.com/fooldychi/undress/settings/pages
2. 确认状态为 "Your site is published at..."
3. 如果显示错误，重新保存设置

#### 步骤 2: 检查 gh-pages 分支
1. 访问 https://github.com/fooldychi/undress/tree/gh-pages
2. 确认分支存在且包含构建文件
3. 检查 index.html 是否存在

#### 步骤 3: 强制刷新
1. 清除浏览器缓存：`Ctrl+Shift+R` (Windows) 或 `Cmd+Shift+R` (Mac)
2. 或者使用无痕/隐私模式访问

### 4. 应急解决方案

如果问题持续存在，可以尝试以下方案：

#### 方案 A: 重新触发部署
```bash
# 在本地项目目录执行
git commit --allow-empty -m "trigger deployment"
git push origin main
```

#### 方案 B: 手动部署到 gh-pages
```bash
# 构建项目
npm run build:github

# 切换到 gh-pages 分支
git checkout -b gh-pages

# 复制构建文件
cp -r dist/* .

# 提交并推送
git add .
git commit -m "manual deployment"
git push origin gh-pages
```

### 5. 联系支持

如果以上方法都无效，请提供以下信息：

1. **浏览器控制台错误截图**
2. **GitHub Actions 日志**
3. **访问的具体 URL**
4. **浏览器和版本信息**

### 6. 预期结果

网站正常工作时，你应该看到：

- 🏠 **主页**: 显示三个功能卡片
- 🎨 **暗色主题**: 深色背景和现代化 UI
- 📱 **响应式设计**: 在移动设备上正常显示
- 🔄 **功能按钮**: 一键换衣、极速换脸、文生图

### 7. 性能优化

网站加载慢的解决方案：

1. **启用 CDN**: GitHub Pages 自动提供 CDN
2. **压缩资源**: 已在构建时自动压缩
3. **懒加载**: 路由组件已配置懒加载

## ✅ 修复确认

修复完成的标志：
- ✅ 页面不再空白
- ✅ 可以看到 Imagic 主页
- ✅ 三个功能卡片正常显示
- ✅ 点击功能卡片可以正常跳转

如果看到以上内容，说明部署成功！🎉
