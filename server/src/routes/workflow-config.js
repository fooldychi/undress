const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { adminAuth } = require('../middleware/adminAuth');

// 获取所有工作流配置（管理员用）
router.get('/', adminAuth, async (req, res) => {
  try {
    console.log('📥 获取工作流配置...');

    // 获取工作流基础信息
    const workflowInfos = await query(`
      SELECT workflow_type, workflow_name, description, file_path, is_enabled
      FROM workflow_info
      ORDER BY workflow_type
    `);

    // 获取节点配置
    const nodeConfigs = await query(`
      SELECT workflow_type, node_type, node_key, node_id, node_order, description, is_enabled
      FROM workflow_configs
      ORDER BY workflow_type, node_type, node_order
    `);

    // 组织数据结构
    const result = {};

    workflowInfos.forEach(info => {
      result[info.workflow_type] = {
        name: info.workflow_name,
        description: info.description,
        filePath: info.file_path,
        enabled: info.is_enabled,
        inputNodes: {},
        outputNodes: []
      };
    });

    nodeConfigs.forEach(config => {
      const workflow = result[config.workflow_type];
      if (!workflow) return;

      if (config.node_type === 'input') {
        // 为了与公开API保持一致，直接使用node_id作为值
        workflow.inputNodes[config.node_key] = config.node_id;
        // 额外信息存储在metadata中
        if (!workflow.metadata) workflow.metadata = { inputNodes: {}, outputNodes: {} };
        workflow.metadata.inputNodes[config.node_key] = {
          description: config.description,
          enabled: config.is_enabled
        };
      } else if (config.node_type === 'output') {
        workflow.outputNodes.push({
          key: config.node_key,
          nodeId: config.node_id,
          order: config.node_order,
          description: config.description,
          enabled: config.is_enabled
        });
      }
    });

    console.log(`📊 返回 ${Object.keys(result).length} 个工作流配置`);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('❌ 获取工作流配置失败:', error);
    res.status(500).json({
      success: false,
      message: '获取工作流配置失败: ' + error.message
    });
  }
});

// 获取公开的工作流配置（前端用）
router.get('/public', async (req, res) => {
  try {
    console.log('📥 获取公开工作流配置...');

    // 只获取启用的工作流和节点
    const workflowInfos = await query(`
      SELECT workflow_type, workflow_name, is_enabled
      FROM workflow_info
      WHERE is_enabled = TRUE
      ORDER BY workflow_type
    `);

    const nodeConfigs = await query(`
      SELECT workflow_type, node_type, node_key, node_id, node_order
      FROM workflow_configs
      WHERE is_enabled = TRUE
      ORDER BY workflow_type, node_type, node_order
    `);

    // 组织数据结构
    const result = {};

    workflowInfos.forEach(info => {
      result[info.workflow_type] = {
        name: info.workflow_name,
        enabled: info.is_enabled,
        inputNodes: {},
        outputNodes: []
      };
    });

    nodeConfigs.forEach(config => {
      const workflow = result[config.workflow_type];
      if (!workflow) return;

      if (config.node_type === 'input') {
        workflow.inputNodes[config.node_key] = config.node_id;
      } else if (config.node_type === 'output') {
        workflow.outputNodes.push({
          key: config.node_key,
          nodeId: config.node_id,
          order: config.node_order
        });
      }
    });

    // 对输出节点按优先级排序
    Object.values(result).forEach(workflow => {
      workflow.outputNodes.sort((a, b) => a.order - b.order);
    });

    console.log(`📊 返回 ${Object.keys(result).length} 个公开工作流配置`);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('❌ 获取公开工作流配置失败:', error);
    res.status(500).json({
      success: false,
      message: '获取公开工作流配置失败: ' + error.message
    });
  }
});

// 更新工作流基础信息
router.put('/info/:workflowType', adminAuth, async (req, res) => {
  try {
    const { workflowType } = req.params;
    const { workflow_name, description, file_path, is_enabled } = req.body;

    console.log(`📝 更新工作流信息: ${workflowType}`);

    await query(`
      UPDATE workflow_info
      SET workflow_name = ?, description = ?, file_path = ?, is_enabled = ?, updated_at = CURRENT_TIMESTAMP
      WHERE workflow_type = ?
    `, [workflow_name, description, file_path, is_enabled, workflowType]);

    res.json({
      success: true,
      message: '工作流信息更新成功'
    });

  } catch (error) {
    console.error('❌ 更新工作流信息失败:', error);
    res.status(500).json({
      success: false,
      message: '更新工作流信息失败: ' + error.message
    });
  }
});

