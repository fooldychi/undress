// ComfyUI工作流服务 - 直连模式
import undressWorkflow from '../workflows/undress.json'
import faceSwapWorkflow from '../workflows/faceswap2.0.json'
import comfyUIConfig from '../config/comfyui.config.js'
import pointsManager from '../utils/pointsManager.js'
import levelCardPointsManager from '../utils/levelCardPointsManager.js'
import { updateAPIConfig } from './api.js'
import loadBalancer from './loadBalancer.js'
import { getWorkflowNodeConfig, isWorkflowEnabled } from '../utils/workflowConfig.js'

// API配置 - 直连模式
const DEFAULT_CONFIG = {
  // ComfyUI服务器URL（用户可配置）
  COMFYUI_SERVER_URL: comfyUIConfig.BASE_URL,
  CLIENT_ID: comfyUIConfig.CLIENT_ID,
  TIMEOUT: 600000 // 从5分钟延长到10分钟
}

// 配置缓存
let configCache = null

// 从localStorage获取配置，如果没有则使用默认配置
function getComfyUIConfig(forceRefresh = false) {
  // 如果强制刷新或缓存为空，重新读取配置
  if (forceRefresh || !configCache) {
    const savedConfig = localStorage.getItem('comfyui_config')
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig)
        configCache = { ...DEFAULT_CONFIG, ...parsed }
        console.log('🔄 配置已刷新:', configCache)
      } catch (error) {
        console.warn('解析保存的配置失败，使用默认配置:', error)
        configCache = { ...DEFAULT_CONFIG }
      }
    } else {
      configCache = { ...DEFAULT_CONFIG }
    }
  }
  return { ...configCache }
}

// 保存配置到localStorage
function saveComfyUIConfig(config) {
  try {
    localStorage.setItem('comfyui_config', JSON.stringify(config))
    // 清除缓存，强制下次读取时重新加载
    configCache = null
    console.log('ComfyUI配置已保存:', config)
  } catch (error) {
    console.error('保存配置失败:', error)
  }
}

// 更新代理服务器配置
async function updateProxyServerConfig(config) {
  try {
    // 只有在使用代理时才更新代理服务器配置
    if (!config.USE_PROXY) {
      console.log('🔧 不使用代理，跳过代理服务器配置更新')
      return { success: true, message: '不使用代理模式' }
    }

    const proxyConfigUrl = config.PROXY_SERVER_URL.replace('/api', '/api/config')
    console.log('🔧 更新代理服务器配置:', proxyConfigUrl)

    const response = await fetch(proxyConfigUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        COMFYUI_SERVER_URL: config.COMFYUI_SERVER_URL,
        CLIENT_ID: config.CLIENT_ID
      }),
      timeout: 10000
    })

    if (response.ok) {
      const result = await response.json()
      return { success: true, message: '代理服务器配置更新成功' }
    } else {
      return { success: false, message: `代理服务器响应错误: ${response.status}` }
    }
  } catch (error) {
    return { success: false, message: '无法连接到代理服务器' }
  }
}

// 配置变更监听器
const configChangeListeners = []

// 添加配置变更监听器
function addConfigChangeListener(listener) {
  configChangeListeners.push(listener)
}

// 移除配置变更监听器
function removeConfigChangeListener(listener) {
  const index = configChangeListeners.indexOf(listener)
  if (index > -1) {
    configChangeListeners.splice(index, 1)
  }
}

// 通知配置变更
function notifyConfigChange(config) {
  // 同步更新API配置
  try {
    updateAPIConfig(config)
  } catch (error) {
    console.error('更新API配置失败:', error)
  }

  configChangeListeners.forEach(listener => {
    try {
      listener(config)
    } catch (error) {
      console.error('配置变更监听器执行失败:', error)
    }
  })
}

// 获取 ComfyUI 图片访问URL
function getComfyUIImageUrl(imageData) {
  try {
    // 如果已经是 ComfyUI 的 URL 格式，直接返回
    if (typeof imageData === 'string' && imageData.includes('/view?')) {
      console.log('🔗 已是 ComfyUI URL 格式:', imageData)
      return imageData
    }

    // 如果是 base64 数据，尝试从全局变量或缓存中获取对应的 ComfyUI URL
    if (typeof imageData === 'string' && imageData.startsWith('data:image/')) {
      console.log('📸 检测到 base64 图片数据，尝试获取 ComfyUI URL...')

      // 检查是否有存储的 ComfyUI URL（在生成过程中可能已经保存）
      if (window.lastComfyUIImageUrl) {
        console.log('🔗 使用缓存的 ComfyUI URL:', window.lastComfyUIImageUrl)
        return window.lastComfyUIImageUrl
      }

      // 如果没有缓存的URL，返回一个占位符或者 null
      console.warn('⚠️ 无法获取 ComfyUI URL，使用占位符')
      return null
    }

    // 其他情况，尝试转换为字符串
    const urlString = String(imageData)
    if (urlString.includes('/view?')) {
      return urlString
    }

    console.warn('⚠️ 无法识别的图片数据格式:', typeof imageData)
    return null

  } catch (error) {
    console.error('❌ 获取 ComfyUI 图片URL失败:', error)
    return null
  }
}

// 更新配置
async function updateComfyUIConfig(newConfig) {
  const currentConfig = getComfyUIConfig(true) // 强制刷新当前配置
  const updatedConfig = { ...currentConfig, ...newConfig }

  // 保存到localStorage（这会清除缓存）
  saveComfyUIConfig(updatedConfig)

  // 强制刷新配置缓存
  configCache = null

  // 通知配置变更
  notifyConfigChange(updatedConfig)

  // 同时更新代理服务器配置
  const proxyUpdateResult = await updateProxyServerConfig(updatedConfig)

  return {
    config: updatedConfig,
    proxyUpdate: proxyUpdateResult
  }
}

// 获取当前配置
function getCurrentConfig(forceRefresh = false) {
  return getComfyUIConfig(forceRefresh)
}

