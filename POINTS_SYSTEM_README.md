# 💎 体验点系统说明

## 🎯 系统概述

体验点系统是一个完整的用户积分管理系统，用于控制AI图像生成功能的使用频次，并提供付费充值功能。

## 📋 功能特性

### 🆓 免费体验
- **每日60点**: 每天0点自动重置为60点免费体验点
- **每次消耗20点**: 每次成功生成图片消耗20点
- **每日3次**: 免费用户每天可以生成3次图片

### 💳 付费充值
- **体验卡**: 9.9元购买500体验点
- **永久有效**: 购买的点数不会过期
- **扫码支付**: 支持微信支付和支付宝

### 📊 智能管理
- **自动重置**: 每日0点自动重置免费点数
- **点数保留**: 购买的点数在重置时会保留
- **使用记录**: 完整的购买和使用历史记录

## 🔧 技术实现

### 核心组件

1. **PointsManager** (`src/utils/pointsManager.js`)
   - 体验点核心管理逻辑
   - 本地存储管理
   - 每日重置机制

2. **PointsDisplay** (`src/components/PointsDisplay.vue`)
   - 体验点显示组件
   - 购买体验卡界面
   - 支付流程管理

3. **服务集成** (`src/services/comfyui.js`)
   - 生成前检查点数
   - 成功后消耗点数
   - 错误处理

### 数据存储

使用 `localStorage` 存储以下数据：
- `user_points`: 当前点数
- `last_reset_date`: 最后重置日期
- `total_points_used`: 今日已使用点数
- `purchase_history`: 购买历史记录

## 🎮 使用方式

### 用户界面

1. **主页显示**: 在所有页面顶部显示当前点数
2. **点数不足**: 自动显示充值按钮
3. **购买流程**: 
   - 选择支付方式
   - 生成付款二维码
   - 扫码支付
   - 自动到账

### 开发者接口

```javascript
import pointsManager from './src/utils/pointsManager.js'

// 检查是否有足够点数
if (pointsManager.hasEnoughPoints()) {
  // 执行生成操作
  const result = await generateImage()
  
  // 成功后消耗点数
  const pointsResult = pointsManager.consumePoints()
  console.log(`消耗${pointsResult.consumed}点，剩余${pointsResult.remaining}点`)
}

// 获取点数状态
const status = pointsManager.getPointsStatus()
console.log('当前点数:', status.current)
console.log('今日剩余:', status.dailyRemaining)
```

## 🧪 测试功能

访问测试页面进行功能验证：
- **本地测试**: http://localhost:3001/test-points-system.html
- **在线测试**: https://fooldychi.github.io/undress/test-points-system.html

### 测试场景

1. **新用户**: 获得60点免费体验点
2. **正常使用**: 每次生成消耗20点
3. **点数不足**: 显示充值提示
4. **购买体验卡**: 获得500点
5. **每日重置**: 免费点数重置，购买点数保留

## 📱 用户体验

### 界面设计
- **简洁明了**: 清晰显示当前点数和剩余次数
- **一键充值**: 点数不足时一键跳转充值
- **实时更新**: 生成后立即更新点数显示

### 支付流程
1. 点击"充值体验卡"
2. 选择支付方式（微信/支付宝）
3. 生成付款二维码
4. 扫码支付
5. 自动到账并更新显示

## 🔒 安全考虑

### 数据安全
- **本地存储**: 所有数据存储在用户本地
- **无敏感信息**: 不存储支付密码等敏感数据
- **防篡改**: 使用时间戳和校验机制

### 业务安全
- **防刷**: 每次生成前检查点数
- **防作弊**: 点数消耗在成功生成后进行
- **容错**: 失败时不消耗点数

## 🚀 部署配置

### 环境变量
```bash
# 可选：自定义配置
VITE_DAILY_FREE_POINTS=60        # 每日免费点数
VITE_GENERATION_COST=20          # 每次生成消耗
VITE_EXPERIENCE_CARD_POINTS=500  # 体验卡点数
VITE_EXPERIENCE_CARD_PRICE=9.9   # 体验卡价格
```

### 生产部署
1. 构建项目: `npm run build:github`
2. 部署到GitHub Pages
3. 配置支付接口（如需真实支付）

## 📈 数据统计

系统自动记录：
- 每日使用次数
- 购买记录
- 用户行为数据

可用于：
- 用户行为分析
- 收入统计
- 功能优化

## 🔄 更新日志

### v1.0.0 (2025-07-04)
- ✅ 基础体验点系统
- ✅ 每日免费点数重置
- ✅ 体验卡购买功能
- ✅ 支付流程界面
- ✅ 完整的测试工具

## 🆘 常见问题

### Q: 点数什么时候重置？
A: 每天0点自动重置免费点数，购买的点数永久有效。

### Q: 支付失败怎么办？
A: 可以重新生成付款码，或联系客服处理。

### Q: 可以退款吗？
A: 体验点一旦购买成功，不支持退款。

### Q: 点数会过期吗？
A: 免费点数每日重置，购买的点数永久有效。

---

**注意**: 当前版本为演示版本，支付功能为模拟实现。生产环境需要接入真实的支付接口。
