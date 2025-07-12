import request from '@/utils/request'

/**
 * 获取用户列表
 */
export function getUserList(params) {
  return request({
    url: '/admin/users',
    method: 'get',
    params
  })
}

/**
 * 获取用户详情
 */
export function getUserDetail(id) {
  return request({
    url: `/admin/users/${id}`,
    method: 'get'
  })
}

/**
 * 更新用户状态
 * @param {number} id 用户ID
 * @param {string} status 新状态 ('active'|'banned')
 */
export function updateUserStatus(id, status) {
  const endpoint = status === 'banned' ? 
    `/admin/users/${id}/ban` : 
    `/admin/users/${id}/unban`;
  
  return request({
    url: endpoint,
    method: 'post'
  })
}

