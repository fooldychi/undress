import Cookies from 'js-cookie'

const TOKEN_KEY = 'admin_token'
const USER_KEY = 'admin_user'

/**
 * 获取token
 */
export function getToken() {
  return Cookies.get(TOKEN_KEY)
}

/**
 * 设置token
 */
export function setToken(token) {
  return Cookies.set(TOKEN_KEY, token, { expires: 7 }) // 7天过期
}

/**
 * 移除token
 */
export function removeToken() {
  return Cookies.remove(TOKEN_KEY)
}

/**
 * 获取用户信息
 */
export function getUser() {
  const userStr = localStorage.getItem(USER_KEY)
  if (userStr) {
    try {
      return JSON.parse(userStr)
    } catch (e) {
      console.error('解析用户信息失败:', e)
      return null
    }
  }
  return null
}

/**
 * 设置用户信息
 */
export function setUser(user) {
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

/**
 * 移除用户信息
 */
export function removeUser() {
  localStorage.removeItem(USER_KEY)
}

/**
 * 清除所有认证信息
 */
export function clearAuth() {
  removeToken()
  removeUser()
}

/**
 * 检查是否已登录
 */
export function isLoggedIn() {
  return !!getToken()
}
