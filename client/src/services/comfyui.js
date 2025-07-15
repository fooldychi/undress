// ComfyUI工作流服务 - 直连模式
import undressWorkflow from '../workflows/undress.json'
import faceSwapWorkflow from '../workflows/faceswap2.0.json'
import comfyUIConfig from '../config/comfyui.config.js'
import pointsManager from '../utils/pointsManager.js'
import levelCardPointsManager from '../utils/levelCardPointsManager.js'
import { updateAPIConfig } from './api.js'
import loadBalancer from './loadBalancer.js'

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

// 创建工作流提示词，将用户图片关联到节点49
function createUndressWorkflowPrompt(uploadedImageName) {
  try {
    // 深拷贝工作流
    const workflow = JSON.parse(JSON.stringify(undressWorkflow))

    // 将上传的图片文件名设置到节点49
    if (workflow['49'] && workflow['49'].class_type === 'LoadImage') {
      workflow['49'].inputs.image = uploadedImageName
      console.log('节点49图片设置为:', uploadedImageName)
    } else {
      throw new Error('工作流中未找到节点49或节点类型不正确')
    }

    // 随机化种子以获得不同的结果
    if (workflow['174'] && workflow['174'].inputs) {
      const newSeed = Math.floor(Math.random() * 1000000000000000)
      workflow['174'].inputs.noise_seed = newSeed
      console.log('随机种子设置为:', newSeed)
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
  // 确保 WebSocket 连接
  await initializeWebSocket(false)

  const config = getComfyUIConfig()
  const apiBaseUrl = await getApiBaseUrl()
  console.log('🔄 第二步：提交工作流到ComfyUI')
  console.log('📡 API地址:', `${apiBaseUrl}/api/prompt`)

  // 构建请求体，按照ComfyUI API文档格式
  const requestBody = {
    client_id: config.CLIENT_ID,
    prompt: workflowPrompt
  }

  // 第二步API调用：提交工作流到ComfyUI
  const promptUrl = `${apiBaseUrl}/api/prompt`

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
  return result.prompt_id // 返回任务ID
}

// 检查任务状态
async function checkTaskStatus(promptId) {
  try {
    const apiBaseUrl = await getApiBaseUrl()
    console.log(`🔍 查询任务状态:`, `${apiBaseUrl}/api/history/${promptId}`)
    const response = await fetch(`${apiBaseUrl}/api/history/${promptId}`)

    if (!response.ok) {
      throw new Error(`状态查询失败: ${response.status} ${response.statusText}`)
    }

    const result = await response.json()
    return result[promptId] || null

  } catch (error) {
    console.error('状态查询失败:', error)
    throw new Error(`状态查询失败: ${error.message}`)
  }
}

// 获取生成的图片
async function getGeneratedImage(taskResult) {
  try {
    const apiBaseUrl = await getApiBaseUrl()

    // 从任务结果中找到输出图片
    const outputs = taskResult.outputs
    let imageInfo = null

    // 优先查找节点730的输出图片（一键换衣处理结果）
    if (outputs['730'] && outputs['730'].images && outputs['730'].images.length > 0) {
      imageInfo = outputs['730'].images[0]
      console.log('📷 找到节点730的一键换衣处理结果图片:', imageInfo)
    } else if (outputs['812'] && outputs['812'].images && outputs['812'].images.length > 0) {
      // 备用：查找节点812的输出图片（换脸处理结果）
      imageInfo = outputs['812'].images[0]
      console.log('📷 找到节点812的换脸处理结果图片:', imageInfo)
    } else if (outputs['813'] && outputs['813'].images && outputs['813'].images.length > 0) {
      // 备用：查找节点813的输出图片（旧版换脸结果）
      imageInfo = outputs['813'].images[0]
      console.log('📷 找到节点813的换脸处理结果图片:', imageInfo)
    } else if (outputs['746'] && outputs['746'].images && outputs['746'].images.length > 0) {
      // 备用：查找节点746的输出图片（更旧版换脸结果）
      imageInfo = outputs['746'].images[0]
      console.log('📷 找到节点746的换脸处理结果图片:', imageInfo)
    } else if (outputs['710'] && outputs['710'].images && outputs['710'].images.length > 0) {
      // 备用：查找节点710的输出图片（换衣处理结果）
      imageInfo = outputs['710'].images[0]
      console.log('📷 找到节点710的处理结果图片:', imageInfo)
    } else {
      // 如果主要节点都没有输出，则查找其他节点的输出图片
      console.log('⚠️ 节点812、813、746和710都无输出，查找其他节点...')
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

// WebSocket 连接管理
let wsConnection = null
let wsReconnectTimer = null
let isWsConnected = false
let wsMessageHandlers = new Map()
let pendingTasks = new Map()
let wsHealthCheckTimer = null
let lastMessageTime = Date.now()
let connectionAttempts = 0
let maxConnectionAttempts = 5


// 前端通知函数
function showWebSocketStatusNotification(message, type = 'info') {
  try {
    // 在控制台显示明显标记
    const timestamp = new Date().toLocaleTimeString()
    const typeEmoji = {
      'success': '✅',
      'error': '❌',
      'warning': '⚠️',
      'info': 'ℹ️'
    }

    console.log(`${typeEmoji[type] || 'ℹ️'} [${timestamp}] ${message}`)

    // 尝试显示浏览器通知（如果用户允许）
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('ComfyUI 处理状态', {
        body: message,
        icon: '/favicon.ico'
      })
    }

    // 尝试触发自定义事件，供Vue组件监听
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('comfyui-status', {
        detail: { message, type, timestamp }
      }))
    }
  } catch (error) {
    console.warn('显示通知失败:', error)
  }
}



// 初始化 WebSocket 连接
async function initializeWebSocket(forceNewConnection = false) {
  try {
    // 检查是否需要重新连接
    if (!forceNewConnection && wsConnection && wsConnection.readyState === WebSocket.OPEN) {
      console.log('🎯 WebSocket 已连接，无需重新初始化')
      return true
    }

    const config = getComfyUIConfig()

    // 获取最优服务器
    const baseUrl = await loadBalancer.getOptimalServer()
    console.log(`🔌 准备连接WebSocket服务器: ${baseUrl}`)

    // 确保使用正确的WebSocket URL格式
    let wsUrl
    if (baseUrl.startsWith('https://')) {
      wsUrl = baseUrl.replace('https://', 'wss://') + '/ws?clientId=' + config.CLIENT_ID
    } else {
      wsUrl = baseUrl.replace('http://', 'ws://') + '/ws?clientId=' + config.CLIENT_ID
    }

    // 先测试HTTP连接是否正常 - 使用统一的官方端点配置
    try {
      const testEndpoints = comfyUIConfig.getHealthCheckEndpoints()
      let connectionOk = false

      for (const endpoint of testEndpoints) {
        try {
          const testResponse = await fetch(`${baseUrl}${endpoint}`, {
            method: 'GET',
            signal: AbortSignal.timeout(comfyUIConfig.HEALTH_CHECK.TIMEOUT / 2) // 使用一半超时时间
          })

          if (testResponse.ok) {
            // 验证响应是否为有效的ComfyUI响应
            try {
              const data = await testResponse.json()
              const isValid = comfyUIConfig.validateResponse(endpoint, data)
              if (isValid) {
                console.log(`✅ HTTP连接测试成功: ${endpoint} (已验证ComfyUI响应)`)
                connectionOk = true
                break
              } else {
                console.log(`⚠️ 端点 ${endpoint} 响应但验证失败`)
              }
            } catch (jsonError) {
              console.log(`✅ HTTP连接测试成功: ${endpoint} (非JSON响应但连接正常)`)
              connectionOk = true
              break
            }
          }
        } catch (endpointError) {
          console.log(`⚠️ 端点 ${endpoint} 测试失败: ${endpointError.message}`)
        }
      }

      if (!connectionOk) {
        throw new Error('所有HTTP端点测试失败')
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
        connectionAttempts = 0 // 重置连接尝试次数
        lastMessageTime = Date.now() // 重置最后消息时间
        clearTimeout(timeout)
        clearTimeout(wsReconnectTimer)

        // 启动健康检查
        startWebSocketHealthCheck()

        // 显示前端通知
        showWebSocketStatusNotification('WebSocket连接成功', 'success')

        resolve(true)
      }

      wsConnection.onclose = (event) => {
        console.log(`🔌 ComfyUI WebSocket 连接关闭: 代码=${event.code}, 原因=${event.reason}`)
        isWsConnected = false
        clearTimeout(timeout)

        // 停止健康检查
        stopWebSocketHealthCheck()

        // 显示前端通知
        showWebSocketStatusNotification('WebSocket连接已断开', 'warning')

        // 分析关闭原因
        let closeReason = '未知原因'
        switch (event.code) {
          case 1000:
            closeReason = '正常关闭'
            break
          case 1001:
            closeReason = '端点离开'
            break
          case 1002:
            closeReason = '协议错误'
            break
          case 1003:
            closeReason = '不支持的数据类型'
            break
          case 1006:
            closeReason = '连接异常关闭（可能是网络问题或服务器切换）'
            break
          case 1011:
            closeReason = '服务器错误'
            break
          default:
            closeReason = `错误代码 ${event.code}`
        }
        console.log(`📋 WebSocket关闭原因: ${closeReason}`)

        // 检查是否有待处理的任务
        const hasPendingTasks = pendingTasks.size > 0
        if (hasPendingTasks) {
          console.warn(`⚠️ WebSocket断开时有 ${pendingTasks.size} 个待处理任务`)
          showWebSocketStatusNotification(`连接断开，有 ${pendingTasks.size} 个任务待处理`, 'warning')
        }

        // 智能重连策略
        if (!wsReconnectTimer) {
          connectionAttempts++

          // 指数退避策略：基础延迟 * 2^尝试次数，最大30秒
          const baseDelay = hasPendingTasks ? 1000 : 5000
          const exponentialDelay = Math.min(baseDelay * Math.pow(2, connectionAttempts - 1), 30000)

          console.log(`🔄 计划重连 (尝试 ${connectionAttempts}/${maxConnectionAttempts})，延迟 ${exponentialDelay/1000}秒`)

          wsReconnectTimer = setTimeout(async () => {
            wsReconnectTimer = null

            // 如果超过最大重连次数，停止自动重连
            if (connectionAttempts > maxConnectionAttempts) {
              console.error(`❌ 已达到最大重连次数 (${maxConnectionAttempts})，停止自动重连`)
              showWebSocketStatusNotification('WebSocket重连失败，任务可能无法完成', 'error')

              // 标记所有待处理任务为失败
              if (hasPendingTasks) {
                console.log('❌ 标记所有待处理任务为失败')
                const taskIds = Array.from(pendingTasks.keys())
                for (const promptId of taskIds) {
                  const task = pendingTasks.get(promptId)
                  if (task && task.onError) {
                    task.onError('WebSocket连接失败，无法监听任务完成')
                  }
                  pendingTasks.delete(promptId)
                }
              }
              return
            }

            try {
              await initializeWebSocket()

              // 重连成功后，检查待处理任务的状态
              if (hasPendingTasks) {
                await checkPendingTasksStatus()
              }
            } catch (error) {
              // 重连失败，继续等待下次重试
            }
          }, exponentialDelay)
        }
      }

      wsConnection.onerror = (error) => {
        clearTimeout(timeout)

        // 显示前端通知
        showWebSocketStatusNotification('WebSocket连接错误', 'error')

        reject(error)
      }

      wsConnection.onmessage = (event) => {
        try {
          // 更新最后消息时间
          lastMessageTime = Date.now()

          // 检查消息数据是否为空或无效
          if (!event.data || typeof event.data !== 'string') {
            console.warn('⚠️ 收到空或无效的WebSocket消息')
            return
          }

          // 检查是否是纯文本消息（非JSON）
          const rawData = event.data.trim()
          if (rawData.length === 0) {
            console.warn('⚠️ 收到空的WebSocket消息')
            return
          }

          // 检查是否是心跳或状态消息
          if (rawData === 'ping' || rawData === 'pong' || rawData === 'heartbeat') {
            // 心跳消息，不需要处理
            return
          }

          let message;
          try {
            message = JSON.parse(rawData)
          } catch (parseError) {
            console.error('❌ WebSocket消息解析失败:', parseError)
            console.error('原始消息内容:', rawData.substring(0, 200) + (rawData.length > 200 ? '...' : ''))
            console.error('消息长度:', rawData.length)
            console.error('消息开头字符:', rawData.charCodeAt(0), rawData.charAt(0))

            // 尝试修复常见的JSON格式问题
            let fixedData = rawData;

            // 移除可能的BOM或特殊字符
            if (rawData.charCodeAt(0) === 0xFEFF) {
              fixedData = rawData.substring(1)
            }

            // 移除开头的非JSON字符
            const jsonStart = fixedData.indexOf('{')
            if (jsonStart > 0) {
              fixedData = fixedData.substring(jsonStart)
            }

            // 尝试再次解析
            try {
              message = JSON.parse(fixedData)
              console.log('✅ 修复后的消息解析成功')
            } catch (secondParseError) {
              console.error('❌ 修复后仍无法解析消息，跳过此消息')
              return
            }
          }

          // 验证消息对象
          if (!message || typeof message !== 'object') {
            console.warn('⚠️ 解析后的消息不是有效对象:', message)
            return
          }

          // 检查消息格式并标准化
          let normalizedMessage = message;
          if (message.type && message.data) {
            // 标准格式：{ type: "...", data: {...} }
            normalizedMessage = message;
          } else if (typeof message === 'object') {
            // 可能是直接的消息对象，尝试推断类型
            if (message.prompt_id && (message.output || message.outputs)) {
              normalizedMessage = {
                type: 'executed',
                data: message
              }
            } else if (message.prompt_id && message.node !== undefined) {
              normalizedMessage = {
                type: 'executing',
                data: message
              }
            } else if (message.prompt_id && (message.value !== undefined && message.max !== undefined)) {
              normalizedMessage = {
                type: 'progress',
                data: message
              }
            } else if (message.prompt_id && message.timestamp) {
              normalizedMessage = {
                type: 'execution_success',
                data: message
              }
            }
          }

          handleWebSocketMessage(normalizedMessage)
        } catch (error) {
          console.error('❌ 处理WebSocket消息失败:', error)
          console.error('错误堆栈:', error.stack)
        }
      }
    })
  } catch (error) {
    console.error('❌❌❌ 初始化 WebSocket 失败 ❌❌❌', error)
    throw error
  }
}

// WebSocket健康检查
function startWebSocketHealthCheck() {
  // 清除现有的健康检查
  stopWebSocketHealthCheck()

  wsHealthCheckTimer = setInterval(() => {
    const now = Date.now()
    const timeSinceLastMessage = now - lastMessageTime

    // 如果超过30秒没有收到消息，认为连接可能有问题
    if (timeSinceLastMessage > 30000) {
      console.warn(`⚠️ WebSocket健康检查：${timeSinceLastMessage/1000}秒未收到消息`)

      // 检查连接状态
      if (wsConnection && wsConnection.readyState !== WebSocket.OPEN) {
        console.warn('⚠️ WebSocket连接状态异常，尝试重连')
        isWsConnected = false

        // 如果有待处理任务，立即尝试重连
        if (pendingTasks.size > 0) {
          console.log('🔄 检测到待处理任务，立即重连WebSocket')
          initializeWebSocket().catch(error => {
            console.error('❌ 健康检查重连失败:', error)
          })
        }
      }
    }

    // 如果超过120秒没有收到消息且有待处理任务，标记任务失败
    if (timeSinceLastMessage > 120000 && pendingTasks.size > 0) {
      const taskIds = Array.from(pendingTasks.keys())
      for (const promptId of taskIds) {
        const task = pendingTasks.get(promptId)
        if (task && task.onError) {
          task.onError('WebSocket连接长时间无响应')
        }
        pendingTasks.delete(promptId)
      }
      showWebSocketStatusNotification('WebSocket连接异常，任务已取消', 'error')
    }
  }, 10000) // 每10秒检查一次
}

function stopWebSocketHealthCheck() {
  if (wsHealthCheckTimer) {
    clearInterval(wsHealthCheckTimer)
    wsHealthCheckTimer = null
  }
}

// 检查待处理任务状态
async function checkPendingTasksStatus() {
  const taskIds = Array.from(pendingTasks.keys())

  for (const promptId of taskIds) {
    try {
      const result = await checkTaskStatus(promptId)

      if (result && result.status && result.status.completed) {
        console.log(`✅ 发现任务 ${promptId} 已完成，触发回调`)

        const task = pendingTasks.get(promptId)
        if (task && task.onComplete) {
          task.onComplete(result)
          pendingTasks.delete(promptId)
          showWebSocketStatusNotification(`任务 ${promptId.substring(0, 8)} 已完成`, 'success')
        }
      } else if (result && result.status && result.status.status_str === 'error') {
        console.error(`❌ 发现任务 ${promptId} 执行失败`)

        const task = pendingTasks.get(promptId)
        if (task && task.onError) {
          task.onError('任务执行失败')
          pendingTasks.delete(promptId)
          showWebSocketStatusNotification(`任务 ${promptId.substring(0, 8)} 执行失败`, 'error')
        }
      }
    } catch (error) {
      console.error(`❌ 检查任务 ${promptId} 状态失败:`, error)
    }
  }
}

// 已移除HTTP轮询备用机制，完全依赖WebSocket进行任务状态监控
// 如果需要手动检查任务状态，请使用 checkTaskStatus(promptId) 函数

// 处理 WebSocket 消息 - 根据ComfyUI官方文档规范
function handleWebSocketMessage(message) {
  try {
    const { type, data } = message

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
      case 'execution_success':
        console.log('🎉 任务执行成功!')
        handleExecutionSuccessMessage(data)
        break
      case 'execution_error':
        handleExecutionErrorMessage(data)
        break
      case 'execution_interrupted':
        handleExecutionInterruptedMessage(data)
        break
      case 'execution_cached':
        handleExecutionCachedMessage(data)
        break
      default:
        console.log(`收到未处理的消息类型: ${type}`)
    }

    // 触发注册的消息处理器
    if (wsMessageHandlers.has(type)) {
      wsMessageHandlers.get(type).forEach(handler => {
        try {
          handler(data)
        } catch (error) {
          console.error(`❌ 处理 ${type} 消息时出错:`, error)
        }
      })
    }
  } catch (error) {
    console.error('❌ 处理 WebSocket 消息失败:', error)
    console.error('错误详情:', error)
    console.log('问题消息:', JSON.stringify(message, null, 2))
  }
}

