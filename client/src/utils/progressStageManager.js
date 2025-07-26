/**
 * 图片处理进度阶段管理器
 * 实现基于实际阶段的进度显示，而不是误导性的百分比
 */

// 进度阶段定义
export const PROGRESS_STAGES = {
  UPLOADING: 'uploading',
  SUBMITTING: 'submitting',
  QUEUING: 'queuing',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  ERROR: 'error'
}

// 阶段显示文本映射
export const STAGE_TEXTS = {
  [PROGRESS_STAGES.UPLOADING]: '图片上传中...',
  [PROGRESS_STAGES.SUBMITTING]: '提交任务中...',
  [PROGRESS_STAGES.QUEUING]: '队列中...',
  [PROGRESS_STAGES.PROCESSING]: '工作流执行中...',
  [PROGRESS_STAGES.COMPLETED]: '处理完成',
  [PROGRESS_STAGES.ERROR]: '处理失败'
}

/**
 * 进度阶段管理器类
 */
export class ProgressStageManager {
  constructor() {
    this.currentStage = null
    this.workflowProgress = {
      currentNode: 0,
      totalNodes: 0,
      percentage: 0
    }
    this.callbacks = new Set()
    this.executedNodes = new Set() // 记录已执行的节点ID
    this.allNodeIds = [] // 存储所有节点ID列表
  }

  /**
   * 添加进度回调
   * @param {Function} callback - 回调函数 (stage, message, workflowProgress) => void
   */
  addCallback(callback) {
    this.callbacks.add(callback)
  }

  /**
   * 移除进度回调
   * @param {Function} callback - 回调函数
   */
  removeCallback(callback) {
    this.callbacks.delete(callback)
  }

  /**
   * 触发所有回调
   */
  _notifyCallbacks() {
    const message = this.getCurrentMessage()
    this.callbacks.forEach(callback => {
      try {
        callback(this.currentStage, message, { ...this.workflowProgress })
      } catch (error) {
        console.error('进度回调执行错误:', error)
      }
    })
  }

  /**
   * 设置当前阶段
   * @param {string} stage - 阶段标识
   */
  setStage(stage) {
    if (this.currentStage !== stage) {
      this.currentStage = stage
      console.log(`🔄 进度阶段更新: ${stage}`)

      // 重置工作流进度（除非是处理阶段）
      if (stage !== PROGRESS_STAGES.PROCESSING) {
        this.workflowProgress = {
          currentNode: 0,
          totalNodes: 0,
          percentage: 0
        }
        this.executedNodes.clear()
      }

      this._notifyCallbacks()
    }
  }

  /**
   * 更新工作流执行进度
   * @param {number} currentNode - 当前节点数
   * @param {number} totalNodes - 总节点数
   */
  updateWorkflowProgress(currentNode, totalNodes) {
    this.currentStage = PROGRESS_STAGES.PROCESSING
    this.workflowProgress = {
      currentNode: Math.max(0, currentNode),
      totalNodes: Math.max(0, totalNodes),
      percentage: totalNodes > 0 ? Math.round((currentNode / totalNodes) * 100) : 0
    }

    console.log(`📊 工作流进度: ${currentNode}/${totalNodes} (${this.workflowProgress.percentage}%)`)
    this._notifyCallbacks()
  }

  /**
   * 设置工作流节点列表
   * @param {Array} nodeIds - 所有节点ID列表
   */
  setWorkflowNodes(nodeIds) {
    this.allNodeIds = [...nodeIds]
    this.workflowProgress.totalNodes = nodeIds.length
    console.log(`📊 设置工作流节点列表: ${nodeIds.length}个节点`, nodeIds)
  }

