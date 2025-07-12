import request from '@/utils/request'

/**
 * 管理员登录
 */
export function login(data) {
  return request({
    url: '/admin-auth/login',
    method: 'post',
    data
  })
}

/**
 * 获取当前管理员信息
 */
export function getAdminInfo() {
  return request({
    url: '/admin-auth/me',
    method: 'get'
  })
}

/**
 * 管理员登出
 */
export function logout() {
  return request({
    url: '/admin-auth/logout',
    method: 'post'
  })
}
