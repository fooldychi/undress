# 数据库表统一修改总结

## 修改目标
将所有使用 `level_card_types` 表的代码统一修改为使用 `card_types` 表，并删除 `level_card_types` 表。

## 已完成的修改

### 1. 文件修改
以下文件已成功修改，将所有 `level_card_types` 引用替换为 `card_types`：

#### ✅ server/init-level-cards.js
- 修改表创建语句：`level_card_types` → `card_types`
- 修改数据插入语句
- 修改查询语句

#### ✅ server/src/scripts/create-level-cards-tables.js
- 修改表创建语句：`level_card_types` → `card_types`
- 修改外键引用：`REFERENCES level_card_types(id)` → `REFERENCES card_types(id)`
- 修改所有相关查询语句

#### ✅ server/src/routes/admin.js
- 修改外键约束引用
- 修改第1023行的查询语句：`FROM level_card_types` → `FROM card_types`

#### ✅ server/src/routes/levelCards.js
- 此文件已经在使用 `card_types`，无需修改

### 2. 创建的新脚本

#### 📄 server/scripts/migrate-card-types.js
数据迁移脚本，功能包括：
- 检查 `level_card_types` 表是否存在
- 创建 `card_types` 表（如果不存在）
- 迁移数据从 `level_card_types` 到 `card_types`
- 更新 `level_cards` 表的外键引用
- 删除旧的外键约束
- 添加新的外键约束
- 删除 `level_card_types` 表

#### 📄 server/scripts/verify-card-types-migration.js
验证脚本，用于检查：
- 文件中是否还有 `level_card_types` 引用
- 数据库表状态
- 外键约束状态
- 数据完整性

#### 📄 server/scripts/check-file-references.js
简化验证脚本，只检查文件引用

## 验证结果

### 文件检查 ✅
所有目标文件已通过检查，没有发现 `level_card_types` 引用：
- ✅ server/init-level-cards.js: 无 level_card_types 引用
- ✅ server/src/scripts/create-level-cards-tables.js: 无 level_card_types 引用
- ✅ server/src/routes/admin.js: 无 level_card_types 引用
- ✅ server/src/routes/levelCards.js: 无 level_card_types 引用

### 数据库检查 ⏳
由于数据库连接问题，暂未完成数据库验证。

## 下一步操作

1. **启动数据库服务**
   ```bash
   # 确保 MySQL 服务正在运行
   ```

2. **运行数据迁移脚本**
   ```bash
   node server/scripts/migrate-card-types.js
   ```

3. **验证迁移结果**
   ```bash
   node server/scripts/verify-card-types-migration.js
   ```

4. **测试应用功能**
   - 测试等级卡类型获取
   - 测试等级卡绑定功能
   - 测试管理员等级卡管理功能

## 修改的具体内容

### 表结构变更
```sql
-- 旧表名
level_card_types

-- 新表名
card_types

-- 外键约束变更
-- 旧：FOREIGN KEY (type_id) REFERENCES level_card_types(id)
-- 新：FOREIGN KEY (type_id) REFERENCES card_types(id)
```

### 查询语句变更
```sql
-- 旧查询
SELECT * FROM level_card_types
JOIN level_card_types lct ON lc.type_id = lct.id

-- 新查询
SELECT * FROM card_types
JOIN card_types ct ON lc.type_id = ct.id
```

## 注意事项

1. **数据完整性**：迁移脚本会保留所有原始数据，包括创建时间和更新时间
2. **外键约束**：会正确处理外键约束的删除和重建
3. **重复数据**：迁移脚本会检查并避免重复数据插入
4. **回滚**：如果需要回滚，可以手动恢复数据库备份

## 影响的功能模块

- 等级卡类型管理
- 等级卡生成
- 等级卡绑定
- 用户积分系统
- 管理员面板

所有这些功能在迁移完成后应该正常工作，使用统一的 `card_types` 表。
