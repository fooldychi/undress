// 导入ComfyUI工作流服务
import { processUndressImage } from './comfyui.js'

// ComfyUI API服务配置 - 将使用动态配置
const API_CONFIG = {
  // ComfyUI服务器URL - 将从配置服务获取
  BASE_URL: 'https://dzqgp58z0s-8188.cnb.run', // 默认值，将被配置服务覆盖
  // 客户端ID，用于标识请求来源
  CLIENT_ID: 'abc1373d4ad648a3a81d0587fbe5534b', // 默认值，将被配置服务覆盖
  // 请求超时时间（毫秒）
  TIMEOUT: 300000 // 5分钟
}

// 后端API服务配置
const BACKEND_API_CONFIG = {
  // 后端服务器URL - 使用代理，开发环境下会自动转发到 http://localhost:3006
  BASE_URL: '',
  // 请求超时时间（毫秒）
  TIMEOUT: 30000 // 30秒
}

// 通用请求函数
async function makeRequest(endpoint, options = {}) {
  const url = `${API_CONFIG.BASE_URL}${endpoint}`

  const defaultOptions = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(API_CONFIG.API_KEY && { 'Authorization': `Bearer ${API_CONFIG.API_KEY}` })
    },
    ...options
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT)

    const response = await fetch(url, {
      ...defaultOptions,
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('请求超时，请稍后重试')
    }
    throw new Error(`请求失败: ${error.message}`)
  }
}

// 将Base64图片转换为Blob
function base64ToBlob(base64Data) {
  const byteCharacters = atob(base64Data.split(',')[1])
  const byteNumbers = new Array(byteCharacters.length)

  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i)
  }

  const byteArray = new Uint8Array(byteNumbers)
  return new Blob([byteArray], { type: 'image/jpeg' })
}

// 模拟API响应（用于开发测试）
function createMockResponse(type) {
  // 这里返回一个模拟的base64图片数据
  // 在实际部署时，这些函数会被真实的API调用替换
  const mockImageBase64 = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k='

  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        resultImage: mockImageBase64,
        message: `${type}处理完成`
      })
    }, 2000) // 模拟2秒处理时间
  })
}

export const comfyApi = {
  // 一键换衣API - 使用真实的ComfyUI工作流
  clothesSwap: async (imageData) => {
    try {
      console.log('调用一键换衣API...')

      // 调用ComfyUI工作流处理
      const result = await processUndressImage(imageData)

      if (result.success) {
        return {
          success: true,
          resultImage: result.resultImage,
          promptId: result.promptId,
          message: result.message
        }
      } else {
        throw new Error(result.error || '处理失败')
      }

    } catch (error) {
      console.error('换衣API调用失败:', error)

      // 如果是开发环境，回退到模拟响应
      if (import.meta.env.DEV) {
        console.log('回退到开发模式模拟响应')
        return await createMockResponse('换衣')
      }

      throw error
    }
  },

  // 文生图API
  textToImage: async ({ prompt, size = '512x512', style = 'realistic' }) => {
    try {
      // 在开发环境中使用模拟响应
      if (import.meta.env.DEV) {
        console.log('开发模式：使用模拟文生图API', { prompt, size, style })
        return await createMockResponse('文生图')
      }

      // 生产环境中的真实API调用
      const [width, height] = size.split('x').map(Number)

      const response = await makeRequest('/api/text-to-image', {
        body: JSON.stringify({
          prompt,
          width,
          height,
          style,
          // ComfyUI工作流参数
          workflow_id: 'text_to_image_workflow',
          parameters: {
            steps: 20,
            cfg_scale: 7.5,
            sampler: 'euler_a',
            seed: -1 // 随机种子
          }
        })
      })

      return response
    } catch (error) {
      console.error('文生图API调用失败:', error)
      throw error
    }
  },

  // 换脸API
  faceSwap: async ({ sourceImage, targetImage, preserveExpression = true, enhanceQuality = false }) => {
    try {
      // 在开发环境中使用模拟响应
      if (import.meta.env.DEV) {
        console.log('开发模式：使用模拟换脸API', { preserveExpression, enhanceQuality })
        return await createMockResponse('换脸')
      }

      // 生产环境中的真实API调用
      const response = await makeRequest('/api/face-swap', {
        body: JSON.stringify({
          source_image: sourceImage,
          target_image: targetImage,
          // ComfyUI工作流参数
          workflow_id: 'face_swap_workflow',
          parameters: {
            preserve_expression: preserveExpression,
            enhance_quality: enhanceQuality,
            blend_ratio: 0.8,
            face_detection_threshold: 0.5
          }
        })
      })

      return response
    } catch (error) {
      console.error('换脸API调用失败:', error)
      throw error
    }
  },

  // 获取工作流状态
  getWorkflowStatus: async (taskId) => {
    try {
      const response = await makeRequest(`/api/status/${taskId}`, {
        method: 'GET'
      })
      return response
    } catch (error) {
      console.error('获取工作流状态失败:', error)
      throw error
    }
  },

  // 获取可用的工作流列表
  getAvailableWorkflows: async () => {
    try {
      const response = await makeRequest('/api/workflows', {
        method: 'GET'
      })
      return response
    } catch (error) {
      console.error('获取工作流列表失败:', error)
      throw error
    }
  }
}

