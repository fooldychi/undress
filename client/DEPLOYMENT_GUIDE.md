# GitHub Pages 部署指南

## 自动部署（推荐）

### 方法 1: 使用 npm 脚本
```bash
cd client
npm run deploy:github
```

### 方法 2: 使用批处理文件（Windows）
```bash
cd client
deploy-to-github.bat
```

### 方法 3: 使用 PowerShell 脚本
```powershell
cd client
powershell -ExecutionPolicy Bypass -File deploy-to-github.ps1
```

## 手动部署步骤

如果自动部署脚本无法运行，请按照以下步骤手动部署：

### 1. 构建项目
```bash
cd client
npm run build:github
```

### 2. 进入构建目录
```bash
cd dist
```

### 3. 初始化 Git 仓库
```bash
git init
git checkout -b main
```

### 4. 添加所有文件
```bash
git add -A
```

### 5. 提交更改
```bash
git commit -m "deploy: GitHub Pages"
```

### 6. 推送到 GitHub Pages
```bash
git push -f git@github.com:fooldychi/undress.git main:gh-pages
```

### 7. 返回上级目录
```bash
cd ..
```

## 部署后访问

部署成功后，网站将在以下地址可用：

- **GitHub Pages**: https://fooldychi.github.io/undress/
- **自定义域名**: https://undress.icomfy.co/

## 故障排除

### SSH 密钥问题
如果推送时出现权限错误，请确保：
1. 已在 GitHub 账户中添加 SSH 密钥
2. SSH 密钥已正确配置
3. 可以使用以下命令测试 SSH 连接：
   ```bash
   ssh -T git@github.com
   ```

### 构建失败
如果构建失败，请检查：
1. Node.js 和 npm 是否已安装
2. 依赖包是否已安装：`npm install`
3. 环境变量是否正确配置

### 域名配置
确保 `client/public/CNAME` 文件包含正确的域名：
```
undress.icomfy.co
```

## 配置文件说明

### 环境配置
- `client/.env.production`: 生产环境配置
- `client/vite.config.js`: Vite 构建配置

### 部署配置
- `client/scripts/deploy.js`: Node.js 部署脚本
- `client/deploy-to-github.bat`: Windows 批处理部署脚本
- `client/deploy-to-github.ps1`: PowerShell 部署脚本

## 注意事项

1. 确保在 `client` 目录下运行部署命令
2. 部署前会自动构建项目
3. 部署使用强制推送 (`-f`)，会覆盖远程分支
4. GitHub Pages 可能需要几分钟才能更新
5. 自定义域名需要在 GitHub 仓库设置中配置
