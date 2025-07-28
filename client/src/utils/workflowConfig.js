// 工作流节点配置工具

/**
 * 获取工作流节点配置
 * @param {string} workflowType - 工作流类型 ('faceswap' | 'undress')
 * @returns {Promise<Object>} 节点配置对象
 */
export async function getWorkflowNodeConfig(workflowType) {
  try {
    console.log(`🔄 获取${workflowType}工作流节点配置...`)

    // 构建正确的API URL
    const baseUrl = import.meta.env.MODE === 'development' ? '' : (import.meta.env.VITE_API_BASE_URL || 'http://114.132.50.71:3007').replace('/api', '');
    const apiUrl = `${baseUrl}/api/workflow-config/public`;

    const response = await fetch(apiUrl)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const result = await response.json()
    if (!result.success) {
      throw new Error(result.message || '获取配置失败')
    }

    const workflowConfig = result.data[workflowType]
    if (!workflowConfig) {
      throw new Error(`未找到${workflowType}工作流配置`)
    }

    // 转换为前端需要的格式
    const nodeConfig = {
      inputNodes: {},
      outputNodes: { primary: null, secondary: [] }
    }

    if (workflowType === 'faceswap') {
      // 换脸工作流节点配置
      nodeConfig.inputNodes.facePhoto1 = workflowConfig.inputNodes.face_photo_1 || '670'
      nodeConfig.inputNodes.facePhoto2 = workflowConfig.inputNodes.face_photo_2 || '662'
      nodeConfig.inputNodes.facePhoto3 = workflowConfig.inputNodes.face_photo_3 || '658'
      nodeConfig.inputNodes.facePhoto4 = workflowConfig.inputNodes.face_photo_4 || '655'
      nodeConfig.inputNodes.targetImage = workflowConfig.inputNodes.target_image || '737'

    } else if (workflowType === 'undress') {
      // 一键褪衣工作流节点配置
      nodeConfig.inputNodes.mainImage = workflowConfig.inputNodes.main_image || '49'
      nodeConfig.inputNodes.seedNode = workflowConfig.inputNodes.seed_node || '174'
    }

    // 处理输出节点
    if (workflowConfig.outputNodes && workflowConfig.outputNodes.length > 0) {
      // 按优先级排序
      const sortedOutputs = workflowConfig.outputNodes.sort((a, b) => a.order - b.order)

      // 第一个是主要输出节点
      nodeConfig.outputNodes.primary = sortedOutputs[0].nodeId

      // 其余是备用输出节点
      nodeConfig.outputNodes.secondary = sortedOutputs.slice(1).map(node => node.nodeId)
    }

    console.log(`📋 获取${workflowType}工作流节点配置成功:`, nodeConfig)
    return nodeConfig

  } catch (error) {
    console.warn('获取工作流节点配置失败，使用默认配置:', error)
    return getDefaultNodeConfig(workflowType)
  }
}

/**
 * 获取默认节点配置（降级机制）
 * @param {string} workflowType - 工作流类型
 * @returns {Object} 默认节点配置
 */
export function getDefaultNodeConfig(workflowType) {
  const defaultConfigs = {
    faceswap: {
      inputNodes: {
        facePhoto1: '670',
        facePhoto2: '662',
        facePhoto3: '658',
        facePhoto4: '655',
        targetImage: '737'
      },
      outputNodes: {
        primary: '812',
        secondary: ['813', '746', '710']
      }
    },
    undress: {
      inputNodes: {
        mainImage: '49',
        seedNode: '174'
      },
      outputNodes: {
        primary: '730',
        secondary: ['812', '813', '746', '710']
      }
    }
  }

  const config = defaultConfigs[workflowType]
  if (!config) {
    throw new Error(`未知的工作流类型: ${workflowType}`)
  }

  console.log(`📋 使用${workflowType}工作流默认配置:`, config)
  return config
}

/**
 * 检查工作流是否启用
 * @param {string} workflowType - 工作流类型
 * @returns {Promise<boolean>} 是否启用
 */
export async function isWorkflowEnabled(workflowType) {
  try {
    // 构建正确的API URL
    const baseUrl = import.meta.env.MODE === 'development' ? '' : (import.meta.env.VITE_API_BASE_URL || 'http://114.132.50.71:3007').replace('/api', '');
    const apiUrl = `${baseUrl}/api/workflow-config/public`;

    const response = await fetch(apiUrl)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const result = await response.json()
    if (!result.success) {
      throw new Error(result.message || '获取配置失败')
    }

    const workflowConfig = result.data[workflowType]
    return workflowConfig ? workflowConfig.enabled : false

  } catch (error) {
    console.warn('检查工作流启用状态失败，默认启用:', error)
    return true
  }
}

/**
 * 获取工作流基础信息
 * @param {string} workflowType - 工作流类型
 * @returns {Promise<Object>} 工作流信息
 */
export async function getWorkflowInfo(workflowType) {
  try {
    // 构建正确的API URL
    const baseUrl = import.meta.env.MODE === 'development' ? '' : (import.meta.env.VITE_API_BASE_URL || 'http://114.132.50.71:3007').replace('/api', '');
    const apiUrl = `${baseUrl}/api/workflow-config/public`;

    const response = await fetch(apiUrl)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const result = await response.json()
    if (!result.success) {
      throw new Error(result.message || '获取配置失败')
    }

    const workflowConfig = result.data[workflowType]
    if (!workflowConfig) {
      throw new Error(`未找到${workflowType}工作流配置`)
    }

    const info = {
      name: workflowConfig.name || `${workflowType} workflow`,
      description: workflowConfig.description || '',
      enabled: workflowConfig.enabled,
      filePath: workflowConfig.filePath || `workflows/${workflowType}.json`
    }

    console.log(`📋 获取${workflowType}工作流信息:`, info)
    return info

  } catch (error) {
    console.warn('获取工作流信息失败，使用默认信息:', error)
    return {
      name: `${workflowType} workflow`,
      description: '',
      enabled: true,
      filePath: `workflows/${workflowType}.json`
    }
  }
}