// 后端API请求函数（带重试机制）
async function makeBackendRequest(endpoint, options = {}, retryCount = 0) {
  const url = `${BACKEND_API_CONFIG.BASE_URL}${endpoint}`

  const defaultOptions = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    ...options
  }

  // 添加认证token（如果存在）
  const token = localStorage.getItem('auth_token')
  if (token) {
    defaultOptions.headers.Authorization = `Bearer ${token}`
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), BACKEND_API_CONFIG.TIMEOUT)

    const response = await fetch(url, {
      ...defaultOptions,
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    // 检查响应是否有内容
    const contentType = response.headers.get('content-type')
    let data = null

    if (contentType && contentType.includes('application/json')) {
      const text = await response.text()
      if (text) {
        try {
          data = JSON.parse(text)
        } catch (parseError) {
          throw new Error(`JSON解析失败: ${parseError.message}`)
        }
      } else {
        throw new Error('服务器返回空响应')
      }
    } else {
      const text = await response.text()
      throw new Error(`服务器返回非JSON响应: ${text}`)
    }

    if (!response.ok) {
      throw new Error(data?.message || `HTTP error! status: ${response.status}`)
    }

    return data
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('请求超时，请稍后重试')
    }

    // 处理网络连接错误 - 尝试重试
    if ((error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) && retryCount < 2) {
      console.log(`网络请求失败，正在重试... (${retryCount + 1}/3)`)
      await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))) // 递增延迟
      return makeBackendRequest(endpoint, options, retryCount + 1)
    }

    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      throw new Error('网络连接失败，请检查服务器状态')
    }

    // 处理认证错误
    if (error.message.includes('认证过程中发生错误') || error.message.includes('401')) {
      // 清除无效的token
      localStorage.removeItem('auth_token')
      localStorage.removeItem('user_info')
      throw new Error('登录已过期，请重新登录')
    }

    throw new Error(`请求失败: ${error.message}`)
  }
}

// 认证API
export const authApi = {
  // 用户注册
  register: async (username, password) => {
    try {
      const response = await makeBackendRequest('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      })

      // 注册成功后自动保存token
      if (response.success && response.data.token) {
        localStorage.setItem('auth_token', response.data.token)
        localStorage.setItem('user_info', JSON.stringify(response.data.user))
      }

      return response
    } catch (error) {
      console.error('注册失败:', error)
      throw error
    }
  },

  // 用户登录
  login: async (username, password) => {
    try {
      const response = await makeBackendRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      })

      // 登录成功后保存token和用户信息
      if (response.success && response.data.token) {
        localStorage.setItem('auth_token', response.data.token)
        localStorage.setItem('user_info', JSON.stringify(response.data.user))
      }

      return response
    } catch (error) {
      console.error('登录失败:', error)
      throw error
    }
  },

  // 获取当前用户信息
  getCurrentUser: async () => {
    try {
      const response = await makeBackendRequest('/api/auth/me', {
        method: 'GET'
      })

      // 更新本地存储的用户信息
      if (response.success && response.data.user) {
        localStorage.setItem('user_info', JSON.stringify(response.data.user))
      }

      return response
    } catch (error) {
      console.error('获取用户信息失败:', error)
      throw error
    }
  },

  // 退出登录
  logout: () => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('user_info')
    return Promise.resolve({ success: true, message: '退出登录成功' })
  },

  // 检查是否已登录
  isLoggedIn: () => {
    const token = localStorage.getItem('auth_token')
    const userInfo = localStorage.getItem('user_info')
    return !!(token && userInfo)
  },

  // 获取本地存储的用户信息
  getLocalUserInfo: () => {
    const userInfo = localStorage.getItem('user_info')
    return userInfo ? JSON.parse(userInfo) : null
  },

  // 获取认证token
  getToken: () => {
    return localStorage.getItem('auth_token')
  }
}

