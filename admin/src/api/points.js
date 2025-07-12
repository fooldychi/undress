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
