// ComfyUI工作流服务 - 直连模式
import undressWorkflow from '../workflows/undress.json'
import faceSwapWorkflow from '../workflows/faceswap2.0.json'
import comfyUIConfig from '../config/comfyui.config.js'
import pointsManager from '../utils/pointsManager.js'
import levelCardPointsManager from '../utils/levelCardPointsManager.js'
import { updateAPIConfig } from './api.js'
import loadBalancer from './loadBalancer.js'
import { getWorkflowNodeConfig, isWorkflowEnabled } from '../utils/workflowConfig.js'

// 🔧 窗口唯一标识符生成机制
function generateWindowId() {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// 🔧 为当前窗口生成唯一的clientId
function generateUniqueClientId() {
  const baseId = 'abc1373d4ad648a3a81d0587fbe5534b' // 基础clientId
  const windowId = generateWindowId()
  return `${baseId}_${windowId}`
}

// 🔧 窗口级别的全局变量 - 确保每个窗口都有唯一标识
const WINDOW_CLIENT_ID = generateUniqueClientId()
const WINDOW_ID = generateWindowId()

console.log(`🪟 窗口标识: ${WINDOW_ID}`)
console.log(`🔑 窗口客户端ID: ${WINDOW_CLIENT_ID}`)

// API配置 - 直连模式
const DEFAULT_CONFIG = {
  // ComfyUI服务器URL（用户可配置）
  COMFYUI_SERVER_URL: comfyUIConfig.BASE_URL,
  CLIENT_ID: WINDOW_CLIENT_ID, // 🔧 使用窗口唯一的clientId
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

// 获取 ComfyUI 图片访问URL（简化版本，现在主要用于兼容性）
function getComfyUIImageUrl(imageData) {
  try {
    // 如果已经是 ComfyUI 的 URL 格式，直接返回
    if (typeof imageData === 'string' && imageData.includes('/view?')) {
      console.log('🔗 已是 ComfyUI URL 格式:', imageData)
      return imageData
    }

    // 如果是其他格式，尝试从全局变量获取最新的URL
    if (window.lastComfyUIImageUrl) {
      console.log('🔗 使用缓存的 ComfyUI URL:', window.lastComfyUIImageUrl)
      return window.lastComfyUIImageUrl
    }

    console.warn('⚠️ 无法获取 ComfyUI URL')
    return imageData // 返回原始数据作为兜底

  } catch (error) {
    console.error('❌ 获取 ComfyUI 图片URL失败:', error)
    return imageData // 返回原始数据作为兜底
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

// 🔧 获取API基础URL - 强化版本（严格的服务器锁定机制）
async function getApiBaseUrl() {
  try {
    // 🔧 详细的状态检查和日志
    console.log('🔍 [getApiBaseUrl] 开始获取API基础URL...')
    console.log(`🔍 [getApiBaseUrl] currentWebSocketServer: ${currentWebSocketServer}`)
    console.log(`🔍 [getApiBaseUrl] wsConnection存在: ${!!wsConnection}`)
    console.log(`🔍 [getApiBaseUrl] wsConnection.readyState: ${wsConnection?.readyState} (1=OPEN)`)
    console.log(`🔍 [getApiBaseUrl] isWsConnected: ${isWsConnected}`)
    console.log(`🔍 [getApiBaseUrl] pendingTasks.size: ${pendingTasks.size}`)

    // 🔧 强化的锁定条件（窗口级别）：
    // 1. 有锁定的服务器 AND
    // 2. (WebSocket连接正常 OR 有待处理任务需要保持一致性)
    const hasLockedServer = !!windowLockedServer
    const wsIsHealthy = wsConnection && wsConnection.readyState === WebSocket.OPEN
    const hasPendingTasks = windowTasks.size > 0
    const shouldUseLocked = hasLockedServer && (wsIsHealthy || hasPendingTasks)

    if (shouldUseLocked) {
      console.log(`🔒 [${WINDOW_ID}] 使用WebSocket锁定的服务器:`, windowLockedServer)
      console.log(`🕐 [${WINDOW_ID}] 服务器锁定时间:`, new Date(windowLockTimestamp).toLocaleTimeString())
      console.log(`⏱️ [${WINDOW_ID}] 锁定持续时间:`, Math.round((Date.now() - windowLockTimestamp) / 1000) + '秒')
      console.log(`📊 [${WINDOW_ID}] 锁定原因: WebSocket健康=${wsIsHealthy}, 待处理任务=${hasPendingTasks}`)

      // 确保URL格式正确，移除末尾的斜杠
      let baseUrl = windowLockedServer
      if (baseUrl && baseUrl.endsWith('/')) {
        baseUrl = baseUrl.slice(0, -1)
      }

      console.log(`✅ [${WINDOW_ID}] [getApiBaseUrl] 返回锁定的服务器URL:`, baseUrl)
      return baseUrl
    }

    // 🔧 只有在没有任何锁定条件时才使用负载均衡
    console.log('🎯 没有服务器锁定，使用负载均衡选择最优服务器...')
    console.log('🔍 [getApiBaseUrl] 未使用锁定服务器的原因:')
    if (!hasLockedServer) console.log('   - 没有锁定的服务器')
    if (hasLockedServer && !wsIsHealthy && !hasPendingTasks) {
      console.log('   - 有锁定服务器但WebSocket不健康且无待处理任务')
    }

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

    // 🔧 备用方案：如果有锁定服务器，优先使用锁定服务器
    if (windowLockedServer) {
      console.log(`🔒 [${WINDOW_ID}] 错误情况下使用锁定服务器:`, windowLockedServer)
      let baseUrl = windowLockedServer
      if (baseUrl && baseUrl.endsWith('/')) {
        baseUrl = baseUrl.slice(0, -1)
      }
      return baseUrl
    }

    // 最后备用方案：使用配置中的默认服务器
    const config = getComfyUIConfig(true)
    let baseUrl = config.COMFYUI_SERVER_URL

    if (baseUrl && baseUrl.endsWith('/')) {
      baseUrl = baseUrl.slice(0, -1)
    }

    console.log('🔗 备用方案API基础URL:', baseUrl)
    return baseUrl
  }
}

// 删除重试机制，直接使用最优服务器

// 重置为默认配置
function resetToDefaultConfig() {
  localStorage.removeItem('comfyui_config')
  return { ...DEFAULT_CONFIG }
}

// 🔧 生成窗口唯一的客户端ID
function generateClientId() {
  return WINDOW_CLIENT_ID
}

// 生成 prompt_id - 官方标准
function generatePromptId() {
  const promptId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
  console.log(`🆔 [PROMPT_ID_TRACK] 新生成 prompt_id: ${promptId}`)
  return promptId
}



// 第一步：上传Base64图片到ComfyUI服务器并获取文件名 - 增强版本（服务器一致性）
async function uploadImageToComfyUI(base64Image) {
  // 🔧 关键修复：确保WebSocket连接和服务器锁定
  await ensureWebSocketConnection()

  const apiBaseUrl = await getApiBaseUrl()
  console.log('🔄 第一步：上传图片到ComfyUI服务器')
  console.log('📡 API地址:', `${apiBaseUrl}/upload/image`)
  logServerConsistency('上传图片到ComfyUI')

  // 🔧 验证窗口级别的服务器一致性
  if (windowLockedServer && apiBaseUrl !== windowLockedServer.replace(/\/$/, '')) {
    console.error(`❌ [${WINDOW_ID}] [uploadImage] 服务器不一致！`)
    console.error(`   锁定服务器: ${windowLockedServer}`)
    console.error(`   上传服务器: ${apiBaseUrl}`)
    throw new Error(`服务器不一致：WebSocket连接到 ${windowLockedServer}，但上传到 ${apiBaseUrl}`)
  }

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

// 官方标准工作流提交 - 修复版本（支持预注册任务和强制服务器锁定）
async function submitWorkflow(workflowPrompt, promptId = null, tempTask = null) {
  console.log('📤 [OFFICIAL] 提交工作流')

  // 🔧 关键修复：确保WebSocket连接并强制锁定服务器
  await ensureWebSocketConnection()

  // 🔧 验证窗口级别的服务器锁定状态
  if (!windowLockedServer) {
    throw new Error('WebSocket服务器未锁定，无法确保任务一致性')
  }

  console.log(`🔒 [${WINDOW_ID}] 确认使用锁定服务器: ${windowLockedServer}`)

  const config = getComfyUIConfig()
  const apiBaseUrl = await getApiBaseUrl()

  // 🔧 双重验证：确保API使用的是锁定的服务器
  if (apiBaseUrl !== windowLockedServer.replace(/\/$/, '')) {
    console.warn(`⚠️ [${WINDOW_ID}] API服务器(${apiBaseUrl})与锁定服务器(${windowLockedServer})不一致`)
    throw new Error('服务器不一致，可能导致任务状态同步问题')
  }

  // 使用传入的promptId或生成新的
  const finalPromptId = promptId || generatePromptId()
  console.log(`🆔 [OFFICIAL] 使用promptId: ${finalPromptId}`)
  logServerConsistency('提交工作流', finalPromptId)

  // 🔧 关键修复：在提交前预注册任务到窗口任务队列
  if (tempTask) {
    registerWindowTask(finalPromptId, tempTask)
    console.log(`📝 [${WINDOW_ID}] 预注册任务: ${finalPromptId}`)
    console.log(`📊 [${WINDOW_ID}] 当前待处理任务: [${Array.from(windowTasks.keys()).join(', ')}]`)
  }

  // 🔧 构建官方标准请求体 - 使用窗口唯一的clientId
  const requestBody = {
    client_id: WINDOW_CLIENT_ID,
    prompt: workflowPrompt,
    prompt_id: finalPromptId
  }

  const promptUrl = `${apiBaseUrl}/api/prompt`
  console.log(`📡 [OFFICIAL] 提交到: ${promptUrl}`)

  const response = await fetch(promptUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  })

  if (!response.ok) {
    // 🔧 提交失败时清理预注册的任务
    if (tempTask) {
      removeWindowTask(finalPromptId)
      console.log(`🧹 [${WINDOW_ID}] 提交失败，清理预注册任务: ${finalPromptId}`)
    }
    const errorText = await response.text()
    throw new Error(`工作流提交失败: ${response.status} ${response.statusText} - ${errorText}`)
  }

  await response.json() // 确保响应被完全读取
  console.log(`✅ [${WINDOW_ID}] 工作流提交成功: ${finalPromptId}`)
  logServerConsistency('工作流提交成功', finalPromptId)

  return finalPromptId
}



// 获取生成的图片URL - 优化版本（直接返回URL，无需传输）
async function getGeneratedImageUrl(taskResult, workflowType = 'undress') {
  try {
    // 🔧 强制使用任务执行时锁定的服务器
    let apiBaseUrl
    if (windowLockedServer) {
      apiBaseUrl = windowLockedServer.replace(/\/$/, '')
      console.log(`🔒 [${WINDOW_ID}] 使用锁定服务器获取图片: ${apiBaseUrl}`)
    } else {
      apiBaseUrl = await getApiBaseUrl()
      console.warn(`⚠️ [${WINDOW_ID}] 未找到锁定服务器，使用当前配置: ${apiBaseUrl}`)
    }

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

    console.log('🌐 直接返回图片URL:', imageUrl)

    // 保存 ComfyUI 原始URL到全局变量，供积分扣除时使用
    window.lastComfyUIImageUrl = imageUrl
    console.log('💾 保存 ComfyUI 图片URL 供积分记录使用:', imageUrl)

    // 直接返回URL，无需下载和转换
    return imageUrl

  } catch (error) {
    console.error('图片URL获取失败:', error)
    throw new Error(`图片URL获取失败: ${error.message}`)
  }
}

// 🔧 新增：根据任务ID获取图片URL（使用任务绑定的服务器）
async function getTaskBoundImageUrl(promptId, taskResult, workflowType = 'undress') {
  try {
    const task = getWindowTask(promptId)
    if (task && task.executionServer) {
      const apiBaseUrl = task.executionServer.replace(/\/$/, '')
      console.log(`🎯 [${WINDOW_ID}] 使用任务绑定服务器获取图片: ${apiBaseUrl}`)

      // 使用绑定的服务器构建图片URL
      return await buildImageUrlWithServer(apiBaseUrl, taskResult, workflowType)
    }

    // 回退到当前逻辑
    console.warn(`⚠️ [${WINDOW_ID}] 任务 ${promptId} 未找到绑定服务器，使用默认逻辑`)
    return await getGeneratedImageUrl(taskResult, workflowType)
  } catch (error) {
    console.error(`❌ [${WINDOW_ID}] 获取任务绑定图片URL失败:`, error)
    throw error
  }
}

// 🔧 新增：使用指定服务器构建图片URL
async function buildImageUrlWithServer(apiBaseUrl, taskResult, workflowType = 'undress') {
  try {
    // 获取节点配置
    const nodeConfig = await getWorkflowNodeConfig(workflowType)
    const outputs = taskResult.outputs
    let imageInfo = null

    // 按照配置的优先级查找图片：先查找主要输出节点
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
      throw new Error('未找到生成的图片')
    }

    // 构建图片URL
    const params = new URLSearchParams({
      filename: imageInfo.filename,
      type: imageInfo.type,
      subfolder: imageInfo.subfolder || ''
    })
    const imageUrl = `${apiBaseUrl}/api/view?${params.toString()}`

    console.log(`🌐 [${WINDOW_ID}] 构建图片URL: ${imageUrl}`)
    return imageUrl

  } catch (error) {
    console.error('构建图片URL失败:', error)
    throw error
  }
}

// WebSocket 连接管理 - 修复版本（服务器锁定机制）
let wsConnection = null
let isWsConnected = false

// 🔧 窗口隔离的任务队列 - 避免多窗口任务冲突
let windowTasks = new Map() // promptId -> task

// 🔧 窗口级别的服务器锁定机制
let windowLockedServer = null
let windowLockTimestamp = null

// 🔧 为了向后兼容，保留 pendingTasks 引用但指向窗口任务队列
let pendingTasks = windowTasks

// 🔧 保留原有的全局变量名但使用窗口级别的值
let currentWebSocketServer = windowLockedServer
let serverLockTimestamp = windowLockTimestamp

// 🔧 窗口级别的任务管理函数
function registerWindowTask(promptId, task) {
  // 🔧 记录任务执行的服务器地址
  task.executionServer = windowLockedServer
  task.windowId = WINDOW_ID
  task.clientId = WINDOW_CLIENT_ID
  task.registeredAt = Date.now()

  windowTasks.set(promptId, task)
  console.log(`📝 [${WINDOW_ID}] 任务已注册: ${promptId}, 绑定服务器: ${task.executionServer}`)
  console.log(`📊 [${WINDOW_ID}] 当前窗口任务数: ${windowTasks.size}`)
}

function getWindowTask(promptId) {
  const task = windowTasks.get(promptId)
  if (task && task.windowId === WINDOW_ID) {
    return task
  }

  // 如果任务不属于当前窗口，记录日志但不返回
  if (task && task.windowId !== WINDOW_ID) {
    console.log(`🔍 [${WINDOW_ID}] 忽略其他窗口的任务: ${promptId} (属于窗口: ${task.windowId})`)
  }

  return null
}

function removeWindowTask(promptId) {
  const task = windowTasks.get(promptId)
  if (task && task.windowId === WINDOW_ID) {
    windowTasks.delete(promptId)
    console.log(`🗑️ [${WINDOW_ID}] 任务已移除: ${promptId}`)
    console.log(`📊 [${WINDOW_ID}] 剩余窗口任务数: ${windowTasks.size}`)
    return true
  }
  return false
}

// 🔧 新增：根据任务ID获取绑定的服务器地址
function getTaskBoundServer(promptId) {
  const task = getWindowTask(promptId)
  if (task && task.executionServer) {
    console.log(`🎯 [${WINDOW_ID}] 任务 ${promptId} 绑定服务器: ${task.executionServer}`)
    return task.executionServer
  }
  console.warn(`⚠️ [${WINDOW_ID}] 任务 ${promptId} 未找到绑定服务器`)
  return null
}

// 🔧 窗口级别的服务器锁定管理
function lockServerForWindow(serverUrl) {
  windowLockedServer = serverUrl
  windowLockTimestamp = Date.now()

  // 同步更新全局变量以保持兼容性
  currentWebSocketServer = windowLockedServer
  serverLockTimestamp = windowLockTimestamp

  console.log(`🔒 [${WINDOW_ID}] 锁定服务器: ${serverUrl}`)
  console.log(`🕐 [${WINDOW_ID}] 锁定时间: ${new Date(windowLockTimestamp).toLocaleTimeString()}`)

  // 设置窗口级别的锁定超时
  setTimeout(() => {
    if (windowTasks.size === 0) {
      unlockServerForWindow()
    }
  }, 300000) // 5分钟超时
}

function unlockServerForWindow() {
  if (windowLockedServer) {
    console.log(`🔓 [${WINDOW_ID}] 解锁服务器: ${windowLockedServer}`)
    windowLockedServer = null
    windowLockTimestamp = null

    // 同步更新全局变量
    currentWebSocketServer = null
    serverLockTimestamp = null
  }
}

// 🔧 窗口间通信机制（用于调试和监控）
function broadcastTaskStatus(promptId, status) {
  try {
    const message = {
      type: 'task_status',
      windowId: WINDOW_ID,
      clientId: WINDOW_CLIENT_ID,
      promptId: promptId,
      status: status,
      timestamp: Date.now()
    }

    localStorage.setItem(`comfyui_task_${promptId}`, JSON.stringify(message))
    console.log(`📡 [${WINDOW_ID}] 广播任务状态: ${promptId} -> ${status}`)
  } catch (error) {
    console.warn(`⚠️ [${WINDOW_ID}] 广播任务状态失败:`, error)
  }
}

// 监听其他窗口的任务状态（用于调试）
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key && e.key.startsWith('comfyui_task_')) {
      try {
        const message = JSON.parse(e.newValue)
        if (message.windowId !== WINDOW_ID) {
          console.log(`📡 [${WINDOW_ID}] 收到其他窗口任务状态: ${message.promptId} -> ${message.status} (来自窗口: ${message.windowId})`)
        }
      } catch (error) {
        // 忽略解析错误
      }
    }
  })
}

