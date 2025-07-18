-- 创建工作流配置表
CREATE TABLE IF NOT EXISTS workflow_configs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  workflow_type VARCHAR(50) NOT NULL COMMENT '工作流类型：faceswap, undress',
  node_type ENUM('input', 'output') NOT NULL COMMENT '节点类型',
  node_key VARCHAR(100) NOT NULL COMMENT '节点键名',
  node_id VARCHAR(50) NOT NULL COMMENT '节点ID',
  node_order INT DEFAULT 0 COMMENT '节点顺序（用于输出节点优先级）',
  description VARCHAR(255) DEFAULT NULL COMMENT '节点描述',
  is_enabled BOOLEAN DEFAULT TRUE COMMENT '是否启用',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_workflow_node (workflow_type, node_type, node_key),
  INDEX idx_workflow_type (workflow_type),
  INDEX idx_node_type (node_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='工作流节点配置表';

-- 创建工作流基础信息表
CREATE TABLE IF NOT EXISTS workflow_info (
  id INT AUTO_INCREMENT PRIMARY KEY,
  workflow_type VARCHAR(50) NOT NULL UNIQUE COMMENT '工作流类型',
  workflow_name VARCHAR(100) NOT NULL COMMENT '工作流名称',
  description TEXT COMMENT '工作流描述',
  file_path VARCHAR(255) COMMENT '工作流文件路径',
  is_enabled BOOLEAN DEFAULT TRUE COMMENT '是否启用',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='工作流基础信息表';

-- 插入工作流基础信息
INSERT INTO workflow_info (workflow_type, workflow_name, description, file_path, is_enabled)
VALUES 
  ('faceswap', 'Face Swap 2.0', '高质量人脸替换工作流', 'workflows/faceswap2.0.json', true),
  ('undress', 'Undress AI', '一键褪衣AI工作流', 'workflows/undress.json', true)
ON DUPLICATE KEY UPDATE 
  workflow_name = VALUES(workflow_name),
  description = VALUES(description),
  file_path = VALUES(file_path),
  is_enabled = VALUES(is_enabled),
  updated_at = CURRENT_TIMESTAMP;

-- 插入工作流节点配置
INSERT INTO workflow_configs (workflow_type, node_type, node_key, node_id, node_order, description)
VALUES 
  -- 换脸工作流输入节点
  ('faceswap', 'input', 'face_photo_1', '670', 1, '第一张人脸照片节点'),
  ('faceswap', 'input', 'face_photo_2', '662', 2, '第二张人脸照片节点'),
  ('faceswap', 'input', 'face_photo_3', '658', 3, '第三张人脸照片节点'),
  ('faceswap', 'input', 'face_photo_4', '655', 4, '第四张人脸照片节点'),
  ('faceswap', 'input', 'target_image', '737', 5, '目标图片节点'),
  
  -- 换脸工作流输出节点（按优先级排序）
  ('faceswap', 'output', 'primary', '812', 1, '主要输出节点'),
  ('faceswap', 'output', 'secondary_1', '813', 2, '备用输出节点1'),
  ('faceswap', 'output', 'secondary_2', '746', 3, '备用输出节点2'),
  ('faceswap', 'output', 'secondary_3', '710', 4, '备用输出节点3'),
  
  -- 一键褪衣工作流输入节点
  ('undress', 'input', 'main_image', '49', 1, '主图片输入节点'),
  ('undress', 'input', 'seed_node', '174', 2, '随机种子节点'),
  
  -- 一键褪衣工作流输出节点（按优先级排序）
  ('undress', 'output', 'primary', '730', 1, '主要输出节点'),
  ('undress', 'output', 'secondary_1', '812', 2, '备用输出节点1'),
  ('undress', 'output', 'secondary_2', '813', 3, '备用输出节点2'),
  ('undress', 'output', 'secondary_3', '746', 4, '备用输出节点3'),
  ('undress', 'output', 'secondary_4', '710', 5, '备用输出节点4')
ON DUPLICATE KEY UPDATE 
  node_id = VALUES(node_id),
  node_order = VALUES(node_order),
  description = VALUES(description),
  updated_at = CURRENT_TIMESTAMP;