// 处理状态消息 - 队列状态变化
function handleStatusMessage() {
  // 队列状态消息，通常用于监控队列状态
  // 这里可以根据需要添加队列状态处理逻辑
}



// 处理执行成功消息 - 这是关键的完成消息！
function handleExecutionSuccessMessage(data) {
  console.log('🎉 ComfyUI 执行成功! 所有节点已完成!')

  if (data && data.prompt_id) {
    const promptId = data.prompt_id
    const task = pendingTasks.get(promptId)

    if (task) {
      console.log(`✅ 任务 ${promptId} 执行完成`)

      // 立即更新进度到99%
      if (task.onProgress) {
        task.onProgress('处理完成，正在加载结果...', 99)
      }

      // 显示前端通知
      showWebSocketStatusNotification(`任务执行成功!`, 'success')

      // 获取完整的历史记录来获取输出结果
      checkTaskStatus(promptId).then(result => {
        if (task.onComplete) {
          console.log('🚀 返回处理结果到前端')

          // 显示成功通知
          showWebSocketStatusNotification('图片处理成功，正在加载结果...', 'success')

          task.onComplete(result)
        }

        pendingTasks.delete(promptId)
        console.log('✅ ComfyUI 处理流程完成!')

      }).catch(error => {
        console.error('❌ 获取任务结果失败:', error)

        // 显示错误通知
        showWebSocketStatusNotification('获取处理结果失败', 'error')

        if (task.onError) {
          task.onError(error.message)
        }
        pendingTasks.delete(promptId)
      })
    } else {
      console.warn(`⚠️ 收到未知任务的执行成功消息: ${promptId}`)
    }
  } else {
    console.warn('⚠️ 收到无效的执行成功消息')
  }
}

