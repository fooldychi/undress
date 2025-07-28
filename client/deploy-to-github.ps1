# GitHub Pages 部署脚本 (PowerShell)
# 用于将构建后的静态文件部署到 GitHub Pages

Write-Host "🚀 开始部署到 GitHub Pages..." -ForegroundColor Green

try {
    # 1. 确保在 client 目录
    if (!(Test-Path "package.json")) {
        Write-Host "❌ 请在 client 目录下运行此脚本" -ForegroundColor Red
        exit 1
    }

    # 2. 检查 dist 目录是否存在
    if (!(Test-Path "dist")) {
        Write-Host "📦 构建项目..." -ForegroundColor Yellow
        # 如果有 npm，使用 npm build
        if (Get-Command npm -ErrorAction SilentlyContinue) {
            npm run build:github
        } else {
            Write-Host "❌ 未找到 npm，请先安装 Node.js 和 npm" -ForegroundColor Red
            exit 1
        }
    }

    # 3. 进入 dist 目录
    Push-Location dist

    # 4. 初始化 git 仓库（如果不存在）
    if (!(Test-Path ".git")) {
        Write-Host "🔧 初始化 Git 仓库..." -ForegroundColor Yellow
        git init
        git checkout -b main
    }

    # 5. 添加所有文件
    Write-Host "📁 添加文件..." -ForegroundColor Yellow
    git add -A

    # 6. 提交更改
    Write-Host "💾 提交更改..." -ForegroundColor Yellow
    git commit -m "deploy: GitHub Pages $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"

    # 7. 推送到 GitHub Pages
    Write-Host "📤 推送到 GitHub Pages..." -ForegroundColor Yellow
    git push -f git@github.com:fooldychi/undress.git main:gh-pages

    # 8. 返回上级目录
    Pop-Location

    Write-Host "✅ 部署成功！" -ForegroundColor Green
    Write-Host "🌐 网站将在几分钟后可用：" -ForegroundColor Cyan
    Write-Host "   - GitHub Pages: https://fooldychi.github.io/undress/" -ForegroundColor Cyan
    Write-Host "   - 自定义域名: https://undress.icomfy.co/" -ForegroundColor Cyan

} catch {
    Write-Host "❌ 部署失败: $($_.Exception.Message)" -ForegroundColor Red
    if (Get-Location | Select-Object -ExpandProperty Path | Select-String "dist") {
        Pop-Location
    }
    exit 1
}
