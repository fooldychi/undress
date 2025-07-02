// 导入ComfyUI工作流服务
import { processUndressImage } from './comfyui.js'

// ComfyUI API服务配置
const API_CONFIG = {
  // ComfyUI服务器URL
  BASE_URL: 'https://dzqgp58z0s-8188.cnb.run',
  // 客户端ID，用于标识请求来源
  CLIENT_ID: 'abc1373d4ad648a3a81d0587fbe5534b',
  // 请求超时时间（毫秒）
  TIMEOUT: 300000 // 5分钟
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

// 导出配置，方便其他地方使用
export { API_CONFIG }
