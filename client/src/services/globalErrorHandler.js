import { ref } from 'vue'

// 全局错误状态
const errorState = ref({
  visible: false,
  title: '',
  message: '',
  details: '',
  showRetry: true,
  errorType: null
})

// 错误类型常量
export const ERROR_TYPES = {
  COMFYUI_SERVER_UNAVAILABLE: 'comfyui_server_unavailable',
  NETWORK_ERROR: 'network_error',
  AUTH_ERROR: 'auth_error',
  UNKNOWN_ERROR: 'unknown_error'
}

// ComfyUI 服务器不可用的错误关键词
const COMFYUI_ERROR_KEYWORDS = [
  'ComfyUI服务器不可用',
  '所有端点测试失败',
  'ComfyUI服务器不可达',
  'WebSocket连接失败',
  'WebSocket连接后未能锁定服务器',
  'ComfyUI服务器响应异常',
  'ComfyUI服务器集群不可用',
  '个服务器都无法连接',
  '没有找到健康的服务器',
  '没有可用的健康服务器',
  '无法获取可用的ComfyUI服务器',
  '负载均衡器未返回有效的服务器URL'
]

// 检查是否为 ComfyUI 服务器错误
function isComfyUIServerError(error) {
  const errorMessage = error?.message || error?.toString() || ''
  return COMFYUI_ERROR_KEYWORDS.some(keyword =>
    errorMessage.includes(keyword)
  )
}

// 检查是否为网络错误
function isNetworkError(error) {
  const errorMessage = error?.message || error?.toString() || ''
  const networkKeywords = [
    'Failed to fetch',
    'NetworkError',
    'fetch',
    'ECONNREFUSED',
    'ENOTFOUND',
    'timeout'
  ]
  return networkKeywords.some(keyword =>
    errorMessage.toLowerCase().includes(keyword.toLowerCase())
  )
}

// 检查是否为认证错误
function isAuthError(error) {
  const errorMessage = error?.message || error?.toString() || ''
  const authKeywords = [
    '登录已过期',
    '令牌已过期',
    '无效的访问令牌',
    '认证验证失败',
    '401'
  ]
  return authKeywords.some(keyword =>
    errorMessage.includes(keyword)
  )
}

// 显示全局错误弹窗
export function showGlobalError(error, options = {}) {
  console.error('🚨 全局错误处理器捕获错误:', error)

  let errorType = ERROR_TYPES.UNKNOWN_ERROR
  let title = '服务器不可用'
  let message = '目前服务器不可用，请刷新页面或稍后再试！'
  let showRetry = false // 默认不显示重试按钮

  // 根据错误类型设置提示
  if (isComfyUIServerError(error)) {
    errorType = ERROR_TYPES.COMFYUI_SERVER_UNAVAILABLE
    title = '服务器不可用'
    message = '目前服务器不可用，请刷新页面或稍后再试！'
    showRetry = false // ComfyUI 服务器错误只提供刷新页面
  } else if (isNetworkError(error)) {
    errorType = ERROR_TYPES.NETWORK_ERROR
    title = '服务器不可用'
    message = '目前服务器不可用，请刷新页面或稍后再试！'
    showRetry = false
  } else if (isAuthError(error)) {
    errorType = ERROR_TYPES.AUTH_ERROR
    title = '登录状态异常'
    message = '您的登录状态已过期，请刷新页面重新登录。'
    showRetry = false
  }

  // 应用自定义选项
  if (options.title) title = options.title
  if (options.message) message = options.message
  if (options.showRetry !== undefined) showRetry = options.showRetry

  // 更新错误状态
  errorState.value = {
    visible: true,
    title,
    message,
    errorType
  }

  // 阻止页面交互
  document.body.style.overflow = 'hidden'

  return errorState
}

// 隐藏全局错误弹窗
export function hideGlobalError() {
  errorState.value.visible = false
  document.body.style.overflow = ''
}

// 获取错误状态
export function getErrorState() {
  return errorState
}

// 全局错误拦截器
export function setupGlobalErrorHandler() {
  // 拦截未捕获的 Promise 错误
  window.addEventListener('unhandledrejection', (event) => {
    console.error('🚨 未处理的 Promise 拒绝:', event.reason)

    // Vue递归更新错误应该暴露给开发者，不要掩盖
    if (event.reason?.message?.includes('Maximum recursive updates exceeded')) {
      console.error('❌ Vue递归更新错误 - 需要修复代码逻辑!')
      console.error('检查以下可能原因:')
      console.error('1. watch中修改被监听的数据')
      console.error('2. computed中修改响应式数据')
      console.error('3. 模板中调用修改状态的函数')
      // 开发环境下不阻止错误，让开发者看到完整错误信息
      if (process.env.NODE_ENV === 'development') {
        return
      }
    }

    // 检查是否为关键错误
    if (isComfyUIServerError(event.reason) ||
        isNetworkError(event.reason) ||
        isAuthError(event.reason)) {
      showGlobalError(event.reason)
      event.preventDefault() // 阻止默认的错误处理
    }
  })

  // 拦截未捕获的 JavaScript 错误
  window.addEventListener('error', (event) => {
    console.error('🚨 未捕获的 JavaScript 错误:', event.error)

    // 检查是否为关键错误
    if (isComfyUIServerError(event.error) ||
        isNetworkError(event.error) ||
        isAuthError(event.error)) {
      showGlobalError(event.error)
    }
  })

  console.log('✅ 全局错误处理器已启动')
}

// 手动触发错误处理（供组件使用）
export function handleError(error, context = '') {
  console.error(`🚨 ${context} 错误:`, error)

  // 检查是否为需要全局处理的错误
  if (isComfyUIServerError(error) ||
      isNetworkError(error) ||
      isAuthError(error)) {
    showGlobalError(error)
    return true // 表示已被全局处理
  }

  return false // 表示需要组件自行处理
}

export default {
  showGlobalError,
  hideGlobalError,
  getErrorState,
  setupGlobalErrorHandler,
  handleError,
  ERROR_TYPES
}