// 获取API基础URL - 使用负载均衡选择的最优服务器
async function getApiBaseUrl() {
  try {
    console.log('🎯 使用负载均衡选择最优服务器...')

    // 使用负载均衡器选择最优服务器
    const optimalServer = await loadBalancer.getOptimalServer()
    console.log('🎯 负载均衡选择的服务器:', optimalServer)

    // 确保URL格式正确，移除末尾的斜杠
    let baseUrl = optimalServer
    if (baseUrl && baseUrl.endsWith('/')) {
      baseUrl = baseUrl.slice(0, -1)
    }

    console.log('🔗 最终API基础URL:', baseUrl)
    return baseUrl
  } catch (error) {
    console.error('❌ 获取API基础URL失败:', error)

    // 备用方案：使用配置中的默认服务器
    const config = getComfyUIConfig(true)
    let baseUrl = config.COMFYUI_SERVER_URL

    if (baseUrl && baseUrl.endsWith('/')) {
      baseUrl = baseUrl.slice(0, -1)
    }

    return baseUrl
  }
}

// 删除重试机制，直接使用最优服务器

// 重置为默认配置
function resetToDefaultConfig() {
  localStorage.removeItem('comfyui_config')
  return { ...DEFAULT_CONFIG }
}

// 生成随机客户端ID（备用函数）
function generateClientId() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

// 生成 prompt_id - 官方标准
function generatePromptId() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}



// 第一步：上传Base64图片到ComfyUI服务器并获取文件名
async function uploadImageToComfyUI(base64Image) {
  const apiBaseUrl = await getApiBaseUrl()
  console.log('🔄 第一步：上传图片到ComfyUI服务器')
  console.log('📡 API地址:', `${apiBaseUrl}/upload/image`)

  // 验证base64格式
  if (!base64Image || !base64Image.startsWith('data:image/')) {
    throw new Error('无效的base64图片格式')
  }

  // 从base64数据中提取图片信息
  const base64Data = base64Image.split(',')[1]
  const mimeType = base64Image.split(',')[0].split(':')[1].split(';')[0]
  const extension = mimeType.split('/')[1] || 'jpg'

  // 生成唯一文件名
  const filename = `upload_${Date.now()}_${Math.random().toString(36).substring(7)}.${extension}`

  // 将base64转换为Blob
  const byteCharacters = atob(base64Data)
  const byteNumbers = new Array(byteCharacters.length)
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i)
  }
  const byteArray = new Uint8Array(byteNumbers)
  const blob = new Blob([byteArray], { type: mimeType })

  console.log('📤 上传文件信息:', {
    filename,
    type: mimeType,
    size: `${(blob.size / 1024).toFixed(2)} KB`
  })

  // 直连上传图片
  const formData = new FormData()
  formData.append('image', blob, filename)
  formData.append('type', 'input')
  formData.append('subfolder', '')
  formData.append('overwrite', 'false')

  console.log('🔄 开始上传图片...')

  const response = await fetch(`${apiBaseUrl}/api/upload/image`, {
    method: 'POST',
    body: formData
  })

  console.log('📥 上传响应状态:', response.status, response.statusText)

  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText)
    throw new Error(`上传失败: ${response.status} ${response.statusText} - ${errorText}`)
  }

  const result = await response.json()
  console.log('✅ 图片上传成功:', result)

  // 验证返回结果
  if (!result.name) {
    throw new Error('上传响应中缺少文件名')
  }

  return result.name
}

// 创建工作流提示词，将用户图片关联到配置的节点
async function createUndressWorkflowPrompt(uploadedImageName) {
  try {
    // 获取节点配置
    const nodeConfig = await getWorkflowNodeConfig('undress')

    // 深拷贝工作流
    const workflow = JSON.parse(JSON.stringify(undressWorkflow))

    // 将上传的图片文件名设置到配置的主图片节点
    const mainImageNodeId = nodeConfig.inputNodes.mainImage
    if (workflow[mainImageNodeId] && workflow[mainImageNodeId].class_type === 'LoadImage') {
      workflow[mainImageNodeId].inputs.image = uploadedImageName
      console.log(`节点${mainImageNodeId}图片设置为:`, uploadedImageName)
    } else {
      throw new Error(`工作流中未找到节点${mainImageNodeId}或节点类型不正确`)
    }

    // 随机化种子以获得不同的结果
    const seedNodeId = nodeConfig.inputNodes.seedNode
    if (workflow[seedNodeId] && workflow[seedNodeId].inputs) {
      const newSeed = Math.floor(Math.random() * 1000000000000000)
      workflow[seedNodeId].inputs.noise_seed = newSeed
      console.log(`随机种子设置为:`, newSeed)
    }

    console.log('工作流配置完成')
    return workflow

  } catch (error) {
    console.error('工作流创建失败:', error)
    throw new Error(`工作流创建失败: ${error.message}`)
  }
}

// 第二步：提交工作流到ComfyUI - 采用官方标准机制
async function submitWorkflow(workflowPrompt, promptId = null) {
  console.log('🔄 第二步：提交工作流到ComfyUI')

  // 确保 WebSocket 连接稳定
  try {
    await ensureWebSocketConnection()
    console.log('✅ WebSocket连接已确认稳定')
  } catch (error) {
    console.error('❌ WebSocket连接不稳定:', error)
    throw new Error(`WebSocket连接不稳定，无法提交工作流: ${error.message}`)
  }

  const config = getComfyUIConfig()
  const apiBaseUrl = await getApiBaseUrl()
  console.log('📡 API地址:', `${apiBaseUrl}/api/prompt`)

  // 生成或使用提供的 prompt_id（官方标准）
  const finalPromptId = promptId || generatePromptId()

  // 构建请求体，按照ComfyUI官方API格式
  const requestBody = {
    client_id: config.CLIENT_ID,
    prompt: workflowPrompt,
    prompt_id: finalPromptId  // 官方标准：显式传递prompt_id
  }

  // 第二步API调用：提交工作流到ComfyUI
  const promptUrl = `${apiBaseUrl}/api/prompt`

  console.log('📤 提交工作流请求...')
  const response = await fetch(promptUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`工作流提交失败: ${response.status} ${response.statusText} - ${errorText}`)
  }

  const result = await response.json()

  // 验证返回结果
  if (!result.prompt_id) {
    throw new Error('工作流响应中缺少prompt_id')
  }

  console.log('✅ 工作流提交成功，任务ID:', finalPromptId)

  // 再次确认WebSocket连接状态
  if (!isWsConnected || !wsConnection || wsConnection.readyState !== WebSocket.OPEN) {
    console.warn('⚠️ 工作流提交后WebSocket连接异常，尝试重连...')
    try {
      await ensureWebSocketConnection()
    } catch (reconnectError) {
      console.error('❌ 重连失败:', reconnectError)
    }
  }

  return finalPromptId // 返回我们使用的prompt_id
}



