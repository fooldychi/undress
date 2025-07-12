-- 创建系统配置表
CREATE TABLE IF NOT EXISTS `system_config` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `config_key` varchar(100) NOT NULL COMMENT '配置键名',
  `config_value` text COMMENT '配置值',
  `config_type` varchar(20) DEFAULT 'string' COMMENT '配置类型: string, number, boolean, json',
  `config_group` varchar(50) DEFAULT 'general' COMMENT '配置分组: database, server, jwt, cors, upload, log',
  `description` varchar(255) DEFAULT NULL COMMENT '配置描述',
  `is_encrypted` tinyint(1) DEFAULT 0 COMMENT '是否加密存储',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_config_key` (`config_key`),
  KEY `idx_config_group` (`config_group`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='系统配置表';

-- 插入默认配置
INSERT INTO `system_config` (`config_key`, `config_value`, `config_type`, `config_group`, `description`) VALUES
-- 服务器配置
('server.port', '3006', 'number', 'server', '服务器端口'),
('server.node_env', 'development', 'string', 'server', '运行环境'),

-- 数据库配置
('database.host', '114.132.50.71', 'string', 'database', '数据库主机'),
('database.port', '3306', 'number', 'database', '数据库端口'),
('database.name', 'aimagic', 'string', 'database', '数据库名称'),
('database.user', 'aimagic', 'string', 'database', '数据库用户名'),
('database.password', 'dFLJYsd82irJwHX5', 'string', 'database', '数据库密码'),

-- JWT配置
('jwt.secret', 'your-super-secret-jwt-key-change-this-in-production', 'string', 'jwt', 'JWT密钥'),
('jwt.expires_in', '7d', 'string', 'jwt', 'JWT过期时间'),

-- CORS配置
('cors.origin', 'http://localhost:3000', 'string', 'cors', '允许的跨域源'),

-- 文件上传配置
('upload.max_file_size', '10485760', 'number', 'upload', '最大文件大小(字节)'),
('upload.path', 'uploads/', 'string', 'upload', '上传路径'),

-- 日志配置
('log.level', 'info', 'string', 'log', '日志级别')

ON DUPLICATE KEY UPDATE 
  `config_value` = VALUES(`config_value`),
  `updated_at` = CURRENT_TIMESTAMP;
