/**
 * CORS 处理工具
 * 用于处理跨域请求问题
 */

// 检测是否支持 CORS
export function supportsCORS() {
  return 'withCredentials' in new XMLHttpRequest()
}

// 创建支持 CORS 的请求配置
export function createCORSConfig(url, options = {}) {
  const config = {
    mode: 'cors',
    credentials: 'omit', // 不发送 cookies
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  }

  return config
}

// 检查 URL 是否需要 CORS 处理
export function needsCORS(url) {
  try {
    const urlObj = new URL(url)
    const currentOrigin = window.location.origin
    return urlObj.origin !== currentOrigin
  } catch (error) {
    return false
  }
}

// 创建带有重试机制的 fetch 函数
export async function fetchWithRetry(url, options = {}, maxRetries = 3) {
  let lastError

  for (let i = 0; i < maxRetries; i++) {
    try {
      const config = needsCORS(url) ? createCORSConfig(url, options) : options
      const response = await fetch(url, config)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      return response
    } catch (error) {
      lastError = error
      console.warn(`请求失败 (尝试 ${i + 1}/${maxRetries}):`, error.message)
      
      if (i < maxRetries - 1) {
        // 等待一段时间后重试
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)))
      }
    }
  }

  throw lastError
}

// 检查服务器是否支持 CORS
export async function checkCORSSupport(serverUrl) {
  try {
    const response = await fetch(serverUrl, {
      method: 'HEAD',
      mode: 'cors'
    })
    return true
  } catch (error) {
    console.warn('服务器不支持 CORS:', error.message)
    return false
  }
}

// 获取 CORS 错误的友好提示
export function getCORSErrorMessage(error) {
  if (error.message.includes('CORS') || error.message.includes('cross-origin')) {
    return '跨域访问被阻止。请确保 ComfyUI 服务器支持 CORS 访问，或使用代理服务器。'
  }
  return error.message
}
