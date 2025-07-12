import { ref, nextTick } from 'vue'

// 全局Toast状态管理
const toasts = ref([])
let toastId = 0

// 生成唯一ID
const generateId = () => {
  return `toast_${++toastId}_${Date.now()}`
}

// 添加Toast
const addToast = (options) => {
  const id = generateId()
  const toast = {
    id,
    visible: false,
    type: 'info',
    title: '',
    message: '',
    duration: 3000,
    closable: true,
    showIcon: true,
    position: 'top-right',
    ...options
  }
  
  toasts.value.push(toast)
  
  // 下一帧显示Toast，确保动画效果
  nextTick(() => {
    const toastIndex = toasts.value.findIndex(t => t.id === id)
    if (toastIndex !== -1) {
      toasts.value[toastIndex].visible = true
    }
  })
  
  return id
}

// 移除Toast
const removeToast = (id) => {
  const index = toasts.value.findIndex(toast => toast.id === id)
  if (index !== -1) {
    toasts.value[index].visible = false
    // 等待动画完成后移除
    setTimeout(() => {
      const currentIndex = toasts.value.findIndex(toast => toast.id === id)
      if (currentIndex !== -1) {
        toasts.value.splice(currentIndex, 1)
      }
    }, 300)
  }
}

// 清除所有Toast
const clearToasts = () => {
  toasts.value.forEach(toast => {
    toast.visible = false
  })
  setTimeout(() => {
    toasts.value.length = 0
  }, 300)
}

// 便捷方法
const showSuccess = (message, options = {}) => {
  return addToast({
    type: 'success',
    message,
    ...options
  })
}

const showError = (message, options = {}) => {
  return addToast({
    type: 'error',
    message,
    duration: 5000, // 错误消息显示更长时间
    ...options
  })
}

const showWarning = (message, options = {}) => {
  return addToast({
    type: 'warning',
    message,
    ...options
  })
}

const showInfo = (message, options = {}) => {
  return addToast({
    type: 'info',
    message,
    ...options
  })
}

// 组合式函数
export const useToast = () => {
  return {
    // 状态
    toasts,
    
    // 方法
    addToast,
    removeToast,
    clearToasts,
    
    // 便捷方法
    showSuccess,
    showError,
    showWarning,
    showInfo,
    
    // 别名方法（兼容现有代码）
    showToastMessage: (message, type = 'info', options = {}) => {
      return addToast({
        type,
        message,
        ...options
      })
    }
  }
}

// 默认导出（用于全局注册）
export default {
  toasts,
  addToast,
  removeToast,
  clearToasts,
  showSuccess,
  showError,
  showWarning,
  showInfo
}