// 处理执行中断消息
function handleExecutionInterruptedMessage(data) {
  if (data && data.prompt_id) {
    const promptId = data.prompt_id
    const task = pendingTasks.get(promptId)
    if (task && task.onError) {
      task.onError('任务执行被中断')
    }
    pendingTasks.delete(promptId)
  }
}

// 处理执行缓存消息
function handleExecutionCachedMessage(data) {
  if (data && data.prompt_id) {
    const promptId = data.prompt_id
    const cachedNodes = data.nodes || []
    const task = pendingTasks.get(promptId)
    if (task && task.onProgress) {
      task.onProgress(`使用缓存 (${cachedNodes.length}个节点)`, 30)
    }
  }
}

// 处理进度消息 - 根据官方文档规范
function handleProgressMessage(data) {
  if (data && data.prompt_id && data.value !== undefined && data.max !== undefined) {
    const promptId = data.prompt_id
    const nodeId = data.node
    const progress = Math.round((data.value / data.max) * 100)

    const task = pendingTasks.get(promptId)
    if (task && task.onProgress) {
      task.onProgress(progress, `处理节点 ${nodeId || ''}`)
    }
  }
}

// 处理节点执行完成消息 - 当节点返回UI元素时
function handleExecutedMessage(data) {
  // 根据官方文档，executed消息只在节点返回UI元素时发送
  // 这不是任务完成的信号，真正的完成信号是execution_success

  if (data && data.prompt_id && data.node && data.output) {
    const promptId = data.prompt_id
    const nodeId = data.node

    // 这里可以处理中间结果或UI更新，但不应该触发任务完成
    const task = pendingTasks.get(promptId)
    if (task && task.onProgress) {
      // 更新进度，但不超过95%，为最终完成留出空间
      const currentProgress = Math.min(95, 60 + Math.random() * 30)
      task.onProgress(`节点 ${nodeId} 完成`, currentProgress)
    }
  }
}

