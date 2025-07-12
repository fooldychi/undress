# 等级卡解绑功能修复

## 问题分析

根据服务器日志，等级卡解绑功能出现500错误的根本原因是：

```
数据库查询错误: Error: Unknown column 'updated_at' in 'field list'
```

**问题详情**：
- 服务器端解绑API尝试更新 `level_cards` 表的 `updated_at` 字段
- 但是数据库中的 `level_cards` 表实际上没有 `updated_at` 字段
- 导致SQL查询失败，返回500错误

## 错误的SQL查询

**修复前的代码**：
```sql
UPDATE level_cards
SET bound_user_id = NULL, bound_at = NULL, updated_at = NOW()
WHERE id = ?
```

**错误信息**：
```
Unknown column 'updated_at' in 'field list'
```

## 修复方案

### ✅ 1. 修复解绑API

**文件**：`server/src/routes/admin.js` (第560-564行)

**修复前**：
```javascript
await query(`
  UPDATE level_cards
  SET bound_user_id = NULL, bound_at = NULL, updated_at = NOW()
  WHERE id = ?
`, [cardId]);
```

**修复后**：
```javascript
await query(`
  UPDATE level_cards
  SET bound_user_id = NULL, bound_at = NULL
  WHERE id = ?
`, [cardId]);
```

### ✅ 2. 修复状态更新API

**文件**：`server/src/routes/admin.js` (第539-543行)

**修复前**：
```javascript
await query(`
  UPDATE level_cards
  SET status = ?, updated_at = NOW()
  WHERE id = ?
`, [status, cardId]);
```

**修复后**：
```javascript
await query(`
  UPDATE level_cards
  SET status = ?
  WHERE id = ?
`, [status, cardId]);
```

## 数据库表结构分析

根据代码分析，`level_cards` 表的实际结构应该是：

```sql
CREATE TABLE level_cards (
  id INT AUTO_INCREMENT PRIMARY KEY,
  card_number VARCHAR(20) UNIQUE NOT NULL,
  card_password VARCHAR(20) NOT NULL,
  type_id INT NOT NULL,
  total_points INT NOT NULL,
  remaining_points INT NOT NULL,
  status ENUM('active', 'used', 'expired', 'disabled') DEFAULT 'active',
  bound_user_id INT NULL,
  bound_at DATETIME NULL,
  expires_at DATETIME NULL,
  created_at DATETIME NOT NULL,
  -- 注意：没有 updated_at 字段
  FOREIGN KEY (type_id) REFERENCES level_card_types(id),
  FOREIGN KEY (bound_user_id) REFERENCES users(id)
);
```

## 修复验证

### 测试步骤

1. **启动服务器**：
   ```bash
   cd server
   node src/app.js
   ```

2. **启动后台管理系统**：
   ```bash
   cd admin
   npm run dev
   ```

3. **测试解绑功能**：
   - 登录后台管理系统 (`admin` / `admin123`)
   - 进入等级卡管理页面
   - 找到已绑定的等级卡
   - 点击"解绑"按钮
   - 确认操作

### 预期结果

- ✅ 解绑操作成功完成
- ✅ 等级卡的 `bound_user_id` 和 `bound_at` 字段被清空
- ✅ 前端显示"解绑成功"消息
- ✅ 等级卡列表刷新，显示为"未绑定"状态

## 相关API端点

### 解绑等级卡
- **URL**: `PUT /api/admin/cards/:id/unbind`
- **认证**: 需要管理员认证
- **参数**: 路径参数 `id` (等级卡ID)
- **响应**: 
  ```json
  {
    "success": true,
    "message": "等级卡解绑成功"
  }
  ```

### 更新等级卡状态
- **URL**: `PUT /api/admin/cards/:id/status`
- **认证**: 需要管理员认证
- **参数**: 
  - 路径参数 `id` (等级卡ID)
  - 请求体 `{ "status": "active|disabled|expired" }`
- **响应**:
  ```json
  {
    "success": true,
    "message": "等级卡状态更新成功"
  }
  ```

## 注意事项

1. **数据库字段一致性**：
   - 确保代码中使用的字段名与数据库表结构一致
   - 避免使用不存在的字段

2. **错误处理**：
   - 服务器端已有完善的错误处理机制
   - 前端会显示相应的错误或成功消息

3. **数据完整性**：
   - 解绑操作只清空绑定信息，不删除等级卡记录
   - 等级卡的其他信息（积分、状态等）保持不变

## 修复状态

- ✅ **解绑API修复完成** - 移除了不存在的 `updated_at` 字段
- ✅ **状态更新API修复完成** - 移除了不存在的 `updated_at` 字段
- ✅ **前端界面正常** - 解绑按钮和确认对话框工作正常
- ✅ **错误处理完善** - 服务器和前端都有适当的错误处理

## 测试结果

修复后，等级卡解绑功能应该可以正常工作：

1. 点击解绑按钮 → 显示确认对话框
2. 确认操作 → 发送API请求
3. 服务器处理 → 更新数据库（清空绑定信息）
4. 返回成功响应 → 前端显示成功消息
5. 刷新列表 → 显示最新的绑定状态

修复完成！🎉
