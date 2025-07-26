// ComfyUI工作流服务 - 直连模式
import undressWorkflow from '../workflows/undress.json'
import faceSwapWorkflow from '../workflows/faceswap2.0.json'
import comfyUIConfig from '../config/comfyui.config.js'
import levelCardPointsManager from '../utils/levelCardPointsManager.js'
import { updateAPIConfig } from './api.js'
import loadBalancer from './loadBalancer.js'
import { getWorkflowNodeConfig, getWorkflowInfo } from '../utils/workflowConfig.js'
// 🔧 新增：导入独立的 WebSocket 管理器（已整合连接和消息处理功能）
import webSocketManager, { WINDOW_ID, CLIENT_ID as WINDOW_CLIENT_ID } from './webSocketManager.js'

// 🔧 窗口标识符现在由 WebSocket 管理器提供
// WINDOW_ID 和 WINDOW_CLIENT_ID 从 webSocketManager 导入

// 🔧 窗口事件监听现在由 WebSocket 管理器处理

// API配置 - 直连模式
const DEFAULT_CONFIG = {
  // ComfyUI服务器URL（用户可配置）
  COMFYUI_SERVER_URL: comfyUIConfig.BASE_URL,
  CLIENT_ID: WINDOW_CLIENT_ID, // 🔧 使用窗口唯一的clientId（从 WebSocket 管理器导入）
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
      await response.json() // 读取响应但不使用
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

// 🔧 统一的图片URL构建器 - 整合所有URL构建逻辑
class ImageUrlBuilder {
  // 核心URL构建方法
  static buildUrl(server, filename, subfolder = '', type = 'output') {
    if (!server || !filename) {
      throw new Error('服务器地址和文件名不能为空')
    }

    const baseUrl = server.endsWith('/') ? server.slice(0, -1) : server
    const params = new URLSearchParams({
      filename,
      type,
      subfolder: subfolder || ''
    })
    return `${baseUrl}/api/view?${params.toString()}`
  }

  // 使用任务绑定服务器构建URL
  static async buildTaskBoundUrl(promptId, filename, subfolder = '', type = 'output') {
    try {
      const server = getTaskBoundServer(promptId) || await getApiBaseUrl()
      return this.buildUrl(server, filename, subfolder, type)
    } catch (error) {
      console.warn('⚠️ 获取任务绑定服务器失败:', error)
      const config = getComfyUIConfig()
      return this.buildUrl(config.COMFYUI_SERVER_URL, filename, subfolder, type)
    }
  }

  // 从图片信息对象构建URL
  static buildFromImageInfo(server, imageInfo) {
    return this.buildUrl(
      server,
      imageInfo.filename,
      imageInfo.subfolder || '',
      imageInfo.type || 'output'
    )
  }
}

// 🔧 服务器地址选择日志记录函数
function logServerSelection(context, promptId, selectedServer, reason) {
  console.log(`🌐 [${WINDOW_ID}] ${context} - 任务: ${promptId || 'N/A'}, 服务器: ${selectedServer}, 原因: ${reason}`)
}

// 🔧 统一的服务器地址获取函数 - 解决URL服务器地址错乱问题
function getUnifiedServerUrl(promptId = null) {

  try {
    // 优先级1: 使用任务绑定的服务器（最高优先级）
    if (promptId) {
      const task = getWindowTask(promptId)
      if (task && task.executionServer) {
        const server = task.executionServer.replace(/\/$/, '')
        logServerSelection('统一服务器获取', promptId, server, '任务绑定服务器')
        return server
      }
      console.warn(`⚠️ [${WINDOW_ID}] 任务 ${promptId} 无绑定服务器信息`)
    }

    // 优先级2: 使用窗口锁定服务器
    const currentLock = webSocketManager.getWindowServerLock()
    if (currentLock && currentLock.server) {
      const server = currentLock.server.replace(/\/$/, '')
      logServerSelection('统一服务器获取', promptId, server, '窗口锁定服务器')
      return server
    }

    // 优先级3: 使用默认配置
    const config = getComfyUIConfig()
    const server = config.COMFYUI_SERVER_URL.replace(/\/$/, '')
    logServerSelection('统一服务器获取', promptId, server, '默认配置服务器')
    return server
  } catch (error) {
    console.error('❌ 获取统一服务器地址失败:', error)
    // 最后的兜底方案
    const config = getComfyUIConfig()
    const server = config.COMFYUI_SERVER_URL.replace(/\/$/, '')
    logServerSelection('统一服务器获取', promptId, server, '兜底方案')
    return server
  }
}

// 🔧 统一的图片URL构建函数 - 确保所有图片URL使用相同服务器
function buildUnifiedImageUrl(filename, subfolder = '', type = 'output', promptId = null) {
  try {
    const server = getUnifiedServerUrl(promptId)
    const url = ImageUrlBuilder.buildUrl(server, filename, subfolder, type)
    console.log(`🌐 [${WINDOW_ID}] 构建统一图片URL: ${filename} -> ${url}`)
    return url
  } catch (error) {
    console.error('❌ 构建统一图片URL失败:', error)
    throw error
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

// 🔧 获取API基础URL - 智能版本（使用 WebSocket 管理器）
async function getApiBaseUrl() {
  try {
    const currentLock = webSocketManager.getWindowServerLock()
    const lockedServer = currentLock ? currentLock.server : null

    // 🔧 智能锁定检查：有待处理任务但服务器未锁定时，自动锁定到当前服务器
    if (webSocketManager.windowTasks.size > 0 && !lockedServer) {
      console.log(`🔒 [${WINDOW_ID}] 有待处理任务但服务器未锁定，自动锁定到最优服务器...`)
      try {
        const optimalServer = await loadBalancer.getOptimalServer()
        webSocketManager.lockServerForWindow(optimalServer)
        console.log(`🔒 [${WINDOW_ID}] 自动锁定服务器: ${optimalServer}`)
      } catch (autoLockError) {
        console.warn(`⚠️ [${WINDOW_ID}] 自动锁定失败，但继续执行: ${autoLockError.message}`)
      }
    }

    // 🔧 简化状态检查日志
    console.log(`🔍 [${WINDOW_ID}] 获取API基础URL (锁定: ${lockedServer || '无'}, 任务: ${webSocketManager.windowTasks.size})`)

    // 🔧 简化的锁定条件：有锁定服务器就使用，不强制要求WebSocket健康
    const hasLockedServer = !!lockedServer
    const wsIsHealthy = webSocketManager.wsConnection && webSocketManager.wsConnection.readyState === WebSocket.OPEN
    const hasPendingTasks = webSocketManager.windowTasks.size > 0
    const shouldUseLocked = hasLockedServer // 简化条件，只要有锁定服务器就使用

    if (shouldUseLocked) {
      console.log(`🔒 [${WINDOW_ID}] 使用锁定服务器: ${lockedServer}`)

      // 确保URL格式正确，移除末尾的斜杠
      let baseUrl = lockedServer
      if (baseUrl && baseUrl.endsWith('/')) {
        baseUrl = baseUrl.slice(0, -1)
      }

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
    const currentLock = webSocketManager.getWindowServerLock()
    if (currentLock && currentLock.server) {
      console.log(`🔒 [${WINDOW_ID}] 错误情况下使用锁定服务器:`, currentLock.server)
      let baseUrl = currentLock.server
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

// 🔧 智能服务器一致性验证 - 警告机制版本（使用 WebSocket 管理器）
function validateServerConsistency(operation, currentServer) {
  const currentLock = webSocketManager.getWindowServerLock()
  const lockedServer = currentLock ? currentLock.server : null

  // 🔧 简化处理：减少过度警告，只在真正需要时进行服务器切换
  if (webSocketManager.windowTasks.size > 0 && lockedServer && currentServer !== lockedServer) {
    // 检查是否是合理的服务器切换（例如负载均衡或长时间锁定）
    const isReasonableSwitch = Math.abs(Date.now() - currentLock.timestamp) > 300000 // 超过5分钟的锁定
    if (isReasonableSwitch) {
      console.log(`🔄 [${WINDOW_ID}] 检测到长时间锁定，允许服务器切换到 ${currentServer}`)
      webSocketManager.lockServerForWindow(currentServer)
    } else {
      // 减少警告频率，只在调试模式下显示详细信息
      console.log(`🔍 [${WINDOW_ID}] ${operation} 使用不同服务器: ${currentServer} (锁定: ${lockedServer})`)
    }
  }

  // 🔧 智能处理：有任务但服务器未锁定时自动锁定
  if (webSocketManager.windowTasks.size > 0 && !lockedServer) {
    console.log(`🔒 [${WINDOW_ID}] 有 ${webSocketManager.windowTasks.size} 个待处理任务但服务器未锁定，自动锁定到当前服务器`)
    console.log(`🪟 [${WINDOW_ID}] 窗口任务列表:`, Array.from(webSocketManager.windowTasks.keys()))
    webSocketManager.lockServerForWindow(currentServer)
  }

  // 简化日志输出，只在有问题时记录详细信息
}

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



// 第一步：上传Base64图片到ComfyUI服务器并获取文件名 - 重构版本（任务-服务器绑定一致性）
async function uploadImageToComfyUI(base64Image) {
  const apiBaseUrl = await getApiBaseUrl()
  console.log('🔄 第一步：上传图片到ComfyUI服务器')
  console.log('📡 API地址:', `${apiBaseUrl}/upload/image`)

  // 🔧 关键修复：确保WebSocket连接到与上传相同的服务器
  await webSocketManager.ensureWebSocketConnection(apiBaseUrl)

  logServerConsistency('上传图片到ComfyUI')

  // 🔧 验证服务器一致性
  validateServerConsistency('uploadImageToComfyUI', apiBaseUrl)

  // 🔧 智能验证窗口级别的服务器一致性
  const currentLock = webSocketManager.getWindowServerLock()
  if (currentLock && apiBaseUrl !== currentLock.server.replace(/\/$/, '')) {
    console.warn(`⚠️ [${WINDOW_ID}] [uploadImage] 服务器不一致，自动更新锁定`)
    console.warn(`   锁定服务器: ${currentLock.server}`)
    console.warn(`   上传服务器: ${apiBaseUrl}`)
    webSocketManager.lockServerForWindow(apiBaseUrl)
    console.log(`🔒 [${WINDOW_ID}] 已更新锁定服务器为: ${apiBaseUrl}`)
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

// 官方标准工作流提交 - 重构版本（任务-服务器绑定一致性）
async function submitWorkflow(workflowPrompt, promptId = null, tempTask = null) {
  console.log('📤 [OFFICIAL] 提交工作流')

  const apiBaseUrl = await getApiBaseUrl()

  // 🔧 关键修复：确保WebSocket连接到与提交相同的服务器
  await webSocketManager.ensureWebSocketConnection(apiBaseUrl)

  // 🔧 智能验证窗口级别的服务器锁定状态
  let currentLock = webSocketManager.getWindowServerLock()
  if (!currentLock) {
    // 新用户/窗口首次发起任务，自动锁定到当前服务器
    console.log(`🔒 [${WINDOW_ID}] 新窗口首次任务，自动锁定服务器: ${apiBaseUrl}`)
    webSocketManager.lockServerForWindow(apiBaseUrl)
    currentLock = webSocketManager.getWindowServerLock()
  }

  console.log(`🔒 [${WINDOW_ID}] 确认使用锁定服务器: ${currentLock.server}`)

  // 🔧 验证服务器一致性
  validateServerConsistency('submitWorkflow', apiBaseUrl)

  // 🔧 智能验证：确保API使用的是锁定的服务器
  if (apiBaseUrl !== currentLock.server.replace(/\/$/, '')) {
    console.warn(`⚠️ [${WINDOW_ID}] API服务器(${apiBaseUrl})与锁定服务器(${currentLock.server})不一致，自动更新锁定`)
    webSocketManager.lockServerForWindow(apiBaseUrl)
    console.log(`🔒 [${WINDOW_ID}] 已更新锁定服务器为: ${apiBaseUrl}`)
  }

  // 使用传入的promptId或生成新的
  const finalPromptId = promptId || generatePromptId()
  console.log(`🆔 [OFFICIAL] 使用promptId: ${finalPromptId}`)
  logServerConsistency('提交工作流', finalPromptId)

  // 🔧 关键修复：在提交前预注册任务到窗口任务队列
  if (tempTask) {
    webSocketManager.registerWindowTask(finalPromptId, tempTask)
    console.log(`📝 [${WINDOW_ID}] 预注册任务: ${finalPromptId}`)
    console.log(`📊 [${WINDOW_ID}] 当前待处理任务: [${Array.from(webSocketManager.windowTasks.keys()).join(', ')}]`)
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
      webSocketManager.removeWindowTask(finalPromptId)
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



// 🔧 重构后的图片URL获取函数 - 使用统一服务器地址
async function getGeneratedImageUrl(taskResult, workflowType = 'undress', promptId = null) {
  try {
    // 使用统一的服务器地址获取函数
    const apiBaseUrl = getUnifiedServerUrl(promptId)
    console.log(`🔒 [${WINDOW_ID}] 使用统一服务器获取图片: ${apiBaseUrl}`)

    // 查找图片信息
    const imageInfo = await findImageInTaskResult(taskResult, workflowType)

    // 使用统一构建器构建URL
    const imageUrl = ImageUrlBuilder.buildFromImageInfo(apiBaseUrl, imageInfo)
    console.log('🌐 直接返回图片URL:', imageUrl)

    // 保存 ComfyUI 原始URL到全局变量，供积分扣除时使用
    window.lastComfyUIImageUrl = imageUrl
    console.log('💾 保存 ComfyUI 图片URL 供积分记录使用:', imageUrl)

    return imageUrl

  } catch (error) {
    console.error('图片URL获取失败:', error)
    throw new Error(`图片URL获取失败: ${error.message}`)
  }
}

// 🔧 提取的图片查找逻辑
async function findImageInTaskResult(taskResult, workflowType) {
  const nodeConfig = await getWorkflowNodeConfig(workflowType)
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
  return imageInfo
}

// 🔧 简化的任务绑定图片URL获取函数 - 确保使用任务执行服务器
async function getTaskBoundImageUrl(promptId, taskResult, workflowType = 'undress') {
  try {
    // 🔧 简化逻辑：优先从任务结果获取执行服务器，确保一致性
    let executionServer = null

    if (taskResult && taskResult.executionServer) {
      executionServer = taskResult.executionServer
      console.log(`🎯 [${WINDOW_ID}] 使用任务结果中的执行服务器: ${executionServer}`)
    } else {
      // 如果任务结果中没有服务器信息，说明有问题，记录警告
      console.warn(`⚠️ [${WINDOW_ID}] 任务结果缺少执行服务器信息，这可能导致图片404`)

      // 尝试从窗口锁定服务器获取（作为备用方案）
      const currentLock = webSocketManager.getWindowServerLock()
      if (currentLock && currentLock.server) {
        executionServer = currentLock.server
        console.log(`🔒 [${WINDOW_ID}] 使用窗口锁定服务器作为备用: ${executionServer}`)
      } else {
        throw new Error('无法确定任务执行服务器，图片URL构建失败')
      }
    }

    // 确保URL格式正确
    if (executionServer && executionServer.endsWith('/')) {
      executionServer = executionServer.slice(0, -1)
    }

    // 查找图片信息并构建URL
    const imageInfo = await findImageInTaskResult(taskResult, workflowType)
    const imageUrl = ImageUrlBuilder.buildFromImageInfo(executionServer, imageInfo)

    console.log(`🎉 [${WINDOW_ID}] 任务绑定图片URL构建完成: ${imageUrl}`)
    return imageUrl

  } catch (error) {
    console.error(`❌ [${WINDOW_ID}] 获取任务绑定图片URL失败:`, error)
    throw error
  }
}

// 🔧 注意：getTaskExecutionServer 函数已被 getUnifiedServerUrl 替代，此处移除重复代码

// 🔧 注意：buildImageUrlWithServer 函数已被统一的 ImageUrlBuilder 替代，此处移除重复代码

// 🔧 WebSocket 连接管理现在由独立的 webSocketManager 模块处理
// 所有相关变量和函数都已移至 webSocketManager.js

// 🔧 任务管理函数现在由 webSocketManager 模块提供
// 通过 webSocketManager.registerWindowTask, webSocketManager.getWindowTask 等调用

// 🔧 服务器锁定管理现在由 webSocketManager 模块提供
// 通过 webSocketManager.lockServerForWindow, webSocketManager.unlockServerForWindow 等调用

// 🔧 实时跟踪变量 - 更新为使用 webSocketManager
function logServerConsistency(action, promptId = null) {
  const timestamp = new Date().toISOString()
  console.log(`🔍 [SERVER_TRACK] ${timestamp} - ${action}`)
  console.log(`🔍 [SERVER_TRACK] 当前WebSocket服务器: ${webSocketManager.currentWebSocketServer}`)
  console.log(`🔍 [SERVER_TRACK] WebSocket连接状态: ${webSocketManager.wsConnection?.readyState} (1=OPEN)`)
  console.log(`🔍 [SERVER_TRACK] isWsConnected: ${webSocketManager.isWsConnected}`)
  if (promptId) {
    console.log(`🔍 [PROMPT_ID_TRACK] 当前prompt_id: ${promptId}`)
  }
  console.log(`🔍 [SERVER_TRACK] 待处理任务数: ${webSocketManager.windowTasks.size}`)
  console.log('🔍 [SERVER_TRACK] =====================================')
}

// 通知函数现在由 webSocketManager 模块提供





// 🔧 WebSocket 初始化现在由 webSocketManager 模块提供
// 通过 webSocketManager.initializeWebSocket() 调用

// 🔧 WebSocket 服务器一致性检查和重置功能现在由 webSocketManager 模块提供
// 通过 webSocketManager.ensureWebSocketServerConsistency() 和 webSocketManager.resetWebSocketServer() 调用

//  暴露核心管理函数到全局，用于故障恢复
if (typeof window !== 'undefined') {
  // 这些函数现在由 webSocketManager 提供，这里只是为了兼容性
  window.getApiBaseUrl = getApiBaseUrl

  console.log(`🔧 [${WINDOW_ID}] 核心管理函数已暴露到全局`)
}

// 🔧 WebSocket 服务器状态和动态解锁检查现在由 webSocketManager 模块提供
// 通过 webSocketManager.getWebSocketServerStatus() 和相关方法调用

// 🔧 解锁检查、防抖机制和安全进度回调现在由 webSocketManager 模块提供
// 通过 webSocketManager.checkServerUnlockCondition() 和 webSocketManager.safeProgressCallback() 调用

// 🔥 WebSocket 消息处理现在由 webSocketMessageHandler 模块提供
// 通过 webSocketManager.handleWebSocketMessage() 调用

// 🔥 消息处理函数、任务状态管理现在由 webSocketMessageHandler 模块提供
// 通过 webSocketManager 相关方法调用

// 🔥 所有消息处理函数现在由 webSocketMessageHandler 模块提供

// 🔥 所有剩余的消息处理函数现在由 webSocketMessageHandler 模块提供

// 🔥 节点执行状态消息处理现在由 webSocketMessageHandler 模块提供

// 🔥 任务完成处理现在由 webSocketMessageHandler 模块提供
// 通过 webSocketManager 相关方法调用









// 🔧 官方标准历史记录获取 - 增强版本（服务器一致性验证）
async function getTaskHistory(promptId) {
  console.log(`🔍 [OFFICIAL] getTaskHistory调用: ${promptId}`)
  logServerConsistency('获取任务历史', promptId)

  try {
    // 🔥 跨服务器历史记录获取：优先使用任务绑定的服务器
    const task = getWindowTask(promptId)
    let apiBaseUrl = null

    if (task && task.executionServer) {
      // 使用任务绑定的服务器
      apiBaseUrl = task.executionServer.replace(/\/$/, '')
      console.log(`🔒 [${WINDOW_ID}] 使用任务绑定服务器查询历史: ${apiBaseUrl}`)
    } else {
      // 回退到当前锁定的服务器
      const currentLock = webSocketManager.getWindowServerLock()
      if (currentLock) {
        apiBaseUrl = currentLock.server.replace(/\/$/, '')
        console.warn(`⚠️ [${WINDOW_ID}] 任务无绑定服务器，使用当前锁定服务器: ${apiBaseUrl}`)
      } else {
        // 最后回退到默认API
        apiBaseUrl = await getApiBaseUrl()
        console.warn(`⚠️ [${WINDOW_ID}] 无锁定服务器，使用默认API: ${apiBaseUrl}`)
      }
    }

    // 🔧 验证服务器一致性（仅在有锁定服务器时）
    const currentLock = getWindowServerLock()
    if (currentLock && task && task.executionServer) {
      if (task.executionServer !== currentLock.server) {
        console.warn(`⚠️ [${WINDOW_ID}] 跨服务器历史查询: 任务在 ${task.executionServer}, 当前锁定 ${currentLock.server}`)
      }
    }

    // 🔧 修复：使用正确的API端点格式（按照官方示例）
    const url = `${apiBaseUrl}/history/${promptId}`

    console.log(`📡 [OFFICIAL] 请求URL: ${url} (服务器: ${apiBaseUrl})`)

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText} (服务器: ${apiBaseUrl})`)
    }

    const history = await response.json()
    console.log(`✅ [OFFICIAL] 历史记录获取成功，任务数: ${Object.keys(history).length} (服务器: ${apiBaseUrl})`)

    // 🔧 验证目标任务存在（按照官方示例第47行）
    if (!history[promptId]) {
      throw new Error(`任务不存在于历史记录: ${promptId} (服务器: ${apiBaseUrl})`)
    }

    console.log(`📊 [OFFICIAL] 任务 ${promptId} 输出节点:`, Object.keys(history[promptId].outputs || {}))
    return history

  } catch (error) {
    console.error(`❌ [OFFICIAL] getTaskHistory失败: ${promptId}`, error.message)
    throw error
  }
}

// 🔥 跨服务器结果提取 - 官方标准机制（按照websockets_api_example.py第48-56行）
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

    // 🔥 获取任务绑定的服务器信息
    const task = getWindowTask(promptId)
    let executionServer = null

    if (task && task.executionServer) {
      executionServer = task.executionServer
      console.log(`🔒 [${WINDOW_ID}] 使用任务绑定服务器: ${executionServer}`)
    } else {
      // 回退到当前锁定的服务器
      const currentLock = getWindowServerLock()
      if (currentLock) {
        executionServer = currentLock.server
        console.warn(`⚠️ [${WINDOW_ID}] 任务无绑定服务器，使用当前锁定服务器: ${executionServer}`)
      } else {
        console.warn(`⚠️ [${WINDOW_ID}] 无法确定执行服务器，图片URL可能不正确`)
      }
    }

    // 🔧 按照官方示例处理图片输出（第48-56行逻辑）
    const outputImages = {}
    const imageUrls = [] // 🔥 新增：收集所有图片URL

    for (const nodeId in taskData.outputs) {
      const nodeOutput = taskData.outputs[nodeId]
      const imagesOutput = []

      if (nodeOutput.images && Array.isArray(nodeOutput.images)) {
        console.log(`📷 [OFFICIAL] 节点 ${nodeId} 包含 ${nodeOutput.images.length} 张图片`)

        for (const image of nodeOutput.images) {
          // 🔥 构建跨服务器安全的图片URL - 使用统一构建函数
          let imageUrl = null
          if (executionServer) {
            imageUrl = ImageUrlBuilder.buildUrl(
              executionServer,
              image.filename,
              image.subfolder || '',
              image.type || 'output'
            )
            console.log(`🌐 [${WINDOW_ID}] 构建图片URL: ${imageUrl}`)
          }

          const imageData = {
            ...image,
            url: imageUrl, // 添加URL字段
            server: executionServer // 记录服务器信息
          }

          imagesOutput.push(imageData)
          if (imageUrl) {
            imageUrls.push(imageUrl)
          }
        }
      }

      if (imagesOutput.length > 0) {
        outputImages[nodeId] = imagesOutput
      }
    }

    // 🔧 返回与现有代码兼容的格式，同时包含跨服务器信息
    const results = {
      outputs: taskData.outputs,
      outputImages: outputImages, // 新增：官方标准的图片数据格式
      imageUrls: imageUrls, // 🔥 新增：所有图片URL列表
      executionServer: executionServer, // 🔥 新增：执行服务器信息
      promptId: promptId
    }

    console.log(`✅ [OFFICIAL] 任务结果提取完成: ${promptId} (服务器: ${executionServer})`)
    console.log(`📷 [OFFICIAL] 提取到 ${imageUrls.length} 个图片URL`)

    return results
  } catch (error) {
    console.error(`❌ [OFFICIAL] 提取任务结果失败: ${promptId}`, error)
    throw error
  }
}

// 🔧 注意：getImageUrl 函数已被 ImageUrlBuilder.buildUrl 替代，此处移除重复代码

// 🔧 WebSocket 连接确保功能现在由 webSocketManager 模块提供
// 通过 webSocketManager.ensureWebSocketConnection() 调用



// 🔥 官方标准任务等待 - 基于WebSocket消息的无超时版本（参考官方 while True 逻辑）
// 🎯 业务需求：移除客户端任务超时机制
// - AI图像处理任务执行时间不可预测，客户端不应主动中断
// - 参考官方 websockets_api_example.py 的 while True 无限等待逻辑
// - 只有服务器主动中断或任务失败时才结束等待
async function waitForTaskCompletion(promptId, onProgress = null, workflowType = 'undress') {
  console.log(`⏳ [${WINDOW_ID}] 等待任务完成: ${promptId} (无超时限制)`)

  // 🔧 尝试确保WebSocket连接，但失败不阻止继续
  try {
    await webSocketManager.ensureWebSocketConnection()
  } catch (connectionError) {
    console.warn(`⚠️ [${WINDOW_ID}] WebSocket连接问题，但继续等待任务:`, connectionError.message)
  }

  return new Promise((resolve, reject) => {
    // 🔧 移除超时机制 - 参考官方 websockets_api_example.py 的 while True 无限等待逻辑
    console.log(`📝 [${WINDOW_ID}] 任务将无限期等待，直到收到完成或失败的WebSocket消息`)

    // 🔧 关键修复：检查任务是否已经注册，避免重复注册
    let task = webSocketManager.getWindowTask(promptId)

    if (!task) {
      console.warn(`⚠️ [${WINDOW_ID}] 任务 ${promptId} 未找到，这不应该发生（任务应该在submitWorkflow中预注册）`)
      // 创建备用任务对象
      task = {
        windowId: WINDOW_ID,
        clientId: WINDOW_CLIENT_ID,
        workflowType: workflowType,
        createdAt: new Date().toISOString(),
        startTime: Date.now(),
        status: webSocketManager.TASK_STATUS.WAITING,
        lastStatusUpdate: Date.now(),
        currentNode: null,
        completedNodes: []
      }
      webSocketManager.registerWindowTask(promptId, task)
    }

    // 🔧 更新任务的回调函数（不重复注册任务）
    task.onProgress = onProgress || (() => {})
    task.onComplete = (result) => {
      console.log(`✅ [${WINDOW_ID}] 任务完成回调: ${promptId}`)
      resolve(result)
    }
    task.onError = (error) => {
      console.error(`❌ [${WINDOW_ID}] 任务错误回调: ${promptId}`, error)
      reject(error instanceof Error ? error : new Error(error))
    }

    console.log(`📝 [${WINDOW_ID}] 任务回调已更新: ${promptId} (状态: ${task.status})`)

    // 设置初始进度
    if (onProgress) {
      onProgress('任务已提交，等待服务器处理...', 5)
    }
  })
}









// 🔧 重构后的换衣API函数 - 使用通用工作流处理器，保持向后兼容
async function processUndressImage(base64Image, onProgress = null) {
  try {
    console.log('🚀 开始处理换衣请求 (使用通用处理器)')

    // 验证图片数据格式
    if (!base64Image || !base64Image.startsWith('data:image/')) {
      throw new Error('无效的图片数据格式')
    }

    // 使用通用工作流处理器
    const result = await processWorkflowUniversal('undress', {
      mainImage: base64Image
    }, onProgress)

    // 保持向后兼容的返回格式
    if (result.success) {
      return {
        success: true,
        resultImage: result.resultImage,
        originalImage: result.originalImage,
        promptId: result.promptId,
        uploadedImageName: result.uploadedImageName || 'unknown', // 兼容性字段
        pointsConsumed: result.pointsConsumed,
        pointsRemaining: result.pointsRemaining,
        message: result.message
      }
    } else {
      return result
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

// 🔧 保留原始实现作为备用（可选）
async function processUndressImageLegacy(base64Image, onProgress = null) {
  try {
    console.log('🚀 开始处理换衣请求 (传统实现)')

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
      onProgress: onProgress,  // 🔧 修复：直接传递进度回调
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

    // 🔧 关键修复：确保任务执行服务器信息被正确保存
    const task = getWindowTask(submittedPromptId)
    if (task && task.executionServer) {
      console.log(`💾 [${WINDOW_ID}] 保存任务执行服务器信息到结果: ${task.executionServer}`)
    } else {
      console.warn(`⚠️ [${WINDOW_ID}] 任务 ${submittedPromptId} 缺少执行服务器信息`)
    }

    // 🔧 简化：基本的服务器一致性检查
    if (task && task.executionServer && taskResult && taskResult.executionServer) {
      if (task.executionServer !== taskResult.executionServer) {
        console.warn(`⚠️ [${WINDOW_ID}] 检测到服务器地址不一致，可能导致图片404错误`)
      }
    }

    // 获取生成的图片URL（使用任务绑定的服务器）
    if (onProgress) onProgress('正在获取处理结果...', 96)

    const resultImageUrl = await getTaskBoundImageUrl(submittedPromptId, taskResult, 'undress')
    console.log('🎉 换衣处理成功! 图片URL:', resultImageUrl)

    // 消耗积分（从等级卡扣除）
    if (onProgress) onProgress('正在更新积分...', 98)

    // 直接使用图片URL进行积分扣除
    const pointsResult = await levelCardPointsManager.consumePoints(20, '一键换衣', resultImageUrl)

    // 🔧 简化：使用任务结果中的执行服务器构建原图URL
    let originalImage = null
    try {
      if (taskResult && taskResult.executionServer) {
        // 使用任务执行服务器构建原图URL，确保与结果图使用相同服务器
        originalImage = ImageUrlBuilder.buildUrl(taskResult.executionServer, uploadedImageName, '', 'input')
        console.log(`📷 [${WINDOW_ID}] 原图URL（使用任务执行服务器）: ${originalImage}`)
      } else {
        console.warn('⚠️ 任务结果缺少执行服务器信息，无法构建原图URL')
      }
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
      console.log('⚠️ system_stats失败，但服务器可能仍然可用')
      return { status: 'warning', endpoint: '/api/system_stats', note: '部分功能可能不可用' }
    }
  } catch (error) {
    console.log('⚠️ 服务器检查失败:', error.message)
    return { status: 'error', error: error.message, note: '服务器可能不可用' }
  }
}



// 🔧 重构后的换脸处理函数 - 使用通用工作流处理器，保持向后兼容
async function processFaceSwapImage({ facePhotos, targetImage, onProgress }) {
  try {
    console.log('🚀 开始换脸处理 (使用通用处理器)')

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

    // 验证图片格式
    for (let i = 0; i < facePhotos.length; i++) {
      if (!facePhotos[i] || !facePhotos[i].startsWith('data:image/')) {
        throw new Error(`人脸照片${i + 1}格式无效`)
      }
    }

    if (!targetImage || !targetImage.startsWith('data:image/')) {
      throw new Error('目标图片格式无效')
    }

    // 使用通用工作流处理器
    const result = await processWorkflowUniversal('faceswap', {
      facePhoto1: facePhotos[0],
      facePhoto2: facePhotos[1],
      facePhoto3: facePhotos[2],
      facePhoto4: facePhotos[3],
      targetImage: targetImage
    }, onProgress)

    // 保持向后兼容的返回格式
    if (result.success) {
      return {
        success: true,
        imageUrl: result.resultImage, // 兼容旧字段名
        targetImageUrl: result.targetImageUrl,
        promptId: result.promptId,
        pointsConsumed: result.pointsConsumed,
        pointsRemaining: result.pointsRemaining,
        message: result.message
      }
    } else {
      return result
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

// 🔧 新增：初始化ComfyUI连接的包装函数
async function initializeComfyUIConnection() {
  console.log('🔌 初始化ComfyUI直连模式...')
  try {
    await webSocketManager.initializeWebSocket()
    console.log('✅ ComfyUI直连初始化成功')
    return true
  } catch (error) {
    console.error('❌ ComfyUI直连初始化失败:', error)
    throw error
  }
}

// 🔧 简化的工作流处理函数（直接使用传统方式）
async function processWorkflow(workflow, callbacks = {}) {
  const { onProgress, onComplete, onError, workflowType = 'default' } = callbacks

  console.log(`🎯 [${WINDOW_ID}] 处理工作流 (类型: ${workflowType})`)

  try {
    // 生成promptId并提交工作流
    const promptId = generatePromptId()
    console.log(`🆔 [WORKFLOW] 生成promptId: ${promptId}`)

    // 创建临时任务对象
    const tempTask = {
      workflowType: workflowType,
      createdAt: new Date().toISOString(),
      onProgress: onProgress,
      onComplete: null,
      onError: null
    }

    // 提交工作流
    const submittedPromptId = await submitWorkflow(workflow, promptId, tempTask)
    console.log(`✅ [WORKFLOW] 工作流提交成功: ${submittedPromptId}`)

    // 等待任务完成
    const result = await waitForTaskCompletion(submittedPromptId, onProgress, workflowType)

    if (onComplete) {
      onComplete(result)
    }

    return result

  } catch (error) {
    console.error(`❌ [WORKFLOW] 工作流处理失败:`, error)
    if (onError) {
      onError(error)
    }
    throw error
  }
}



// ========================================
// � 通用工作流处理器 - 配置驱动架构
// ========================================

/**
 * 通用工作流处理器类 - 消除重复代码，支持配置驱动
 * 所有工作流都使用相同的处理流程，只需配置不同的参数
 */
class UniversalWorkflowProcessor {
  constructor(workflowConfig) {
    this.config = workflowConfig
    this.nodeConfig = null
    this.uploadedFiles = new Map() // 存储上传的文件名，用于构建额外图片URL
  }

  /**
   * 通用工作流处理入口
   * @param {Object} inputs - 输入参数
   * @param {Function} onProgress - 进度回调
   * @returns {Promise<Object>} 处理结果
   */
  async process(inputs, onProgress = null) {
    try {
      console.log(`🚀 开始处理${this.config.displayName}请求`)

      // 1. 预检查阶段
      await this.preCheck(onProgress)

      // 2. 输入处理阶段
      const processedInputs = await this.processInputs(inputs, onProgress)

      // 3. 工作流构建阶段
      const workflow = await this.buildWorkflow(processedInputs, onProgress)

      // 4. 执行阶段
      const result = await this.executeWorkflow(workflow, onProgress)

      // 5. 后处理阶段
      return await this.postProcess(result, onProgress)

    } catch (error) {
      return this.handleError(error)
    }
  }

  /**
   * 通用预检查 - 服务器状态和积分验证
   */
  async preCheck(onProgress) {
    // 服务器状态检查
    if (onProgress) onProgress('正在检查服务器状态...', 5)

    if (this.config.checkServer) {
      try {
        const serverStatus = await checkComfyUIServerStatus()
        if (serverStatus.status === 'error') {
          console.warn('⚠️ 服务器预检查失败，但尝试继续处理:', serverStatus.error)
        } else if (serverStatus.status === 'warning') {
          console.warn('⚠️ 服务器状态警告，但继续尝试:', serverStatus.note)
        }
      } catch (preCheckError) {
        console.warn('⚠️ 预检查异常，但继续尝试处理:', preCheckError.message)
      }
    }

    // 积分检查
    if (onProgress) onProgress('正在检查积分...', 10)

    const pointsStatus = await levelCardPointsManager.getPointsStatus()
    if (!pointsStatus.canGenerate) {
      throw new Error(`积分不足！当前积分: ${pointsStatus.current}，需要: ${pointsStatus.generationCost}`)
    }
  }

  /**
   * 动态输入处理 - 根据配置自动处理不同类型的输入
   */
  async processInputs(inputs, onProgress) {
    const processedInputs = {}

    // 验证必需输入
    for (const [key, config] of Object.entries(this.config.inputSchema)) {
      if (config.required && !inputs[key]) {
        throw new Error(`缺少必需的输入参数: ${config.description || key}`)
      }
    }

    // 处理图片输入
    const imageInputs = Object.entries(this.config.inputSchema)
      .filter(([key, config]) => config.type === 'image' && inputs[key])

    if (imageInputs.length > 0) {
      if (onProgress) onProgress('正在上传图片...', 20)

      for (const [key, config] of imageInputs) {
        const imageData = inputs[key]

        // 验证图片格式
        if (!imageData || !imageData.startsWith('data:image/')) {
          throw new Error(`无效的图片数据格式: ${config.description || key}`)
        }

        // 上传图片
        const uploadedName = await uploadImageToComfyUI(imageData)
        processedInputs[key] = uploadedName
        this.uploadedFiles.set(key, uploadedName) // 保存文件名用于后续构建URL
        console.log(`📤 上传${config.description || key}成功:`, uploadedName)
      }
    }

    // 处理其他类型输入
    for (const [key, value] of Object.entries(inputs)) {
      if (!processedInputs[key] && this.config.inputSchema[key]?.type !== 'image') {
        processedInputs[key] = value
      }
    }

    return processedInputs
  }

  /**
   * 动态工作流构建 - 根据配置自动构建工作流
   */
  async buildWorkflow(processedInputs, onProgress) {
    if (onProgress) onProgress('正在配置工作流...', 40)

    // 获取节点配置
    this.nodeConfig = await getWorkflowNodeConfig(this.config.type)

    // 加载工作流模板
    const workflow = JSON.parse(JSON.stringify(this.config.workflowTemplate))

    // 设置输入节点
    for (const [inputKey, nodeKey] of Object.entries(this.config.inputMapping)) {
      const nodeId = this.nodeConfig.inputNodes[nodeKey]
      const inputValue = processedInputs[inputKey]

      if (inputValue && workflow[nodeId]) {
        const inputField = this.getInputFieldForNode(workflow[nodeId])
        workflow[nodeId].inputs[inputField] = inputValue
        console.log(`🔧 设置节点 ${nodeId} (${nodeKey}): ${inputField} = ${inputValue}`)
      }
    }

    // 随机化种子节点
    if (this.config.randomizeSeed) {
      this.randomizeSeedNodes(workflow)
    }

    return workflow
  }

  /**
   * 通用工作流执行
   */
  async executeWorkflow(workflow, onProgress) {
    if (onProgress) onProgress(`正在提交${this.config.displayName}任务...`, 50)

    // 生成任务ID
    const promptId = generatePromptId()
    console.log(`🆔 [${this.config.type.toUpperCase()}] 生成promptId: ${promptId}`)

    // 创建任务对象
    const tempTask = {
      workflowType: this.config.type,
      createdAt: new Date().toISOString(),
      onProgress: onProgress,
      onComplete: null,
      onError: null
    }

    // 提交工作流
    const submittedPromptId = await submitWorkflow(workflow, promptId, tempTask)
    console.log(`✅ [${this.config.type.toUpperCase()}] 工作流提交完成: ${submittedPromptId}`)

    // 等待任务完成
    if (onProgress) onProgress(`正在处理${this.config.displayName}...`, 60)

    const taskResult = await waitForTaskCompletion(submittedPromptId, (status, progress) => {
      if (onProgress) {
        const adjustedProgress = Math.min(95, Math.max(60, 60 + (progress * 0.35)))
        onProgress(status, adjustedProgress)
      }
    }, this.config.type)

    console.log(`✅ ${this.config.displayName}任务处理完成`)
    return { promptId: submittedPromptId, taskResult }
  }

  /**
   * 通用后处理 - 获取结果和扣除积分
   */
  async postProcess(result, onProgress) {
    if (onProgress) onProgress('正在获取处理结果...', 96)

    // 获取结果图片URL
    const resultImageUrl = await getTaskBoundImageUrl(result.promptId, result.taskResult, this.config.type)
    console.log(`🎉 ${this.config.displayName}处理成功! 图片URL:`, resultImageUrl)

    // 消耗积分
    if (onProgress) onProgress('正在更新积分...', 98)
    const pointsResult = await levelCardPointsManager.consumePoints(
      this.config.pointsCost,
      this.config.displayName,
      resultImageUrl
    )

    // 构建额外的图片URL（如原图等）
    const additionalImages = await this.buildAdditionalImageUrls(result)

    if (onProgress) onProgress('处理完成', 100)

    return {
      success: true,
      resultImage: resultImageUrl,
      ...additionalImages,
      promptId: result.promptId,
      pointsConsumed: pointsResult.consumed,
      pointsRemaining: pointsResult.remaining,
      message: `${this.config.displayName}处理完成`
    }
  }

  /**
   * 构建额外的图片URL（如原图、目标图等）
   */
  async buildAdditionalImageUrls(result) {
    const additionalImages = {}

    try {
      if (result.taskResult && result.taskResult.executionServer) {
        const server = result.taskResult.executionServer

        // 根据工作流类型构建不同的额外图片
        if (this.config.type === 'undress' && this.config.originalImageKey) {
          const originalImage = ImageUrlBuilder.buildUrl(server, this.config.originalImageKey, '', 'input')
          additionalImages.originalImage = originalImage
          console.log(`📷 原图URL: ${originalImage}`)
        }

        if (this.config.type === 'faceswap' && this.config.targetImageKey) {
          const targetImageUrl = ImageUrlBuilder.buildUrl(server, this.config.targetImageKey, '', 'input')
          additionalImages.targetImageUrl = targetImageUrl
          console.log(`📷 目标图片URL: ${targetImageUrl}`)
        }
      }
    } catch (error) {
      console.warn('⚠️ 构建额外图片URL失败:', error)
    }

    return additionalImages
  }

  /**
   * 根据节点类型推断输入字段
   */
  getInputFieldForNode(node) {
    const classType = node.class_type
    const fieldMappings = {
      'LoadImage': 'image',
      'KSampler': 'seed',
      'CLIPTextEncode': 'text',
      'VAEDecode': 'samples',
      'SaveImage': 'images'
    }
    return fieldMappings[classType] || 'image'
  }

  /**
   * 随机化种子节点
   */
  randomizeSeedNodes(workflow) {
    for (const [nodeId, node] of Object.entries(workflow)) {
      if (node.class_type === 'KSampler' && node.inputs && 'seed' in node.inputs) {
        const newSeed = Math.floor(Math.random() * 1000000000000000)
        node.inputs.seed = newSeed
        console.log(`🎲 随机化种子节点 ${nodeId}: ${newSeed}`)
      }
      if (node.class_type === 'KSampler' && node.inputs && 'noise_seed' in node.inputs) {
        const newSeed = Math.floor(Math.random() * 1000000000000000)
        node.inputs.noise_seed = newSeed
        console.log(`🎲 随机化噪声种子节点 ${nodeId}: ${newSeed}`)
      }
    }
  }

  /**
   * 统一错误处理
   */
  handleError(error) {
    console.error(`❌ ${this.config.displayName}处理失败:`, error)
    return {
      success: false,
      error: error.message,
      message: `${this.config.displayName}处理失败`
    }
  }
}

// ========================================
// 🔧 工作流配置管理器 - 配置驱动架构
// ========================================

/**
 * 工作流配置管理器 - 管理所有工作流的配置
 */
class WorkflowConfigManager {
  constructor() {
    this.configs = new Map()
    this.initialized = false
  }

  /**
   * 初始化工作流配置
   */
  async initialize() {
    if (this.initialized) return

    // 注册内置工作流配置
    await this.registerBuiltinWorkflows()
    this.initialized = true
    console.log('✅ 工作流配置管理器初始化完成')
  }

  /**
   * 注册内置工作流
   */
  async registerBuiltinWorkflows() {
    // 注册一键褪衣工作流
    this.registerWorkflow('undress', {
      type: 'undress',
      displayName: '一键褪衣',
      pointsCost: 20,
      checkServer: true,
      randomizeSeed: true,
      workflowTemplate: undressWorkflow,
      inputSchema: {
        mainImage: {
          type: 'image',
          required: true,
          description: '主图片'
        }
      },
      inputMapping: {
        mainImage: 'mainImage'
      },
      outputMapping: {
        primary: 'primary',
        secondary: 'secondary'
      }
    })

    // 注册换脸工作流
    this.registerWorkflow('faceswap', {
      type: 'faceswap',
      displayName: '极速换脸',
      pointsCost: 20,
      checkServer: true,
      randomizeSeed: false,
      workflowTemplate: faceSwapWorkflow,
      inputSchema: {
        facePhoto1: {
          type: 'image',
          required: true,
          description: '人脸照片1'
        },
        facePhoto2: {
          type: 'image',
          required: true,
          description: '人脸照片2'
        },
        facePhoto3: {
          type: 'image',
          required: true,
          description: '人脸照片3'
        },
        facePhoto4: {
          type: 'image',
          required: true,
          description: '人脸照片4'
        },
        targetImage: {
          type: 'image',
          required: true,
          description: '目标图片'
        }
      },
      inputMapping: {
        facePhoto1: 'facePhoto1',
        facePhoto2: 'facePhoto2',
        facePhoto3: 'facePhoto3',
        facePhoto4: 'facePhoto4',
        targetImage: 'targetImage'
      },
      outputMapping: {
        primary: 'primary',
        secondary: 'secondary'
      }
    })

    console.log('📋 内置工作流注册完成:', Array.from(this.configs.keys()))
  }

  /**
   * 注册工作流配置
   */
  registerWorkflow(type, config) {
    this.configs.set(type, config)
    console.log(`📝 注册工作流配置: ${type} - ${config.displayName}`)
  }

  /**
   * 获取工作流配置
   */
  getWorkflowConfig(type) {
    const config = this.configs.get(type)
    if (!config) {
      throw new Error(`未找到工作流配置: ${type}`)
    }
    return config
  }

  /**
   * 获取所有工作流类型
   */
  getAvailableWorkflows() {
    return Array.from(this.configs.keys())
  }

  /**
   * 检查工作流是否存在
   */
  hasWorkflow(type) {
    return this.configs.has(type)
  }

  /**
   * 从数据库动态加载工作流配置（扩展功能）
   */
  async loadWorkflowFromDatabase(type) {
    try {
      console.log(`🔄 从数据库加载工作流配置: ${type}`)

      // 获取工作流基础信息
      const workflowInfo = await getWorkflowInfo(type)
      if (!workflowInfo.enabled) {
        throw new Error(`工作流 ${type} 已禁用`)
      }

      // 获取节点配置
      const nodeConfig = await getWorkflowNodeConfig(type)

      // 动态加载工作流文件
      const workflowResponse = await fetch(`/${workflowInfo.filePath}`)
      if (!workflowResponse.ok) {
        throw new Error(`无法加载工作流文件: ${workflowInfo.filePath}`)
      }
      const workflowTemplate = await workflowResponse.json()

      // 构建配置对象
      const config = {
        type: type,
        displayName: workflowInfo.name,
        pointsCost: 20, // 默认积分消耗，可以从数据库配置
        checkServer: true,
        randomizeSeed: type === 'undress', // 根据类型决定是否随机化种子
        workflowTemplate: workflowTemplate,
        inputSchema: this.buildInputSchemaFromNodeConfig(nodeConfig),
        inputMapping: this.buildInputMappingFromNodeConfig(nodeConfig),
        outputMapping: {
          primary: 'primary',
          secondary: 'secondary'
        }
      }

      // 注册配置
      this.registerWorkflow(type, config)
      console.log(`✅ 动态加载工作流配置成功: ${type}`)

      return config
    } catch (error) {
      console.error(`❌ 动态加载工作流配置失败 [${type}]:`, error)
      throw error
    }
  }

  /**
   * 从节点配置构建输入模式
   */
  buildInputSchemaFromNodeConfig(nodeConfig) {
    const schema = {}

    // 根据输入节点构建模式
    for (const [key] of Object.entries(nodeConfig.inputNodes)) {
      if (key === 'seedNode') continue // 跳过种子节点

      schema[key] = {
        type: 'image',
        required: true,
        description: this.getNodeDescription(key)
      }
    }

    return schema
  }

  /**
   * 从节点配置构建输入映射
   */
  buildInputMappingFromNodeConfig(nodeConfig) {
    const mapping = {}

    for (const [key] of Object.entries(nodeConfig.inputNodes)) {
      if (key === 'seedNode') continue // 跳过种子节点
      mapping[key] = key
    }

    return mapping
  }

  /**
   * 获取节点描述
   */
  getNodeDescription(nodeKey) {
    const descriptions = {
      mainImage: '主图片',
      facePhoto1: '人脸照片1',
      facePhoto2: '人脸照片2',
      facePhoto3: '人脸照片3',
      facePhoto4: '人脸照片4',
      targetImage: '目标图片'
    }
    return descriptions[nodeKey] || nodeKey
  }
}

// 创建全局工作流配置管理器实例
const workflowConfigManager = new WorkflowConfigManager()

/**
 * 通用工作流处理函数 - 统一入口
 * @param {string} workflowType - 工作流类型
 * @param {Object} inputs - 输入参数
 * @param {Function} onProgress - 进度回调
 * @returns {Promise<Object>} 处理结果
 */
async function processWorkflowUniversal(workflowType, inputs, onProgress = null) {
  try {
    // 确保配置管理器已初始化
    await workflowConfigManager.initialize()

    // 获取工作流配置
    let config
    try {
      config = workflowConfigManager.getWorkflowConfig(workflowType)
    } catch (error) {
      // 如果内置配置不存在，尝试从数据库动态加载
      console.log(`🔄 内置配置不存在，尝试动态加载: ${workflowType}`)
      config = await workflowConfigManager.loadWorkflowFromDatabase(workflowType)
    }

    // 创建处理器并执行
    const processor = new UniversalWorkflowProcessor(config)
    return await processor.process(inputs, onProgress)

  } catch (error) {
    console.error(`❌ 通用工作流处理失败 [${workflowType}]:`, error)
    return {
      success: false,
      error: error.message,
      message: `${workflowType}处理失败`
    }
  }
}

// ========================================
// 🔧 辅助函数和兼容性支持
// ========================================

/**
 * 获取窗口任务 - 兼容性函数
 */
function getWindowTask(promptId) {
  return webSocketManager.getWindowTask(promptId)
}

/**
 * 获取窗口服务器锁定状态 - 兼容性函数
 */
function getWindowServerLock() {
  return webSocketManager.getWindowServerLock()
}

// ========================================
// 🔧 导出语句
// ========================================

// 导出主要的API函数（保持向后兼容）
export {
  // 主要工作流处理函数
  processUndressImage,
  processFaceSwapImage,

  // 通用工作流处理器
  processWorkflowUniversal,
  UniversalWorkflowProcessor,
  WorkflowConfigManager,
  workflowConfigManager,

  // 配置管理
  updateComfyUIConfig,
  getCurrentConfig,
  getComfyUIConfig,
  saveComfyUIConfig,
  resetToDefaultConfig,

  // 连接管理
  initializeComfyUIConnection,

  // 工作流处理
  processWorkflow,
  submitWorkflow,
  waitForTaskCompletion,

  // 图片处理
  uploadImageToComfyUI,
  getGeneratedImageUrl,
  getTaskBoundImageUrl,
  buildUnifiedImageUrl,

  // 服务器管理
  checkComfyUIServerStatus,
  getApiBaseUrl,
  getUnifiedServerUrl,

  // 任务管理
  getTaskHistory,
  extractTaskResults,

  // 工具函数
  generatePromptId,
  generateClientId,
  ImageUrlBuilder,

  // 配置监听
  addConfigChangeListener,
  removeConfigChangeListener,

  // 兼容性函数
  getWindowTask,
  getWindowServerLock
}

// 默认导出主要处理函数
export default {
  processUndressImage,
  processFaceSwapImage,
  processWorkflowUniversal,
  initializeComfyUIConnection,
  updateComfyUIConfig,
  getCurrentConfig
}