// 处理执行错误消息
function handleExecutionErrorMessage(data) {
  if (data && data.prompt_id) {
    const task = pendingTasks.get(data.prompt_id)
    if (task) {
      console.error(`❌ 任务 ${data.prompt_id} 执行失败:`, data)
      if (task.onError) {
        task.onError(data.exception_message || data.traceback || '任务执行失败')
      }
      pendingTasks.delete(data.prompt_id)
    }
  }
}

// 处理正在执行消息 - 根据官方文档规范
function handleExecutingMessage(data) {
  if (data && data.prompt_id) {
    const promptId = data.prompt_id
    const nodeId = data.node

    const task = pendingTasks.get(promptId)
    if (task && task.onProgress) {
      if (nodeId === null || nodeId === undefined) {
        // node为null表示执行完成，但不是最终完成
        task.onProgress('所有节点执行完成，等待结果...', 95)
      } else {
        // 开始执行新节点，动态计算进度
        const currentProgress = Math.min(90, 30 + Math.random() * 50)
        task.onProgress(`执行节点 ${nodeId}`, currentProgress)
      }
    }
  }
}

// 等待任务完成 - 完全依赖WebSocket机制
async function waitForTaskCompletion(promptId, maxWaitTime = 300000, onProgress = null) {
  console.log(`⏳ 等待任务完成: ${promptId}`)

  // 确保WebSocket连接已建立
  try {
    const wsConnected = await initializeWebSocket()
    if (!wsConnected) {
      throw new Error('WebSocket连接失败')
    }
  } catch (error) {
    console.error('❌ WebSocket连接失败:', error)
    throw new Error(`WebSocket连接失败: ${error.message}`)
  }

  return new Promise((resolve, reject) => {
    let isResolved = false

    // 设置超时
    const timeout = setTimeout(() => {
      if (isResolved) return

      console.warn(`⏰ 任务 ${promptId} 等待超时`)

      // 确实超时
      pendingTasks.delete(promptId)
      showWebSocketStatusNotification('任务处理超时', 'error')
      reject(new Error(`任务 ${promptId} 执行超时`))
    }, maxWaitTime)

    // 创建任务跟踪对象
    const task = {
      promptId,
      onProgress: (status, progress) => {
        // 调用外部进度回调
        if (onProgress) {
          onProgress(status, progress)
        }
      },
      onComplete: (result) => {
        if (isResolved) return
        isResolved = true

        clearTimeout(timeout)
        console.log(`✅ 任务 ${promptId} 完成`)

        if (onProgress) {
          onProgress('处理完成', 100)
        }

        resolve(result)
      },
      onError: (error) => {
        if (isResolved) return
        isResolved = true

        clearTimeout(timeout)
        console.error(`❌ 任务 ${promptId} 失败:`, error)

        if (onProgress) {
          onProgress('处理失败', 0)
        }

        // 显示错误通知
        showWebSocketStatusNotification('任务处理失败', 'error')

        reject(new Error(error))
      }
    }

    // 注册任务到待处理列表
    pendingTasks.set(promptId, task)

    // 确认WebSocket连接状态
    if (isWsConnected && wsConnection && wsConnection.readyState === WebSocket.OPEN) {
      console.log('📡 WebSocket已连接，等待任务完成')

      // 初始进度
      if (onProgress) {
        onProgress('任务已提交，等待处理...', 10)
      }
    } else {
      console.error('❌ WebSocket连接状态异常')
      // 清理任务并拒绝
      pendingTasks.delete(promptId)
      clearTimeout(timeout)
      reject(new Error('WebSocket连接状态异常，无法监听任务完成'))
    }
  })
}

