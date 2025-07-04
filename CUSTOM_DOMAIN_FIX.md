# 自定义域名配置修复说明

## 问题描述

使用自定义域名 `https://undress.icomfy.co/` 访问网站时出现"加载失败"错误，页面无法正常显示。

## 问题原因

1. **基础路径配置错误**：Vite配置中使用了 `/undress/` 作为基础路径，但自定义域名应该使用 `/`
2. **资源引用路径错误**：HTML文件中的资源路径仍然包含 `/undress/` 前缀
3. **缺少CNAME文件**：GitHub Pages需要CNAME文件来配置自定义域名
4. **404页面路径错误**：404重定向逻辑仍然使用旧的路径结构

## 修复方案

### 1. 更新Vite配置

**文件**: `vite.config.js`

```javascript
// 修改前
base: mode === 'production' ? '/undress/' : '/',

// 修改后  
base: mode === 'production' ? '/' : '/',
```

### 2. 修复HTML文件中的资源路径

**文件**: `index.html`

```html
<!-- 修改前 -->
<a href="/undress/test.html">诊断页面</a>

<!-- 修改后 -->
<a href="/test.html">诊断页面</a>
```

### 3. 创建CNAME文件

**文件**: `public/CNAME`

```
undress.icomfy.co
```

### 4. 修复404页面配置

**文件**: `public/404.html`

```javascript
// 修改前
const path = window.location.pathname.replace('/undress', '');
window.location.replace('/undress/' + '?redirect=' + encodeURIComponent(path + query + hash));

// 修改后
const path = window.location.pathname;
window.location.replace('/' + '?redirect=' + encodeURIComponent(path + query + hash));
```

### 5. 修复部署脚本

**文件**: `scripts/deploy.js`

```javascript
// 添加分支创建命令
execSync('git checkout -b main', { stdio: 'inherit' })
```

## 验证步骤

### 1. 访问测试

- ✅ 主域名：https://undress.icomfy.co/
- ✅ GitHub Pages：https://fooldychi.github.io/undress/
- ✅ 测试页面：https://undress.icomfy.co/domain-test.html

### 2. 功能测试

- ✅ 页面加载正常
- ✅ 资源文件加载正常
- ✅ 路由跳转正常
- ✅ API连接正常

### 3. DNS配置验证

```bash
# 检查DNS解析
nslookup undress.icomfy.co

# 检查CNAME记录
dig undress.icomfy.co CNAME
```

## 部署流程

1. **构建项目**
   ```bash
   npm run build
   ```

2. **部署到GitHub Pages**
   ```bash
   npm run deploy
   ```

3. **等待DNS传播**
   - 通常需要5-10分钟
   - 最长可能需要24小时

## 注意事项

### DNS配置要求

确保域名DNS配置正确：

```
# 对于子域名 undress.icomfy.co
CNAME undress fooldychi.github.io.
```

### HTTPS证书

- GitHub Pages会自动为自定义域名提供HTTPS证书
- 证书生成可能需要几分钟时间
- 如果证书生成失败，可以在仓库Settings > Pages中重新配置

### 缓存清理

如果修改后仍然无法访问，尝试：

1. 清除浏览器缓存
2. 使用无痕模式访问
3. 等待DNS缓存过期

## 测试工具

### 域名测试页面

访问 `https://undress.icomfy.co/domain-test.html` 可以：

- 查看当前访问信息
- 测试资源加载状态
- 验证API连接
- 检查路由功能
- 确认DNS解析状态

### 手动测试命令

```bash
# 测试域名解析
curl -I https://undress.icomfy.co/

# 测试资源加载
curl -I https://undress.icomfy.co/favicon.ico

# 测试API连接
curl -I https://undress.icomfy.co/api/test
```

## 故障排除

### 常见问题

1. **页面显示404**
   - 检查CNAME文件是否正确
   - 确认DNS配置是否生效

2. **资源加载失败**
   - 检查基础路径配置
   - 确认构建输出是否正确

3. **API连接失败**
   - 检查CORS配置
   - 确认API服务器状态

### 联系支持

如果问题仍然存在，请：

1. 检查浏览器控制台错误信息
2. 访问域名测试页面获取详细信息
3. 提供具体的错误截图和日志

## 更新日志

- **2024-07-04**: 修复自定义域名配置，更新基础路径为 `/`
- **2024-07-04**: 添加CNAME文件和域名测试页面
- **2024-07-04**: 修复部署脚本和404页面配置
