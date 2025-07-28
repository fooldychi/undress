#!/usr/bin/env node

/**
 * GitHub Pages 部署脚本
 * 用于将构建后的静态文件部署到 GitHub Pages
 */

import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

const REPO_URL = 'git@github.com:fooldychi/undress.git'
const BRANCH = 'gh-pages'

console.log('🚀 开始部署到 GitHub Pages...')

try {
  // 1. 构建项目
  console.log('📦 构建项目...')
  execSync('npm run build', { stdio: 'inherit' })

  // 2. 进入构建目录
  process.chdir('dist')

  // 3. 初始化 git 仓库
  console.log('🔧 初始化 Git 仓库...')
  execSync('git init', { stdio: 'inherit' })

  // 检查是否已存在main分支
  try {
    execSync('git checkout main', { stdio: 'inherit' })
  } catch (error) {
    execSync('git checkout -b main', { stdio: 'inherit' })
  }

  execSync('git add -A', { stdio: 'inherit' })
  execSync('git commit -m "deploy: GitHub Pages"', { stdio: 'inherit' })

  // 4. 推送到 gh-pages 分支
  console.log('📤 推送到 GitHub Pages...')
  execSync(`git push -f ${REPO_URL} main:${BRANCH}`, { stdio: 'inherit' })

  console.log('✅ 部署成功！')
  console.log('🌐 网站将在几分钟后可用：')
  console.log('   - 自定义域名: https://undress.icomfy.co/')
  console.log('   - GitHub Pages: https://fooldychi.github.io/undress/')
  console.log('   - 域名测试页面: https://undress.icomfy.co/domain-test.html')

} catch (error) {
  console.error('❌ 部署失败:', error.message)
  process.exit(1)
}
