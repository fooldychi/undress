#!/bin/bash

# AIMagic 后端服务部署脚本
# 服务器: 114.132.50.71
# 作者: AIMagic Team
# 版本: 1.0.0

set -e  # 遇到错误立即退出

echo "========================================"
echo "    AIMagic 后端服务部署脚本 v1.0.0"
echo "========================================"
echo "部署时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo "服务器: 114.132.50.71"
echo "========================================"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查Node.js版本
check_node_version() {
    log_info "检查Node.js版本..."
    if ! command -v node &> /dev/null; then
        log_error "Node.js 未安装，请先安装 Node.js >= 16.0.0"
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2)
    REQUIRED_VERSION="16.0.0"
    
    if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
        log_error "Node.js 版本过低，当前版本: $NODE_VERSION，要求版本: >= $REQUIRED_VERSION"
        exit 1
    fi
    
    log_success "Node.js 版本检查通过: $NODE_VERSION"
}

# 检查PM2
check_pm2() {
    log_info "检查PM2..."
    if ! command -v pm2 &> /dev/null; then
        log_warning "PM2 未安装，正在安装..."
        npm install -g pm2
        log_success "PM2 安装完成"
    else
        log_success "PM2 已安装: $(pm2 -v)"
    fi
}

# 创建必要目录
create_directories() {
    log_info "创建必要目录..."
    mkdir -p logs
    mkdir -p uploads/images
    mkdir -p uploads/temp
    chmod 755 logs uploads
    chmod 755 uploads/images uploads/temp
    log_success "目录创建完成"
}

# 安装依赖
install_dependencies() {
    log_info "安装生产依赖..."
    if [ -f "package-lock.json" ]; then
        npm ci --only=production
    else
        npm install --only=production
    fi
    log_success "依赖安装完成"
}

# 数据库初始化
init_database() {
    log_info "初始化数据库配置..."
    if [ -f "src/scripts/init-deployment-config.js" ]; then
        node src/scripts/init-deployment-config.js
        log_success "数据库配置初始化完成"
    else
        log_warning "数据库初始化脚本不存在，跳过此步骤"
    fi
}

# 停止现有服务
stop_existing_service() {
    log_info "停止现有服务..."
    if pm2 list | grep -q "aimagic-server"; then
        pm2 stop aimagic-server
        pm2 delete aimagic-server
        log_success "现有服务已停止"
    else
        log_info "没有运行中的服务"
    fi
}

# 启动服务
start_service() {
    log_info "启动生产服务..."
    pm2 start ecosystem.config.js --env production
    pm2 save
    log_success "服务启动完成"
}

# 检查服务状态
check_service_status() {
    log_info "检查服务状态..."
    sleep 3
    
    if pm2 list | grep -q "aimagic-server.*online"; then
        log_success "服务运行正常"
        pm2 show aimagic-server
    else
        log_error "服务启动失败"
        pm2 logs aimagic-server --lines 20
        exit 1
    fi
}

# 设置开机自启
setup_startup() {
    log_info "设置开机自启..."
    pm2 startup
    pm2 save
    log_success "开机自启设置完成"
}

# 主部署流程
main() {
    log_info "开始部署流程..."
    
    # 检查环境
    check_node_version
    check_pm2
    
    # 准备环境
    create_directories
    
    # 安装依赖
    install_dependencies
    
    # 初始化数据库
    init_database
    
    # 停止现有服务
    stop_existing_service
    
    # 启动新服务
    start_service
    
    # 检查服务状态
    check_service_status
    
    # 设置开机自启
    setup_startup
    
    echo "========================================"
    log_success "🎉 部署完成！"
    echo "========================================"
    echo "🌐 服务地址: http://114.132.50.71:3007"
    echo "📊 监控命令: pm2 monit"
    echo "📋 查看日志: pm2 logs aimagic-server"
    echo "🔄 重启服务: pm2 restart aimagic-server"
    echo "⏹️  停止服务: pm2 stop aimagic-server"
    echo "========================================"
}

# 错误处理
trap 'log_error "部署过程中发生错误，请检查日志"; exit 1' ERR

# 执行主流程
main "$@"
