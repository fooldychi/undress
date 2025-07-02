@echo off
chcp 65001 >nul
echo 🚀 开始部署 Imagic 项目...

:: 检查Node.js环境
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ 错误: 未找到 Node.js，请先安装 Node.js
    pause
    exit /b 1
)

:: 检查npm
npm --version >nul 2>&1
if errorlevel 1 (
    echo ❌ 错误: 未找到 npm，请先安装 npm
    pause
    exit /b 1
)

echo ✅ Node.js 环境检查通过

:: 安装依赖
echo 📦 安装项目依赖...
call npm install
if errorlevel 1 (
    echo ❌ 依赖安装失败
    pause
    exit /b 1
)

echo ✅ 依赖安装完成

:: 构建项目
echo 🔨 构建生产版本...
call npm run build
if errorlevel 1 (
    echo ❌ 构建失败
    pause
    exit /b 1
)

echo ✅ 构建完成

:: 检查dist目录
if not exist "dist" (
    echo ❌ 错误: dist 目录不存在
    pause
    exit /b 1
)

echo 📁 dist 目录内容:
dir dist

:: 创建部署包
echo 📦 创建部署包...
for /f "tokens=1-3 delims=/ " %%a in ('date /t') do set mydate=%%c%%a%%b
for /f "tokens=1-2 delims=: " %%a in ('time /t') do set mytime=%%a%%b
set mytime=%mytime: =0%
set TIMESTAMP=%mydate%_%mytime%
set DEPLOY_NAME=imagic_deploy_%TIMESTAMP%

:: 创建部署目录
if not exist "deploy" mkdir deploy
mkdir "deploy\%DEPLOY_NAME%"

:: 复制dist内容
xcopy dist\* "deploy\%DEPLOY_NAME%\" /E /I /Y

:: 复制部署相关文件
copy DEPLOYMENT.md "deploy\%DEPLOY_NAME%\"
copy proxy-server.js "deploy\%DEPLOY_NAME%\"

:: 创建简化的package.json
(
echo {
echo   "name": "imagic",
echo   "version": "1.0.0",
echo   "description": "Imagic - AI图像处理平台",
echo   "main": "proxy-server.js",
echo   "scripts": {
echo     "start": "node proxy-server.js",
echo     "proxy": "node proxy-server.js"
echo   },
echo   "dependencies": {
echo     "express": "^4.18.2",
echo     "http-proxy-middleware": "^2.0.6",
echo     "cors": "^2.8.5",
echo     "multer": "^1.4.5-lts.1",
echo     "form-data": "^4.0.0",
echo     "node-fetch": "^2.6.7"
echo   }
echo }
) > "deploy\%DEPLOY_NAME%\package.json"

:: 创建启动脚本
(
echo @echo off
echo echo 🚀 启动 Imagic 代理服务器...
echo call npm install --production
echo node proxy-server.js
echo pause
) > "deploy\%DEPLOY_NAME%\start.bat"

:: 创建Nginx配置示例
(
echo server {
echo     listen 80;
echo     server_name your-domain.com;
echo     root /path/to/imagic;
echo     index index.html;
echo.
echo     # SPA路由支持
echo     location / {
echo         try_files $uri $uri/ /index.html;
echo     }
echo.
echo     # 静态资源缓存
echo     location /assets/ {
echo         expires 1y;
echo         add_header Cache-Control "public, immutable";
echo     }
echo.
echo     # API代理（如果使用代理服务器）
echo     location /api/ {
echo         proxy_pass http://localhost:3008;
echo         proxy_set_header Host $host;
echo         proxy_set_header X-Real-IP $remote_addr;
echo         proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
echo         proxy_set_header X-Forwarded-Proto $scheme;
echo     }
echo }
) > "deploy\%DEPLOY_NAME%\nginx.conf"

echo ✅ 部署包创建完成: deploy\%DEPLOY_NAME%

:: 创建压缩包（如果有PowerShell）
powershell -command "if (Get-Command Compress-Archive -ErrorAction SilentlyContinue) { Compress-Archive -Path 'deploy\%DEPLOY_NAME%\*' -DestinationPath 'deploy\%DEPLOY_NAME%.zip' -Force; Write-Host '✅ 压缩包创建完成: deploy\%DEPLOY_NAME%.zip' }" 2>nul

echo.
echo 🎉 部署准备完成！
echo.
echo 📋 部署选项:
echo 1. 静态托管: 上传 deploy\%DEPLOY_NAME%\ 中的文件到静态托管平台
echo 2. 服务器部署: 将整个 deploy\%DEPLOY_NAME%\ 目录上传到服务器
echo 3. 使用压缩包: 下载 deploy\%DEPLOY_NAME%.zip 进行部署
echo.
echo 📖 详细部署说明请查看 DEPLOYMENT.md 文件
echo.
echo 🔗 预览地址: http://localhost:4173
echo ⚙️ 代理服务器: npm run proxy (端口 3008)
echo.
pause
