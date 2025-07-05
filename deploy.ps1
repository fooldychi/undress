# 部署脚本 - 修复自定义域名问题
Write-Host "开始部署到 GitHub Pages..." -ForegroundColor Green

# 确保在正确的目录
Set-Location $PSScriptRoot

# 构建项目
Write-Host "构建项目..." -ForegroundColor Yellow
npm run build

# 检查构建是否成功
if (-not (Test-Path "dist/index.html")) {
    Write-Host "构建失败！" -ForegroundColor Red
    exit 1
}

# 添加更改到git
Write-Host "添加文件到git..." -ForegroundColor Yellow
git add .
git commit -m "Fix base path for custom domain - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"

# 推送到main分支
Write-Host "推送到main分支..." -ForegroundColor Yellow
git push origin main

# 部署到gh-pages
Write-Host "部署到gh-pages分支..." -ForegroundColor Yellow
git subtree push --prefix dist origin gh-pages

Write-Host "部署完成！" -ForegroundColor Green
Write-Host "请等待几分钟让GitHub Pages更新..." -ForegroundColor Cyan