// 🔧 实时跟踪变量
function logServerConsistency(action, promptId = null) {
  const timestamp = new Date().toISOString()
  console.log(`🔍 [SERVER_TRACK] ${timestamp} - ${action}`)
  console.log(`🔍 [SERVER_TRACK] 当前WebSocket服务器: ${currentWebSocketServer}`)
  console.log(`🔍 [SERVER_TRACK] WebSocket连接状态: ${wsConnection?.readyState} (1=OPEN)`)
  console.log(`🔍 [SERVER_TRACK] isWsConnected: ${isWsConnected}`)
  if (promptId) {
    console.log(`🔍 [PROMPT_ID_TRACK] 当前prompt_id: ${promptId}`)
  }
  console.log(`🔍 [SERVER_TRACK] 待处理任务数: ${pendingTasks.size}`)
  console.log('🔍 [SERVER_TRACK] =====================================')
}

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

// 调试辅助函数 - 用于诊断任务状态问题（窗口隔离版本）
function debugTaskStatus(promptId = null) {
  console.log(`🔍 [${WINDOW_ID}] ===== 任务状态调试信息 =====`)
  console.log(`🪟 [${WINDOW_ID}] 窗口客户端ID: ${WINDOW_CLIENT_ID}`)
  console.log(`📊 [${WINDOW_ID}] 待处理任务总数: ${windowTasks.size}`)
  console.log(`🔗 [${WINDOW_ID}] WebSocket 连接状态: ${isWsConnected ? '已连接' : '未连接'}`)
  console.log(`📡 [${WINDOW_ID}] WebSocket 就绪状态: ${wsConnection?.readyState || '无连接'}`)
  console.log(`🔒 [${WINDOW_ID}] 锁定服务器: ${windowLockedServer || '无'}`)

  if (windowTasks.size > 0) {
    console.log(`📋 [${WINDOW_ID}] 所有待处理任务:`)
    for (const [taskId, task] of windowTasks.entries()) {
      console.log(`  - ${taskId}: ${task.workflowType || 'unknown'} (创建于: ${task.createdAt || 'unknown'}) (窗口: ${task.windowId || 'unknown'})`)
    }
  }

  if (promptId) {
    const task = getWindowTask(promptId)
    console.log(`🎯 [${WINDOW_ID}] 指定任务 ${promptId}:`, {
      exists: !!task,
      belongsToWindow: task?.windowId === WINDOW_ID,
      hasOnComplete: !!(task?.onComplete),
      hasOnError: !!(task?.onError),
      hasOnProgress: !!(task?.onProgress),
      workflowType: task?.workflowType,
      createdAt: task?.createdAt,
      windowId: task?.windowId
    })
  }

  console.log(`🔍 [${WINDOW_ID}] ===== 调试信息结束 =====`)
}