  /**
   * 从节点ID解析进度（ComfyUI节点执行消息）
   * @param {string} nodeId - 节点ID
   */
  updateFromNodeExecution(nodeId) {
    if (!nodeId) return

    // 记录已执行的节点
    this.executedNodes.add(nodeId)

    // 计算当前进度
    const currentNode = this.executedNodes.size
    const totalNodes = this.workflowProgress.totalNodes || this.allNodeIds.length

    if (totalNodes > 0) {
      this.updateWorkflowProgress(currentNode, totalNodes)
    } else {
      // 如果不知道总节点数，只更新当前节点
      this.currentStage = PROGRESS_STAGES.PROCESSING
      this.workflowProgress.currentNode = currentNode

      console.log(`📊 工作流执行节点: ${nodeId} (已执行: ${currentNode})`)
      this._notifyCallbacks()
    }
  }

  /**
   * 获取当前显示消息
   * @returns {string} 显示消息
   */
  getCurrentMessage() {
    if (this.currentStage === PROGRESS_STAGES.PROCESSING && this.workflowProgress.totalNodes > 0) {
      // 工作流执行阶段显示详细进度
      const { currentNode, totalNodes, percentage } = this.workflowProgress
      return `${percentage}%（${currentNode}/${totalNodes}）`
    } else {
      // 其他阶段显示阶段文本
      return STAGE_TEXTS[this.currentStage] || '处理中...'
    }
  }

  /**
   * 获取当前状态
   * @returns {Object} 当前状态对象
   */
  getCurrentState() {
    return {
      stage: this.currentStage,
      message: this.getCurrentMessage(),
      workflowProgress: { ...this.workflowProgress },
      isWorkflowStage: this.currentStage === PROGRESS_STAGES.PROCESSING && this.workflowProgress.totalNodes > 0
    }
  }

  /**
   * 重置进度状态
   */
  reset() {
    this.currentStage = null
    this.workflowProgress = {
      currentNode: 0,
      totalNodes: 0,
      percentage: 0
    }
    this.executedNodes.clear()
    this.allNodeIds = []
    console.log('🔄 进度状态已重置')
  }

  /**
   * 设置错误状态
   * @param {string} errorMessage - 错误消息
   */
  setError(errorMessage = '处理失败') {
    this.currentStage = PROGRESS_STAGES.ERROR
    this.errorMessage = errorMessage
    console.log(`❌ 进度错误: ${errorMessage}`)
    this._notifyCallbacks()
  }

  /**
   * 设置完成状态
   */
  setCompleted() {
    this.currentStage = PROGRESS_STAGES.COMPLETED
    console.log('✅ 进度完成')
    this._notifyCallbacks()
  }
}

/**
 * 创建进度阶段管理器实例
 * @returns {ProgressStageManager} 管理器实例
 */
export function createProgressStageManager() {
  return new ProgressStageManager()
}

/**
 * 解析ComfyUI工作流JSON，获取所有节点ID
 * @param {Object} workflow - 工作流JSON对象
 * @returns {Array} 节点ID列表
 */
export function getWorkflowNodeIds(workflow) {
  if (!workflow || typeof workflow !== 'object') {
    return []
  }

  // ComfyUI工作流的节点存储在根级别，每个键是节点ID
  const nodeIds = Object.keys(workflow).filter(key => {
    const node = workflow[key]
    return node && typeof node === 'object' && node.class_type
  })

  return nodeIds
}

/**
 * 解析ComfyUI工作流JSON，获取总节点数
 * @param {Object} workflow - 工作流JSON对象
 * @returns {number} 总节点数
 */
export function getWorkflowTotalNodes(workflow) {
  return getWorkflowNodeIds(workflow).length
}

/**
 * 从节点ID提取数字
 * @param {string} nodeId - 节点ID
 * @returns {number} 提取的数字，如果无法提取则返回0
 */
export function extractNodeNumber(nodeId) {
  if (!nodeId) return 0

  // 尝试直接转换为数字
  const directNumber = parseInt(nodeId)
  if (!isNaN(directNumber)) {
    return directNumber
  }

  // 尝试从字符串中提取数字
  const match = nodeId.toString().match(/\d+/)
  return match ? parseInt(match[0]) : 0
}