// 获取生成的图片 - 兼容新的结果格式
async function getGeneratedImage(taskResult, workflowType = 'undress') {
  try {
    const apiBaseUrl = await getApiBaseUrl()
    const nodeConfig = await getWorkflowNodeConfig(workflowType)

    // 从任务结果中找到输出图片
    const outputs = taskResult.outputs
    let imageInfo = null

    // 按优先级查找图片：先查找主要输出节点
    const primaryNodeId = nodeConfig.outputNodes.primary
    if (primaryNodeId && outputs[primaryNodeId] && outputs[primaryNodeId].images && outputs[primaryNodeId].images.length > 0) {
      imageInfo = outputs[primaryNodeId].images[0]
      console.log(`📷 找到主要输出节点${primaryNodeId}的图片:`, imageInfo)
    } else {
      // 如果主要节点没有图片，查找备用节点
      const secondaryNodes = nodeConfig.outputNodes.secondary || []
      for (const nodeId of secondaryNodes) {
        if (outputs[nodeId] && outputs[nodeId].images && outputs[nodeId].images.length > 0) {
          imageInfo = outputs[nodeId].images[0]
          console.log(`📷 找到备用输出节点${nodeId}的图片:`, imageInfo)
          break
        }
      }
    }

    // 如果配置的节点都没有图片，则遍历所有节点（兜底机制）
    if (!imageInfo) {
      console.warn('⚠️ 配置的输出节点都没有图片，使用兜底机制')
      for (const nodeId in outputs) {
        const nodeOutput = outputs[nodeId]
        if (nodeOutput.images && nodeOutput.images.length > 0) {
          imageInfo = nodeOutput.images[0]
          console.log(`📷 兜底机制找到节点${nodeId}的图片:`, imageInfo)
          break
        }
      }
    }

    if (!imageInfo) {
      console.error('❌ 所有节点输出:', JSON.stringify(outputs, null, 2))
      throw new Error('未找到生成的图片')
    }

    console.log('📷 最终选择的图片:', imageInfo)

    // 构建图片URL - 按照ComfyUI API文档格式
    const params = new URLSearchParams({
      filename: imageInfo.filename,
      type: imageInfo.type,
      subfolder: imageInfo.subfolder || ''
    })
    const imageUrl = `${apiBaseUrl}/api/view?${params.toString()}`

    console.log('🌐 获取图片URL:', imageUrl)

    // 保存 ComfyUI 原始URL到全局变量，供积分扣除时使用
    window.lastComfyUIImageUrl = imageUrl
    console.log('💾 保存 ComfyUI 图片URL 供积分记录使用:', imageUrl)

    // 获取图片数据并转换为base64
    const imageResponse = await fetch(imageUrl)
    if (!imageResponse.ok) {
      throw new Error(`图片获取失败: ${imageResponse.status}`)
    }

    const imageBlob = await imageResponse.blob()
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(imageBlob)
    })

  } catch (error) {
    console.error('图片获取失败:', error)
    throw new Error(`图片获取失败: ${error.message}`)
  }
}

// WebSocket 连接管理 - 简化版本
let wsConnection = null
let isWsConnected = false
let pendingTasks = new Map()

// 简化的通知函数
function showNotification(message, type = 'info') {
  const timestamp = new Date().toLocaleTimeString()
  const typeEmoji = {
    'success': '✅',
    'error': '❌',
    'warning': '⚠️',
    'info': 'ℹ️'
  }

  console.log(`${typeEmoji[type] || 'ℹ️'} [${timestamp}] ${message}`)

  // 触发自定义事件供Vue组件监听
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('comfyui-status', {
      detail: { message, type, timestamp }
    }))
  }
}

// 调试辅助函数 - 用于诊断任务状态问题
function debugTaskStatus(promptId = null) {
  console.log('🔍 ===== 任务状态调试信息 =====')
  console.log(`📊 待处理任务总数: ${pendingTasks.size}`)
  console.log(`🔗 WebSocket 连接状态: ${isWsConnected ? '已连接' : '未连接'}`)
  console.log(`📡 WebSocket 就绪状态: ${wsConnection?.readyState || '无连接'}`)

  if (pendingTasks.size > 0) {
    console.log('📋 所有待处理任务:')
    for (const [taskId, task] of pendingTasks.entries()) {
      console.log(`  - ${taskId}: ${task.workflowType || 'unknown'} (创建于: ${task.createdAt || 'unknown'})`)
    }
  }

  if (promptId) {
    const task = pendingTasks.get(promptId)
    console.log(`🎯 指定任务 ${promptId}:`, {
      exists: !!task,
      hasOnComplete: !!(task?.onComplete),
      hasOnError: !!(task?.onError),
      hasOnProgress: !!(task?.onProgress),
      workflowType: task?.workflowType,
      createdAt: task?.createdAt
    })
  }

  console.log('🔍 ===== 调试信息结束 =====')
}



