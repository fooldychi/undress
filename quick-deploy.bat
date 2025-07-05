@echo off
echo 开始快速部署...

echo 添加文件到git...
git add .

echo 提交更改...
git commit -m "Fix base path for custom domain"

echo 推送到main分支...
git push origin main

echo 部署到gh-pages...
git subtree push --prefix dist origin gh-pages

echo 部署完成！
pause
