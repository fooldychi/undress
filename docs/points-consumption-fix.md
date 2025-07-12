# 积分扣除问题修复说明

## 问题描述

用户在前端生图成功后没有扣除相应等级卡的积分，导致积分一直没有减少。原因是客户端使用了旧的本地积分管理器 `pointsManager`，而不是基于服务端API的等级卡积分管理器。

## 问题根因

1. **使用错误的积分管理器**: 客户端在 ComfyUI 服务中使用了 `pointsManager.consumePoints()`，这个方法只在本地 localStorage 中扣除积分，不会调用服务端API。

2. **缺少服务端同步**: 本地积分管理器与服务端的等级卡系统没有同步，导致服务端积分没有真正扣除。

3. **体验卡优先级未实现**: 没有按照要求优先扣除体验卡积分。

## 修复方案

### 1. 替换积分管理器

将所有使用 `pointsManager` 的地方替换为 `levelCardPointsManager`：

**修复前 (client/src/services/comfyui.js):**
```javascript
// 检查体验点
if (!pointsManager.hasEnoughPoints()) {
  throw new Error('体验点不足！')
}

// 消耗体验点
const pointsResult = pointsManager.consumePoints()
```

**修复后:**
```javascript
// 检查积分（优先使用等级卡系统）
const pointsStatus = await levelCardPointsManager.getPointsStatus()
if (!pointsStatus.canGenerate) {
  throw new Error(`积分不足！当前积分: ${pointsStatus.current}，需要: ${pointsStatus.generationCost}`)
}

// 消耗积分（从等级卡扣除）
const pointsResult = await levelCardPointsManager.consumePoints(20, '一键换衣', resultImage)
```

### 2. 修复的功能模块

#### A. 一键换衣功能 (`processUndressImage`)
- ✅ 积分检查改为使用等级卡系统
- ✅ 积分扣除改为调用服务端API
- ✅ 传递生成的图片URL到积分记录

#### B. 极速换脸功能 (`processFaceSwap`)
- ✅ 积分检查改为使用等级卡系统
- ✅ 积分扣除改为调用服务端API
- ✅ 传递生成的图片URL到积分记录

#### C. 文生图功能
- ⚠️ 目前仍为模拟功能，需要实现真实的积分扣除

### 3. 服务端积分扣除流程

服务端已经实现了完整的等级卡积分扣除逻辑：

1. **优先扣除体验卡**: 按照 `ORDER BY CASE WHEN ct.name = '体验卡' THEN 1 ELSE 2 END` 排序
2. **按绑定时间排序**: 优先扣除较早绑定的卡片积分
3. **记录详细日志**: 包含媒体文件URL和消费描述
4. **返回扣除详情**: 包含每张卡片的扣除情况

### 4. API接口流程

```
客户端 → /api/level-cards/consume-points → 服务端积分计算器 → 数据库更新
```

**请求参数:**
```json
{
  "amount": 20,
  "description": "一键换衣",
  "mediaUrl": "生成的图片URL"
}
```

**响应数据:**
```json
{
  "success": true,
  "message": "积分消耗成功",
  "data": {
    "totalConsumed": 20,
    "consumedCards": [
      {
        "cardId": 1,
        "cardNumber": "EXP001",
        "cardType": "体验卡",
        "consumed": 20,
        "remaining": 80
      }
    ],
    "remainingPoints": 80,
    "mediaUrl": "生成的图片URL"
  }
}
```

## 测试验证

### 1. 自动化测试工具

在浏览器控制台中可以使用以下测试工具：

```javascript
// 完整的积分系统测试
await window.fullPointsTest()

// 测试积分扣除
await window.testPointsConsumption()

// 测试积分不足处理
await window.testInsufficientPoints()

// 查看等级卡信息
await window.testLevelCards()

// 查看积分历史
await window.testPointsHistory()
```

### 2. 手动测试步骤

1. **登录用户账号**
2. **确保有绑定的等级卡且有积分**
3. **进行一键换衣或换脸操作**
4. **检查积分是否正确扣除**
5. **查看积分记录是否包含操作历史**

### 3. 验证要点

- ✅ 积分在生图成功后立即扣除
- ✅ 优先从体验卡扣除积分
- ✅ 积分记录包含生成的图片URL
- ✅ 积分不足时正确提示错误
- ✅ 多张卡片时按优先级扣除

## 配置要求

### 1. 用户需要绑定等级卡

用户必须先绑定等级卡才能使用AI功能：
- 在个人中心绑定等级卡
- 确保等级卡有足够积分
- 体验卡会优先被使用

### 2. 积分消费标准

- **一键换衣**: 20积分
- **极速换脸**: 20积分  
- **文生图**: 20积分（待实现）

### 3. 数据库表结构

确保以下表存在且结构正确：
- `level_cards` - 等级卡信息
- `card_types` - 卡片类型（包含体验卡）
- `point_logs` - 积分消费记录

## 错误处理

### 1. 积分不足
```javascript
throw new Error('积分不足！当前积分: 10，需要: 20')
```

### 2. 未登录
```javascript
throw new Error('请先登录')
```

### 3. 未绑定等级卡
```javascript
throw new Error('请先绑定等级卡')
```

### 4. 服务端错误
```javascript
throw new Error('积分扣除失败: 服务器错误')
```

## 监控和日志

### 1. 客户端日志
- 积分检查过程
- 积分扣除结果
- 错误信息记录

### 2. 服务端日志
- 积分消费请求
- 卡片扣除详情
- 数据库更新结果

### 3. 数据库记录
- `point_logs` 表记录所有积分变动
- 包含用户ID、操作类型、积分数量、描述、媒体URL等

## 后续优化

1. **实现文生图真实积分扣除**
2. **添加积分预扣除机制**（生图开始时预扣，失败时退还）
3. **优化积分缓存策略**
4. **添加积分使用统计**
5. **实现积分使用限制**（如每日限额）

## 总结

通过将客户端积分管理从本地 `pointsManager` 迁移到基于服务端API的 `levelCardPointsManager`，成功解决了积分扣除问题。现在用户在使用AI功能时会正确扣除等级卡积分，并优先使用体验卡积分，同时记录详细的使用日志。