// 初始化 WebSocket 连接 - 简化版本
async function initializeWebSocket() {
  try {
    // 检查现有连接
    if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
      console.log('🎯 WebSocket 已连接')
      return true
    }

    const config = getComfyUIConfig()
    const baseUrl = await loadBalancer.getOptimalServer()
    console.log(`🔌 连接WebSocket: ${baseUrl}`)

    // 构建WebSocket URL
    let wsUrl
    if (baseUrl.startsWith('https://')) {
      wsUrl = baseUrl.replace('https://', 'wss://') + '/ws?clientId=' + config.CLIENT_ID
    } else {
      wsUrl = baseUrl.replace('http://', 'ws://') + '/ws?clientId=' + config.CLIENT_ID
    }

    // 简单的HTTP连接测试
    try {
      const testResponse = await fetch(`${baseUrl}/api/queue`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      })
      if (!testResponse.ok) {
        throw new Error(`服务器响应错误: ${testResponse.status}`)
      }
    } catch (httpError) {
      throw new Error(`ComfyUI服务器不可达: ${httpError.message}`)
    }

    wsConnection = new WebSocket(wsUrl)

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('WebSocket 连接超时'))
      }, 10000)

      wsConnection.onopen = () => {
        isWsConnected = true
        clearTimeout(timeout)
        showNotification('WebSocket连接成功', 'success')
        resolve(true)
      }

      wsConnection.onclose = (event) => {
        console.log(`🔌 WebSocket 连接关闭: 代码=${event.code}`)
        isWsConnected = false
        clearTimeout(timeout)
        showNotification('WebSocket连接已断开', 'warning')

        // 简单重连策略 - 如果有待处理任务则重连
        if (pendingTasks.size > 0) {
          console.log('🔄 检测到待处理任务，5秒后重连...')
          setTimeout(() => {
            initializeWebSocket().catch(error => {
              console.error('❌ 重连失败:', error)
              // 标记所有任务失败
              const taskIds = Array.from(pendingTasks.keys())
              for (const promptId of taskIds) {
                const task = pendingTasks.get(promptId)
                if (task && task.onError) {
                  task.onError('WebSocket连接失败')
                }
                pendingTasks.delete(promptId)
              }
            })
          }, 5000)
        }
      }

      wsConnection.onerror = (error) => {
        clearTimeout(timeout)
        showNotification('WebSocket连接错误', 'error')
        reject(error)
      }

      wsConnection.onmessage = (event) => {
        try {
          // 基本消息验证
          if (!event.data || typeof event.data !== 'string') {
            return
          }

          const rawData = event.data.trim()
          if (!rawData) {
            return
          }

          // 解析JSON消息
          let message
          try {
            message = JSON.parse(rawData)
          } catch (parseError) {
            console.warn('WebSocket消息解析失败:', parseError.message)
            return
          }

          // 验证消息结构
          if (!message || typeof message !== 'object') {
            return
          }

          console.log(`📨 收到消息类型:`, message.type || 'unknown')

          // 如果是executed消息，记录更多详细信息
          if (message.type === 'executed') {
            console.log('🎯 executed消息原始数据:', JSON.stringify(message, null, 2))
          }

          // 处理消息
          handleWebSocketMessage(message)
        } catch (error) {
          console.error('❌ 处理WebSocket消息失败:', error)
        }
      }
    })
  } catch (error) {
    console.error('❌ 初始化 WebSocket 失败:', error)
    throw error
  }
}

// 移除复杂的健康检查系统

// 处理 WebSocket 消息 - 采用官方标准机制（增强完整性检查）
function handleWebSocketMessage(message) {
  try {
    // 验证消息结构
    if (!message || typeof message !== 'object') {
      console.warn('⚠️ 收到无效的 WebSocket 消息:', message)
      return
    }

    const { type, data } = message

    // 记录所有消息类型以便调试
    console.log(`📨 收到 WebSocket 消息: ${type}`)

    // 记录任务相关消息的详细信息
    if (data && data.prompt_id) {
      console.log(`📋 任务相关消息详情:`, {
        type: type,
        promptId: data.prompt_id,
        nodeId: data.node,
        hasOutputs: !!data.outputs,
        pendingTasksCount: pendingTasks.size
      })
    }

    // 处理官方标准消息类型
    switch (type) {
      case 'status':
        handleStatusMessage(data)
        break
      case 'progress':
        handleProgressMessage(data)
        break
      case 'executing':
        // 官方标准：executing消息用于检测任务完成
        console.log(`🔄 处理 executing 消息`)
        handleExecutingMessage(data)
        break
      case 'executed':
        console.log(`✅ 处理 executed 消息`)
        handleExecutedMessage(data)
        break
      case 'execution_start':
        console.log(`🚀 处理 execution_start 消息`)
        handleExecutionStartMessage(data)
        break
      case 'execution_cached':
        console.log(`💾 处理 execution_cached 消息`)
        handleExecutionCachedMessage(data)
        break
      default:
        // 记录未知消息类型，可能包含重要信息
        if (data && data.prompt_id) {
          console.warn(`⚠️ 未处理的任务相关消息类型: ${type}`, data)
        } else {
          console.debug(`忽略消息类型: ${type}`)
        }
    }
  } catch (error) {
    console.error('❌ 处理 WebSocket 消息失败:', error)
    console.error('❌ 消息内容:', JSON.stringify(message, null, 2))
    console.error('❌ 错误堆栈:', error.stack)
  }
}

// 处理状态消息 - 队列状态
function handleStatusMessage(data) {
  // 简单记录队列状态
  console.debug('📊 队列状态更新')
}

// 处理执行缓存消息
function handleExecutionCachedMessage(data) {
  if (data && data.prompt_id) {
    const promptId = data.prompt_id
    const task = pendingTasks.get(promptId)
    if (task && task.onProgress) {
      task.onProgress('使用缓存节点', 20)
    }
  }
}



// 处理进度消息 - 官方标准
function handleProgressMessage(data) {
  if (data && data.prompt_id && data.value !== undefined && data.max !== undefined) {
    const promptId = data.prompt_id
    const progress = Math.round((data.value / data.max) * 100)

    const task = pendingTasks.get(promptId)
    if (task && task.onProgress) {
      task.onProgress(`处理中 ${data.value}/${data.max}`, progress)
    }
  }
}

