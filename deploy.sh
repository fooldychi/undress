#!/bin/bash

# Imagic 部署脚本
echo "🚀 开始部署 Imagic 项目..."

# 检查Node.js环境
if ! command -v node &> /dev/null; then
    echo "❌ 错误: 未找到 Node.js，请先安装 Node.js"
    exit 1
fi

# 检查npm
if ! command -v npm &> /dev/null; then
    echo "❌ 错误: 未找到 npm，请先安装 npm"
    exit 1
fi

echo "✅ Node.js 环境检查通过"

# 安装依赖
echo "📦 安装项目依赖..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ 依赖安装失败"
    exit 1
fi

echo "✅ 依赖安装完成"

# 构建项目
echo "🔨 构建生产版本..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ 构建失败"
    exit 1
fi

echo "✅ 构建完成"

# 检查dist目录
if [ ! -d "dist" ]; then
    echo "❌ 错误: dist 目录不存在"
    exit 1
fi

echo "📁 dist 目录内容:"
ls -la dist/

# 创建部署包
echo "📦 创建部署包..."
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DEPLOY_NAME="imagic_deploy_${TIMESTAMP}"

# 创建部署目录
mkdir -p "deploy/${DEPLOY_NAME}"

# 复制dist内容
cp -r dist/* "deploy/${DEPLOY_NAME}/"

# 复制部署相关文件
cp DEPLOYMENT.md "deploy/${DEPLOY_NAME}/"
cp proxy-server.js "deploy/${DEPLOY_NAME}/"
cp package.json "deploy/${DEPLOY_NAME}/"

# 创建简化的package.json用于生产环境
cat > "deploy/${DEPLOY_NAME}/package.json" << EOF
{
  "name": "imagic",
  "version": "1.0.0",
  "description": "Imagic - AI图像处理平台",
  "main": "proxy-server.js",
  "scripts": {
    "start": "node proxy-server.js",
    "proxy": "node proxy-server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "http-proxy-middleware": "^2.0.6",
    "cors": "^2.8.5",
    "multer": "^1.4.5-lts.1",
    "form-data": "^4.0.0",
    "node-fetch": "^2.6.7"
  }
}
EOF

# 创建启动脚本
cat > "deploy/${DEPLOY_NAME}/start.sh" << 'EOF'
#!/bin/bash
echo "🚀 启动 Imagic 代理服务器..."
npm install --production
node proxy-server.js
EOF

chmod +x "deploy/${DEPLOY_NAME}/start.sh"

# 创建Nginx配置示例
cat > "deploy/${DEPLOY_NAME}/nginx.conf" << 'EOF'
server {
    listen 80;
    server_name your-domain.com;
    root /path/to/imagic;
    index index.html;

    # SPA路由支持
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 静态资源缓存
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # API代理（如果使用代理服务器）
    location /api/ {
        proxy_pass http://localhost:3008;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

echo "✅ 部署包创建完成: deploy/${DEPLOY_NAME}"

# 创建压缩包
if command -v zip &> /dev/null; then
    echo "📦 创建压缩包..."
    cd deploy
    zip -r "${DEPLOY_NAME}.zip" "${DEPLOY_NAME}/"
    cd ..
    echo "✅ 压缩包创建完成: deploy/${DEPLOY_NAME}.zip"
fi

echo ""
echo "🎉 部署准备完成！"
echo ""
echo "📋 部署选项:"
echo "1. 静态托管: 上传 deploy/${DEPLOY_NAME}/ 中的文件到静态托管平台"
echo "2. 服务器部署: 将整个 deploy/${DEPLOY_NAME}/ 目录上传到服务器"
echo "3. 使用压缩包: 下载 deploy/${DEPLOY_NAME}.zip 进行部署"
echo ""
echo "📖 详细部署说明请查看 DEPLOYMENT.md 文件"
echo ""
echo "🔗 预览地址: http://localhost:4173"
echo "⚙️ 代理服务器: npm run proxy (端口 3008)"
