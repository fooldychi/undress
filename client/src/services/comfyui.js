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
  TIMEOUT: 300000 // 5分钟
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

// 第二步：提交工作流到ComfyUI
async function submitWorkflow(workflowPrompt) {
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

  // 构建请求体，按照ComfyUI API文档格式
  const requestBody = {
    client_id: config.CLIENT_ID,
    prompt: workflowPrompt
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

  console.log('✅ 工作流提交成功，任务ID:', result.prompt_id)

  // 再次确认WebSocket连接状态
  if (!isWsConnected || !wsConnection || wsConnection.readyState !== WebSocket.OPEN) {
    console.warn('⚠️ 工作流提交后WebSocket连接异常，尝试重连...')
    try {
      await ensureWebSocketConnection()
    } catch (reconnectError) {
      console.error('❌ 重连失败:', reconnectError)
    }
  }

  return result.prompt_id // 返回任务ID
}

// 检查任务状态
async function checkTaskStatus(promptId) {
  try {
    const apiBaseUrl = await getApiBaseUrl()
    console.log(`🔍 查询任务状态:`, `${apiBaseUrl}/api/history/${promptId}`)

    // 添加超时控制
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超时

    const response = await fetch(`${apiBaseUrl}/api/history/${promptId}`, {
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`状态查询失败: ${response.status} ${response.statusText}`)
    }

    const result = await response.json()

    // 处理不同的响应格式
    if (result.success && result.data && result.data[promptId]) {
      // 格式1: { success: true, data: { promptId: {...} } }
      console.log('✅ 获取到任务状态 (格式1)')
      return result.data[promptId]
    } else if (result[promptId]) {
      // 格式2: { promptId: {...} }
      console.log('✅ 获取到任务状态 (格式2)')
      return result[promptId]
    } else if (result.outputs) {
      // 格式3: { outputs: {...}, ... }
      console.log('✅ 获取到任务状态 (格式3)')
      return result
    }

    console.warn('⚠️ 未识别的响应格式:', JSON.stringify(result).substring(0, 200))
    return null

  } catch (error) {
    console.error('状态查询失败:', error)
    throw new Error(`状态查询失败: ${error.message}`)
  }
}

// 获取生成的图片
async function getGeneratedImage(taskResult, workflowType = 'undress') {
  try {
    const apiBaseUrl = await getApiBaseUrl()

    // 从任务结果中找到输出图片
    const outputs = taskResult.outputs
    let imageInfo = null

    // 获取节点配置
    const nodeConfig = await getWorkflowNodeConfig(workflowType)

    // 优先查找主要输出节点
    const primaryNodeId = nodeConfig.outputNodes.primary
    if (outputs[primaryNodeId] && outputs[primaryNodeId].images && outputs[primaryNodeId].images.length > 0) {
      imageInfo = outputs[primaryNodeId].images[0]
      console.log(`📷 找到主要输出节点${primaryNodeId}的图片:`, imageInfo)
    } else {
      // 查找备用输出节点
      for (const nodeId of nodeConfig.outputNodes.secondary) {
        if (outputs[nodeId] && outputs[nodeId].images && outputs[nodeId].images.length > 0) {
          imageInfo = outputs[nodeId].images[0]
          console.log(`📷 找到备用输出节点${nodeId}的图片:`, imageInfo)
          break
        }
      }
    }

    // 如果配置的节点都没有输出，则查找其他节点的输出图片
    if (!imageInfo) {
      console.log('⚠️ 配置的输出节点都无输出，查找其他节点...')
      for (const nodeId in outputs) {
        const nodeOutput = outputs[nodeId]
        if (nodeOutput.images && nodeOutput.images.length > 0) {
          imageInfo = nodeOutput.images[0]
          console.log(`📷 找到节点${nodeId}的图片:`, imageInfo)
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

// 处理 WebSocket 消息 - 基于ComfyUI官方标准，增强并发任务支持
function handleWebSocketMessage(message) {
  try {
    const { type, data } = message

    // 记录所有消息以便调试并发问题
    if (data && data.prompt_id) {
      console.log(`📨 收到任务相关消息: ${type} for ${data.prompt_id}`)
      console.log(`📊 当前待处理任务: [${Array.from(pendingTasks.keys()).join(', ')}]`)
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
        handleExecutingMessage(data)
        break
      case 'executed':
        handleExecutedMessage(data)
        break
      case 'execution_start':
        handleExecutionStartMessage(data)
        break
      case 'execution_cached':
        handleExecutionCachedMessage(data)
        break
      case 'crystools.monitor':
        // 处理crystools监控消息，可能包含任务状态信息
        handleCrystoolsMonitorMessage(data)
        break
      default:
        // 记录未知消息类型，特别是包含prompt_id的消息
        if (data && data.prompt_id) {
          console.warn(`⚠️ 未处理的任务相关消息类型: ${type}`, data)
        } else {
          console.debug(`忽略消息类型: ${type}`)
        }
    }
  } catch (error) {
    console.error('❌ 处理 WebSocket 消息失败:', error)
    console.error('❌ 消息内容:', message)
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

// 处理crystools监控消息
function handleCrystoolsMonitorMessage(data) {
  if (data && data.prompt_id) {
    const promptId = data.prompt_id
    console.log(`🔍 crystools监控消息 for ${promptId}:`, data)

    // 检查是否包含任务完成信息
    if (data.status === 'completed' || data.finished === true) {
      console.log(`✅ crystools检测到任务 ${promptId} 完成`)
      const task = pendingTasks.get(promptId)
      if (task) {
        // 作为备用完成检测机制
        setTimeout(async () => {
          const stillPending = pendingTasks.get(promptId)
          if (stillPending) {
            console.log('⚠️ crystools备用检测：任务仍在等待，尝试获取结果')
            try {
              const taskResult = await checkTaskStatus(promptId)
              if (taskResult && taskResult.outputs && Object.keys(taskResult.outputs).length > 0) {
                console.log('✅ crystools备用检测获取到任务结果')
                if (task.onComplete) {
                  task.onComplete(taskResult)
                }
                pendingTasks.delete(promptId)
              }
            } catch (error) {
              console.error('❌ crystools备用检测失败:', error)
            }
          }
        }, 1000)
      }
    }
  } else {
    console.debug('📊 crystools监控消息（非任务相关）:', data)
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

// 处理节点执行完成消息 - 精确检测输出节点
function handleExecutedMessage(data) {
  console.log('🎯 收到executed消息:', data)
  console.log('📊 executed消息详细结构:', JSON.stringify(data, null, 2))

  if (!data || !data.prompt_id) {
    console.warn('⚠️ executed消息缺少prompt_id')
    return
  }

  const promptId = data.prompt_id
  const task = pendingTasks.get(promptId)

  if (!task) {
    console.warn(`⚠️ executed消息：任务 ${promptId} 已被处理或不存在`)
    console.log('📋 当前待处理任务:', Array.from(pendingTasks.keys()))
    console.log('🔍 任务ID匹配检查:', {
      收到的promptId: promptId,
      promptId类型: typeof promptId,
      待处理任务列表: Array.from(pendingTasks.keys()),
      是否存在完全匹配: pendingTasks.has(promptId)
    })

    // 尝试模糊匹配（防止ID格式问题）
    const fuzzyMatch = Array.from(pendingTasks.keys()).find(id =>
      id.includes(promptId) || promptId.includes(id)
    )
    if (fuzzyMatch) {
      console.log(`🔍 找到模糊匹配的任务ID: ${fuzzyMatch}`)
      // 使用模糊匹配的任务继续处理
      const fuzzyTask = pendingTasks.get(fuzzyMatch)
      if (fuzzyTask) {
        console.log(`✅ 使用模糊匹配任务 ${fuzzyMatch} 处理executed消息`)
        // 递归调用，使用正确的任务ID
        const correctedData = { ...data, prompt_id: fuzzyMatch }
        handleExecutedMessage(correctedData)
        return
      }
    }

    return
  }

  // 获取执行完成的节点ID
  const executedNodeId = data.node_id || Object.keys(data.outputs || {})[0]

  console.log('🔍 executed消息分析:', {
    node_id: data.node_id,
    outputs: data.outputs ? Object.keys(data.outputs) : '无outputs',
    executedNodeId: executedNodeId
  })

  if (!executedNodeId) {
    console.log('📊 executed消息未包含节点ID，跳过处理')
    return
  }

  console.log(`🔍 检查节点 ${executedNodeId} 是否为输出节点`)

  // 获取工作流配置，检查是否是输出节点
  const workflowType = task.workflowType || 'undress'

  getWorkflowNodeConfig(workflowType).then(nodeConfig => {
    console.log(`📋 获取到${workflowType}工作流节点配置:`, nodeConfig)

    const isOutputNode = executedNodeId === nodeConfig.outputNodes.primary ||
                        nodeConfig.outputNodes.secondary.includes(executedNodeId)

    if (isOutputNode) {
      console.log(`✅ 输出节点 ${executedNodeId} 执行完成，任务结束`)
      console.log(`📊 输出节点数据结构:`, data.outputs ? Object.keys(data.outputs) : '无outputs字段')

      // 验证数据结构完整性
      if (!data.outputs || Object.keys(data.outputs).length === 0) {
        console.warn('⚠️ executed消息缺少outputs数据，延迟获取结果')
        // 延迟获取完整结果
        setTimeout(async () => {
          try {
            const taskResult = await checkTaskStatus(promptId)
            if (taskResult && taskResult.outputs && Object.keys(taskResult.outputs).length > 0) {
              console.log(`✅ 通过API获取到完整任务结果`)
              if (task.onProgress) {
                task.onProgress('处理完成', 100)
              }
              if (task.onComplete) {
                task.onComplete(taskResult)
              }
            } else {
              console.error('❌ API获取任务结果失败')
              if (task.onError) {
                task.onError('任务完成但无法获取结果')
              }
            }
            pendingTasks.delete(promptId)
          } catch (error) {
            console.error('❌ 获取任务结果失败:', error)
            if (task.onError) {
              task.onError(error.message)
            }
            pendingTasks.delete(promptId)
          }
        }, 1000)
      } else {
        // 数据完整，立即处理
        console.log(`✅ executed消息包含完整数据，立即处理`)
        if (task.onProgress) {
          task.onProgress('处理完成', 100)
        }
        if (task.onComplete) {
          task.onComplete(data)
        }
        pendingTasks.delete(promptId)
      }

      console.log(`🧹 输出节点任务 ${promptId} 处理完成，剩余任务: ${pendingTasks.size}`)
    } else {
      console.log(`📝 节点 ${executedNodeId} 不是输出节点，继续等待`)
      console.log(`📋 输出节点配置: 主要=${nodeConfig.outputNodes.primary}, 备用=[${nodeConfig.outputNodes.secondary.join(',')}]`)
    }
  }).catch(error => {
    console.warn('⚠️ 获取节点配置失败，使用备用逻辑:', error)
    // 备用逻辑：检查是否是已知的输出节点
    const knownOutputNodes = ['732', '730', '812', '813', '746', '710']
    if (knownOutputNodes.includes(executedNodeId)) {
      console.log(`✅ 检测到已知输出节点 ${executedNodeId} 完成`)
      if (task.onProgress) {
        task.onProgress('处理完成', 100)
      }
      if (task.onComplete) {
        task.onComplete(data)
      }
      pendingTasks.delete(promptId)
    } else {
      console.log(`📝 节点 ${executedNodeId} 不在已知输出节点列表中，继续等待`)
    }
  })
}

// 处理正在执行消息 - 简化版本，只处理进度更新
function handleExecutingMessage(data) {
  if (data && data.prompt_id) {
    const promptId = data.prompt_id
    const nodeId = data.node

    console.log('🔄 收到executing消息:', {
      promptId: promptId,
      nodeId: nodeId,
      当前待处理任务数: pendingTasks.size
    })

    const task = pendingTasks.get(promptId)

    if (!task) {
      console.log(`⚠️ executing消息：未找到任务 ${promptId} (节点: ${nodeId})`)
      console.log('📋 当前待处理任务:', Array.from(pendingTasks.keys()))
      console.log('🔍 任务ID匹配检查:', {
        收到的promptId: promptId,
        promptId类型: typeof promptId,
        待处理任务列表: Array.from(pendingTasks.keys()),
        是否存在完全匹配: pendingTasks.has(promptId)
      })

      // 尝试模糊匹配
      const fuzzyMatch = Array.from(pendingTasks.keys()).find(id =>
        id.includes(promptId) || promptId.includes(id)
      )
      if (fuzzyMatch) {
        console.log(`🔍 找到模糊匹配的任务ID: ${fuzzyMatch}`)
        const fuzzyTask = pendingTasks.get(fuzzyMatch)
        if (fuzzyTask) {
          console.log(`✅ 使用模糊匹配任务 ${fuzzyMatch} 处理executing消息`)
          // 递归调用，使用正确的任务ID
          const correctedData = { ...data, prompt_id: fuzzyMatch }
          handleExecutingMessage(correctedData)
          return
        }
      }

      return
    }

    if (nodeId === null) {
      // 所有节点执行完成信号 - 作为备用完成检测机制
      console.log('📊 检测到所有节点执行完成信号 (executing with node=null)')
      console.log('⏳ 等待输出节点的executed消息，同时启动备用检测...')

      // 更新进度
      if (task.onProgress) {
        task.onProgress('等待输出节点完成...', 95)
      }

      // 备用机制：延迟2秒后检查任务结果，防止executed消息丢失
      setTimeout(async () => {
        // 检查任务是否还在等待（没有被executed消息处理）
        const stillPending = pendingTasks.get(promptId)
        if (stillPending) {
          console.log('⚠️ 2秒后任务仍在等待，启动备用完成检测')
          try {
            const taskResult = await checkTaskStatus(promptId)
            if (taskResult && taskResult.outputs && Object.keys(taskResult.outputs).length > 0) {
              console.log('✅ 备用检测获取到完整任务结果')
              if (task.onProgress) {
                task.onProgress('处理完成', 100)
              }
              if (task.onComplete) {
                task.onComplete(taskResult)
              }
              pendingTasks.delete(promptId)
              console.log(`🧹 备用机制完成任务 ${promptId}`)
            } else {
              console.warn('⚠️ 备用检测未获取到有效结果')
            }
          } catch (error) {
            console.error('❌ 备用检测失败:', error)
          }
        } else {
          console.log('✅ 任务已被executed消息正常处理')
        }
      }, 2000)
    } else {
      // 单个节点开始执行 - 更新进度
      console.log(`🔄 节点 ${nodeId} 开始执行`)
      if (task.onProgress) {
        task.onProgress(`正在执行节点 ${nodeId}`, 60)
      }
    }
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

// 全局任务状态监控 - 防止任务丢失
let taskMonitorInterval = null

function startTaskMonitoring() {
  if (taskMonitorInterval) {
    clearInterval(taskMonitorInterval)
  }

  taskMonitorInterval = setInterval(async () => {
    if (pendingTasks.size === 0) return

    console.log(`🔍 定期检查 ${pendingTasks.size} 个待处理任务状态...`)

    for (const [promptId, task] of pendingTasks.entries()) {
      try {
        // 检查任务是否已在服务器端完成
        const taskResult = await checkTaskStatus(promptId)
        if (taskResult && taskResult.outputs && Object.keys(taskResult.outputs).length > 0) {
          console.log(`🎯 监控发现任务 ${promptId} 已完成但未被WebSocket处理`)

          // 触发任务完成
          if (task.onComplete) {
            task.onComplete(taskResult)
          }
          pendingTasks.delete(promptId)
          console.log(`🧹 监控机制完成任务 ${promptId}`)
        }
      } catch (error) {
        console.debug(`任务 ${promptId} 状态检查失败:`, error.message)
      }
    }
  }, 10000) // 每10秒检查一次
}

function stopTaskMonitoring() {
  if (taskMonitorInterval) {
    clearInterval(taskMonitorInterval)
    taskMonitorInterval = null
  }
}

// 等待任务完成 - 添加工作流类型参数和增强监控
async function waitForTaskCompletion(promptId, maxWaitTime = 300000, onProgress = null, workflowType = 'undress') {
  console.log(`⏳ 开始等待任务完成: ${promptId} (${workflowType})`)
  console.log(`📊 当前待处理任务数: ${pendingTasks.size}`)

  await ensureWebSocketConnection()

  // 启动任务监控
  startTaskMonitoring()

  return new Promise((resolve, reject) => {
    // 设置超时 - 增强超时前的最后检查
    const timeout = setTimeout(async () => {
      console.log(`⏰ 任务即将超时: ${promptId}，进行最后检查...`)

      try {
        // 超时前最后一次检查任务状态
        const lastCheckResult = await checkTaskStatus(promptId)
        if (lastCheckResult && lastCheckResult.outputs && Object.keys(lastCheckResult.outputs).length > 0) {
          console.log(`✅ 超时前检查发现任务 ${promptId} 已完成`)
          pendingTasks.delete(promptId)
          resolve(lastCheckResult)
          return
        }
      } catch (error) {
        console.error(`❌ 超时前检查失败:`, error)
      }

      console.log(`⏰ 任务确认超时: ${promptId}`)
      pendingTasks.delete(promptId)
      showNotification('任务处理超时', 'error')
      reject(new Error('任务执行超时'))
    }, maxWaitTime)

    // 创建任务对象，包含工作流类型和超时控制
    const task = {
      workflowType: workflowType, // 记录工作流类型
      timeout: timeout, // 保存超时引用
      创建时间: new Date().toISOString(),
      onProgress: (status, progress) => {
        console.log(`📈 任务进度更新: ${promptId} - ${status} (${progress}%)`)
        if (onProgress) {
          onProgress(status, progress)
        }
      },
      onComplete: (result) => {
        clearTimeout(timeout)
        console.log(`✅ 任务完成回调触发: ${promptId}`)
        // 如果没有其他待处理任务，停止监控
        if (pendingTasks.size <= 1) {
          stopTaskMonitoring()
        }
        resolve(result)
      },
      onError: (error) => {
        clearTimeout(timeout)
        console.error(`❌ 任务失败回调触发: ${promptId} - ${error}`)
        showNotification('任务处理失败', 'error')
        reject(new Error(error))
      }
    }

    // 注册任务
    pendingTasks.set(promptId, task)
    console.log(`📝 任务已注册: ${promptId} (${workflowType})`)
    console.log(`📊 注册后待处理任务数: ${pendingTasks.size}`)
    console.log(`📋 当前所有待处理任务: ${Array.from(pendingTasks.keys()).join(', ')}`)

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

    const taskResult = await waitForTaskCompletion(promptId, 300000, (status, progress) => {
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
  getApiBaseUrl,
  addConfigChangeListener,
  removeConfigChangeListener,
  processUndressImage,
  processFaceSwapImage,
  initializeWebSocket,
  wsConnection,
  isWsConnected,
  startTaskMonitoring,
  stopTaskMonitoring,
  pendingTasks // 导出用于调试
}
