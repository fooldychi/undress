-- 插入工作流基础信息
INSERT INTO workflow_info (workflow_type, workflow_name, description, file_path, is_enabled)
VALUES 
  ('faceswap', 'Face Swap 2.0', '高质量人脸替换工作流', 'workflows/faceswap2.0.json', true),
  ('undress', 'Undress AI', '一键褪衣AI工作流', 'workflows/undress.json', true);

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
  ('undress', 'output', 'secondary_4', '710', 5, '备用输出节点4');
