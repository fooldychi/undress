-- 修复节点ID - 将被截断的JSON字符串重置为正确的节点ID

-- 修复换脸工作流的输入节点
UPDATE workflow_configs SET node_id = '670', updated_at = NOW() 
WHERE workflow_type = 'faceswap' AND node_type = 'input' AND node_key = 'face_photo_1';

UPDATE workflow_configs SET node_id = '662', updated_at = NOW() 
WHERE workflow_type = 'faceswap' AND node_type = 'input' AND node_key = 'face_photo_2';

UPDATE workflow_configs SET node_id = '658', updated_at = NOW() 
WHERE workflow_type = 'faceswap' AND node_type = 'input' AND node_key = 'face_photo_3';

UPDATE workflow_configs SET node_id = '655', updated_at = NOW() 
WHERE workflow_type = 'faceswap' AND node_type = 'input' AND node_key = 'face_photo_4';

UPDATE workflow_configs SET node_id = '737', updated_at = NOW() 
WHERE workflow_type = 'faceswap' AND node_type = 'input' AND node_key = 'target_image';

-- 修复一键褪衣工作流的输入节点
UPDATE workflow_configs SET node_id = '49', updated_at = NOW() 
WHERE workflow_type = 'undress' AND node_type = 'input' AND node_key = 'main_image';

UPDATE workflow_configs SET node_id = '174', updated_at = NOW() 
WHERE workflow_type = 'undress' AND node_type = 'input' AND node_key = 'seed_node';

-- 验证更新结果
SELECT 
  workflow_type, 
  node_type, 
  node_key, 
  node_id,
  LENGTH(node_id) as id_length,
  CASE 
    WHEN node_id LIKE '%{%' THEN 'JSON格式'
    ELSE '正常'
  END as format_status
FROM workflow_configs 
ORDER BY workflow_type, node_type, node_key;
