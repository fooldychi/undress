import axios from 'axios'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getToken, clearAuth } from './auth'
import router from '@/router'

// 创建axios实例
const service = axios.create({
  baseURL: '/api', // 使用代理
  timeout: 30000, // 请求超时时间
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器
service.interceptors.request.use(
  config => {
    // 添加token到请求头
    const token = getToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    console.log('🚀 发送请求:', config.method?.toUpperCase(), config.url)
    return config
  },
  error => {
    console.error('❌ 请求错误:', error)
    return Promise.reject(error)
  }
)

// 响应拦截器
service.interceptors.response.use(
  response => {
    const res = response.data
    console.log('✅ 收到响应:', response.config.url, res)

    // 如果是文件下载，直接返回
    if (response.config.responseType === 'blob') {
      return response
    }

    // 检查业务状态码
    if (res.success === false) {
      // 特殊错误码处理
      if (res.code === 'NO_TOKEN' || res.code === 'INVALID_TOKEN' || res.code === 'ADMIN_NOT_FOUND') {
        ElMessageBox.confirm(
          '登录状态已过期，请重新登录',
          '系统提示',
          {
            confirmButtonText: '重新登录',
            cancelButtonText: '取消',
            type: 'warning'
          }
        ).then(() => {
          clearAuth()
          router.push('/login')
        })
        return Promise.reject(new Error(res.message || '登录已过期'))
      }

      // 其他业务错误
      ElMessage.error(res.message || '请求失败')
      return Promise.reject(new Error(res.message || '请求失败'))
    }

    return res
  },
  error => {
    console.error('❌ 响应错误:', error)

    let message = '网络错误'

    if (error.response) {
      const { status, data } = error.response

      switch (status) {
        case 401:
          message = '未授权，请重新登录'
          clearAuth()
          router.push('/login')
          break
        case 403:
          message = '权限不足'
          break
        case 404:
          message = '请求的资源不存在'
          break
        case 500:
          message = '服务器内部错误'
          break
        default:
          message = data?.message || `请求失败 (${status})`
      }
    } else if (error.code === 'ECONNABORTED') {
      message = '请求超时'
    } else if (error.message.includes('Network Error')) {
      message = '网络连接失败'
    }

    ElMessage.error(message)
    return Promise.reject(error)
  }
)

export default service
