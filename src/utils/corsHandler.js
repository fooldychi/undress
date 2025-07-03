/**
 * CORS 处理工具
 * 用于处理跨域请求问题
 */

// 公共 CORS 代理服务列表（按优先级排序）
const CORS_PROXIES = [
  'https://api.allorigins.win/raw?url=',
  'https://cors-anywhere.herokuapp.com/',
  'https://thingproxy.freeboard.io/fetch/',
  'https://api.codetabs.com/v1/proxy?quest='
]

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

// 获取可用的 CORS 代理
export function getCORSProxy(originalUrl, corsMode = 'cors-proxy') {
  // 只有在 cors-proxy 模式下才使用代理
  if (corsMode === 'cors-proxy') {
    return `${CORS_PROXIES[0]}${encodeURIComponent(originalUrl)}`
  }

  // 其他模式直接返回原 URL
  return originalUrl
}

// 检查是否应该使用 CORS 代理
export function shouldUseCORSProxy(corsMode) {
  return corsMode === 'cors-proxy'
}

// 创建带有重试机制的 fetch 函数
export async function fetchWithRetry(url, options = {}, maxRetries = 3, corsMode = 'direct') {
  let lastError
  const originalUrl = url

  for (let i = 0; i < maxRetries; i++) {
    try {
      let requestUrl = url
      let requestOptions = { ...options }

      // 根据 CORS 模式和重试次数决定策略
      if (needsCORS(url)) {
        if (corsMode === 'cors-proxy') {
          // CORS 代理模式：优先使用代理
          if (i === 0) {
            requestUrl = getCORSProxy(originalUrl, corsMode)
            console.log(`🔄 尝试CORS代理: ${requestUrl}`)
            requestOptions = {
              ...options,
              mode: 'cors',
              headers: {
                'Content-Type': 'application/json',
                ...options.headers
              }
            }
          } else if (i === 1) {
            // 备用：直接请求
            console.log(`🔄 尝试直接请求: ${url}`)
            requestOptions = createCORSConfig(url, options)
          } else {
            // 最后尝试：no-cors 模式
            console.log(`🔄 尝试无CORS模式: ${url}`)
            requestOptions = {
              ...options,
              mode: 'no-cors',
              headers: {}
            }
          }
        } else {
          // 直接模式：按原来的逻辑
          if (i === 0) {
            console.log(`🔄 尝试直接请求: ${url}`)
            requestOptions = createCORSConfig(url, options)
          } else if (i === 1) {
            console.log(`🔄 尝试无CORS模式: ${url}`)
            requestOptions = {
              ...options,
              mode: 'no-cors',
              headers: {}
            }
          } else {
            requestUrl = getCORSProxy(originalUrl, 'cors-proxy')
            console.log(`🔄 尝试CORS代理: ${requestUrl}`)
            requestOptions = {
              ...options,
              mode: 'cors',
              headers: {
                'Content-Type': 'application/json',
                ...options.headers
              }
            }
          }
        }
      }

      const response = await fetch(requestUrl, requestOptions)

      // 对于 no-cors 模式，无法检查状态码
      if (requestOptions.mode === 'no-cors') {
        if (response.type === 'opaque') {
          console.log('✅ 无CORS模式请求成功')
          return response
        } else {
          throw new Error('无CORS模式请求失败')
        }
      }

      if (!response.ok) {
        const errorText = await response.text().catch(() => response.statusText)
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }

      console.log(`✅ 请求成功: ${requestUrl}`)
      return response
    } catch (error) {
      lastError = error
      console.warn(`❌ 请求失败 (尝试 ${i + 1}/${maxRetries}):`, error.message)

      if (i < maxRetries - 1) {
        // 等待一段时间后重试
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)))
      }
    }
  }

  throw new Error(`所有请求方式都失败了: ${getCORSErrorMessage(lastError)}`)
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
  const message = error?.message || '未知错误'

  if (message.includes('CORS') || message.includes('cross-origin')) {
    return 'CORS错误 - ComfyUI服务器可能没有设置正确的跨域头'
  }

  if (message.includes('Failed to fetch')) {
    return 'CORS错误 - ComfyUI服务器可能没有设置正确的跨域头'
  }

  if (message.includes('405')) {
    return '无CORS模式上传 失败: 405  - ComfyUI服务器不支持此请求方法'
  }

  if (message.includes('404')) {
    return 'API端点不存在 - 请检查ComfyUI服务器地址和API路径'
  }

  if (message.includes('500')) {
    return 'ComfyUI服务器内部错误 - 请检查服务器状态'
  }

  return message
}

// 检查是否为 CORS 相关错误
export function isCORSError(error) {
  const message = error?.message || ''
  return message.includes('CORS') ||
         message.includes('cross-origin') ||
         message.includes('Failed to fetch') ||
         message.includes('Network request failed')
}

// 创建 CORS 友好的错误处理
export function handleCORSError(error, context = '') {
  const corsMessage = getCORSErrorMessage(error)
  const fullMessage = context ? `${context}: ${corsMessage}` : corsMessage

  console.error('CORS错误详情:', {
    context,
    originalError: error,
    friendlyMessage: corsMessage
  })

  return new Error(fullMessage)
}
