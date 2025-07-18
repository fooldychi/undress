import request from '@/utils/request'

/**
 * 获取工作流配置（管理员用）
 */
export function getWorkflowConfig() {
  return request({
    url: '/workflow-config',
    method: 'get'
  })
}

/**
 * 获取公开工作流配置
 */
export function getPublicWorkflowConfig() {
  return request({
    url: '/workflow-config/public',
    method: 'get'
  })
}

/**
 * 更新工作流基础信息
 */
export function updateWorkflowInfo(workflowType, data) {
  return request({
    url: `/workflow-config/info/${workflowType}`,
    method: 'put',
    data
  })
}

/**
 * 更新工作流节点配置
 */
export function updateWorkflowNodes(workflowType, data) {
  return request({
    url: `/workflow-config/nodes/${workflowType}`,
    method: 'put',
    data
  })
}

/**
 * 批量更新工作流配置
 */
export function batchUpdateWorkflowConfig(data) {
  return request({
    url: '/workflow-config/batch-update',
    method: 'post',
    data
  })
}