// 积分API
export const pointsApi = {
  // 获取用户积分信息
  getUserPoints: async () => {
    try {
      const response = await makeBackendRequest('/api/level-cards/user-points', {
        method: 'GET'
      })
      return response
    } catch (error) {
      console.error('获取积分信息失败:', error)
      throw error
    }
  },

  // 获取积分使用记录
  getPointsHistory: async (page = 1, limit = 20, recent = false) => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        recent: recent.toString()
      })

      const response = await makeBackendRequest(`/api/level-cards/point-logs?${params}`, {
        method: 'GET'
      })
      return response
    } catch (error) {
      console.error('获取积分记录失败:', error)
      throw error
    }
  },

  // 获取用户绑定的等级卡信息
  getUserCards: async () => {
    try {
      const response = await makeBackendRequest('/api/level-cards/my-cards', {
        method: 'GET'
      })
      return response
    } catch (error) {
      console.error('获取等级卡信息失败:', error)
      throw error
    }
  },

  // 消耗积分
  consumePoints: async (amount, description = '积分消费', mediaUrl = null) => {
    try {
      const response = await makeBackendRequest('/api/level-cards/consume-points', {
        method: 'POST',
        body: JSON.stringify({ amount, description, mediaUrl })
      })
      return response
    } catch (error) {
      console.error('消耗积分失败:', error)
      throw error
    }
  }
}

// 系统API
export const systemApi = {
  // 健康检查
  healthCheck: async () => {
    try {
      const response = await makeBackendRequest('/api/level-cards/types', {
        method: 'GET'
      })
      return response
    } catch (error) {
      console.error('健康检查失败:', error)
      throw error
    }
  }
}

// 等级卡API
export const levelCardApi = {
  // 获取等级卡类型列表
  getCardTypes: async () => {
    try {
      const response = await makeBackendRequest('/api/level-cards/types', {
        method: 'GET'
      })
      return response
    } catch (error) {
      console.error('获取等级卡类型失败:', error)
      throw error
    }
  },

  // 绑定等级卡
  bindCard: async (cardNumber, cardPassword) => {
    try {
      const response = await makeBackendRequest('/api/level-cards/bind', {
        method: 'POST',
        body: JSON.stringify({ cardNumber, cardPassword })
      })
      return response
    } catch (error) {
      console.error('绑定等级卡失败:', error)
      throw error
    }
  },

  // 获取用户绑定的等级卡列表
  getMyCards: async () => {
    try {
      const response = await makeBackendRequest('/api/level-cards/my-cards', {
        method: 'GET'
      })
      return response
    } catch (error) {
      console.error('获取我的等级卡失败:', error)
      throw error
    }
  },

  // 获取用户积分信息（基于等级卡）
  getUserPoints: async () => {
    try {
      const response = await makeBackendRequest('/api/level-cards/user-points', {
        method: 'GET'
      })
      return response
    } catch (error) {
      console.error('获取用户积分失败:', error)
      throw error
    }
  }
}

// 用户API
export const userApi = {
  // 获取用户详细信息
  getUserProfile: async (userId) => {
    try {
      const response = await makeBackendRequest(`/api/users/${userId}`, {
        method: 'GET'
      })
      return response
    } catch (error) {
      console.error('获取用户详细信息失败:', error)
      throw error
    }
  },

  // 更新用户信息
  updateUserProfile: async (userId, userData) => {
    try {
      const response = await makeBackendRequest(`/api/users/${userId}`, {
        method: 'PUT',
        body: JSON.stringify(userData)
      })
      return response
    } catch (error) {
      console.error('更新用户信息失败:', error)
      throw error
    }
  }
}

// 更新API配置的函数
export function updateAPIConfig(newConfig) {
  if (newConfig.COMFYUI_SERVER_URL) {
    API_CONFIG.BASE_URL = newConfig.COMFYUI_SERVER_URL
    console.log('🔄 API_CONFIG.BASE_URL 已更新为:', API_CONFIG.BASE_URL)
  }
  if (newConfig.CLIENT_ID) {
    API_CONFIG.CLIENT_ID = newConfig.CLIENT_ID
    console.log('🔄 API_CONFIG.CLIENT_ID 已更新为:', API_CONFIG.CLIENT_ID)
  }
  if (newConfig.TIMEOUT) {
    API_CONFIG.TIMEOUT = newConfig.TIMEOUT
    console.log('🔄 API_CONFIG.TIMEOUT 已更新为:', API_CONFIG.TIMEOUT)
  }
}

// 导出配置，方便其他地方使用
export { API_CONFIG, BACKEND_API_CONFIG }