// 🔧 初始化 WebSocket 连接 - 修复版本（服务器锁定机制）
async function initializeWebSocket() {
  try {
    // 检查现有连接
    if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
      console.log('🎯 WebSocket 已连接')
      console.log('🔒 当前锁定服务器:', currentWebSocketServer)
      return true
    }

    const config = getComfyUIConfig()

    // 🔧 关键修复：窗口级别的服务器锁定机制
    let baseUrl
    if (windowLockedServer) {
      // 如果已有锁定的服务器，继续使用
      baseUrl = windowLockedServer
      console.log(`🔒 [${WINDOW_ID}] 使用已锁定的WebSocket服务器: ${baseUrl}`)
      logServerConsistency('使用已锁定的WebSocket服务器')
    } else {
      // 首次连接或重连时，选择最优服务器并锁定
      try {
        baseUrl = await loadBalancer.getOptimalServer()
        if (!baseUrl) {
          throw new Error('负载均衡器未返回有效的服务器URL')
        }
        lockServerForWindow(baseUrl)
        console.log(`🔒 [${WINDOW_ID}] 锁定WebSocket服务器: ${baseUrl}`)
        console.log(`🕐 [${WINDOW_ID}] 锁定时间: ${new Date(windowLockTimestamp).toLocaleTimeString()}`)
        logServerConsistency('锁定新的WebSocket服务器')
      } catch (loadBalancerError) {
        console.error(`❌ [${WINDOW_ID}] 负载均衡器获取服务器失败:`, loadBalancerError)
        throw new Error(`无法获取可用的ComfyUI服务器: ${loadBalancerError.message}`)
      }
    }

    console.log(`🔌 [${WINDOW_ID}] 连接WebSocket: ${baseUrl}`)

    // 🔧 构建WebSocket URL - 使用窗口唯一的clientId
    let wsUrl
    if (baseUrl.startsWith('https://')) {
      wsUrl = baseUrl.replace('https://', 'wss://') + '/ws?clientId=' + WINDOW_CLIENT_ID
    } else {
      wsUrl = baseUrl.replace('http://', 'ws://') + '/ws?clientId=' + WINDOW_CLIENT_ID
    }

    console.log(`🔗 [${WINDOW_ID}] WebSocket URL: ${wsUrl}`)

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
        showNotification(`[${WINDOW_ID}] WebSocket连接成功`, 'success')
        logServerConsistency('WebSocket连接成功')
        resolve(true)
      }

      wsConnection.onclose = (event) => {
        console.log(`🔌 [${WINDOW_ID}] WebSocket 连接关闭: 代码=${event.code}`)
        isWsConnected = false
        clearTimeout(timeout)
        showNotification(`[${WINDOW_ID}] WebSocket连接已断开`, 'warning')

        // 🔧 关键修复：WebSocket断开时不立即解锁服务器
        // 只有在没有待处理任务时才考虑解锁
        if (windowTasks.size === 0) {
          console.log(`🔓 [${WINDOW_ID}] 没有待处理任务，可以解锁服务器`)
          unlockServerForWindow()
          logServerConsistency('WebSocket断开-解锁服务器')
        } else {
          console.log(`🔒 [${WINDOW_ID}] 有 ${windowTasks.size} 个待处理任务，保持服务器锁定`)
          console.log(`📋 [${WINDOW_ID}] 待处理任务: [${Array.from(windowTasks.keys()).join(', ')}]`)
          logServerConsistency('WebSocket断开-保持锁定')
        }

        // 重连策略 - 如果有待处理任务则立即重连
        if (windowTasks.size > 0) {
          console.log(`🔄 [${WINDOW_ID}] 检测到待处理任务，立即重连...`)
          setTimeout(() => {
            initializeWebSocket().catch(error => {
              console.error(`❌ [${WINDOW_ID}] 重连失败:`, error)

              // 🔧 只有在多次重连失败后才解锁服务器
              console.log(`⚠️ [${WINDOW_ID}] 重连失败，但保持服务器锁定以便手动重试`)

              // 给任务更多时间，不立即标记失败
              console.log(`⏳ [${WINDOW_ID}] 任务将继续等待，可手动重连或等待超时`)
            })
          }, 2000) // 缩短重连间隔
        } else {
          console.log(`ℹ️ [${WINDOW_ID}] 没有待处理任务，不进行自动重连`)
        }
      }

      wsConnection.onerror = (error) => {
        clearTimeout(timeout)
        showNotification(`[${WINDOW_ID}] WebSocket连接错误`, 'error')

        // 🔧 关键修复：连接错误时不立即解锁服务器
        // 保持锁定以便重连到同一服务器
        console.log(`⚠️ [${WINDOW_ID}] WebSocket连接错误，但保持服务器锁定以便重连`)
        console.log(`🔒 [${WINDOW_ID}] 当前锁定服务器: ${windowLockedServer}`)
        console.log(`📊 [${WINDOW_ID}] 待处理任务数: ${windowTasks.size}`)

        reject(error)
      }

      wsConnection.onmessage = (event) => {
        try {
          // 🔥 官方标准消息处理 - 完全重构版本（基于 websockets_api_example.py 第34-45行）
          const message = event.data

          // 官方标准：处理二进制消息（预览图像）
          if (message instanceof ArrayBuffer || message instanceof Blob) {
            // 官方注释：previews are binary data - continue
            return
          }

          // 官方标准：只处理字符串消息
          if (typeof message === 'string') {
            try {
              const parsedMessage = JSON.parse(message)

              // 调用重构后的消息处理函数
              handleWebSocketMessage(parsedMessage)
            } catch (parseError) {
              console.error('❌ [OFFICIAL] JSON解析失败:', parseError.message)
            }
          }

        } catch (error) {
          console.error('❌ [OFFICIAL] WebSocket消息处理失败:', error)
        }
      }
    })
  } catch (error) {
    console.error('❌ 初始化 WebSocket 失败:', error)

    // 🔧 根据错误类型决定是否清除服务器锁定
    if (error.message.includes('负载均衡器') || error.message.includes('无法获取可用的ComfyUI服务器')) {
      // 如果是负载均衡器错误，清除服务器锁定
      currentWebSocketServer = null
      serverLockTimestamp = null
      console.log('🔓 负载均衡器错误，清除服务器锁定')
    } else if (error.message.includes('ComfyUI服务器不可达') || error.message.includes('WebSocket 连接超时')) {
      // 如果是连接错误但服务器可能恢复，保持锁定以便重试
      console.log('🔒 连接错误但保持服务器锁定以便重试')
    } else {
      // 其他未知错误，清除锁定
      currentWebSocketServer = null
      serverLockTimestamp = null
      console.log('🔓 未知错误，清除服务器锁定')
    }

    throw error
  }
}

// 🔧 新增：手动重置WebSocket服务器锁定的功能
function resetWebSocketServer(force = false) {
  console.log('🔄 手动重置WebSocket服务器锁定')
  console.log('🔓 清除服务器锁定:', currentWebSocketServer)

  if (!force && pendingTasks.size > 0) {
    console.log(`⚠️ 有 ${pendingTasks.size} 个待处理任务，建议等待完成后再重置`)
    console.log('💡 如需强制重置，请调用: resetWebSocketServer(true)')
    return false
  }

  // 清除服务器锁定
  currentWebSocketServer = null
  serverLockTimestamp = null

  // 关闭现有WebSocket连接
  if (wsConnection) {
    console.log('🔌 关闭现有WebSocket连接')
    wsConnection.close(1000, '手动重置服务器')
    wsConnection = null
    isWsConnected = false
  }

  // 清理所有待处理任务（如果强制重置）
  if (force && pendingTasks.size > 0) {
    console.log(`🧹 强制清理 ${pendingTasks.size} 个待处理任务`)
    const taskIds = Array.from(pendingTasks.keys())
    for (const promptId of taskIds) {
      const task = pendingTasks.get(promptId)
      if (task && task.onError) {
        task.onError('WebSocket服务器已强制重置')
      }
      pendingTasks.delete(promptId)
    }
  }

  console.log('✅ WebSocket服务器重置完成')
  return true
}

// 🔧 将重置函数暴露到全局，方便调试和故障恢复（窗口隔离版本）
if (typeof window !== 'undefined') {
  window.resetWebSocketServer = resetWebSocketServer
  window.getWebSocketServerStatus = getWebSocketServerStatus
  window.debugWebSocketLock = debugWebSocketLock
  window.getApiBaseUrl = getApiBaseUrl
  window.checkServerUnlockCondition = checkServerUnlockCondition
  window.validateServerConsistency = validateServerConsistency
  window.debugTaskStatus = debugTaskStatus
  window.checkTaskStatusManually = checkTaskStatusManually
  window.forceCompleteTask = forceCompleteTask
  window.checkAllPendingTasks = checkAllPendingTasks
  window.pendingTasks = windowTasks // 🔧 暴露窗口级别的任务队列

  // 🔧 新增：窗口信息调试函数
  window.getWindowInfo = () => ({
    windowId: WINDOW_ID,
    clientId: WINDOW_CLIENT_ID,
    lockedServer: windowLockedServer,
    taskCount: windowTasks.size,
    tasks: Array.from(windowTasks.keys())
  })

  // 🔧 新增：多窗口服务器状态调试函数
  window.debugMultiWindowServers = function() {
    console.log(`🪟 当前窗口: ${WINDOW_ID}`)
    console.log(`🔒 锁定服务器: ${windowLockedServer}`)
    console.log(`📋 待处理任务:`, Array.from(windowTasks.keys()))

    // 显示所有任务的服务器绑定
    console.log(`📊 任务服务器绑定详情:`)
    windowTasks.forEach((task, promptId) => {
      console.log(`  任务 ${promptId}: ${task.executionServer || '未绑定'}`)
    })

    // 显示其他窗口的任务状态（从localStorage读取）
    console.log(`🌐 其他窗口任务状态:`)
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('comfyui_task_')) {
        try {
          const message = JSON.parse(localStorage.getItem(key))
          if (message.windowId !== WINDOW_ID) {
            console.log(`  窗口 ${message.windowId}: 任务 ${message.promptId} -> ${message.status}`)
          }
        } catch (error) {
          // 忽略解析错误
        }
      }
    }
  }

  console.log(`🔧 [${WINDOW_ID}] WebSocket管理函数已暴露到全局: window.resetWebSocketServer(), window.getWebSocketServerStatus(), window.debugWebSocketLock(), window.getApiBaseUrl(), window.checkServerUnlockCondition(), window.validateServerConsistency(), window.debugTaskStatus(), window.checkTaskStatusManually(), window.forceCompleteTask(), window.checkAllPendingTasks(), window.pendingTasks, window.getWindowInfo(), window.debugMultiWindowServers()`)
}

