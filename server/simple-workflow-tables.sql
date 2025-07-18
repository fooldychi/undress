-- 创建工作流基础信息表
CREATE TABLE workflow_info (
  id INT AUTO_INCREMENT PRIMARY KEY,
  workflow_type VARCHAR(50) NOT NULL UNIQUE,
  workflow_name VARCHAR(100) NOT NULL,
  description TEXT,
  file_path VARCHAR(255),
  is_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 创建工作流节点配置表
CREATE TABLE workflow_configs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  workflow_type VARCHAR(50) NOT NULL,
  node_type ENUM('input', 'output') NOT NULL,
  node_key VARCHAR(100) NOT NULL,
  node_id VARCHAR(50) NOT NULL,
  node_order INT DEFAULT 0,
  description VARCHAR(255) DEFAULT NULL,
  is_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT NULL,
  UNIQUE KEY uk_workflow_node (workflow_type, node_type, node_key),
  INDEX idx_workflow_type (workflow_type),
  INDEX idx_node_type (node_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
