// 通知工具函数
// 提供简单的通知功能，兼容WebSocket重构版本

/**
 * 显示通知消息
 * @param {string} message - 通知消息
 * @param {string} type - 通知类型: 'success', 'error', 'warning', 'info'
 */
export function showNotification(message, type = 'info') {
  const timestamp = new Date().toLocaleTimeString()
  const typeEmoji = {
    'success': '✅',
    'error': '❌',
    'warning': '⚠️',
    'info': 'ℹ️'
  }

  // 控制台输出
  console.log(`${typeEmoji[type] || 'ℹ️'} [${timestamp}] ${message}`)

  // 触发自定义事件供Vue组件监听
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('comfyui-status', {
      detail: { message, type, timestamp }
    }))
  }

  // 如果有Vant Toast可用，也使用Toast显示
  if (typeof window !== 'undefined' && window.vant && window.vant.Toast) {
    const toastType = type === 'error' ? 'fail' : type === 'success' ? 'success' : 'loading'
    window.vant.Toast({
      type: toastType,
      message: message,
      duration: type === 'error' ? 3000 : 2000
    })
  }
}

/**
 * 显示成功通知
 * @param {string} message - 通知消息
 */
export function showSuccessNotification(message) {
  showNotification(message, 'success')
}

/**
 * 显示错误通知
 * @param {string} message - 通知消息
 */
export function showErrorNotification(message) {
  showNotification(message, 'error')
}

/**
 * 显示警告通知
 * @param {string} message - 通知消息
 */
export function showWarningNotification(message) {
  showNotification(message, 'warning')
}

/**
 * 显示信息通知
 * @param {string} message - 通知消息
 */
export function showInfoNotification(message) {
  showNotification(message, 'info')
}

// 默认导出
export default {
  showNotification,
  showSuccessNotification,
  showErrorNotification,
  showWarningNotification,
  showInfoNotification
}
