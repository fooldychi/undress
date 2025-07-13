-- 数据库性能优化SQL
-- 为个人中心相关查询添加索引，提升查询性能

-- 1. 用户表索引优化
-- 为用户名添加索引（登录查询）
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- 为用户状态添加索引
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- 为最后登录时间添加索引
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login);

-- 2. 等级卡表索引优化
-- 为绑定用户ID添加索引（个人中心查询用户卡片）
CREATE INDEX IF NOT EXISTS idx_level_cards_bound_user_id ON level_cards(bound_user_id);

-- 为剩余积分添加索引（积分计算查询）
CREATE INDEX IF NOT EXISTS idx_level_cards_remaining_points ON level_cards(remaining_points);

-- 为绑定时间添加索引（按时间排序）
CREATE INDEX IF NOT EXISTS idx_level_cards_bound_at ON level_cards(bound_at);

-- 复合索引：绑定用户ID + 剩余积分（优化积分查询）
CREATE INDEX IF NOT EXISTS idx_level_cards_user_points ON level_cards(bound_user_id, remaining_points);

-- 3. 积分记录表索引优化
-- 为用户ID添加索引（查询用户积分记录）
CREATE INDEX IF NOT EXISTS idx_point_logs_user_id ON point_logs(user_id);

-- 为创建时间添加索引（按时间排序）
CREATE INDEX IF NOT EXISTS idx_point_logs_created_at ON point_logs(created_at);

-- 复合索引：用户ID + 创建时间（优化个人中心记录查询）
CREATE INDEX IF NOT EXISTS idx_point_logs_user_time ON point_logs(user_id, created_at DESC);

-- 4. 用户积分表索引优化（如果使用）
-- 为用户ID添加索引
CREATE INDEX IF NOT EXISTS idx_user_points_user_id ON user_points(user_id);

-- 为每日重置日期添加索引
CREATE INDEX IF NOT EXISTS idx_user_points_daily_reset ON user_points(daily_reset_date);

-- 5. 积分交易记录表索引优化（如果使用）
-- 为用户ID添加索引
CREATE INDEX IF NOT EXISTS idx_point_transactions_user_id ON point_transactions(user_id);

-- 为创建时间添加索引
CREATE INDEX IF NOT EXISTS idx_point_transactions_created_at ON point_transactions(created_at);

-- 复合索引：用户ID + 创建时间
CREATE INDEX IF NOT EXISTS idx_point_transactions_user_time ON point_transactions(user_id, created_at DESC);

-- 6. 卡片类型表索引优化
-- 为卡片类型名称添加索引
CREATE INDEX IF NOT EXISTS idx_card_types_name ON card_types(name);

-- 7. 查询优化建议
-- 以下是一些查询优化的建议：

-- 原查询：获取用户绑定的等级卡及其类型信息
-- SELECT lc.id, lc.card_number, lc.remaining_points, lc.bound_at,
--        ct.name as type_name, ct.icon, ct.points as total_points, ct.price
-- FROM level_cards lc
-- JOIN card_types ct ON lc.type_id = ct.id
-- WHERE lc.bound_user_id = ?
-- ORDER BY lc.bound_at DESC

-- 优化后的查询（使用索引）：
-- 确保 bound_user_id 和 bound_at 都有索引，JOIN 操作会更快

-- 原查询：计算用户总积分
-- SELECT COALESCE(SUM(remaining_points), 0) as total_points
-- FROM level_cards
-- WHERE bound_user_id = ?

-- 优化后：使用复合索引 idx_level_cards_user_points

-- 原查询：获取用户积分记录
-- SELECT action_type, points_amount, description, url, created_at
-- FROM point_logs
-- WHERE user_id = ?
-- ORDER BY created_at DESC
-- LIMIT ? OFFSET ?

-- 优化后：使用复合索引 idx_point_logs_user_time

-- 8. 数据库配置优化建议
-- 在数据库配置中添加以下设置：

-- # MySQL配置优化
-- innodb_buffer_pool_size = 1G  # 根据服务器内存调整
-- innodb_log_file_size = 256M
-- innodb_flush_log_at_trx_commit = 2
-- query_cache_size = 64M
-- query_cache_type = 1
-- max_connections = 200
-- wait_timeout = 28800
-- interactive_timeout = 28800

-- 9. 定期维护
-- 定期分析表统计信息
-- ANALYZE TABLE users, level_cards, point_logs, card_types;

-- 定期优化表
-- OPTIMIZE TABLE users, level_cards, point_logs, card_types;

-- 10. 监控查询性能
-- 启用慢查询日志
-- SET GLOBAL slow_query_log = 'ON';
-- SET GLOBAL long_query_time = 1;  -- 记录执行时间超过1秒的查询

-- 查看执行计划
-- EXPLAIN SELECT ... FROM ... WHERE ...;
