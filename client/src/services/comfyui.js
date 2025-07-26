// ComfyUI工作流服务 - 直连模式
import undressWorkflow from '../workflows/undress.json'
import faceSwapWorkflow from '../workflows/faceswap2.0.json'
import comfyUIConfig from '../config/comfyui.config.js'
import levelCardPointsManager from '../utils/levelCardPointsManager.js'
import { updateAPIConfig } from './api.js'
import loadBalancer from './loadBalancer.js'
import { getWorkflowNodeConfig } from '../utils/workflowConfig.js'

// 🔧 窗口唯一标识符生成机制
function generateWindowId() {
  return `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
}

// 🔧 为当前窗口生成唯一的clientId - 增强唯一性防止冲突
function generateUniqueClientId() {
  const baseId = 'abc1373d4ad648a3a81d0587fbe5534b' // 基础clientId
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 11)
  const windowId = generateWindowId()

  // 🔧 增强唯一性：基础ID + 时间戳 + 随机数 + 窗口ID
  return `${baseId}_${timestamp}_${random}_${windowId}`
}

// 🔧 窗口级别的全局变量 - 确保每个窗口都有唯一标识
const WINDOW_CLIENT_ID = generateUniqueClientId()
const WINDOW_ID = generateWindowId()

console.log(`🪟 窗口标识: ${WINDOW_ID}`)
console.log(`🔑 窗口客户端ID: ${WINDOW_CLIENT_ID}`)

// 🔧 窗口关闭时的清理机制
window.addEventListener('beforeunload', () => {
  console.log(`🚪 [${WINDOW_ID}] 窗口即将关闭，执行清理...`)

  // 清理当前窗口的服务器锁定
  const currentLock = getWindowServerLock()
  if (currentLock) {
    console.log(`🔓 [${WINDOW_ID}] 窗口关闭，清理服务器锁定: ${currentLock.server}`)
    clearWindowServerLock()
  }

  // 清理当前窗口的任务
  if (windowTasks.size > 0) {
    console.log(`🗑️ [${WINDOW_ID}] 窗口关闭，清理 ${windowTasks.size} 个任务`)
    windowTasks.clear()
  }

  // 关闭WebSocket连接
  if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
    console.log(`🔌 [${WINDOW_ID}] 窗口关闭，断开WebSocket连接`)
    wsConnection.close()
  }
})

// 🔧 页面可见性变化时的处理
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    console.log(`👁️ [${WINDOW_ID}] 窗口隐藏`)
  } else {
    console.log(`👁️ [${WINDOW_ID}] 窗口重新可见`)

    // 检查服务器锁定状态
    const currentLock = getWindowServerLock()
    if (currentLock) {
      console.log(`🔒 [${WINDOW_ID}] 窗口重新可见，服务器锁定状态: ${currentLock.server}`)
    }

    // 检查任务状态
    if (windowTasks.size > 0) {
      console.log(`📊 [${WINDOW_ID}] 窗口重新可见，当前任务数: ${windowTasks.size}`)
    }
  }
})

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
    const currentLock = getWindowServerLock()
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

// 🔧 获取API基础URL - 智能版本（自动修复服务器锁定）
async function getApiBaseUrl() {
  try {
    const currentLock = getWindowServerLock()
    const lockedServer = currentLock ? currentLock.server : null

    // 🔧 智能锁定检查：有待处理任务但服务器未锁定时，自动锁定到当前服务器
    if (windowTasks.size > 0 && !lockedServer) {
      console.log(`🔒 [${WINDOW_ID}] 有待处理任务但服务器未锁定，自动锁定到最优服务器...`)
      try {
        const optimalServer = await loadBalancer.getOptimalServer()
        lockServerForWindow(optimalServer)
        console.log(`🔒 [${WINDOW_ID}] 自动锁定服务器: ${optimalServer}`)
      } catch (autoLockError) {
        console.warn(`⚠️ [${WINDOW_ID}] 自动锁定失败，但继续执行: ${autoLockError.message}`)
      }
    }

    // 🔧 简化状态检查日志
    console.log(`🔍 [${WINDOW_ID}] 获取API基础URL (锁定: ${lockedServer || '无'}, 任务: ${windowTasks.size})`)

    // 🔧 简化的锁定条件：有锁定服务器就使用，不强制要求WebSocket健康
    const hasLockedServer = !!lockedServer
    const wsIsHealthy = wsConnection && wsConnection.readyState === WebSocket.OPEN
    const hasPendingTasks = windowTasks.size > 0
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

// 🔧 智能服务器一致性验证 - 警告机制版本
function validateServerConsistency(operation, currentServer) {
  const currentLock = getWindowServerLock()
  const lockedServer = currentLock ? currentLock.server : null

  // 🔧 简化处理：减少过度警告，只在真正需要时进行服务器切换
  if (windowTasks.size > 0 && lockedServer && currentServer !== lockedServer) {
    // 检查是否是合理的服务器切换（例如负载均衡或长时间锁定）
    const isReasonableSwitch = Math.abs(Date.now() - currentLock.timestamp) > 300000 // 超过5分钟的锁定
    if (isReasonableSwitch) {
      console.log(`🔄 [${WINDOW_ID}] 检测到长时间锁定，允许服务器切换到 ${currentServer}`)
      lockServerForWindow(currentServer)
    } else {
      // 减少警告频率，只在调试模式下显示详细信息
      console.log(`🔍 [${WINDOW_ID}] ${operation} 使用不同服务器: ${currentServer} (锁定: ${lockedServer})`)
    }
  }

  // 🔧 智能处理：有任务但服务器未锁定时自动锁定
  if (windowTasks.size > 0 && !lockedServer) {
    console.log(`🔒 [${WINDOW_ID}] 有 ${windowTasks.size} 个待处理任务但服务器未锁定，自动锁定到当前服务器`)
    console.log(`🪟 [${WINDOW_ID}] 窗口任务列表:`, Array.from(windowTasks.keys()))
    lockServerForWindow(currentServer)
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
  await ensureWebSocketConnection(apiBaseUrl)

  logServerConsistency('上传图片到ComfyUI')

  // 🔧 验证服务器一致性
  validateServerConsistency('uploadImageToComfyUI', apiBaseUrl)

  // 🔧 智能验证窗口级别的服务器一致性
  const currentLock = getWindowServerLock()
  if (currentLock && apiBaseUrl !== currentLock.server.replace(/\/$/, '')) {
    console.warn(`⚠️ [${WINDOW_ID}] [uploadImage] 服务器不一致，自动更新锁定`)
    console.warn(`   锁定服务器: ${currentLock.server}`)
    console.warn(`   上传服务器: ${apiBaseUrl}`)
    lockServerForWindow(apiBaseUrl)
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
  await ensureWebSocketConnection(apiBaseUrl)

  // 🔧 智能验证窗口级别的服务器锁定状态
  let currentLock = getWindowServerLock()
  if (!currentLock) {
    // 新用户/窗口首次发起任务，自动锁定到当前服务器
    console.log(`🔒 [${WINDOW_ID}] 新窗口首次任务，自动锁定服务器: ${apiBaseUrl}`)
    lockServerForWindow(apiBaseUrl)
    currentLock = getWindowServerLock()
  }

  console.log(`🔒 [${WINDOW_ID}] 确认使用锁定服务器: ${currentLock.server}`)

  // 🔧 验证服务器一致性
  validateServerConsistency('submitWorkflow', apiBaseUrl)

  // 🔧 智能验证：确保API使用的是锁定的服务器
  if (apiBaseUrl !== currentLock.server.replace(/\/$/, '')) {
    console.warn(`⚠️ [${WINDOW_ID}] API服务器(${apiBaseUrl})与锁定服务器(${currentLock.server})不一致，自动更新锁定`)
    lockServerForWindow(apiBaseUrl)
    console.log(`🔒 [${WINDOW_ID}] 已更新锁定服务器为: ${apiBaseUrl}`)
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

// 🔧 重构后的任务绑定图片URL获取函数 - 使用统一服务器地址
async function getTaskBoundImageUrl(promptId, taskResult, workflowType = 'undress') {
  try {
    let executionServer = null

    // 优先级1: 从任务结果中获取服务器信息（任务完成后保存的）
    if (taskResult && taskResult.executionServer) {
      executionServer = taskResult.executionServer
      logServerSelection('任务绑定图片URL', promptId, executionServer, '任务结果中的服务器')
    } else {
      // 优先级2: 使用统一的服务器地址获取函数
      executionServer = getUnifiedServerUrl(promptId)
      logServerSelection('任务绑定图片URL', promptId, executionServer, '统一服务器获取函数')
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

// WebSocket 连接管理 - 修复版本（服务器锁定机制）
let wsConnection = null
let isWsConnected = false
let currentWebSocketServer = null // 当前WebSocket连接的服务器

// 🔧 窗口隔离的任务队列 - 避免多窗口任务冲突
let windowTasks = new Map() // promptId -> task

// 🔥 窗口级别的服务器锁定机制 - 完全隔离版本
// 使用窗口ID作为命名空间，确保真正的窗口隔离
const WINDOW_SERVER_LOCKS = new Map() // windowId -> { server, timestamp, tasks }

// 🔧 获取当前窗口的服务器锁定信息
function getWindowServerLock() {
  return WINDOW_SERVER_LOCKS.get(WINDOW_ID) || null
}

// 🔧 设置当前窗口的服务器锁定信息
function setWindowServerLock(server, timestamp = Date.now()) {
  WINDOW_SERVER_LOCKS.set(WINDOW_ID, {
    server,
    timestamp,
    windowId: WINDOW_ID,
    clientId: WINDOW_CLIENT_ID
  })
  console.log(`🔒 [${WINDOW_ID}] 设置窗口服务器锁定: ${server}`)
}

// 🔧 清除当前窗口的服务器锁定信息
function clearWindowServerLock() {
  const lock = WINDOW_SERVER_LOCKS.get(WINDOW_ID)
  if (lock) {
    WINDOW_SERVER_LOCKS.delete(WINDOW_ID)
    console.log(`🔓 [${WINDOW_ID}] 清除窗口服务器锁定: ${lock.server}`)
  }
}

// 🔧 兼容性：动态获取当前窗口的锁定服务器
Object.defineProperty(window, 'windowLockedServer', {
  get() {
    const lock = getWindowServerLock()
    return lock ? lock.server : null
  },
  set(value) {
    if (value) {
      setWindowServerLock(value)
    } else {
      clearWindowServerLock()
    }
  }
})

Object.defineProperty(window, 'windowLockTimestamp', {
  get() {
    const lock = getWindowServerLock()
    return lock ? lock.timestamp : null
  }
})

// 🔧 为了向后兼容，保留 pendingTasks 引用但指向窗口任务队列
let pendingTasks = windowTasks

// 🔧 保留原有的全局变量名但使用窗口级别的值（动态获取）
Object.defineProperty(window, 'currentWebSocketServer', {
  get() {
    return window.windowLockedServer
  },
  set(value) {
    window.windowLockedServer = value
  }
})

Object.defineProperty(window, 'serverLockTimestamp', {
  get() {
    return window.windowLockTimestamp
  }
})

// 🔧 窗口级别的任务管理函数 - 完全隔离版本
function registerWindowTask(promptId, task) {
  let currentLock = getWindowServerLock()

  // 🔧 智能验证：如果服务器未锁定，自动锁定到当前API服务器
  if (!currentLock || !currentLock.server) {
    console.warn(`⚠️ [${WINDOW_ID}] 注册任务时服务器未锁定，尝试自动锁定...`)
    try {
      // 使用当前任务的执行服务器或默认API服务器
      const serverToLock = task.executionServer || getComfyUIConfig().COMFYUI_SERVER_URL
      lockServerForWindow(serverToLock)
      currentLock = getWindowServerLock()
      console.log(`🔒 [${WINDOW_ID}] 自动锁定服务器: ${serverToLock}`)
    } catch (lockError) {
      console.error(`❌ [${WINDOW_ID}] 自动锁定失败: ${lockError.message}`)
      // 继续执行，但记录警告
      console.warn(`⚠️ [${WINDOW_ID}] 任务 ${promptId} 将在无锁定状态下注册`)
    }
  }

  // 🔧 智能绑定服务器：优先使用锁定服务器，否则使用任务自带的服务器
  if (currentLock && currentLock.server) {
    task.executionServer = currentLock.server
  } else if (!task.executionServer) {
    // 如果都没有，使用默认配置
    task.executionServer = getComfyUIConfig().COMFYUI_SERVER_URL
    console.warn(`⚠️ [${WINDOW_ID}] 使用默认服务器绑定任务: ${task.executionServer}`)
  }

  task.windowId = WINDOW_ID
  task.clientId = WINDOW_CLIENT_ID
  task.registeredAt = Date.now()
  task.lockInfo = currentLock ? { ...currentLock } : null // 保存锁定信息快照

  windowTasks.set(promptId, task)

  console.log(`📝 [${WINDOW_ID}] 任务已注册: ${promptId}, 绑定服务器: ${task.executionServer}`)
  console.log(`📊 [${WINDOW_ID}] 当前窗口任务数: ${windowTasks.size}`)
  console.log(`🔒 [${WINDOW_ID}] 任务锁定信息:`, task.lockInfo)

  // 🔧 锁定续期：检测到新任务时自动续期锁定状态
  if (currentLock) {
    console.log(`🔄 [${WINDOW_ID}] 检测到新任务，续期服务器锁定状态`)
    // 重新调度解锁检查
    scheduleServerUnlockCheck()
  }
}

function getWindowTask(promptId) {
  const task = windowTasks.get(promptId)
  if (task) {
    // 🔧 简化检测：如果任务存在就返回，不严格检查窗口归属
    // 这样可以避免因窗口ID不匹配导致的任务丢失
    if (task.windowId !== WINDOW_ID) {
      console.log(`🔍 [${WINDOW_ID}] 使用其他窗口的任务: ${promptId} (原窗口: ${task.windowId})`)
    }
    return task
  }

  return null
}

function removeWindowTask(promptId) {
  const task = windowTasks.get(promptId)
  if (task && task.windowId === WINDOW_ID) {
    windowTasks.delete(promptId)
    console.log(`🗑️ [${WINDOW_ID}] 任务已移除: ${promptId}`)
    console.log(`📊 [${WINDOW_ID}] 剩余窗口任务数: ${windowTasks.size}`)

    // 🔧 任务移除后立即检查是否可以解锁服务器
    const currentLock = getWindowServerLock()
    if (windowTasks.size === 0 && currentLock) {
      console.log(`🔓 [${WINDOW_ID}] 最后一个任务完成，立即解锁服务器`)
      unlockServerForWindow()
    } else if (windowTasks.size > 0) {
      console.log(`🔒 [${WINDOW_ID}] 仍有任务运行，保持服务器锁定`)
    }

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

// 🔧 动态服务器锁定管理（基于任务状态的智能锁定）- 完全窗口隔离版本
// 🎯 解决问题：防止长时间运行的AI任务因锁定超时导致图片链接错误
// - 移除固定5分钟超时机制，改为基于任务状态的动态锁定
// - 确保图片链接始终指向正确的服务器（任务实际处理的服务器）
// - 只有在所有任务完成后才解锁服务器
// - 完全按窗口隔离，不同窗口可以锁定不同服务器
function lockServerForWindow(serverUrl) {
  const timestamp = Date.now()
  setWindowServerLock(serverUrl, timestamp)

  console.log(`🔒 [${WINDOW_ID}] 锁定服务器: ${serverUrl}`)
  console.log(`🕐 [${WINDOW_ID}] 锁定时间: ${new Date(timestamp).toLocaleTimeString()}`)
  console.log(`🎯 [${WINDOW_ID}] 锁定模式: 任务驱动动态锁定（无固定超时）`)
  console.log(`🪟 [${WINDOW_ID}] 窗口隔离: 独立锁定，不影响其他窗口`)

  // 🔧 实现动态锁定机制：在任务完成前不解锁服务器
  // 移除固定时间的超时机制，改为基于任务状态的动态检查
  scheduleServerUnlockCheck()
}

function unlockServerForWindow() {
  const currentLock = getWindowServerLock()
  if (currentLock) {
    const lockDuration = Date.now() - currentLock.timestamp
    console.log(`🔓 [${WINDOW_ID}] 解锁服务器: ${currentLock.server}`)
    console.log(`⏱️ [${WINDOW_ID}] 锁定持续时间: ${Math.round(lockDuration / 1000)}秒`)
    console.log(`📊 [${WINDOW_ID}] 解锁时任务数: ${windowTasks.size}`)
    console.log(`🪟 [${WINDOW_ID}] 窗口隔离: 仅解锁当前窗口，不影响其他窗口`)

    clearWindowServerLock()

    // 清理解锁检查定时器
    clearServerUnlockTimer()
  }
}

// 🔧 强制解锁服务器（用于异常情况处理）
function forceUnlockServerForWindow() {
  const currentLock = getWindowServerLock()
  if (currentLock) {
    console.log(`🚨 [${WINDOW_ID}] 强制解锁服务器: ${currentLock.server}`)
    console.log(`⚠️ [${WINDOW_ID}] 当前仍有 ${windowTasks.size} 个待处理任务`)
    console.log(`🪟 [${WINDOW_ID}] 窗口隔离: 强制解锁仅影响当前窗口`)
    unlockServerForWindow()
    return true
  }
  return false
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





// 🔧 初始化 WebSocket 连接 - 重构版本（解决多服务器消息路由错乱）
async function initializeWebSocket(targetServer = null) {
  try {
    // 🔧 关键修复：支持指定目标服务器，确保任务-服务器绑定一致性
    let baseUrl
    const currentLock = getWindowServerLock()

    if (targetServer) {
      // 🔧 新增：强制连接到指定服务器（用于任务执行时的服务器绑定）
      baseUrl = targetServer
      console.log(`🎯 [${WINDOW_ID}] 强制连接到指定服务器: ${baseUrl}`)
      console.log(`🔗 [${WINDOW_ID}] 任务-服务器绑定: 确保WebSocket与任务执行服务器一致`)

      // 如果指定服务器与当前锁定不同，需要更新锁定
      if (!currentLock || currentLock.server !== baseUrl) {
        lockServerForWindow(baseUrl)
        console.log(`🔒 [${WINDOW_ID}] 更新服务器锁定: ${baseUrl}`)
      }
    } else if (currentLock && currentLock.server) {
      // 如果已有锁定的服务器，继续使用
      baseUrl = currentLock.server
      console.log(`🔒 [${WINDOW_ID}] 使用已锁定的WebSocket服务器: ${baseUrl}`)
      console.log(`🪟 [${WINDOW_ID}] 窗口隔离: 使用当前窗口独立锁定的服务器`)
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
        console.log(`🕐 [${WINDOW_ID}] 锁定时间: ${new Date(getWindowServerLock().timestamp).toLocaleTimeString()}`)
        console.log(`🪟 [${WINDOW_ID}] 窗口隔离: 为当前窗口独立锁定服务器`)
        logServerConsistency('锁定新的WebSocket服务器')
      } catch (loadBalancerError) {
        console.error(`❌ [${WINDOW_ID}] 负载均衡器获取服务器失败:`, loadBalancerError)
        throw new Error(`无法获取可用的ComfyUI服务器: ${loadBalancerError.message}`)
      }
    }

    // 🔧 检查现有连接是否与目标服务器一致
    if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
      const currentWsServer = currentWebSocketServer || getWindowServerLock()?.server
      if (currentWsServer === baseUrl) {
        console.log(`✅ [${WINDOW_ID}] WebSocket已连接到正确服务器: ${baseUrl}`)
        return true
      } else {
        console.log(`🔄 [${WINDOW_ID}] WebSocket服务器不匹配，需要重连`)
        console.log(`   当前连接: ${currentWsServer}`)
        console.log(`   目标服务器: ${baseUrl}`)
        // 关闭现有连接，建立新连接
        wsConnection.close(1000, '切换到正确的服务器')
        wsConnection = null
        isWsConnected = false
      }
    }

    console.log(`🔌 [${WINDOW_ID}] 连接WebSocket: ${baseUrl}`)

    // 🔧 构建WebSocket URL - 使用增强的唯一clientId
    let wsUrl
    if (baseUrl.startsWith('https://')) {
      wsUrl = baseUrl.replace('https://', 'wss://') + '/ws?clientId=' + WINDOW_CLIENT_ID
    } else {
      wsUrl = baseUrl.replace('http://', 'ws://') + '/ws?clientId=' + WINDOW_CLIENT_ID
    }

    console.log(`🔗 [${WINDOW_ID}] WebSocket URL: ${wsUrl}`)
    console.log(`🔑 [${WINDOW_ID}] 使用增强clientId: ${WINDOW_CLIENT_ID}`)

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

    // 🔧 记录即将连接的服务器，用于后续验证
    currentWebSocketServer = baseUrl
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

        // 🔧 重连策略 - 确保重连到正确的服务器
        if (windowTasks.size > 0) {
          console.log(`🔄 [${WINDOW_ID}] 检测到待处理任务，重连到锁定服务器...`)
          const lockedServer = getWindowServerLock()?.server
          if (lockedServer) {
            console.log(`🎯 [${WINDOW_ID}] 重连目标服务器: ${lockedServer}`)
            setTimeout(() => {
              // 🔧 关键修复：重连时指定服务器，确保任务-服务器绑定一致性
              initializeWebSocket(lockedServer).catch(error => {
                console.error(`❌ [${WINDOW_ID}] 重连到锁定服务器失败:`, error)
                console.log(`⚠️ [${WINDOW_ID}] 重连失败，但保持服务器锁定以便手动重试`)
                console.log(`⏳ [${WINDOW_ID}] 任务将继续等待，可手动重连或等待超时`)
              })
            }, 2000) // 缩短重连间隔
          } else {
            console.error(`❌ [${WINDOW_ID}] 有待处理任务但没有锁定服务器，无法重连`)
          }
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
      clearWindowServerLock()
      console.log('🔓 负载均衡器错误，清除服务器锁定')
    } else if (error.message.includes('ComfyUI服务器不可达') || error.message.includes('WebSocket 连接超时')) {
      // 如果是连接错误但服务器可能恢复，保持锁定以便重试
      console.log('🔒 连接错误但保持服务器锁定以便重试')
    } else {
      // 其他未知错误，清除锁定
      currentWebSocketServer = null
      clearWindowServerLock()
      console.log('🔓 未知错误，清除服务器锁定')
    }

    throw error
  }
}

// 🔧 新增：确保WebSocket连接与任务执行服务器一致性
async function ensureWebSocketServerConsistency(taskServer) {
  try {
    console.log(`🔍 [${WINDOW_ID}] 检查WebSocket服务器一致性...`)
    console.log(`🎯 [${WINDOW_ID}] 任务执行服务器: ${taskServer}`)

    const currentLock = getWindowServerLock()
    const lockedServer = currentLock?.server
    const wsServer = currentWebSocketServer

    console.log(`🔒 [${WINDOW_ID}] 当前锁定服务器: ${lockedServer}`)
    console.log(`🔗 [${WINDOW_ID}] WebSocket连接服务器: ${wsServer}`)

    // 检查所有服务器是否一致
    const serversMatch = taskServer === lockedServer && taskServer === wsServer

    if (serversMatch && wsConnection && wsConnection.readyState === WebSocket.OPEN) {
      console.log(`✅ [${WINDOW_ID}] 服务器一致性验证通过`)
      return true
    }

    // 服务器不一致，需要重新建立连接
    console.log(`🔄 [${WINDOW_ID}] 服务器不一致，重新建立WebSocket连接`)
    console.log(`   任务服务器: ${taskServer}`)
    console.log(`   锁定服务器: ${lockedServer}`)
    console.log(`   WebSocket服务器: ${wsServer}`)

    // 关闭现有连接
    if (wsConnection) {
      wsConnection.close(1000, '服务器不一致，重新连接')
      wsConnection = null
      isWsConnected = false
    }

    // 重新初始化WebSocket连接到正确的服务器
    await initializeWebSocket(taskServer)

    console.log(`✅ [${WINDOW_ID}] WebSocket重新连接到正确服务器: ${taskServer}`)
    return true

  } catch (error) {
    console.error(`❌ [${WINDOW_ID}] WebSocket服务器一致性检查失败:`, error)
    throw error
  }
}

// 🔧 新增：手动重置WebSocket服务器锁定的功能
function resetWebSocketServer(force = false) {
  const currentLock = getWindowServerLock()
  console.log('🔄 手动重置WebSocket服务器锁定')
  console.log('🔓 清除服务器锁定:', currentLock?.server || '无')

  if (!force && windowTasks.size > 0) {
    console.log(`⚠️ 有 ${windowTasks.size} 个待处理任务，建议等待完成后再重置`)
    console.log('💡 如需强制重置，请调用: resetWebSocketServer(true)')
    return false
  }

  // 清除服务器锁定
  unlockServerForWindow()

  // 关闭现有WebSocket连接
  if (wsConnection) {
    console.log('🔌 关闭现有WebSocket连接')
    wsConnection.close(1000, '手动重置服务器')
    wsConnection = null
    isWsConnected = false
  }

  // 清理所有待处理任务（如果强制重置）
  if (force && windowTasks.size > 0) {
    console.log(`🧹 强制清理 ${windowTasks.size} 个待处理任务`)
    const taskIds = Array.from(windowTasks.keys())
    for (const promptId of taskIds) {
      const task = windowTasks.get(promptId)
      if (task && task.onError) {
        task.onError('WebSocket服务器已强制重置')
      }
      windowTasks.delete(promptId)
    }
  }

  console.log('✅ WebSocket服务器重置完成')
  return true
}

// 🔧 暴露核心管理函数到全局，用于故障恢复
if (typeof window !== 'undefined') {
  window.resetWebSocketServer = resetWebSocketServer
  window.getWebSocketServerStatus = getWebSocketServerStatus
  window.getApiBaseUrl = getApiBaseUrl
  window.pendingTasks = windowTasks // 🔧 暴露窗口级别的任务队列

  // 🔧 动态锁定管理函数
  window.forceUnlockServerForWindow = forceUnlockServerForWindow

  console.log(`🔧 [${WINDOW_ID}] 核心管理函数已暴露到全局`)
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



// 🔧 动态解锁检查机制
let serverUnlockTimer = null

// 🔧 调度服务器解锁检查（定期检查任务状态）
function scheduleServerUnlockCheck() {
  // 清理之前的定时器
  clearServerUnlockTimer()

  // 设置定期检查（每30秒检查一次）
  serverUnlockTimer = setInterval(() => {
    checkServerUnlockCondition()
  }, 30000)

  console.log(`⏰ [${WINDOW_ID}] 已调度动态解锁检查（每30秒检查一次）`)
}

// 🔧 清理解锁检查定时器
function clearServerUnlockTimer() {
  if (serverUnlockTimer) {
    clearInterval(serverUnlockTimer)
    serverUnlockTimer = null
    console.log(`🧹 [${WINDOW_ID}] 已清理解锁检查定时器`)
  }
}

// 🔧 检查是否可以解锁服务器的函数（增强版本）
function checkServerUnlockCondition() {
  if (!windowLockedServer) {
    // 服务器未锁定，清理定时器
    clearServerUnlockTimer()
    return false
  }

  const taskCount = windowTasks.size
  const lockDuration = Date.now() - windowLockTimestamp

  console.log(`🔍 [${WINDOW_ID}] 解锁条件检查:`)
  console.log(`   - 待处理任务数: ${taskCount}`)
  console.log(`   - 锁定持续时间: ${Math.round(lockDuration / 1000)}秒`)
  console.log(`   - 锁定服务器: ${windowLockedServer}`)

  if (taskCount === 0) {
    console.log(`🔓 [${WINDOW_ID}] 所有任务已完成，自动解锁服务器`)
    unlockServerForWindow()
    return true
  } else {
    console.log(`🔒 [${WINDOW_ID}] 仍有 ${taskCount} 个待处理任务，保持服务器锁定`)

    // 列出待处理任务
    const taskIds = Array.from(windowTasks.keys())
    console.log(`📋 [${WINDOW_ID}] 待处理任务: [${taskIds.join(', ')}]`)

    // 检查是否有长时间运行的任务
    const longRunningTasks = []
    windowTasks.forEach((task, promptId) => {
      const taskDuration = Date.now() - (task.registeredAt || windowLockTimestamp)
      if (taskDuration > 10 * 60 * 1000) { // 超过10分钟
        longRunningTasks.push({ promptId, duration: Math.round(taskDuration / 1000) })
      }
    })

    if (longRunningTasks.length > 0) {
      console.log(`⚠️ [${WINDOW_ID}] 检测到长时间运行的任务:`)
      longRunningTasks.forEach(({ promptId, duration }) => {
        console.log(`   - ${promptId}: ${duration}秒`)
      })
    }
  }

  return false
}

// 🔧 注意：validateServerConsistency 函数已在第282行定义，此处移除重复声明

// 移除复杂的健康检查系统

// 🔥 防抖机制：避免频繁的进度回调触发递归更新
const progressCallbackDebounce = new Map()

function safeProgressCallback(promptId, task, message, percent) {
  if (!task.onProgress) return

  // 防抖：同一任务的进度回调间隔至少100ms
  const lastCallTime = progressCallbackDebounce.get(promptId) || 0
  const now = Date.now()

  if (now - lastCallTime < 100) {
    console.log(`🚫 [${WINDOW_ID}] 进度回调防抖: ${promptId} (${percent}%)`)
    return
  }

  progressCallbackDebounce.set(promptId, now)

  try {
    // 使用queueMicrotask避免递归更新
    queueMicrotask(() => {
      try {
        task.onProgress(message, percent)
      } catch (callbackError) {
        console.error(`❌ [${WINDOW_ID}] 进度回调执行失败: ${promptId}`, callbackError)

        // 如果是递归更新错误，停止后续回调
        if (callbackError.message?.includes('Maximum recursive updates')) {
          console.error(`🔥 [${WINDOW_ID}] 检测到递归更新，禁用进度回调: ${promptId}`)
          task.onProgress = null
        }
      }
    })
  } catch (error) {
    console.error(`❌ [${WINDOW_ID}] 安全进度回调失败: ${promptId}`, error)
  }
}

// 🔥 跨服务器隔离的WebSocket消息处理 - 基于官方API文档重构
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

    // 🔥 简化消息过滤：如果找到任务就处理，不严格限制窗口归属
    if (data && data.prompt_id) {
      const task = getWindowTask(data.prompt_id)
      if (!task) {
        // 任务不存在，可能是其他窗口的消息，静默忽略
        return
      }

      // 🔥 验证消息来源服务器一致性
      const currentLock = getWindowServerLock()
      if (currentLock && task.executionServer && task.executionServer !== currentLock.server) {
        console.warn(`⚠️ [${WINDOW_ID}] 跨服务器消息检测: 任务在 ${task.executionServer}, 当前锁定 ${currentLock.server}`)
        // 仍然处理消息，但记录警告以便调试
      }

      // 🔥 记录消息处理日志（用于跨服务器调试）
      console.log(`📨 [${WINDOW_ID}] 处理消息: ${type} (prompt_id: ${data.prompt_id}, 服务器: ${task.executionServer || '未知'})`)
    }

    // 🔥 新增：处理progress_state消息
    if (type === 'progress_state' && data?.prompt_id) {
      console.log(`📊 [${WINDOW_ID}] progress_state消息: ${data.prompt_id}`)
      handleProgressStateMessage(data)
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

// 🔥 新增：处理progress_state消息
function handleProgressStateMessage(data) {
  const { prompt_id, nodes } = data
  const task = getWindowTask(prompt_id)

  if (!task) {
    console.log(`⚠️ [${WINDOW_ID}] progress_state: 未找到任务 ${prompt_id}`)
    return
  }

  console.log(`📊 [${WINDOW_ID}] 处理progress_state: ${prompt_id}`)

  // 分析节点状态，计算整体进度
  let completedNodes = 0
  let totalNodes = 0

  for (const nodeId in nodes) {
    totalNodes++
    const nodeState = nodes[nodeId]

    // 检查节点是否完成（根据实际状态字段调整）
    if (nodeState.completed || nodeState.status === 'completed') {
      completedNodes++
    }
  }

  // 计算进度百分比
  const progressPercent = totalNodes > 0 ? Math.round((completedNodes / totalNodes) * 100) : 0

  console.log(`📊 [${WINDOW_ID}] 节点进度: ${completedNodes}/${totalNodes} (${progressPercent}%)`)

  // 更新任务进度
  if (progressPercent > 85) {
    safeProgressCallback(prompt_id, task, `处理中... (${completedNodes}/${totalNodes} 节点)`, progressPercent)
  }

  // 如果所有节点都完成，触发任务完成
  if (completedNodes === totalNodes && totalNodes > 0) {
    console.log(`✅ [${WINDOW_ID}] progress_state检测到任务完成: ${prompt_id}`)
    queueMicrotask(() => {
      handleTaskCompletion(prompt_id)
    })
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
    if (task.windowId === WINDOW_ID && task.status === TASK_STATUS.WAITING) {
      if (queueRemaining > 1) {
        // 多个任务等待时显示具体数量
        safeProgressCallback(promptId, task, `队列中还有 ${queueRemaining} 个任务等待`, 8)
      } else if (queueRemaining === 1) {
        // 只有一个任务等待时的提示
        safeProgressCallback(promptId, task, '队列中还有 1 个任务等待', 10)
      } else {
        // 队列为空，即将开始处理
        safeProgressCallback(promptId, task, '即将开始处理...', 12)
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

  if (updated) {
    // 🔧 使用安全进度回调
    safeProgressCallback(promptId, task, '任务开始执行...', 15)
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

  // 🔧 使用安全进度回调
  safeProgressCallback(promptId, task, `缓存命中 ${data.nodes.length} 个节点`, 25)
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

  // 🔧 使用安全进度回调
  safeProgressCallback(promptId, task, `节点 ${data.node} 完成`, 60)
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

    // 🔧 使用安全进度回调
    safeProgressCallback(promptId, task, `处理进度: ${data.value}/${data.max}`, overallProgress)
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

// 🔥 跨服务器任务完成处理 - 立即响应版本（消除延迟）
async function handleTaskCompletion(promptId) {
  // 🔧 只处理属于当前窗口的任务
  const task = getWindowTask(promptId)
  if (!task) {
    console.warn(`⚠️ [${WINDOW_ID}] 任务未找到或不属于当前窗口: ${promptId}`)
    return
  }

  console.log(`🚀 [${WINDOW_ID}] 开始立即处理任务完成: ${promptId} (服务器: ${task.executionServer || '未知'})`)

  try {
    // 🔧 立即更新进度到98%，表示正在获取结果
    if (task.onProgress) {
      task.onProgress('正在获取处理结果...', 98)
    }

    console.log(`🔍 [${WINDOW_ID}] 立即获取任务历史记录: ${promptId} (服务器: ${task.executionServer || '未知'})`)

    // 🔥 跨服务器历史记录获取：优先使用任务绑定的服务器
    let history
    if (task.executionServer) {
      try {
        // 直接从任务绑定的服务器获取历史记录
        const url = `${task.executionServer}/history/${promptId}`
        console.log(`🔍 [${WINDOW_ID}] 从绑定服务器获取历史记录: ${url}`)

        const response = await fetch(url)
        if (response.ok) {
          const fullHistory = await response.json()
          history = fullHistory
          console.log(`✅ [${WINDOW_ID}] 从绑定服务器获取历史记录成功: ${task.executionServer}`)
        } else {
          throw new Error(`绑定服务器历史记录获取失败: ${response.status}`)
        }
      } catch (error) {
        console.warn(`⚠️ [${WINDOW_ID}] 从绑定服务器获取历史记录失败，回退到默认方法: ${error.message}`)
        // 回退到默认的getTaskHistory方法
        history = await getTaskHistory(promptId)
      }
    } else {
      // 🔧 官方标准：立即获取历史记录（按照websockets_api_example.py第47行）
      history = await getTaskHistory(promptId)
    }

    console.log(`📊 [${WINDOW_ID}] 历史记录获取成功，开始提取结果: ${promptId}`)

    // 🔧 官方标准：提取结果数据（按照websockets_api_example.py第48-56行）
    const results = await extractTaskResults(history, promptId)

    console.log(`✅ [${WINDOW_ID}] 结果提取完成，更新进度到100%: ${promptId}`)

    // 🔧 在清理任务前，将服务器信息保存到结果中
    if (task.executionServer) {
      results.executionServer = task.executionServer
      console.log(`💾 [${WINDOW_ID}] 保存任务执行服务器信息到结果: ${task.executionServer}`)
    }

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
      const currentLock = getWindowServerLock()
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

// 🔧 确保WebSocket连接 - 重构版本（支持任务-服务器绑定一致性）
// 🎯 错误处理策略：WebSocket连接问题属于技术层面，不显示用户弹窗，仅记录日志
async function ensureWebSocketConnection(taskServer = null) {
  console.log(`🔌 [${WINDOW_ID}] 确保WebSocket连接`)

  if (taskServer) {
    console.log(`🎯 [${WINDOW_ID}] 指定任务服务器: ${taskServer}`)

    // 🔧 关键修复：如果指定了任务服务器，确保WebSocket连接到正确服务器
    await ensureWebSocketServerConsistency(taskServer)
    return true
  }

  // 如果已连接，检查服务器一致性
  if (wsConnection && wsConnection.readyState === WebSocket.OPEN && isWsConnected) {
    console.log(`✅ [${WINDOW_ID}] WebSocket已连接`)

    // 尝试锁定服务器，但失败不影响继续使用
    const currentLock = getWindowServerLock()
    if (!currentLock) {
      try {
        const apiBaseUrl = await getApiBaseUrl()
        lockServerForWindow(apiBaseUrl)
        console.log(`🔒 [${WINDOW_ID}] 补充锁定服务器: ${apiBaseUrl}`)
        console.log(`🪟 [${WINDOW_ID}] 窗口隔离: 为当前窗口补充服务器锁定`)
      } catch (error) {
        console.warn(`⚠️ [${WINDOW_ID}] 服务器锁定失败，但继续使用连接:`, error.message)
      }
    } else {
      console.log(`🔒 [${WINDOW_ID}] 服务器已锁定: ${currentLock.server}`)

      // 🔧 验证WebSocket连接与锁定服务器的一致性
      const wsServer = currentWebSocketServer
      if (wsServer && wsServer !== currentLock.server) {
        console.log(`🔄 [${WINDOW_ID}] WebSocket服务器与锁定服务器不一致，重新连接`)
        console.log(`   WebSocket服务器: ${wsServer}`)
        console.log(`   锁定服务器: ${currentLock.server}`)

        // 重新连接到锁定的服务器
        await initializeWebSocket(currentLock.server)
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

    // 🔧 关键修复：检查任务是否已经注册，避免重复注册
    let task = getWindowTask(promptId)

    if (!task) {
      console.warn(`⚠️ [${WINDOW_ID}] 任务 ${promptId} 未找到，这不应该发生（任务应该在submitWorkflow中预注册）`)
      // 创建备用任务对象
      task = {
        windowId: WINDOW_ID,
        clientId: WINDOW_CLIENT_ID,
        workflowType: workflowType,
        createdAt: new Date().toISOString(),
        startTime: Date.now(),
        status: TASK_STATUS.WAITING,
        lastStatusUpdate: Date.now(),
        currentNode: null,
        completedNodes: []
      }
      registerWindowTask(promptId, task)
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

    // 🔧 修复：获取节点49的原图用于对比，使用任务结果中的服务器信息
    let originalImage = null
    try {
      // 使用任务结果中保存的执行服务器信息构建原图URL
      const executionServer = taskResult.executionServer || getUnifiedServerUrl(submittedPromptId)
      logServerSelection('原图URL构建', submittedPromptId, executionServer,
        taskResult.executionServer ? '任务结果中的服务器' : '统一服务器获取函数')
      originalImage = ImageUrlBuilder.buildUrl(executionServer, uploadedImageName, '', 'input')
      console.log(`📷 [${WINDOW_ID}] 原图URL: ${originalImage}`)
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
      onProgress: onProgress,  // 🔧 修复：直接传递进度回调
      onComplete: null,
      onError: null
    }

    const submittedPromptId = await submitWorkflow(workflow, promptId, tempTask)

    if (onProgress) onProgress('正在处理换脸...', 85)

    // 等待任务完成（无超时限制）
    const taskResult = await waitForTaskCompletion(submittedPromptId, (status, progress) => {
      if (onProgress) {
        const adjustedProgress = Math.min(95, Math.max(85, 85 + (progress * 0.1)))
        onProgress(status, adjustedProgress)
      }
    }, 'faceswap')
    console.log('✅ 换脸任务处理完成')

    if (onProgress) onProgress('正在获取处理结果...', 95)

    // 获取结果图片URL（使用任务绑定的服务器）
    const imageUrl = await getTaskBoundImageUrl(submittedPromptId, taskResult, 'faceswap')

    // 消耗积分（从等级卡扣除）
    // 直接使用图片URL进行积分扣除
    const pointsResult = await levelCardPointsManager.consumePoints(20, '极速换脸', imageUrl)

    // 🔧 修复：构建目标图片URL，使用统一服务器地址确保一致性
    let targetImageUrl = null
    try {
      // 使用统一的图片URL构建函数，确保目标图片和结果图使用相同服务器
      targetImageUrl = buildUnifiedImageUrl(targetUploadedFilename, '', 'input', submittedPromptId)
      console.log(`📷 [${WINDOW_ID}] 目标图片URL: ${targetImageUrl}`)
    } catch (error) {
      console.warn('⚠️ 获取目标图片URL失败:', error)
      // 回退到原始目标图片
      targetImageUrl = targetImage
    }

    if (onProgress) onProgress('换脸完成！', 100)

    console.log('✅ 换脸处理完成')
    return {
      success: true,
      imageUrl: imageUrl,
      targetImageUrl: targetImageUrl, // 🔧 修复：使用服务器一致的目标图片URL
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



// 🔧 重构后的导出接口 - 简化并整理
export {
  // 核心配置管理
  getCurrentConfig,
  updateComfyUIConfig,
  resetToDefaultConfig,

  // 基础工具函数
  generateClientId,
  generatePromptId,
  getApiBaseUrl,
  addConfigChangeListener,
  removeConfigChangeListener,

  // 主要业务函数
  processUndressImage,
  processFaceSwapImage,
  processWorkflow,

  // 连接和状态管理
  checkComfyUIServerStatus,
  initializeWebSocket,
  initializeComfyUIConnection,
  wsConnection,
  isWsConnected,

  // 任务处理
  getTaskHistory,
  extractTaskResults,
  handleTaskCompletion,
  waitForTaskCompletion,
  updateTaskStatus,
  TASK_STATUS,

  // 统一的图片URL处理（简化导出，保留核心函数）
  getGeneratedImageUrl,
  getTaskBoundImageUrl,
  getTaskBoundServer,

  // 统一的服务器地址和URL构建函数
  getUnifiedServerUrl,
  buildUnifiedImageUrl,
  ImageUrlBuilder,

  // WebSocket消息处理
  handleWebSocketMessage,
  handleExecutingMessage,
  handleExecutedMessage,
  handleProgressMessage,
  handleStatusMessage,
  handleExecutionStartMessage,
  handleExecutionCachedMessage,
  handleExecutionErrorMessage,
  handleExecutionInterruptedMessage,

  // 调试和管理工具
  windowTasks as pendingTasks,
  forceUnlockServerForWindow,
  scheduleServerUnlockCheck,
  clearServerUnlockTimer
}

