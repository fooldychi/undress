-- 修复工作流配置值
UPDATE system_config SET config_value = '670' WHERE config_key = 'workflow.faceswap.input_nodes.face_photo_1';
UPDATE system_config SET config_value = '662' WHERE config_key = 'workflow.faceswap.input_nodes.face_photo_2';
UPDATE system_config SET config_value = '658' WHERE config_key = 'workflow.faceswap.input_nodes.face_photo_3';
UPDATE system_config SET config_value = '655' WHERE config_key = 'workflow.faceswap.input_nodes.face_photo_4';
UPDATE system_config SET config_value = '737' WHERE config_key = 'workflow.faceswap.input_nodes.target_image';
UPDATE system_config SET config_value = '812' WHERE config_key = 'workflow.faceswap.output_nodes.primary';
UPDATE system_config SET config_value = '813,746,710' WHERE config_key = 'workflow.faceswap.output_nodes.secondary';
UPDATE system_config SET config_value = '高质量人脸替换工作流' WHERE config_key = 'workflow.faceswap.description';
UPDATE system_config SET config_value = 'Face Swap 2.0' WHERE config_key = 'workflow.faceswap.name';

UPDATE system_config SET config_value = '49' WHERE config_key = 'workflow.undress.input_nodes.main_image';
UPDATE system_config SET config_value = '174' WHERE config_key = 'workflow.undress.input_nodes.seed_node';
UPDATE system_config SET config_value = '730' WHERE config_key = 'workflow.undress.output_nodes.primary';
UPDATE system_config SET config_value = '812,813,746,710' WHERE config_key = 'workflow.undress.output_nodes.secondary';
UPDATE system_config SET config_value = '一键褪衣AI工作流' WHERE config_key = 'workflow.undress.description';
UPDATE system_config SET config_value = 'Undress AI' WHERE config_key = 'workflow.undress.name';
