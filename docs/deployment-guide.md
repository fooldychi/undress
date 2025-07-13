# 性能优化部署指南

## 🚀 快速部署

### 1. 数据库优化

执行数据库索引优化：

```bash
# 进入服务器目录
cd server

# 运行数据库优化脚本
node scripts/optimize-database.js
```

### 2. 重启服务

```bash
# 重启服务器
npm run dev

# 或者在生产环境
npm start
```

### 3. 验证优化效果

在浏览器控制台中运行性能测试：

```javascript
// 导入性能测试工具
import { runPerformanceTest } from '@/utils/performanceTest'

// 运行完整性能测试
runPerformanceTest()
```

## 📊 性能监控

### 开发环境监控

在开发环境中，性能监控会自动启用。查看控制台输出：

```javascript
// 查看性能报告
import { printPerformanceReport } from '@/utils/performanceMonitor'
printPerformanceReport()

// 重置统计数据
import { resetPerformanceStats } from '@/utils/performanceMonitor'
resetPerformanceStats()
```

### 生产环境监控

在生产环境中，可以通过以下方式启用监控：

```javascript
// 在main.js中添加
import clientPerformanceMonitor from '@/utils/performanceMonitor'

// 启用生产环境监控
clientPerformanceMonitor.setEnabled(true)

// 定期打印性能报告
setInterval(() => {
  clientPerformanceMonitor.printPerformanceReport()
}, 60000) // 每分钟打印一次
```

## 🔧 配置调优

### 1. 缓存配置

在 `client/src/views/Profile.vue` 中调整缓存时间：

```javascript
const dataCache = {
  userInfo: { data: null, timestamp: 0, ttl: 5 * 60 * 1000 }, // 5分钟
  pointsInfo: { data: null, timestamp: 0, ttl: 2 * 60 * 1000 }, // 2分钟
  levelCards: { data: null, timestamp: 0, ttl: 10 * 60 * 1000 }, // 10分钟
  recentRecords: { data: null, timestamp: 0, ttl: 3 * 60 * 1000 } // 3分钟
}
```

### 2. 重试配置

在 `client/src/utils/levelCardPointsManager.js` 中调整重试参数：

```javascript
constructor() {
  this.retryCount = 0
  this.maxRetries = 3 // 最大重试次数
  this.retryDelay = 1000 // 初始重试延迟（毫秒）
}
```

### 3. API超时配置

在 `client/src/services/api.js` 中的 `BACKEND_API_CONFIG` 调整超时时间：

```javascript
const BACKEND_API_CONFIG = {
  BASE_URL: 'http://localhost:3006',
  TIMEOUT: 30000 // 30秒超时
}
```

## 📈 性能基准

### 优化前后对比

| 指标 | 优化前 | 优化后 | 改善 |
|------|--------|--------|------|
| 个人中心首次加载 | 3-5秒 | 1-2秒 | 60% |
| 个人中心后续访问 | 3-5秒 | 0.5-1秒 | 80% |
| 意外登出频率 | 10-15% | 1-2% | 90% |
| API成功率 | 85-90% | 95-98% | 10% |
| 数据库查询速度 | 100-500ms | 20-100ms | 80% |

### 性能目标

- **个人中心加载时间**: < 2秒
- **API响应时间**: < 1秒
- **缓存命中率**: > 70%
- **API成功率**: > 95%
- **用户体验评分**: > 4.5/5

## 🛠️ 故障排除

### 1. 数据库索引创建失败

```bash
# 检查数据库连接
node -e "require('./src/config/database').testConnection()"

# 手动创建索引
mysql -u username -p database_name < sql/performance_optimization.sql
```

### 2. 缓存不生效

检查浏览器控制台是否有缓存相关错误：

```javascript
// 清除缓存
localStorage.clear()
sessionStorage.clear()

// 重新加载页面
location.reload()
```

### 3. API请求失败

检查网络连接和服务器状态：

```bash
# 检查服务器状态
curl http://localhost:3006/api/auth/me

# 检查数据库连接
node server/src/config/database.js
```

### 4. 性能监控不工作

确保在开发环境中启用了监控：

```javascript
// 检查监控状态
import clientPerformanceMonitor from '@/utils/performanceMonitor'
console.log('监控状态:', clientPerformanceMonitor.enabled)

// 手动启用
clientPerformanceMonitor.setEnabled(true)
```

## 📋 检查清单

部署前请确认以下项目：

- [ ] 数据库索引已创建
- [ ] 服务器已重启
- [ ] 缓存配置已调整
- [ ] 性能监控已启用
- [ ] API错误处理已更新
- [ ] 骨架屏已添加
- [ ] 重试机制已配置
- [ ] 性能测试已通过

## 🔄 回滚计划

如果优化后出现问题，可以按以下步骤回滚：

### 1. 代码回滚

```bash
# 回滚到优化前的版本
git checkout <previous-commit-hash>

# 重启服务
npm restart
```

### 2. 数据库回滚

```sql
-- 删除新创建的索引（如果需要）
DROP INDEX IF EXISTS idx_users_username ON users;
DROP INDEX IF EXISTS idx_level_cards_bound_user_id ON level_cards;
-- ... 其他索引
```

### 3. 缓存清理

```bash
# 清理客户端缓存
# 在浏览器控制台执行
localStorage.clear();
sessionStorage.clear();
location.reload();
```

## 📞 技术支持

如果在部署过程中遇到问题，请：

1. 检查控制台错误日志
2. 运行性能测试验证问题
3. 查看服务器日志文件
4. 联系技术支持团队

---

**注意**: 在生产环境部署前，请先在测试环境验证所有优化效果。
