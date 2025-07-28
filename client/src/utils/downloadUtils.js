/**
 * 下载工具函数
 * 提供统一的文件下载功能，确保文件直接下载到本地而不是在浏览器中显示
 */

import { Toast } from 'vant'

/**
 * 下载图片文件
 * @param {string} url - 图片URL
 * @param {string} prefix - 文件名前缀，默认为 'AI_Magic'
 * @param {string} defaultExtension - 默认文件扩展名，默认为 'jpg'
 * @returns {Promise<boolean>} - 下载是否成功
 */
export const downloadImage = async (url, prefix = 'AI_Magic', defaultExtension = 'jpg') => {
  if (!url) {
    Toast.fail('文件地址无效')
    return false
  }

  try {
    // 获取文件扩展名
    const extension = url.split('.').pop()?.toLowerCase() || defaultExtension
    const fileName = `${prefix}_${Date.now()}.${extension}`

    // 使用 fetch 获取图片数据，确保强制下载
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache'
      }
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const blob = await response.blob()
    const blobUrl = window.URL.createObjectURL(blob)

    // 创建下载链接
    const link = document.createElement('a')
    link.href = blobUrl
    link.download = fileName
    link.style.display = 'none'
    
    // 添加到DOM，点击，然后移除
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    // 清理blob URL
    setTimeout(() => {
      window.URL.revokeObjectURL(blobUrl)
    }, 100)
    
    Toast.success('图片已保存到本地')
    return true
  } catch (error) {
    console.error('下载失败:', error)
    
    // 如果 fetch 失败，尝试使用传统方法
    try {
      const link = document.createElement('a')
      link.href = url
      link.download = `${prefix}_${Date.now()}.${defaultExtension}`
      link.target = '_blank'
      link.rel = 'noopener noreferrer'
      link.style.display = 'none'
      
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      Toast.success('图片下载已开始')
      return true
    } catch (fallbackError) {
      console.error('备用下载方法也失败:', fallbackError)
      Toast.fail('下载失败，请重试或检查网络连接')
      return false
    }
  }
}

/**
 * 下载视频文件
 * @param {string} url - 视频URL
 * @param {string} prefix - 文件名前缀，默认为 'AI_Magic'
 * @param {string} defaultExtension - 默认文件扩展名，默认为 'mp4'
 * @returns {Promise<boolean>} - 下载是否成功
 */
export const downloadVideo = async (url, prefix = 'AI_Magic', defaultExtension = 'mp4') => {
  if (!url) {
    Toast.fail('文件地址无效')
    return false
  }

  try {
    // 获取文件扩展名
    const extension = url.split('.').pop()?.toLowerCase() || defaultExtension
    const fileName = `${prefix}_${Date.now()}.${extension}`

    // 对于视频文件，直接使用链接下载（因为视频文件通常较大）
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
    link.style.display = 'none'
    
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    Toast.success('视频下载已开始')
    return true
  } catch (error) {
    console.error('视频下载失败:', error)
    Toast.fail('下载失败，请重试')
    return false
  }
}

/**
 * 通用文件下载函数
 * @param {string} url - 文件URL
 * @param {string} prefix - 文件名前缀，默认为 'AI_Magic'
 * @returns {Promise<boolean>} - 下载是否成功
 */
export const downloadFile = async (url, prefix = 'AI_Magic') => {
  if (!url) {
    Toast.fail('文件地址无效')
    return false
  }

  // 判断文件类型
  const extension = url.split('.').pop()?.toLowerCase()
  const videoExtensions = ['mp4', 'webm', 'ogg', 'avi', 'mov', 'mkv']
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg']

  if (videoExtensions.includes(extension)) {
    return await downloadVideo(url, prefix, extension)
  } else if (imageExtensions.includes(extension)) {
    return await downloadImage(url, prefix, extension)
  } else {
    // 其他文件类型使用通用下载
    return await downloadImage(url, prefix, extension || 'file')
  }
}

/**
 * 检查是否支持下载功能
 * @returns {boolean} - 是否支持下载
 */
export const isDownloadSupported = () => {
  return typeof document !== 'undefined' && 'createElement' in document
}

/**
 * 获取文件大小的友好显示
 * @param {number} bytes - 字节数
 * @returns {string} - 格式化的文件大小
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