// 更新节点配置
router.put('/nodes/:workflowType', adminAuth, async (req, res) => {
  try {
    const { workflowType } = req.params;
    const { inputNodes, outputNodes } = req.body;

    console.log(`📝 更新节点配置: ${workflowType}`);

    // 开始事务
    await query('START TRANSACTION');

    try {
      // 更新输入节点
      if (inputNodes) {
        for (const [nodeKey, nodeId] of Object.entries(inputNodes)) {
          await query(`
            UPDATE workflow_configs
            SET node_id = ?, updated_at = CURRENT_TIMESTAMP
            WHERE workflow_type = ? AND node_type = 'input' AND node_key = ?
          `, [nodeId, workflowType, nodeKey]);
        }
      }

      // 更新输出节点
      if (outputNodes) {
        for (const outputNode of outputNodes) {
          await query(`
            UPDATE workflow_configs
            SET node_id = ?, node_order = ?, updated_at = CURRENT_TIMESTAMP
            WHERE workflow_type = ? AND node_type = 'output' AND node_key = ?
          `, [outputNode.nodeId, outputNode.order, workflowType, outputNode.key]);
        }
      }

      await query('COMMIT');

      res.json({
        success: true,
        message: '节点配置更新成功'
      });

    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('❌ 更新节点配置失败:', error);
    res.status(500).json({
      success: false,
      message: '更新节点配置失败: ' + error.message
    });
  }
});

// 批量更新工作流配置
router.post('/batch-update', adminAuth, async (req, res) => {
  try {
    const { workflows } = req.body;

    console.log('📝 批量更新工作流配置...');
    console.log('📊 接收到的数据:', JSON.stringify(workflows, null, 2));

    if (!workflows || typeof workflows !== 'object') {
      return res.status(400).json({
        success: false,
        message: '无效的工作流配置数据'
      });
    }

    let updateCount = 0;

    for (const [workflowType, config] of Object.entries(workflows)) {
      console.log(`🔧 处理工作流: ${workflowType}`, config);

      // 更新工作流基础信息
      if (config.name || config.description || config.enabled !== undefined) {
        console.log(`📝 更新工作流基础信息: ${workflowType}`);
        try {
          // 构建动态更新语句，只更新提供的字段
          const updateFields = [];
          const updateValues = [];

          if (config.name !== undefined) {
            updateFields.push('workflow_name = ?');
            updateValues.push(config.name);
          }

          if (config.description !== undefined) {
            updateFields.push('description = ?');
            updateValues.push(config.description);
          }

          if (config.enabled !== undefined) {
            updateFields.push('is_enabled = ?');
            updateValues.push(config.enabled);
          }

          if (updateFields.length === 0) {
            console.log(`⚠️ 没有需要更新的工作流基础信息字段: ${workflowType}`);
            continue;
          }

          updateFields.push('updated_at = NOW()');
          updateValues.push(workflowType);

          const sql = `UPDATE workflow_info SET ${updateFields.join(', ')} WHERE workflow_type = ?`;
          console.log(`📝 执行SQL: ${sql}`);
          console.log(`📊 参数: [${updateValues.join(', ')}]`);

          const result = await query(sql, updateValues);
          console.log(`✅ 工作流基础信息更新结果:`, result);
          console.log(`📊 影响行数: ${result.affectedRows}, 改变行数: ${result.changedRows}`);
          if (result.affectedRows > 0) {
            updateCount++;
          } else {
            console.log(`⚠️ 没有找到匹配的工作流: ${workflowType}`);
          }
        } catch (error) {
          console.error(`❌ 更新工作流基础信息失败: ${workflowType}`, error);
        }
      }

      // 更新输入节点
      if (config.inputNodes) {
        console.log(`📝 更新输入节点: ${workflowType}`, config.inputNodes);
        for (const [nodeKey, nodeId] of Object.entries(config.inputNodes)) {
          console.log(`  - 更新输入节点: ${nodeKey} -> ${nodeId}`);
          try {
            const result = await query(`
              UPDATE workflow_configs
              SET node_id = ?, updated_at = NOW()
              WHERE workflow_type = ? AND node_type = 'input' AND node_key = ?
            `, [nodeId, workflowType, nodeKey]);
            console.log(`  ✅ 输入节点更新结果:`, result);
            console.log(`  📊 影响行数: ${result.affectedRows}, 改变行数: ${result.changedRows}`);
            if (result.affectedRows > 0) {
              updateCount++;
            } else {
              console.log(`  ⚠️ 没有找到匹配的记录: ${workflowType}/${nodeKey}`);
            }
          } catch (error) {
            console.error(`  ❌ 更新输入节点失败: ${nodeKey}`, error);
          }
        }
      }

      // 更新输出节点
      if (config.outputNodes) {
        console.log(`📝 更新输出节点: ${workflowType}`, config.outputNodes);
        for (const outputNode of config.outputNodes) {
          console.log(`  - 更新输出节点: ${outputNode.key} -> ${outputNode.nodeId} (优先级: ${outputNode.order})`);
          try {
            const result = await query(`
              UPDATE workflow_configs
              SET node_id = ?, node_order = ?, updated_at = NOW()
              WHERE workflow_type = ? AND node_type = 'output' AND node_key = ?
            `, [outputNode.nodeId, outputNode.order, workflowType, outputNode.key]);
            console.log(`  ✅ 输出节点更新结果:`, result);
            console.log(`  📊 影响行数: ${result.affectedRows}, 改变行数: ${result.changedRows}`);
            if (result.affectedRows > 0) {
              updateCount++;
            } else {
              console.log(`  ⚠️ 没有找到匹配的记录: ${workflowType}/${outputNode.key}`);
            }
          } catch (error) {
            console.error(`  ❌ 更新输出节点失败: ${outputNode.key}`, error);
          }
        }
      }
    }

    console.log(`🎉 批量更新完成，共更新 ${updateCount} 项配置`);

    res.json({
      success: true,
      message: `批量更新成功，共更新 ${updateCount} 项配置`,
      updateCount
    });

  } catch (error) {
    console.error('❌ 批量更新失败:', error);
    res.status(500).json({
      success: false,
      message: '批量更新失败: ' + error.message
    });
  }
});

// 获取启用的功能列表（用于首页显示）
router.get('/features', async (req, res) => {
  try {
    // 简化日志输出
    if (process.env.NODE_ENV === 'development') {
      console.log('📥 获取启用的功能列表...');
    }

    // 获取启用的工作流
    const enabledWorkflows = await query(`
      SELECT workflow_type, workflow_name, is_enabled
      FROM workflow_info
      WHERE is_enabled = TRUE
      ORDER BY workflow_type
    `);

    // 功能映射配置
    const featureMapping = {
      'undress': {
        id: 'clothes-swap',
        title: '一键褪衣',
        description: '智能识别人物轮廓，快速移除照片中的服装，体验前沿AI技术',
        route: '/clothes-swap',
        icon: {
          type: 'custom',
          component: 'UndressWomanIcon',
          size: 28,
          color: '#667eea'
        },
        iconClass: 'undress-icon',
        tags: [
          { text: 'AI识别', type: 'primary' },
          { text: '快速处理', type: 'success' }
        ],
        requireLogin: true,
        order: 1,
        category: 'image-processing',
        pointsCost: 20
      },
      'faceswap': {
        id: 'face-swap',
        title: '极速换脸',
        description: '精准面部识别技术，实现自然的人脸替换效果，创造有趣内容',
        route: '/face-swap',
        icon: {
          type: 'custom',
          component: 'FaceSwapIcon',
          size: 28,
          color: '#f093fb'
        },
        iconClass: 'faceswap-icon',
        tags: [
          { text: '面部识别', type: 'warning' },
          { text: '自然效果', type: 'primary' }
        ],
        requireLogin: true,
        order: 2,
        category: 'image-processing',
        pointsCost: 20
      }
    };

    // 根据启用的工作流生成功能列表
    const enabledFeatures = enabledWorkflows
      .map(workflow => {
        const feature = featureMapping[workflow.workflow_type];
        if (feature) {
          return {
            ...feature,
            enabled: Boolean(workflow.is_enabled),
            workflowName: workflow.workflow_name
          };
        }
        return null;
      })
      .filter(feature => feature !== null)
      .sort((a, b) => a.order - b.order);

    console.log(`✅ 返回 ${enabledFeatures.length} 个启用的功能`);

    res.json({
      success: true,
      data: enabledFeatures
    });

  } catch (error) {
    console.error('❌ 获取功能列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取功能列表失败: ' + error.message
    });
  }
});

module.exports = router;