// 处理节点执行完成消息 - 简化版本，仅用于进度更新
function handleExecutedMessage(data) {
  if (!data || !data.prompt_id) {
    return
  }

  const promptId = data.prompt_id
  const task = pendingTasks.get(promptId)

  if (task && task.onProgress) {
    // 仅用于进度更新，不处理任务完成
    const executedNodeId = data.node_id || Object.keys(data.outputs || {})[0]
    if (executedNodeId) {
      task.onProgress(`节点 ${executedNodeId} 执行完成`, 80)
    }
  }
}

// 处理执行消息 - 基于官方实现的精确任务完成检测
function handleExecutingMessage(data) {
  console.log(`📨 收到 executing 消息:`, data)

  // 官方实现验证：必须有有效的 prompt_id
  if (!data || !data.prompt_id) {
    console.warn('⚠️ 收到无效的 executing 消息 - 缺少 prompt_id:', data)
    return
  }

  const promptId = data.prompt_id
  const task = pendingTasks.get(promptId)

  console.log(`🔍 检查任务 ${promptId}:`, {
    hasTask: !!task,
    nodeValue: data.node,
    nodeType: typeof data.node,
    isComplete: data.node === null,
    pendingTasksCount: pendingTasks.size,
    allPendingTasks: Array.from(pendingTasks.keys())
  })

  // 官方标准双重条件检测：data.node === null AND data.prompt_id === promptId
  if (data.node === null && data.prompt_id === promptId) {
    console.log(`🎯 任务执行完成 (官方标准检测): ${promptId}`)
    // 立即处理任务完成 - 官方实现证明此时历史记录已准备就绪
    handleTaskCompletion(promptId)
  } else if (data.node && task && task.onProgress) {
    // 节点开始执行 - 更新进度
    console.log(`🔄 节点开始执行: ${data.node} for task ${promptId}`)
    task.onProgress(`正在执行节点: ${data.node}`, 50)
  } else if (data.node && !task) {
    console.warn(`⚠️ 收到节点执行消息但未找到对应任务: ${promptId}, 节点: ${data.node}`)
    console.warn(`📋 当前待处理任务列表:`, Array.from(pendingTasks.keys()))
  }
}

