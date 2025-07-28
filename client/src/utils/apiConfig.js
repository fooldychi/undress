// 统一API配置管理工具
// 解决多处配置不一致的问题

/**
 * 获取API基础URL
 * 统一管理所有API调用的基础地址
 * @returns {string} API基础URL
 */
export function getAPIBaseURL() {
  if (import.meta.env.MODE === 'development') {
    console.log('🔧 开发环境：使用代理模式')
    return '' // 开发环境使用代理
  }
  
  // 生产环境：从环境变量获取
  const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://114.132.50.71:3007/api'
  let baseUrl = apiUrl.replace('/api', '')
  
  // 强制使用HTTP协议（防止意外的HTTPS配置）
  if (baseUrl.startsWith('https://')) {
    console.warn('⚠️ 检测到HTTPS配置，强制转换为HTTP:', baseUrl)
    baseUrl = baseUrl.replace('https://', 'http://')
  }
  
  // 确保没有尾部斜杠
  baseUrl = baseUrl.replace(/\/$/, '')
  
  console.log('🌐 生产环境API基础URL:', baseUrl)
  return baseUrl
}

/**
 * 构建完整的API URL
 * @param {string} endpoint - API端点路径（如：'/api/config'）
 * @returns {string} 完整的API URL
 */
export function buildAPIURL(endpoint) {
  const baseUrl = getAPIBaseURL()
  
  // 确保endpoint以/开头
  if (!endpoint.startsWith('/')) {
    endpoint = '/' + endpoint
  }
  
  const fullUrl = baseUrl + endpoint
  console.log(`🔗 构建API URL: ${endpoint} -> ${fullUrl}`)
  return fullUrl
}

/**
 * 获取后端API配置对象
 * @returns {Object} API配置对象
 */
export function getBackendAPIConfig() {
  return {
    BASE_URL: getAPIBaseURL(),
    TIMEOUT: 30000 // 30秒
  }
}

/**
 * 创建标准的fetch请求配置
 * @param {Object} options - 请求选项
 * @returns {Object} fetch配置对象
 */
export function createFetchConfig(options = {}) {
  const config = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    ...options
  }
  
  // 添加认证token（如果存在）
  const token = localStorage.getItem('auth_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  
  return config
}

/**
 * 统一的API请求函数
 * @param {string} endpoint - API端点
 * @param {Object} options - 请求选项
 * @returns {Promise} fetch Promise
 */
export async function apiRequest(endpoint, options = {}) {
  const url = buildAPIURL(endpoint)
  const config = createFetchConfig(options)
  
  console.log(`🚀 API请求: ${config.method} ${url}`)
  
  try {
    const response = await fetch(url, config)
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const data = await response.json()
    console.log(`✅ API响应成功: ${endpoint}`)
    return data
    
  } catch (error) {
    console.error(`❌ API请求失败: ${endpoint}`, error)
    throw error
  }
}

// 导出常用的API端点
export const API_ENDPOINTS = {
  // 配置相关
  PUBLIC_CONFIG: '/api/public-config',
  CONFIG: '/api/config',
  
  // 工作流相关
  WORKFLOW_CONFIG_PUBLIC: '/api/workflow-config/public',
  WORKFLOW_CONFIG_FEATURES: '/api/workflow-config/features',
  
  // 认证相关
  AUTH_LOGIN: '/api/auth/login',
  AUTH_REGISTER: '/api/auth/register',
  AUTH_PROFILE: '/api/auth/profile',
  
  // 用户相关
  USER_PROFILE: '/api/user/profile',
  USER_POINTS: '/api/user/points',
  
  // AI处理相关
  AI_UNDRESS: '/api/ai/undress',
  AI_FACESWAP: '/api/ai/faceswap'
}

// 调试信息
console.log('📋 API配置工具已加载')
console.log('🔧 当前环境:', import.meta.env.MODE)
console.log('🌐 API基础URL:', getAPIBaseURL())
