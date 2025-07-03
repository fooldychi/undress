/**
 * CORS 处理工具
 * 用于处理跨域请求问题
 */

// 公共 CORS 代理服务列表（按优先级排序）
const CORS_PROXIES = [
  {
    name: 'allorigins',
    url: 'https://api.allorigins.win/get?url=',
    needsUnwrap: true // 需要从响应中提取 contents
  },
  {
    name: 'thingproxy',
    url: 'https://thingproxy.freeboard.io/fetch/',
    needsUnwrap: false
  },
  {
    name: 'cors-anywhere',
    url: 'https://cors-anywhere.herokuapp.com/',
    needsUnwrap: false
  }
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
export function getCORSProxy(originalUrl, corsMode = 'cors-proxy', proxyIndex = 0) {
  // 只有在 cors-proxy 模式下才使用代理
  if (corsMode === 'cors-proxy' && proxyIndex < CORS_PROXIES.length) {
    const proxy = CORS_PROXIES[proxyIndex]
    return {
      url: `${proxy.url}${encodeURIComponent(originalUrl)}`,
      needsUnwrap: proxy.needsUnwrap,
      name: proxy.name
    }
  }

  // 其他模式直接返回原 URL
  return {
    url: originalUrl,
    needsUnwrap: false,
    name: 'direct'
  }
}

// 检查是否应该使用 CORS 代理
export function shouldUseCORSProxy(corsMode) {
  return corsMode === 'cors-proxy'
}

// 处理代理响应
export async function unwrapProxyResponse(response, needsUnwrap) {
  if (!needsUnwrap) {
    return response
  }

  // 对于 allorigins，需要从 JSON 响应中提取 contents
  try {
    const data = await response.json()
    if (data.contents) {
      // 创建一个新的响应对象，包含原始内容
      return new Response(data.contents, {
        status: data.status?.http_code || 200,
        statusText: 'OK',
        headers: {
          'Content-Type': 'application/json'
        }
      })
    } else {
      throw new Error('代理响应格式错误')
    }
  } catch (error) {
    console.error('解析代理响应失败:', error)
    throw new Error('代理响应解析失败')
  }
}

// 创建带有重试机制的 fetch 函数
export async function fetchWithRetry(url, options = {}, maxRetries = 5, corsMode = 'direct') {
  let lastError
  const originalUrl = url

  for (let i = 0; i < maxRetries; i++) {
    try {
      let requestUrl = url
      let requestOptions = { ...options }
      let needsUnwrap = false
      let proxyName = 'direct'

      // 根据 CORS 模式和重试次数决定策略
      if (needsCORS(url)) {
        if (corsMode === 'cors-proxy') {
          // CORS 代理模式：尝试不同的代理服务
          if (i < CORS_PROXIES.length) {
            const proxyInfo = getCORSProxy(originalUrl, corsMode, i)
            requestUrl = proxyInfo.url
            needsUnwrap = proxyInfo.needsUnwrap
            proxyName = proxyInfo.name
            console.log(`🔄 尝试CORS代理 (${proxyName}): ${requestUrl}`)
            requestOptions = {
              ...options,
              mode: 'cors',
              headers: {
                'Content-Type': 'application/json',
                ...options.headers
              }
            }
          } else if (i === CORS_PROXIES.length) {
            // 所有代理都试过了，尝试直接请求
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
            // 备用：尝试第一个代理
            const proxyInfo = getCORSProxy(originalUrl, 'cors-proxy', 0)
            requestUrl = proxyInfo.url
            needsUnwrap = proxyInfo.needsUnwrap
            proxyName = proxyInfo.name
            console.log(`🔄 尝试CORS代理 (${proxyName}): ${requestUrl}`)
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

      let response = await fetch(requestUrl, requestOptions)

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

      // 如果使用了需要解包的代理，处理响应
      if (needsUnwrap) {
        console.log(`🔄 解包代理响应 (${proxyName})`)
        response = await unwrapProxyResponse(response, needsUnwrap)
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
    return {
      type: 'cors',
      message: 'CORS跨域错误',
      details: 'ComfyUI服务器没有设置正确的跨域头，无法从浏览器直接访问',
      solutions: [
        '在ComfyUI服务器上配置CORS头',
        '使用支持CORS的代理服务器',
        '部署自己的后端API服务'
      ]
    }
  }

  if (message.includes('Failed to fetch')) {
    return {
      type: 'cors',
      message: 'CORS跨域错误',
      details: 'ComfyUI服务器没有设置正确的跨域头，无法从浏览器直接访问',
      solutions: [
        '在ComfyUI服务器上配置CORS头',
        '使用支持CORS的代理服务器',
        '部署自己的后端API服务'
      ]
    }
  }

  if (message.includes('405')) {
    return {
      type: 'method',
      message: '请求方法不支持',
      details: 'ComfyUI服务器不支持此请求方法',
      solutions: [
        '检查API端点是否正确',
        '确认ComfyUI服务器版本兼容性'
      ]
    }
  }

  if (message.includes('404')) {
    return {
      type: 'notfound',
      message: 'API端点不存在',
      details: '请检查ComfyUI服务器地址和API路径',
      solutions: [
        '确认ComfyUI服务器地址正确',
        '检查服务器是否正在运行',
        '验证API路径是否正确'
      ]
    }
  }

  if (message.includes('500')) {
    return {
      type: 'server',
      message: 'ComfyUI服务器内部错误',
      details: '服务器处理请求时发生错误',
      solutions: [
        '检查ComfyUI服务器日志',
        '确认服务器资源充足',
        '重启ComfyUI服务器'
      ]
    }
  }

  return {
    type: 'unknown',
    message: '未知错误',
    details: message,
    solutions: [
      '检查网络连接',
      '确认服务器地址正确',
      '查看浏览器控制台获取更多信息'
    ]
  }
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