// HTTP轮询备份机制已移除，完全依赖WebSocket实时通信
// 如果需要手动检查任务状态，请使用 checkTaskStatus(promptId) 函数

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

    const workflowPrompt = createUndressWorkflowPrompt(uploadedImageName)

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
    })
    console.log('✅ 任务处理完成')

    // 获取生成的图片
    if (onProgress) onProgress('正在获取处理结果...', 96)

    const resultImage = await getGeneratedImage(taskResult)
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

    // 准备工作流
    const workflow = JSON.parse(JSON.stringify(faceSwapWorkflow))

    // 更新工作流中的图片节点
    // 根据最新工作流，正确的节点映射：
    // 节点670: 第一张人脸照片
    // 节点662: 第二张人脸照片
    // 节点658: 第三张人脸照片
    // 节点655: 第四张人脸照片
    // 节点737: 目标图片
    // 节点812: 处理结果输出（最新）

    if (workflow['670']) {
      workflow['670'].inputs.image = uploadedFacePhotos[0]
    }
    if (workflow['662']) {
      workflow['662'].inputs.image = uploadedFacePhotos[1]
    }
    if (workflow['658']) {
      workflow['658'].inputs.image = uploadedFacePhotos[2]
    }
    if (workflow['655']) {
      workflow['655'].inputs.image = uploadedFacePhotos[3]
    }
    if (workflow['737']) {
      workflow['737'].inputs.image = targetUploadedFilename
    }

    if (onProgress) onProgress('正在提交换脸任务...', 80)

    // 提交工作流
    const promptId = await submitWorkflow(workflow)

    if (onProgress) onProgress('正在处理换脸...', 85)

    // 等待任务完成 - 换脸需要更长时间，设置10分钟超时
    const maxWaitTime = 600000 // 10分钟

    const taskResult = await waitForTaskCompletion(promptId, maxWaitTime, onProgress)
    console.log('✅ 换脸任务处理完成')

    if (onProgress) onProgress('正在获取处理结果...', 95)

    // 获取结果图片
    const imageUrl = await getGeneratedImage(taskResult)

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
  isWsConnected
}