// 🔧 新增：获取当前WebSocket服务器状态的函数（窗口隔离版本）
function getWebSocketServerStatus() {
  return {
    windowId: WINDOW_ID,
    clientId: WINDOW_CLIENT_ID,
    isConnected: isWsConnected,
    lockedServer: windowLockedServer,
    lockTimestamp: windowLockTimestamp,
    lockDuration: windowLockTimestamp ? Date.now() - windowLockTimestamp : null,
    pendingTasksCount: windowTasks.size,
    connectionState: wsConnection?.readyState || 'CLOSED'
  }
}

// 🔧 新增：调试WebSocket锁定机制的函数（窗口隔离版本）
function debugWebSocketLock() {
  console.log(`🔍 [${WINDOW_ID}] ===== WebSocket服务器锁定状态调试 =====`)
  console.log(`🪟 [${WINDOW_ID}] 窗口客户端ID: ${WINDOW_CLIENT_ID}`)
  console.log(`🔗 [${WINDOW_ID}] WebSocket连接状态: ${isWsConnected ? '已连接' : '未连接'}`)
  console.log(`📡 [${WINDOW_ID}] WebSocket就绪状态: ${wsConnection?.readyState || '无连接'} (0=CONNECTING, 1=OPEN, 2=CLOSING, 3=CLOSED)`)
  console.log(`🔒 [${WINDOW_ID}] 锁定的服务器: ${windowLockedServer || '无'}`)
  console.log(`🕐 [${WINDOW_ID}] 锁定时间: ${windowLockTimestamp ? new Date(windowLockTimestamp).toLocaleString() : '无'}`)
  console.log(`⏱️ [${WINDOW_ID}] 锁定持续时间: ${windowLockTimestamp ? Math.round((Date.now() - windowLockTimestamp) / 1000) + '秒' : '无'}`)
  console.log(`📊 [${WINDOW_ID}] 待处理任务数: ${windowTasks.size}`)

  if (windowTasks.size > 0) {
    console.log(`📋 [${WINDOW_ID}] 待处理任务列表:`)
    for (const [promptId, task] of windowTasks.entries()) {
      console.log(`   - ${promptId}: ${task.workflowType || 'unknown'} (窗口: ${task.windowId || 'unknown'})`)
    }
  }

  // 检查锁定条件
  const lockCondition = windowLockedServer && wsConnection && wsConnection.readyState === WebSocket.OPEN
  console.log(`✅ [${WINDOW_ID}] 锁定条件满足: ${lockCondition ? '是' : '否'}`)

  if (!lockCondition) {
    console.log(`❌ [${WINDOW_ID}] 锁定条件不满足的原因:`)
    if (!windowLockedServer) console.log('   - 没有锁定的服务器')
    if (!wsConnection) console.log('   - WebSocket连接对象不存在')
    if (wsConnection && wsConnection.readyState !== WebSocket.OPEN) {
      console.log(`   - WebSocket未处于OPEN状态 (当前: ${wsConnection.readyState})`)
    }
  }

  console.log(`🔍 [${WINDOW_ID}] ===== 调试信息结束 =====`)

  return {
    windowId: WINDOW_ID,
    clientId: WINDOW_CLIENT_ID,
    isConnected: isWsConnected,
    lockedServer: windowLockedServer,
    lockTimestamp: windowLockTimestamp,
    lockConditionMet: lockCondition,
    wsReadyState: wsConnection?.readyState,
    pendingTasksCount: windowTasks.size
  }
}

// 🔧 新增：检查是否可以解锁服务器的函数（窗口隔离版本）
function checkServerUnlockCondition() {
  // 只有在以下条件都满足时才解锁服务器：
  // 1. 没有待处理任务
  // 2. WebSocket连接已断开超过一定时间（可选）

  if (windowTasks.size === 0) {
    if (windowLockedServer) {
      console.log(`🔓 [${WINDOW_ID}] 所有任务已完成，解锁服务器`)
      console.log(`🔓 [${WINDOW_ID}] 解锁服务器: ${windowLockedServer}`)
      unlockServerForWindow()
      return true
    }
  } else {
    console.log(`🔒 [${WINDOW_ID}] 仍有 ${windowTasks.size} 个待处理任务，保持服务器锁定`)
  }

  return false
}

// 🔧 新增：验证服务器一致性的函数（窗口隔离版本）
async function validateServerConsistency(operation = 'API调用') {
  try {
    const apiBaseUrl = await getApiBaseUrl()

    if (!windowLockedServer) {
      console.warn(`⚠️ [${WINDOW_ID}] [${operation}] 没有锁定的WebSocket服务器`)
      return { consistent: false, reason: '没有锁定的WebSocket服务器' }
    }

    const normalizedLocked = windowLockedServer.replace(/\/$/, '')
    const normalizedApi = apiBaseUrl.replace(/\/$/, '')

    if (normalizedLocked !== normalizedApi) {
      console.error(`❌ [${WINDOW_ID}] [${operation}] 服务器不一致！`)
      console.error(`   锁定服务器: ${normalizedLocked}`)
      console.error(`   API服务器: ${normalizedApi}`)
      return {
        consistent: false,
        reason: `服务器不一致：锁定=${normalizedLocked}, API=${normalizedApi}`,
        lockedServer: normalizedLocked,
        apiServer: normalizedApi
      }
    }

    console.log(`✅ [${WINDOW_ID}] [${operation}] 服务器一致性验证通过: ${normalizedApi}`)
    return { consistent: true, server: normalizedApi }

  } catch (error) {
    console.error(`❌ [${WINDOW_ID}] [${operation}] 服务器一致性验证失败:`, error)
    return { consistent: false, reason: error.message }
  }
}

// 移除复杂的健康检查系统

// 🔥 官方标准WebSocket消息处理 - 基于官方API文档重构
function handleWebSocketMessage(message) {
  try {
    if (!message || typeof message !== 'object') {
      return
    }

    const { type, data } = message

    // 静默处理crystools.monitor消息，避免干扰正常消息处理
    if (type === 'crystools.monitor') {
      // 静默忽略crystools插件的监控消息
      return
    }

    // 根据官方WebSocket API文档处理所有标准消息类型
    switch (type) {
      case 'status':
        // 服务器状态和队列信息
        handleStatusMessage(data)
        break

      case 'execution_start':
        // 任务开始执行 - 官方标准状态检测
        handleExecutionStartMessage(data)
        break

      case 'executing':
        // 节点执行状态 - 官方标准完成检测
        handleExecutingMessage(data)
        break

      case 'progress':
        // 节点执行进度
        handleProgressMessage(data)
        break

      case 'executed':
        // 节点执行完成
        handleExecutedMessage(data)
        break

      case 'execution_cached':
        // 节点缓存命中
        handleExecutionCachedMessage(data)
        break

      case 'execution_error':
        // 执行错误
        handleExecutionErrorMessage(data)
        break

      case 'execution_interrupted':
        // 执行中断
        handleExecutionInterruptedMessage(data)
        break

      default:
        // 记录未知消息类型用于调试
        console.log(`🔍 [OFFICIAL] 未知消息类型: ${type}`, data)
    }

  } catch (error) {
    console.error('❌ [OFFICIAL] WebSocket消息处理失败:', error)
  }
}

// 🔥 官方标准任务状态管理 - 基于WebSocket消息的状态枚举
const TASK_STATUS = {
  WAITING: 'waiting',        // 任务在队列中等待
  EXECUTING: 'executing',    // 任务正在执行
  COMPLETED: 'completed',    // 任务已完成
  ERROR: 'error',           // 任务执行错误
  INTERRUPTED: 'interrupted' // 任务被中断
}

// 🔥 原子性任务状态更新函数 - 窗口隔离版本
function updateTaskStatus(promptId, newStatus, additionalData = {}) {
  // 🔧 只处理属于当前窗口的任务
  const task = getWindowTask(promptId)
  if (!task) {
    console.warn(`⚠️ [${WINDOW_ID}] 尝试更新不存在或不属于当前窗口的任务状态: ${promptId}`)
    return false
  }

  const oldStatus = task.status
  task.status = newStatus
  task.lastStatusUpdate = Date.now()

  // 合并额外数据
  Object.assign(task, additionalData)

  console.log(`🔄 [${WINDOW_ID}] 任务状态变更: ${promptId} ${oldStatus} → ${newStatus}`)

  // 🔧 广播任务状态变更
  broadcastTaskStatus(promptId, newStatus)

  return true
}

// 🔥 处理服务器状态消息 - 官方标准队列检测（窗口隔离版本）
function handleStatusMessage(data) {
  if (!data || !data.status) {
    return
  }

  const execInfo = data.status.exec_info
  if (!execInfo) {
    return
  }

  const queueRemaining = execInfo.queue_remaining || 0
  console.log(`📊 [${WINDOW_ID}] 服务器队列状态: ${queueRemaining} 个任务等待`)

  // 🔧 只更新属于当前窗口的等待中任务状态
  windowTasks.forEach((task, promptId) => {
    // 确保任务属于当前窗口
    if (task.windowId === WINDOW_ID && task.status === TASK_STATUS.WAITING && task.onProgress) {
      if (queueRemaining > 1) {
        // 多个任务等待时显示具体数量
        task.onProgress(`队列中还有 ${queueRemaining} 个任务等待`, 8)
      } else if (queueRemaining === 1) {
        // 只有一个任务等待时的提示
        task.onProgress('队列中还有 1 个任务等待', 10)
      } else {
        // 队列为空，即将开始处理
        task.onProgress('即将开始处理...', 12)
      }
    }
  })
}

// 🔥 处理任务开始执行消息 - 官方标准状态检测（窗口隔离版本）
function handleExecutionStartMessage(data) {
  if (!data || !data.prompt_id) {
    return
  }

  const promptId = data.prompt_id

  // 🔧 只处理属于当前窗口的任务
  const task = getWindowTask(promptId)
  if (!task) {
    console.log(`🔍 [${WINDOW_ID}] 忽略其他窗口的执行开始消息: ${promptId}`)
    return
  }

  console.log(`🚀 [${WINDOW_ID}] 任务开始执行: ${promptId}`)

  // 原子性状态更新：waiting → executing
  const updated = updateTaskStatus(promptId, TASK_STATUS.EXECUTING, {
    executionStartTime: Date.now(),
    currentNode: null,
    completedNodes: []
  })

  if (updated && task.onProgress) {
    task.onProgress('任务开始执行...', 15)
  }
}

