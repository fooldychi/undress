import request from '@/utils/request'

/**
 * 获取积分记录列表
 */
export function getPointsList(params) {
  return request({
    url: '/admin/points-logs',
    method: 'get',
    params
  })
}

/**
 * 查看积分记录结果
 */
export function viewPointsResult(url) {
  // 直接返回URL，让前端处理打开
  return Promise.resolve({ success: true, data: { url } })
}