// 处理任务完成 - 基于官方实现的增强版本（添加重试机制）
async function handleTaskCompletion(promptId) {
  console.log(`🎯 开始处理任务完成: ${promptId}`)

  const task = pendingTasks.get(promptId)
  if (!task) {
    console.warn(`⚠️ 未找到待处理任务: ${promptId}`)
    console.log(`📋 当前待处理任务列表:`, Array.from(pendingTasks.keys()))
    return
  }

  // 添加重试机制 - 解决多任务并发时的竞争条件
  let retryCount = 0
  const maxRetries = 3
  let lastError = null

  while (retryCount < maxRetries) {
    try {
      console.log(`📡 获取任务历史记录 (尝试 ${retryCount + 1}/${maxRetries}): ${promptId}`)

      // 官方实现：任务完成后立即获取历史记录
      const history = await getTaskHistory(promptId)

      // 验证历史记录完整性
      if (!history[promptId] || !history[promptId].outputs) {
        throw new Error(`历史记录不完整，任务 ${promptId} 可能仍在处理中`)
      }

      console.log(`📊 历史记录获取成功，开始提取结果: ${promptId}`)
      const results = await extractTaskResults(history, promptId)
      console.log(`✅ 任务结果提取成功: ${promptId}`)

      // 更新进度到100%
      if (task.onProgress) {
        console.log(`📈 更新任务进度到100%: ${promptId}`)
        task.onProgress('处理完成', 100)
      }

      // 调用完成回调
      if (task.onComplete) {
        console.log(`🎉 调用任务完成回调: ${promptId}`)
        task.onComplete(results)
      } else {
        console.warn(`⚠️ 任务没有完成回调函数: ${promptId}`)
      }

      // 成功处理，跳出重试循环
      break

    } catch (error) {
      lastError = error
      retryCount++
      console.error(`❌ 处理任务完成失败 (尝试 ${retryCount}/${maxRetries}): ${promptId}`, error)

      if (retryCount < maxRetries) {
        // 等待后重试，延迟时间递增
        const delay = 1000 * retryCount
        console.log(`⏳ ${delay}ms 后重试...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      } else {
        // 最终失败
        console.error(`❌ 任务处理最终失败: ${promptId}`, lastError)
        if (task.onError) {
          console.log(`🚨 调用任务错误回调: ${promptId}`)
          task.onError(lastError.message)
        } else {
          console.warn(`⚠️ 任务没有错误回调函数: ${promptId}`)
        }
      }
    }
  }

  // 清理任务
  console.log(`🧹 清理任务: ${promptId}`)
  pendingTasks.delete(promptId)
  console.log(`📊 剩余待处理任务数: ${pendingTasks.size}`)
}

// 获取任务历史记录 - 基于官方实现的增强版本（添加超时和重试）
async function getTaskHistory(promptId) {
  const maxAttempts = 3
  let lastError = null

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const apiBaseUrl = await getApiBaseUrl()
      const url = `${apiBaseUrl}/history/${promptId}`
      console.log(`🔍 获取任务历史记录 (尝试 ${attempt}/${maxAttempts}): ${url}`)

      // 添加超时控制
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000) // 15秒超时

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`历史记录获取失败: ${response.status} ${response.statusText}`)
      }

      const history = await response.json()
      console.log(`✅ 获取到任务历史记录，包含 ${Object.keys(history).length} 个任务`)

      // 验证是否包含目标任务
      if (!history[promptId]) {
        throw new Error(`历史记录中未找到任务: ${promptId}`)
      }

      return history

    } catch (error) {
      lastError = error
      console.error(`❌ 获取任务历史记录失败 (尝试 ${attempt}/${maxAttempts}): ${promptId}`, error)

      if (attempt < maxAttempts) {
        // 等待后重试，延迟时间递增
        const delay = 2000 * attempt
        console.log(`⏳ ${delay}ms 后重试...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError
}

// 从历史记录中提取结果 - 官方标准机制
async function extractTaskResults(history, promptId) {
  try {
    console.log(`📊 开始提取任务结果: ${promptId}`)

    // 历史记录格式: { promptId: { outputs: {...} } }
    const taskData = history[promptId]
    if (!taskData) {
      throw new Error(`历史记录中未找到任务: ${promptId}`)
    }

    if (!taskData.outputs) {
      throw new Error(`任务 ${promptId} 没有输出数据`)
    }

    console.log(`📋 任务输出节点:`, Object.keys(taskData.outputs))

    // 直接返回输出数据，保持与现有代码兼容
    const results = {
      outputs: taskData.outputs,
      promptId: promptId
    }

    console.log(`✅ 任务结果提取完成: ${promptId}`)
    return results
  } catch (error) {
    console.error(`❌ 提取任务结果失败: ${promptId}`, error)
    throw error
  }
}

// 获取图片数据 - 官方标准API
async function getImage(filename, subfolder, folderType) {
  try {
    const apiBaseUrl = await getApiBaseUrl()
    const params = new URLSearchParams({
      filename: filename,
      subfolder: subfolder || '',
      type: folderType || 'output'
    })

    const url = `${apiBaseUrl}/view?${params.toString()}`
    console.log(`🖼️ 获取图片: ${url}`)

    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`图片获取失败: ${response.status} ${response.statusText}`)
    }

    const imageBlob = await response.blob()
    console.log(`✅ 图片获取成功: ${filename}`)
    return imageBlob
  } catch (error) {
    console.error(`❌ 获取图片失败: ${filename}`, error)
    throw error
  }
}

// 确保WebSocket连接
async function ensureWebSocketConnection() {
  if (wsConnection && wsConnection.readyState === WebSocket.OPEN && isWsConnected) {
    return true
  }

  console.log('🔄 建立WebSocket连接...')
  await initializeWebSocket()
  return true
}



// 等待任务完成 - 增强版本，采用官方标准机制
async function waitForTaskCompletion(promptId, maxWaitTime = 600000, onProgress = null, workflowType = 'undress') {
  console.log(`⏳ 开始等待任务完成: ${promptId}`)
  console.log(`📊 当前待处理任务数: ${pendingTasks.size}`)

  await ensureWebSocketConnection()

  return new Promise((resolve, reject) => {
    // 设置超时
    const timeout = setTimeout(() => {
      console.log(`⏰ 任务超时: ${promptId}`)
      console.log(`📋 超时时待处理任务:`, Array.from(pendingTasks.keys()))

      // 清理任务
      pendingTasks.delete(promptId)
      showNotification('任务处理超时', 'error')
      reject(new Error('任务执行超时'))
    }, maxWaitTime)

    // 创建任务对象，增强调试信息
    const task = {
      workflowType: workflowType,
      createdAt: new Date().toISOString(),
      onProgress: (status, progress) => {
        console.log(`📈 任务进度更新: ${promptId} - ${status} (${progress}%)`)
        if (onProgress) {
          onProgress(status, progress)
        }
      },
      onComplete: (result) => {
        clearTimeout(timeout)
        console.log(`✅ 任务完成回调触发: ${promptId}`)
        console.log(`📊 任务结果结构:`, {
          hasOutputs: !!result?.outputs,
          outputNodes: result?.outputs ? Object.keys(result.outputs) : [],
          promptId: result?.promptId
        })
        resolve(result)
      },
      onError: (error) => {
        clearTimeout(timeout)
        console.error(`❌ 任务失败回调触发: ${promptId} - ${error}`)
        showNotification('任务处理失败', 'error')
        reject(new Error(error))
      }
    }

    // 注册任务到待处理列表
    pendingTasks.set(promptId, task)
    console.log(`📝 任务已注册到待处理列表: ${promptId}`)
    console.log(`📊 注册后待处理任务数: ${pendingTasks.size}`)
    console.log(`📋 所有待处理任务:`, Array.from(pendingTasks.keys()))

    // 启动任务监控（如果还没启动）
    startTaskMonitoring()

    // 初始进度
    if (onProgress) {
      onProgress('任务已提交，等待处理...', 10)
    }
  })
}

// 处理执行开始消息
function handleExecutionStartMessage(data) {
  if (data && data.prompt_id) {
    const promptId = data.prompt_id
    const task = pendingTasks.get(promptId)
    if (task && task.onProgress) {
      task.onProgress('开始执行', 15)
    }
  }
}

// 任务监控系统 - 解决多任务并发时的遗漏问题
let taskMonitorInterval = null

// 启动任务监控
function startTaskMonitoring() {
  if (taskMonitorInterval) {
    return // 已经在监控中
  }

  console.log('🔍 启动任务状态监控')
  taskMonitorInterval = setInterval(() => {
    if (pendingTasks.size > 0) {
      console.log(`📊 任务监控检查 - 当前待处理任务: ${pendingTasks.size}`)

      for (const [promptId, task] of pendingTasks.entries()) {
        const taskAge = Date.now() - new Date(task.createdAt).getTime()

        // 如果任务等待超过5分钟，主动检查状态
        if (taskAge > 300000) { // 5分钟
          console.log(`⚠️ 任务 ${promptId} 等待时间过长 (${Math.round(taskAge/1000)}秒)，主动检查状态`)
          checkTaskStatusManually(promptId)
        }
      }
    } else if (taskMonitorInterval) {
      // 没有待处理任务时停止监控
      console.log('📊 无待处理任务，停止监控')
      stopTaskMonitoring()
    }
  }, 30000) // 每30秒检查一次
}

// 停止任务监控
function stopTaskMonitoring() {
  if (taskMonitorInterval) {
    clearInterval(taskMonitorInterval)
    taskMonitorInterval = null
    console.log('⏹️ 任务监控已停止')
  }
}

// 手动检查任务状态 - 用于处理遗漏的完成信号
async function checkTaskStatusManually(promptId) {
  try {
    console.log(`🔍 手动检查任务状态: ${promptId}`)

    // 直接尝试获取历史记录
    const history = await getTaskHistory(promptId)

    if (history[promptId] && history[promptId].outputs) {
      console.log(`✅ 发现已完成的任务，触发完成处理: ${promptId}`)
      await handleTaskCompletion(promptId)
    } else {
      console.log(`📋 任务 ${promptId} 仍在处理中`)
    }
  } catch (error) {
    console.error(`❌ 手动检查任务状态失败: ${promptId}`, error)
    // 如果是404错误，说明任务可能已被清理，从待处理列表中移除
    if (error.message.includes('404')) {
      console.log(`🧹 任务 ${promptId} 不存在，从待处理列表中移除`)
      pendingTasks.delete(promptId)
    }
  }
}

// 主要的换衣API函数 - 两步流程
async function processUndressImage(base64Image, onProgress = null) {
  try {
    console.log('🚀 开始处理换衣请求')

    // 预检查服务器状态
    if (onProgress) onProgress('正在检查服务器状态...', 5)

    const serverStatus = await checkComfyUIServerStatus()
    if (serverStatus.status === 'error') {
      throw new Error(`ComfyUI服务器不可用: ${serverStatus.error}`)
    }

    // 检查积分（优先使用等级卡系统）
    if (onProgress) onProgress('正在检查积分...', 10)

    const pointsStatus = await levelCardPointsManager.getPointsStatus()
    if (!pointsStatus.canGenerate) {
      throw new Error(`积分不足！当前积分: ${pointsStatus.current}，需要: ${pointsStatus.generationCost}`)
    }

    // 验证图片数据格式
    if (onProgress) onProgress('正在验证图片格式...', 15)

    if (!base64Image || !base64Image.startsWith('data:image/')) {
      throw new Error('无效的图片数据格式')
    }

    // 第一步：上传图片到ComfyUI服务器
    if (onProgress) onProgress('正在上传图片到ComfyUI...', 20)

    const uploadedImageName = await uploadImageToComfyUI(base64Image)
    console.log('✅ 图片上传完成:', uploadedImageName)

    // 创建工作流提示词，将上传的图片关联到节点49
    if (onProgress) onProgress('正在配置工作流...', 30)

    const workflowPrompt = await createUndressWorkflowPrompt(uploadedImageName)

    // 第二步：提交工作流
    if (onProgress) onProgress('正在提交工作流到ComfyUI...', 40)

    const promptId = await submitWorkflow(workflowPrompt)
    console.log('✅ 工作流提交完成，任务ID:', promptId)

    // 等待任务完成 - 传递前端进度回调
    if (onProgress) onProgress('正在等待ComfyUI处理...', 50)

    const taskResult = await waitForTaskCompletion(promptId, 600000, (status, progress) => {
      // 将WebSocket进度传递给前端
      if (onProgress) {
        // 确保进度在50-95之间，为最后的图片获取留出空间
        const adjustedProgress = Math.min(95, Math.max(50, 50 + (progress * 0.45)))
        onProgress(status, adjustedProgress)
      }
    }, 'undress')
    console.log('✅ 任务处理完成')

    // 获取生成的图片
    if (onProgress) onProgress('正在获取处理结果...', 96)

    const resultImage = await getGeneratedImage(taskResult, 'undress')
    console.log('🎉 换衣处理成功!')

    // 消耗积分（从等级卡扣除）
    if (onProgress) onProgress('正在更新积分...', 98)

    // 获取 ComfyUI 图片访问URL而不是 base64 数据
    const imageViewUrl = getComfyUIImageUrl(resultImage)
    const pointsResult = await levelCardPointsManager.consumePoints(20, '一键换衣', imageViewUrl)

    // 获取节点49的原图用于对比
    let originalImage = null
    try {
      // 构建节点49原图的URL
      const params = new URLSearchParams({
        filename: uploadedImageName,
        type: 'input',
        subfolder: ''
      })
      const apiBaseUrl = await getApiBaseUrl()
      originalImage = `${apiBaseUrl}/api/view?${params.toString()}`
    } catch (error) {
      console.warn('⚠️ 获取原图失败:', error)
    }

    // 最终完成
    if (onProgress) onProgress('处理完成', 100)

    return {
      success: true,
      resultImage: resultImage,
      originalImage: originalImage, // 新增：节点49的原图
      promptId: promptId,
      uploadedImageName: uploadedImageName,
      pointsConsumed: pointsResult.consumed,
      pointsRemaining: pointsResult.remaining,
      message: '换衣处理完成'
    }

  } catch (error) {
    console.error('❌ 换衣处理失败:', error)
    return {
      success: false,
      error: error.message,
      message: '换衣处理失败'
    }
  }
}

// 检查ComfyUI服务器状态 - 使用统一的官方端点配置
async function checkComfyUIServerStatus() {
  try {
    const apiBaseUrl = await getApiBaseUrl()
    const testEndpoints = comfyUIConfig.getHealthCheckEndpoints()

    console.log('🔍 检查ComfyUI服务器状态:', apiBaseUrl)
    console.log('📋 使用端点列表:', testEndpoints)

    for (const endpoint of testEndpoints) {
      try {
        const response = await fetch(`${apiBaseUrl}${endpoint}`, {
          method: 'GET',
          signal: AbortSignal.timeout(comfyUIConfig.HEALTH_CHECK.TIMEOUT)
        })

        if (response.ok) {
          try {
            const data = await response.json()
            const isValid = comfyUIConfig.validateResponse(endpoint, data)

            if (isValid) {
              console.log(`✅ 服务器状态检查成功: ${endpoint} (已验证ComfyUI响应)`)
              return { status: 'ok', endpoint, data, validated: true }
            } else {
              console.log(`⚠️ 端点 ${endpoint} 响应但验证失败`)
              continue
            }
          } catch (jsonError) {
            // 即使不是JSON，只要响应成功就认为服务器正常
            console.log(`✅ 服务器状态检查成功: ${endpoint} (非JSON响应但连接正常)`)
            return { status: 'ok', endpoint, note: '非JSON响应但连接正常' }
          }
        }
      } catch (endpointError) {
        console.log(`端点 ${endpoint} 测试失败: ${endpointError.message}`)
      }
    }

    return { status: 'error', error: '所有端点测试失败' }
  } catch (error) {
    return { status: 'error', error: error.message }
  }
}

// 换脸处理函数
async function processFaceSwapImage({ facePhotos, targetImage, onProgress }) {
  try {
    console.log('🚀 开始换脸处理')

    // 检查积分（优先使用等级卡系统）
    const pointsStatus = await levelCardPointsManager.getPointsStatus()
    if (!pointsStatus.canGenerate) {
      throw new Error(`积分不足！当前积分: ${pointsStatus.current}，需要: ${pointsStatus.generationCost}`)
    }

    if (onProgress) onProgress('正在检查服务器状态...', 5)

    // 检查ComfyUI服务器状态
    const serverStatus = await checkComfyUIServerStatus()
    if (serverStatus.status === 'error') {
      throw new Error(`ComfyUI服务器不可用: ${serverStatus.error || serverStatus.code}`)
    }

    if (onProgress) onProgress('正在准备工作流...', 10)

    // 验证输入
    if (!facePhotos || facePhotos.length !== 4) {
      throw new Error('需要提供4张人脸照片')
    }

    if (!targetImage) {
      throw new Error('需要提供目标图片')
    }

    // 检查是否所有人脸照片都已上传
    const validFacePhotos = facePhotos.filter(photo => photo !== null)
    if (validFacePhotos.length !== 4) {
      throw new Error('请上传4张人脸照片')
    }

    if (onProgress) onProgress('正在上传人脸照片...', 20)

    // 上传4张人脸照片
    const uploadedFacePhotos = []
    for (let i = 0; i < facePhotos.length; i++) {
      const photo = facePhotos[i]
      if (onProgress) onProgress(`正在上传人脸照片 ${i + 1}/4...`, 20 + (i * 10))

      const uploadedFilename = await uploadImageToComfyUI(photo)
      uploadedFacePhotos.push(uploadedFilename)
    }

    if (onProgress) onProgress('正在上传目标图片...', 60)

    // 上传目标图片
    const targetUploadedFilename = await uploadImageToComfyUI(targetImage)

    if (onProgress) onProgress('正在准备换脸工作流...', 70)

    // 获取节点配置
    const nodeConfig = await getWorkflowNodeConfig('faceswap')

    // 准备工作流
    const workflow = JSON.parse(JSON.stringify(faceSwapWorkflow))

    // 更新工作流中的图片节点（使用配置化的节点ID）
    const facePhotoNodes = [
      nodeConfig.inputNodes.facePhoto1,
      nodeConfig.inputNodes.facePhoto2,
      nodeConfig.inputNodes.facePhoto3,
      nodeConfig.inputNodes.facePhoto4
    ]

    // 设置人脸照片节点
    facePhotoNodes.forEach((nodeId, index) => {
      if (workflow[nodeId] && uploadedFacePhotos[index]) {
        workflow[nodeId].inputs.image = uploadedFacePhotos[index]
        console.log(`设置人脸照片${index + 1}到节点${nodeId}:`, uploadedFacePhotos[index])
      }
    })

    // 设置目标图片节点
    const targetImageNodeId = nodeConfig.inputNodes.targetImage
    if (workflow[targetImageNodeId]) {
      workflow[targetImageNodeId].inputs.image = targetUploadedFilename
      console.log(`设置目标图片到节点${targetImageNodeId}:`, targetUploadedFilename)
    }

    if (onProgress) onProgress('正在提交换脸任务...', 80)

    // 提交工作流
    const promptId = await submitWorkflow(workflow)

    if (onProgress) onProgress('正在处理换脸...', 85)

    // 等待任务完成 - 换脸需要更长时间，设置10分钟超时
    const maxWaitTime = 600000 // 10分钟

    const taskResult = await waitForTaskCompletion(promptId, maxWaitTime, onProgress, 'faceswap')
    console.log('✅ 换脸任务处理完成')

    if (onProgress) onProgress('正在获取处理结果...', 95)

    // 获取结果图片（指定工作流类型）
    const imageUrl = await getGeneratedImage(taskResult, 'faceswap')

    // 消耗积分（从等级卡扣除）
    // 获取 ComfyUI 图片访问URL而不是 base64 数据
    const imageViewUrl = getComfyUIImageUrl(imageUrl)
    const pointsResult = await levelCardPointsManager.consumePoints(20, '极速换脸', imageViewUrl)

    if (onProgress) onProgress('换脸完成！', 100)

    console.log('✅ 换脸处理完成')
    return {
      success: true,
      imageUrl: imageUrl,
      targetImageUrl: targetImage, // 返回目标图像用于对比
      promptId: promptId,
      pointsConsumed: pointsResult.consumed,
      pointsRemaining: pointsResult.remaining,
      message: '换脸处理完成'
    }

  } catch (error) {
    console.error('❌ 换脸处理失败:', error)
    return {
      success: false,
      error: error.message,
      message: '换脸处理失败'
    }
  }
}

// 导出所有公共函数
export {
  getCurrentConfig,
  updateComfyUIConfig,
  resetToDefaultConfig,
  generateClientId,
  generatePromptId,
  getApiBaseUrl,
  addConfigChangeListener,
  removeConfigChangeListener,
  processUndressImage,
  processFaceSwapImage,
  checkComfyUIServerStatus,
  initializeWebSocket,
  wsConnection,
  isWsConnected,
  getTaskHistory,
  extractTaskResults,
  getImage,
  handleTaskCompletion,
  debugTaskStatus,
  startTaskMonitoring,
  stopTaskMonitoring,
  checkTaskStatusManually,
  pendingTasks // 导出用于调试
}