// 🔥 处理节点缓存命中消息（窗口隔离版本）
function handleExecutionCachedMessage(data) {
  if (!data || !data.prompt_id || !data.nodes) {
    return
  }

  const promptId = data.prompt_id

  // 🔧 只处理属于当前窗口的任务
  const task = getWindowTask(promptId)
  if (!task) {
    console.log(`🔍 [${WINDOW_ID}] 忽略其他窗口的缓存命中消息: ${promptId}`)
    return
  }

  console.log(`⚡ [${WINDOW_ID}] 缓存命中: ${promptId}, 节点: [${data.nodes.join(', ')}]`)

  if (task.onProgress) {
    task.onProgress(`缓存命中 ${data.nodes.length} 个节点`, 25)
  }
}

// 🔥 处理执行错误消息（窗口隔离版本）
function handleExecutionErrorMessage(data) {
  if (!data || !data.prompt_id) {
    return
  }

  const promptId = data.prompt_id

  // 🔧 只处理属于当前窗口的任务
  const task = getWindowTask(promptId)
  if (!task) {
    console.log(`🔍 [${WINDOW_ID}] 忽略其他窗口的执行错误消息: ${promptId}`)
    return
  }

  console.error(`❌ [${WINDOW_ID}] 任务执行错误: ${promptId}`, data)

  // 原子性状态更新：* → error
  const updated = updateTaskStatus(promptId, TASK_STATUS.ERROR, {
    errorTime: Date.now(),
    errorData: data
  })

  if (updated) {
    // 清理任务
    removeWindowTask(promptId)

    if (task.onError) {
      const error = new Error(`执行错误: ${data.exception_message || '未知错误'}`)
      error.details = data
      task.onError(error)
    }
  }
}

// 🔥 处理执行中断消息（窗口隔离版本）
function handleExecutionInterruptedMessage(data) {
  if (!data || !data.prompt_id) {
    return
  }

  const promptId = data.prompt_id

  // 🔧 只处理属于当前窗口的任务
  const task = getWindowTask(promptId)
  if (!task) {
    console.log(`🔍 [${WINDOW_ID}] 忽略其他窗口的执行中断消息: ${promptId}`)
    return
  }

  console.warn(`⚠️ [${WINDOW_ID}] 任务被中断: ${promptId}`)

  // 原子性状态更新：* → interrupted
  const updated = updateTaskStatus(promptId, TASK_STATUS.INTERRUPTED, {
    interruptTime: Date.now()
  })

  if (updated) {
    // 清理任务
    removeWindowTask(promptId)

    if (task.onError) {
      task.onError(new Error('任务执行被中断'))
    }
  }
}

// 🔥 处理节点执行完成消息 - 重构版本（窗口隔离版本）
function handleExecutedMessage(data) {
  if (!data || !data.prompt_id || !data.node) {
    return
  }

  const promptId = data.prompt_id

  // 🔧 只处理属于当前窗口的任务
  const task = getWindowTask(promptId)
  if (!task || task.status !== TASK_STATUS.EXECUTING) {
    if (!task) {
      console.log(`🔍 [${WINDOW_ID}] 忽略其他窗口的节点完成消息: ${promptId}`)
    }
    return
  }

  console.log(`✅ [${WINDOW_ID}] 节点完成: ${data.node} (任务: ${promptId})`)

  // 记录完成的节点
  if (!task.completedNodes) {
    task.completedNodes = []
  }
  task.completedNodes.push(data.node)

  if (task.onProgress) {
    task.onProgress(`节点 ${data.node} 完成`, 60)
  }
}

// 🔥 处理节点执行进度消息 - 重构版本（窗口隔离版本）
function handleProgressMessage(data) {
  if (!data || !data.prompt_id) {
    return
  }

  const promptId = data.prompt_id

  // 🔧 只处理属于当前窗口的任务
  const task = getWindowTask(promptId)
  if (!task || task.status !== TASK_STATUS.EXECUTING) {
    if (!task) {
      console.log(`🔍 [${WINDOW_ID}] 忽略其他窗口的进度消息: ${promptId}`)
    }
    return
  }

  if (data.value !== undefined && data.max !== undefined) {
    const progress = Math.round((data.value / data.max) * 100)
    const overallProgress = 40 + (progress * 0.5) // 40-90%区间

    console.log(`📈 [${WINDOW_ID}] 进度更新: ${promptId} - ${data.value}/${data.max} (${progress}%)`)

    if (task.onProgress) {
      task.onProgress(`处理进度: ${data.value}/${data.max}`, overallProgress)
    }
  }
}

// 🔥 处理节点执行状态消息 - 官方标准完成检测（窗口隔离版本）
function handleExecutingMessage(data) {
  if (!data || !data.prompt_id) {
    return
  }

  const promptId = data.prompt_id

  // 🔧 只处理属于当前窗口的任务
  const task = getWindowTask(promptId)
  if (!task) {
    console.log(`🔍 [${WINDOW_ID}] 忽略其他窗口的执行状态消息: ${promptId}`)
    return
  }

  // 官方标准双重条件检测：data.node === null && data.prompt_id === promptId
  if (data.node === null && data.prompt_id === promptId) {
    console.log(`🎯 [${WINDOW_ID}] 任务执行完成: ${promptId}`)

    // 原子性状态更新：executing → completed
    updateTaskStatus(promptId, TASK_STATUS.COMPLETED, {
      completionTime: Date.now()
    })

    // 立即处理任务完成
    handleTaskCompletion(promptId)

  } else if (data.node !== null) {
    // 正在执行某个节点
    console.log(`⚙️ [${WINDOW_ID}] 执行节点: ${data.node} (任务: ${promptId})`)

    // 更新当前执行节点
    if (task.status === TASK_STATUS.EXECUTING) {
      task.currentNode = data.node

      if (task.onProgress) {
        task.onProgress(`正在执行: ${data.node}`, 40)
      }
    }
  }
}

// 官方标准任务完成处理 - 立即响应版本（消除延迟）
async function handleTaskCompletion(promptId) {
  // 🔧 只处理属于当前窗口的任务
  const task = getWindowTask(promptId)
  if (!task) {
    console.warn(`⚠️ [${WINDOW_ID}] 任务未找到或不属于当前窗口: ${promptId}`)
    return
  }

  console.log(`🚀 [${WINDOW_ID}] 开始立即处理任务完成: ${promptId}`)

  try {
    // 🔧 立即更新进度到98%，表示正在获取结果
    if (task.onProgress) {
      task.onProgress('正在获取处理结果...', 98)
    }

    console.log(`🔍 [${WINDOW_ID}] 立即获取任务历史记录: ${promptId}`)

    // 🔧 官方标准：立即获取历史记录（按照websockets_api_example.py第47行）
    const history = await getTaskHistory(promptId)

    console.log(`📊 [${WINDOW_ID}] 历史记录获取成功，开始提取结果: ${promptId}`)

    // 🔧 官方标准：提取结果数据（按照websockets_api_example.py第48-56行）
    const results = await extractTaskResults(history, promptId)

    console.log(`✅ [${WINDOW_ID}] 结果提取完成，更新进度到100%: ${promptId}`)

    // � 立即更新进度到100%
    if (task.onProgress) {
      task.onProgress('处理完成', 100)
    }

    // 🔧 立即清理任务并调用完成回调
    removeWindowTask(promptId)
    console.log(`🧹 [${WINDOW_ID}] 任务清理完成: ${promptId}`)

    // 🔧 检查是否可以解锁服务器
    checkServerUnlockCondition()

    console.log(`🎉 [${WINDOW_ID}] 立即调用完成回调: ${promptId}`)
    if (task.onComplete) {
      // 🔧 使用setTimeout(0)确保回调立即执行（浏览器兼容）
      setTimeout(() => {
        task.onComplete(results)
      }, 0)
    }

  } catch (error) {
    console.error(`❌ [${WINDOW_ID}] 任务完成处理失败: ${promptId}`, error.message)

    // 立即清理任务并调用错误回调
    removeWindowTask(promptId)

    // 🔧 检查是否可以解锁服务器
    checkServerUnlockCondition()

    if (task.onError) {
      // 🔧 使用setTimeout(0)确保错误回调立即执行（浏览器兼容）
      setTimeout(() => {
        task.onError(error.message)
      }, 0)
    }
  }
}

// 🔥 官方标准任务完成处理 - 完全重构版本（基于 websockets_api_example.py 第47-56行）
async function handleTaskCompletionOfficial(promptId) {
  const task = pendingTasks.get(promptId)
  if (!task) {
    return
  }

  console.log(`🎯 [OFFICIAL] 任务完成，立即获取结果: ${promptId}`)

  try {
    // 更新进度到98%
    if (task.onProgress) {
      task.onProgress('正在获取处理结果...', 98)
    }

    // 官方标准：history = get_history(prompt_id)[prompt_id]
    const history = await getTaskHistoryOfficial(promptId)

    // 官方标准：提取结果（for node_id in history['outputs']:）
    const results = await extractTaskResultsOfficial(history, promptId)

    // 更新进度到100%
    if (task.onProgress) {
      task.onProgress('处理完成', 100)
    }

    // 清理任务
    pendingTasks.delete(promptId)
    console.log(`✅ [OFFICIAL] 任务完成: ${promptId}`)

    // 立即调用完成回调
    if (task.onComplete) {
      task.onComplete(results)
    }

  } catch (error) {
    console.error(`❌ [OFFICIAL] 任务处理失败: ${promptId}`, error)

    // 清理任务
    pendingTasks.delete(promptId)

    // 调用错误回调
    if (task.onError) {
      task.onError(error.message)
    }
  }
}

// 🔥 官方标准历史记录获取 - 完全重构版本（基于 websockets_api_example.py 第25-27行）
async function getTaskHistoryOfficial(promptId) {
  const apiBaseUrl = await getApiBaseUrl()
  const url = `${apiBaseUrl}/history/${promptId}`

  console.log(`📡 [OFFICIAL] 获取历史记录: ${url}`)

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`历史记录获取失败: ${response.status} ${response.statusText}`)
  }

  const history = await response.json()

  // 官方标准：返回 history[prompt_id]
  if (!history[promptId]) {
    throw new Error(`历史记录中未找到任务: ${promptId}`)
  }

  return history[promptId]
}

// 🔥 官方标准结果提取 - 完全重构版本（基于 websockets_api_example.py 第48-56行）
async function extractTaskResultsOfficial(history, promptId) {
  console.log(`🔍 [OFFICIAL] 提取任务结果: ${promptId}`)

  const outputImages = {}

  // 官方标准：for node_id in history['outputs']:
  for (const nodeId in history.outputs) {
    const nodeOutput = history.outputs[nodeId]
    const imagesOutput = []

    // 官方标准：if 'images' in node_output:
    if (nodeOutput.images && Array.isArray(nodeOutput.images)) {
      console.log(`📸 [OFFICIAL] 节点 ${nodeId} 有 ${nodeOutput.images.length} 张图片`)

      // 官方标准：for image in node_output['images']:
      for (const image of nodeOutput.images) {
        try {
          // 🔧 修复：使用任务绑定的服务器构建图片URL
          let apiBaseUrl
          const task = getWindowTask(promptId)
          if (task && task.executionServer) {
            apiBaseUrl = task.executionServer.replace(/\/$/, '')
            console.log(`🎯 [${WINDOW_ID}] extractTaskResultsOfficial 使用任务绑定服务器: ${apiBaseUrl}`)
          } else {
            apiBaseUrl = await getApiBaseUrl()
            console.warn(`⚠️ [${WINDOW_ID}] extractTaskResultsOfficial 未找到绑定服务器，使用默认: ${apiBaseUrl}`)
          }

          const imageUrl = getImageUrlOfficial(image.filename, image.subfolder, image.type, apiBaseUrl)
          imagesOutput.push({
            ...image,
            url: imageUrl  // 添加URL字段
          })
        } catch (error) {
          console.error(`构建图片URL失败: ${image.filename}`, error)
        }
      }
    }

    outputImages[nodeId] = imagesOutput
  }

  console.log(`✅ [OFFICIAL] 结果提取完成: ${promptId}, 节点数: ${Object.keys(outputImages).length}`)

  return {
    promptId: promptId,
    outputs: history.outputs,
    outputImages: outputImages,
    status: 'completed'
  }
}

// 🔥 官方标准图片URL获取 - 优化版本（直接返回URL，无需下载）
function getImageUrlOfficial(filename, subfolder, folderType, apiBaseUrl) {
  const params = new URLSearchParams({
    filename: filename,
    subfolder: subfolder || '',
    type: folderType || 'output'
  })

  const url = `${apiBaseUrl}/view?${params.toString()}`
  console.log(`🔗 [OFFICIAL] 构建图片URL: ${filename} -> ${url}`)

  return url
}

// 🔥 官方标准进度消息处理 - 简化版本
function handleProgressMessageOfficial(data) {
  if (!data || !data.prompt_id) {
    return
  }

  const task = pendingTasks.get(data.prompt_id)
  if (!task || !task.onProgress) {
    return
  }

  // 计算进度百分比
  const progress = data.max > 0 ? (data.value / data.max) * 100 : 0

  // 将进度映射到50-92%范围（为最终处理预留空间）
  const adjustedProgress = Math.min(92, Math.max(50, 50 + (progress * 0.42)))

  task.onProgress(`处理中 ${data.value}/${data.max}`, adjustedProgress)
}

// 🔧 官方标准历史记录获取 - 增强版本（服务器一致性验证）
async function getTaskHistory(promptId) {
  console.log(`🔍 [OFFICIAL] getTaskHistory调用: ${promptId}`)
  logServerConsistency('获取任务历史', promptId)

  try {
    // 🔧 关键修复：验证服务器一致性
    if (currentWebSocketServer) {
      console.log(`🔒 [getTaskHistory] 使用锁定服务器查询历史: ${currentWebSocketServer}`)
    } else {
      console.warn(`⚠️ [getTaskHistory] 没有锁定服务器，可能导致任务查询失败`)
    }

    const apiBaseUrl = await getApiBaseUrl()

    // 🔧 双重验证：确保使用锁定的服务器
    if (currentWebSocketServer && apiBaseUrl !== currentWebSocketServer.replace(/\/$/, '')) {
      console.error(`❌ [getTaskHistory] 服务器不一致！`)
      console.error(`   锁定服务器: ${currentWebSocketServer}`)
      console.error(`   API服务器: ${apiBaseUrl}`)
      throw new Error(`服务器不一致：任务在 ${currentWebSocketServer} 上执行，但查询 ${apiBaseUrl}`)
    }

    // 🔧 修复：使用正确的API端点格式（按照官方示例）
    const url = `${apiBaseUrl}/api/history/${promptId}`

    console.log(`📡 [OFFICIAL] 请求URL: ${url}`)

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const history = await response.json()
    console.log(`✅ [OFFICIAL] 历史记录获取成功，任务数: ${Object.keys(history).length}`)

    // 🔧 验证目标任务存在（按照官方示例第47行）
    if (!history[promptId]) {
      throw new Error(`任务不存在于历史记录: ${promptId}`)
    }

    console.log(`📊 [OFFICIAL] 任务 ${promptId} 输出节点:`, Object.keys(history[promptId].outputs || {}))
    return history

  } catch (error) {
    console.error(`❌ [OFFICIAL] getTaskHistory失败: ${promptId}`, error.message)
    throw error
  }
}

// 🔧 从历史记录中提取结果 - 官方标准机制（按照websockets_api_example.py第48-56行）
async function extractTaskResults(history, promptId) {
  try {
    console.log(`📊 [OFFICIAL] 开始提取任务结果: ${promptId}`)

    // 🔧 历史记录格式: { promptId: { outputs: {...} } }（按照官方示例第47行）
    const taskData = history[promptId]
    if (!taskData) {
      throw new Error(`历史记录中未找到任务: ${promptId}`)
    }

    if (!taskData.outputs) {
      throw new Error(`任务 ${promptId} 没有输出数据`)
    }

    console.log(`📋 [OFFICIAL] 任务输出节点:`, Object.keys(taskData.outputs))

    // 🔧 按照官方示例处理图片输出（第48-56行逻辑）
    const outputImages = {}
    for (const nodeId in taskData.outputs) {
      const nodeOutput = taskData.outputs[nodeId]
      const imagesOutput = []

      if (nodeOutput.images && Array.isArray(nodeOutput.images)) {
        console.log(`📷 [OFFICIAL] 节点 ${nodeId} 包含 ${nodeOutput.images.length} 张图片`)
        for (const image of nodeOutput.images) {
          // 保存图片信息，供后续getGeneratedImage函数使用
          imagesOutput.push(image)
        }
      }

      if (imagesOutput.length > 0) {
        outputImages[nodeId] = imagesOutput
      }
    }

    // 🔧 返回与现有代码兼容的格式，同时包含官方标准的图片数据
    const results = {
      outputs: taskData.outputs,
      outputImages: outputImages, // 新增：官方标准的图片数据格式
      promptId: promptId
    }

    console.log(`✅ [OFFICIAL] 任务结果提取完成: ${promptId}`)
    return results
  } catch (error) {
    console.error(`❌ [OFFICIAL] 提取任务结果失败: ${promptId}`, error)
    throw error
  }
}

// 🔧 获取图片URL - 官方标准API（按照websockets_api_example.py第19-23行，优化为直接返回URL）
function getImageUrl(filename, subfolder, folderType, apiBaseUrl) {
  // 🔧 按照官方示例构建参数（第20-21行）
  const params = new URLSearchParams({
    filename: filename,
    subfolder: subfolder || '',
    type: folderType || 'output'
  })

  // 🔧 使用正确的API端点格式（第22行）
  const url = `${apiBaseUrl}/api/view?${params.toString()}`
  console.log(`🔗 [OFFICIAL] 构建图片URL: ${filename} -> ${url}`)

  return url
}

// 🔧 简化版：确保WebSocket连接（技术层面错误降级为警告）
// 🎯 错误处理策略：WebSocket连接问题属于技术层面，不显示用户弹窗，仅记录日志
async function ensureWebSocketConnection() {
  console.log(`🔌 [${WINDOW_ID}] 确保WebSocket连接`)

  // 如果已连接，直接返回（不强制要求服务器锁定）
  if (wsConnection && wsConnection.readyState === WebSocket.OPEN && isWsConnected) {
    console.log(`✅ [${WINDOW_ID}] WebSocket已连接`)

    // 尝试锁定服务器，但失败不影响继续使用
    if (!windowLockedServer) {
      try {
        const apiBaseUrl = await getApiBaseUrl()
        lockServerForWindow(apiBaseUrl)
        console.log(`🔒 [${WINDOW_ID}] 补充锁定服务器: ${apiBaseUrl}`)
      } catch (error) {
        console.warn(`⚠️ [${WINDOW_ID}] 服务器锁定失败，但继续使用连接:`, error.message)
      }
    }
    return true
  }

  // 需要建立新连接
  console.log(`🔄 [${WINDOW_ID}] 建立新的WebSocket连接`)

  try {
    await initializeWebSocket()

    // 给连接一些时间稳定
    await new Promise(resolve => setTimeout(resolve, 500))

    if (!isWsConnected) {
      console.warn(`⚠️ [${WINDOW_ID}] WebSocket连接状态异常，但尝试继续`)
    }

    console.log(`✅ [${WINDOW_ID}] WebSocket连接完成`)
    return true

  } catch (error) {
    console.warn(`⚠️ [${WINDOW_ID}] WebSocket连接失败，但不阻止操作:`, error.message)
    // 🔧 关键改进：不抛出错误，允许降级使用
    return false
  }
}



// 🔥 官方标准任务等待 - 基于WebSocket消息的无超时版本（参考官方 while True 逻辑）
// 🎯 业务需求：移除客户端任务超时机制
// - AI图像处理任务执行时间不可预测，客户端不应主动中断
// - 参考官方 websockets_api_example.py 的 while True 无限等待逻辑
// - 只有服务器主动中断或任务失败时才结束等待
async function waitForTaskCompletion(promptId, onProgress = null, workflowType = 'undress') {
  console.log(`⏳ [${WINDOW_ID}] 等待任务完成: ${promptId} (无超时限制)`)

  // 🔧 尝试确保WebSocket连接，但失败不阻止继续
  try {
    await ensureWebSocketConnection()
  } catch (connectionError) {
    console.warn(`⚠️ [${WINDOW_ID}] WebSocket连接问题，但继续等待任务:`, connectionError.message)
  }

  return new Promise((resolve, reject) => {
    // 🔧 移除超时机制 - 参考官方 websockets_api_example.py 的 while True 无限等待逻辑
    console.log(`📝 [${WINDOW_ID}] 任务将无限期等待，直到收到完成或失败的WebSocket消息`)

    // 创建任务对象 - 包含官方标准状态字段和窗口标识（无超时机制）
    const task = {
      // 🔧 窗口标识
      windowId: WINDOW_ID,
      clientId: WINDOW_CLIENT_ID,

      // 基本信息
      workflowType: workflowType,
      createdAt: new Date().toISOString(),
      startTime: Date.now(),

      // 官方标准状态字段
      status: TASK_STATUS.WAITING,
      lastStatusUpdate: Date.now(),

      // 执行状态跟踪
      currentNode: null,
      completedNodes: [],

      // 回调函数（移除超时处理）
      onProgress: onProgress || (() => {}),
      onComplete: (result) => {
        console.log(`✅ [${WINDOW_ID}] 任务完成回调: ${promptId}`)
        resolve(result)
      },
      onError: (error) => {
        console.error(`❌ [${WINDOW_ID}] 任务错误回调: ${promptId}`, error)
        reject(error instanceof Error ? error : new Error(error))
      }
    }

    // 🔧 注册任务到窗口队列
    registerWindowTask(promptId, task)
    console.log(`📝 [${WINDOW_ID}] 任务已注册: ${promptId} (状态: ${task.status})`)

    // 设置初始进度
    if (onProgress) {
      onProgress('任务已提交，等待服务器处理...', 5)
    }
  })
}

// 移除执行开始消息处理 - 简化实现

// 手动检查任务状态 - 仅用于调试（窗口隔离版本）
async function checkTaskStatusManually(promptId) {
  try {
    console.log(`🔍 [${WINDOW_ID}] 手动检查任务状态: ${promptId}`)

    // 直接尝试获取历史记录
    const history = await getTaskHistory(promptId)

    if (history[promptId] && history[promptId].outputs) {
      console.log(`✅ [${WINDOW_ID}] 发现已完成的任务，触发完成处理: ${promptId}`)
      await handleTaskCompletion(promptId)
    } else {
      console.log(`📋 [${WINDOW_ID}] 任务 ${promptId} 仍在处理中`)
    }
  } catch (error) {
    console.error(`❌ [${WINDOW_ID}] 手动检查任务状态失败: ${promptId}`, error)
    // 如果是404错误，说明任务可能已被清理，从待处理列表中移除
    if (error.message.includes('404')) {
      console.log(`🧹 [${WINDOW_ID}] 任务 ${promptId} 不存在，从待处理列表中移除`)
      removeWindowTask(promptId)
    }
  }
}

// 🔧 新增：强制完成任务的调试函数（窗口隔离版本）
function forceCompleteTask(promptId) {
  console.log(`🚀 [${WINDOW_ID}] 强制完成任务: ${promptId}`)

  const task = getWindowTask(promptId)
  if (!task) {
    console.error(`❌ [${WINDOW_ID}] 任务不存在或不属于当前窗口: ${promptId}`)
    return false
  }

  console.log(`🎯 [${WINDOW_ID}] 找到任务，强制触发完成: ${promptId}`)

  // 模拟接收到完成信号
  const mockExecutingData = {
    prompt_id: promptId,
    node: null  // null表示完成
  }

  console.log(`📨 [${WINDOW_ID}] 模拟executing消息: ${JSON.stringify(mockExecutingData)}`)
  handleExecutingMessage(mockExecutingData)

  return true
}

// 🔧 新增：检查所有待处理任务状态的函数（窗口隔离版本）
async function checkAllPendingTasks() {
  console.log(`🔍 [${WINDOW_ID}] 检查所有待处理任务状态`)
  console.log(`📊 [${WINDOW_ID}] 当前待处理任务数: ${windowTasks.size}`)

  if (windowTasks.size === 0) {
    console.log(`ℹ️ [${WINDOW_ID}] 没有待处理任务`)
    return
  }

  for (const [promptId] of windowTasks.entries()) {
    console.log(`🔍 [${WINDOW_ID}] 检查任务: ${promptId}`)
    try {
      await checkTaskStatusManually(promptId)
    } catch (error) {
      console.error(`❌ [${WINDOW_ID}] 检查任务失败: ${promptId}`, error)
    }
  }
}

// 主要的换衣API函数 - 两步流程
async function processUndressImage(base64Image, onProgress = null) {
  try {
    console.log('🚀 开始处理换衣请求')

    // 🔧 预检查改为警告而非阻断
    if (onProgress) onProgress('正在检查服务器状态...', 5)

    try {
      const serverStatus = await checkComfyUIServerStatus()
      if (serverStatus.status === 'error') {
        console.warn('⚠️ 服务器预检查失败，但尝试继续处理:', serverStatus.error)
        // 不要立即抛出错误，给用户一个尝试的机会
      } else if (serverStatus.status === 'warning') {
        console.warn('⚠️ 服务器状态警告，但继续尝试:', serverStatus.note)
      }
    } catch (preCheckError) {
      console.warn('⚠️ 预检查异常，但继续尝试处理:', preCheckError.message)
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

    // 官方标准：提交工作流
    if (onProgress) onProgress('正在提交工作流到ComfyUI...', 40)

    // 🔧 关键修复：预先创建任务对象，在提交前注册
    const promptId = generatePromptId()
    console.log(`🆔 [OFFICIAL] 生成promptId: ${promptId}`)

    // 🔧 创建临时任务对象，用于预注册
    const tempTask = {
      workflowType: 'undress',
      createdAt: new Date().toISOString(),
      onProgress: null,
      onComplete: null,
      onError: null
    }

    const submittedPromptId = await submitWorkflow(workflowPrompt, promptId, tempTask)
    console.log(`✅ [OFFICIAL] 工作流提交完成: ${submittedPromptId}`)

    // 等待任务完成
    if (onProgress) onProgress('正在等待ComfyUI处理...', 50)

    const taskResult = await waitForTaskCompletion(submittedPromptId, (status, progress) => {
      if (onProgress) {
        const adjustedProgress = Math.min(95, Math.max(50, 50 + (progress * 0.45)))
        onProgress(status, adjustedProgress)
      }
    }, 'undress')
    console.log('✅ 任务处理完成')

    // 获取生成的图片URL（使用任务绑定的服务器）
    if (onProgress) onProgress('正在获取处理结果...', 96)

    const resultImageUrl = await getTaskBoundImageUrl(submittedPromptId, taskResult, 'undress')
    console.log('🎉 换衣处理成功! 图片URL:', resultImageUrl)

    // 消耗积分（从等级卡扣除）
    if (onProgress) onProgress('正在更新积分...', 98)

    // 直接使用图片URL进行积分扣除
    const pointsResult = await levelCardPointsManager.consumePoints(20, '一键换衣', resultImageUrl)

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
      resultImage: resultImageUrl,  // 直接返回URL
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

// 🔧 简化版：检查ComfyUI服务器状态（更宽松的检查策略）
async function checkComfyUIServerStatus() {
  try {
    const apiBaseUrl = await getApiBaseUrl()
    console.log('🔍 检查服务器状态:', apiBaseUrl)

    // 🔧 简化检查：只要能连通就认为可用
    const response = await fetch(`${apiBaseUrl}/api/system_stats`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000) // 5秒超时
    })

    if (response.ok) {
      console.log('✅ 服务器状态正常')
      return { status: 'ok', endpoint: '/api/system_stats' }
    } else {
      // 🔧 即使system_stats失败，尝试其他端点
      console.log('⚠️ system_stats失败，尝试其他检查')
      return await fallbackServerCheck(apiBaseUrl)
    }
  } catch (error) {
    console.log('⚠️ 主要检查失败，尝试备用检查:', error.message)
    return await fallbackServerCheck()
  }
}

// 🔧 备用检查方法
async function fallbackServerCheck(apiBaseUrl) {
  if (!apiBaseUrl) {
    apiBaseUrl = await getApiBaseUrl()
  }

  const fallbackEndpoints = ['/api/queue', '/api/history', '/']

  for (const endpoint of fallbackEndpoints) {
    try {
      const response = await fetch(`${apiBaseUrl}${endpoint}`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000)
      })

      if (response.ok) {
        console.log(`✅ 备用检查成功: ${endpoint}`)
        return { status: 'ok', endpoint, note: '备用检查通过' }
      }
    } catch (error) {
      console.log(`❌ 备用端点 ${endpoint} 失败:`, error.message)
    }
  }

  // 🔧 关键改进：即使所有检查都失败，也给出更友好的结果
  console.log('⚠️ 所有端点检查失败，但这可能是暂时的网络问题')
  return {
    status: 'warning', // 改为warning而不是error
    error: '所有检查端点都失败',
    note: '但这可能是暂时的网络问题，可以尝试继续操作'
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

    // 🔧 官方标准：预先创建任务对象并提交
    const promptId = generatePromptId()
    console.log(`🆔 [OFFICIAL] 生成换脸promptId: ${promptId}`)
    logServerConsistency('生成换脸任务', promptId)

    // 🔧 创建临时任务对象，用于预注册
    const tempTask = {
      workflowType: 'faceswap',
      createdAt: new Date().toISOString(),
      onProgress: null,
      onComplete: null,
      onError: null
    }

    const submittedPromptId = await submitWorkflow(workflow, promptId, tempTask)

    if (onProgress) onProgress('正在处理换脸...', 85)

    // 等待任务完成（无超时限制）
    const taskResult = await waitForTaskCompletion(submittedPromptId, onProgress, 'faceswap')
    console.log('✅ 换脸任务处理完成')

    if (onProgress) onProgress('正在获取处理结果...', 95)

    // 获取结果图片URL（使用任务绑定的服务器）
    const imageUrl = await getTaskBoundImageUrl(submittedPromptId, taskResult, 'faceswap')

    // 消耗积分（从等级卡扣除）
    // 直接使用图片URL进行积分扣除
    const pointsResult = await levelCardPointsManager.consumePoints(20, '极速换脸', imageUrl)

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

// 测试官方标准实现
async function testOfficialStandard() {
  console.log('🧪 [OFFICIAL] 开始测试官方标准实现')

  try {
    // 1. 确保WebSocket连接
    await ensureWebSocketConnection()
    console.log('✅ [OFFICIAL] WebSocket连接成功')

    // 2. 生成promptId
    const promptId = generatePromptId()
    console.log(`🆔 [OFFICIAL] 生成promptId: ${promptId}`)

    // 3. 创建简单测试工作流
    const testWorkflow = {
      "1": {
        "inputs": {
          "text": "test official standard implementation"
        },
        "class_type": "CLIPTextEncode"
      }
    }

    // 4. 创建临时任务对象并提交工作流
    const tempTask = {
      workflowType: 'test',
      createdAt: new Date().toISOString(),
      onProgress: null,
      onComplete: null,
      onError: null
    }

    const submittedPromptId = await submitWorkflow(testWorkflow, promptId, tempTask)
    console.log(`✅ [OFFICIAL] 工作流提交成功: ${submittedPromptId}`)

    // 5. 等待完成（无超时限制）
    const result = await waitForTaskCompletion(submittedPromptId, (status, progress) => {
      console.log(`📊 [OFFICIAL] 测试进度: ${status} (${progress}%)`)
    }, 'test')

    console.log('🎉 [OFFICIAL] 测试完成:', result)
    return result

  } catch (error) {
    console.error('❌ [OFFICIAL] 测试失败:', error.message)
    throw error
  }
}

// 🔥 官方标准任务状态调试工具
function debugTaskStatusOfficial(promptId = null) {
  console.log('📋 [OFFICIAL] 任务状态调试信息:')
  console.log('=====================================')

  if (promptId) {
    // 调试特定任务
    const task = pendingTasks.get(promptId)
    if (task) {
      const runtime = Math.round((Date.now() - task.startTime) / 1000)
      console.log(`📝 任务: ${promptId}`)
      console.log(`  状态: ${task.status}`)
      console.log(`  类型: ${task.workflowType}`)
      console.log(`  运行时间: ${runtime}秒`)
      console.log(`  创建时间: ${task.createdAt}`)
      console.log(`  最后状态更新: ${new Date(task.lastStatusUpdate).toLocaleTimeString()}`)
      if (task.currentNode) console.log(`  当前节点: ${task.currentNode}`)
      if (task.completedNodes?.length) console.log(`  完成节点: [${task.completedNodes.join(', ')}]`)
      if (task.executionStartTime) {
        const execTime = Math.round((Date.now() - task.executionStartTime) / 1000)
        console.log(`  执行时间: ${execTime}秒`)
      }
    } else {
      console.log(`❌ 未找到任务: ${promptId}`)
    }
  } else {
    // 调试所有任务
    console.log(`📊 总任务数: ${pendingTasks.size}`)

    if (pendingTasks.size === 0) {
      console.log('✅ 没有待处理任务')
      return
    }

    // 按状态分组显示
    const tasksByStatus = {}
    pendingTasks.forEach((task, id) => {
      if (!tasksByStatus[task.status]) {
        tasksByStatus[task.status] = []
      }
      tasksByStatus[task.status].push({ id, task })
    })

    Object.entries(tasksByStatus).forEach(([status, tasks]) => {
      console.log(`\n📂 状态: ${status} (${tasks.length}个)`)
      tasks.forEach(({ id, task }) => {
        const runtime = Math.round((Date.now() - task.startTime) / 1000)
        console.log(`  ${id.substring(0, 8)}: ${task.workflowType} (${runtime}秒)`)
      })
    })
  }

  console.log('\n🔍 WebSocket连接状态:', isWsConnected ? '✅ 已连接' : '❌ 未连接')
  console.log('🔒 锁定服务器:', currentWebSocketServer || '无')
}

// 🔥 获取任务状态统计
function getTaskStatusStats() {
  const stats = {
    total: pendingTasks.size,
    byStatus: {},
    byType: {},
    avgRuntime: 0
  }

  let totalRuntime = 0

  pendingTasks.forEach(task => {
    // 按状态统计
    stats.byStatus[task.status] = (stats.byStatus[task.status] || 0) + 1

    // 按类型统计
    stats.byType[task.workflowType] = (stats.byType[task.workflowType] || 0) + 1

    // 运行时间统计
    totalRuntime += (Date.now() - task.startTime)
  })

  if (pendingTasks.size > 0) {
    stats.avgRuntime = Math.round(totalRuntime / pendingTasks.size / 1000)
  }

  return stats
}

// 🔧 修改版：清理真正异常的任务（移除超时清理，保留必要的异常检测）
function cleanupAbnormalTasks() {
  const now = Date.now()
  const abnormalTasks = []

  pendingTasks.forEach((task, promptId) => {
    // 🔧 移除超时检查 - AI任务执行时间不可预测，不应该被客户端主动中断

    // 🔧 只检查真正的异常情况：
    // 1. 任务状态异常（比如状态为undefined或无效值）
    if (!task.status || !Object.values(TASK_STATUS).includes(task.status)) {
      abnormalTasks.push({ promptId, reason: 'invalid_status', status: task.status })
    }
    // 2. 任务对象损坏（缺少必要字段）
    else if (!task.workflowType || !task.createdAt) {
      abnormalTasks.push({ promptId, reason: 'corrupted_task', task: task })
    }

    // 🔧 移除状态更新超时检查 - 长时间运行的任务可能确实需要很长时间
    // 只有在确实收到服务器错误信号时才清理任务
  })

  if (abnormalTasks.length > 0) {
    console.log(`🧹 [OFFICIAL] 发现 ${abnormalTasks.length} 个真正异常的任务:`)
    abnormalTasks.forEach(({ promptId, reason, status, task }) => {
      console.log(`  ${promptId.substring(0, 8)}: ${reason}`, status || task)

      const taskObj = pendingTasks.get(promptId)
      if (taskObj) {
        pendingTasks.delete(promptId)
        if (taskObj.onError) {
          taskObj.onError(new Error(`任务数据异常: ${reason}`))
        }
      }
    })
  }

  return abnormalTasks.length
}

// 🔥 官方标准测试函数 - 验证重构后的实现
async function testOfficialStandardRefactored() {
  console.log('🧪 [OFFICIAL] 开始测试重构后的官方标准实现')

  try {
    // 1. 测试WebSocket连接
    console.log('📡 [OFFICIAL] 测试WebSocket连接...')
    await ensureWebSocketConnection()
    console.log('✅ [OFFICIAL] WebSocket连接成功')

    // 2. 测试消息处理函数
    console.log('📨 [OFFICIAL] 测试消息处理函数...')

    // 模拟 executing 消息
    const mockExecutingMessage = {
      type: 'executing',
      data: {
        prompt_id: 'test-prompt-id',
        node: 'test-node'
      }
    }

    // 注册测试任务
    const testTask = {
      workflowType: 'test',
      createdAt: new Date().toISOString(),
      onProgress: (status, progress) => {
        console.log(`📊 [OFFICIAL] 测试进度: ${status} - ${progress}%`)
      },
      onComplete: (result) => {
        console.log('✅ [OFFICIAL] 测试任务完成:', result)
      },
      onError: (error) => {
        console.error('❌ [OFFICIAL] 测试任务失败:', error)
      }
    }

    pendingTasks.set('test-prompt-id', testTask)

    // 测试消息处理
    handleWebSocketMessage(mockExecutingMessage)
    console.log('✅ [OFFICIAL] 消息处理测试成功')

    // 3. 测试任务完成检测
    console.log('🎯 [OFFICIAL] 测试任务完成检测...')

    const mockCompletionMessage = {
      type: 'executing',
      data: {
        prompt_id: 'test-prompt-id',
        node: null  // 官方标准：node为null表示完成
      }
    }

    handleWebSocketMessage(mockCompletionMessage)
    console.log('✅ [OFFICIAL] 任务完成检测测试成功')

    // 清理测试任务
    pendingTasks.delete('test-prompt-id')

    console.log('🎉 [OFFICIAL] 重构后的官方标准实现测试完成')

    return {
      success: true,
      message: '重构后的官方标准实现测试通过',
      timestamp: new Date().toISOString()
    }

  } catch (error) {
    console.error('❌ [OFFICIAL] 重构测试失败:', error)
    throw error
  }
}

// 🔧 新增：初始化ComfyUI连接的包装函数
async function initializeComfyUIConnection() {
  console.log('🔌 初始化ComfyUI直连模式...')
  try {
    await initializeWebSocket()
    console.log('✅ ComfyUI直连初始化成功')
    return true
  } catch (error) {
    console.error('❌ ComfyUI直连初始化失败:', error)
    throw error
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
  initializeComfyUIConnection, // 🔧 新增：直连模式初始化函数
  wsConnection,
  isWsConnected,
  getTaskHistory,
  extractTaskResults,
  getImageUrl, // 更新：URL版本替代下载版本
  handleTaskCompletion,
  debugTaskStatus,
  checkTaskStatusManually,
  testOfficialStandard, // 新增测试函数
  testOfficialStandardRefactored, // 🔥 新增：重构后的测试函数
  windowTasks as pendingTasks, // 🔧 导出窗口级别的任务队列用于调试
  resetWebSocketServer, // 🔧 新增：手动重置WebSocket服务器
  getWebSocketServerStatus, // 🔧 新增：获取WebSocket服务器状态
  debugWebSocketLock, // 🔧 新增：调试WebSocket锁定机制
  checkServerUnlockCondition, // 🔧 新增：检查服务器解锁条件
  validateServerConsistency, // 🔧 新增：验证服务器一致性
  // 🔥 新增：官方标准函数（重构版本）
  handleWebSocketMessage,
  handleExecutingMessage,
  handleExecutedMessage,
  handleProgressMessage,
  handleStatusMessage,
  handleExecutionStartMessage,
  handleExecutionCachedMessage,
  handleExecutionErrorMessage,
  handleExecutionInterruptedMessage,
  waitForTaskCompletion,
  updateTaskStatus,
  TASK_STATUS,
  // 🔥 新增：调试和监控工具
  debugTaskStatusOfficial,
  getTaskStatusStats,
  cleanupAbnormalTasks,
  // 🔥 保留：优化后的图片处理函数
  getGeneratedImageUrl, // 新增：直接返回URL的图片获取函数
  getTaskBoundImageUrl, // 🔧 新增：使用任务绑定服务器的图片获取函数
  getTaskBoundServer, // 🔧 新增：获取任务绑定的服务器地址
  buildImageUrlWithServer, // 🔧 新增：使用指定服务器构建图片URL
  getComfyUIImageUrl // 保留：兼容性函数
}
