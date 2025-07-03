// ComfyUI工作流服务
import undressWorkflow from '../workflows/undress.json'
import faceSwapWorkflow from '../workflows/faceswap2.0.json'

// API配置 - 支持动态配置
const DEFAULT_CONFIG = {
  // 原始ComfyUI服务器URL（用户可配置）
  COMFYUI_SERVER_URL: 'https://hwf0p724ub-8188.cnb.run',
  // 是否使用代理服务器（避免CORS问题）
  USE_PROXY: true,
  // 代理服务器URL
  PROXY_SERVER_URL: 'http://localhost:3008/api',
  CLIENT_ID: 'abc1373d4ad648a3a81d0587fbe5534b',
  TIMEOUT: 300000 // 5分钟
}

// 从localStorage获取配置，如果没有则使用默认配置
function getComfyUIConfig() {
  const savedConfig = localStorage.getItem('comfyui_config')
  if (savedConfig) {
    try {
      const parsed = JSON.parse(savedConfig)
      return { ...DEFAULT_CONFIG, ...parsed }
    } catch (error) {
      console.warn('解析保存的配置失败，使用默认配置:', error)
    }
  }
  return { ...DEFAULT_CONFIG }
}

// 保存配置到localStorage
function saveComfyUIConfig(config) {
  try {
    localStorage.setItem('comfyui_config', JSON.stringify(config))
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
      console.log('✅ 代理服务器配置更新成功:', result)
      return { success: true, message: '代理服务器配置更新成功' }
    } else {
      console.warn('⚠️ 代理服务器配置更新失败:', response.status)
      return { success: false, message: `代理服务器响应错误: ${response.status}` }
    }
  } catch (error) {
    console.warn('⚠️ 无法连接到代理服务器，可能代理服务器未启动:', error.message)
    return { success: false, message: '无法连接到代理服务器' }
  }
}

// 更新配置
async function updateComfyUIConfig(newConfig) {
  const currentConfig = getComfyUIConfig()
  const updatedConfig = { ...currentConfig, ...newConfig }

  // 保存到localStorage
  saveComfyUIConfig(updatedConfig)

  // 同时更新代理服务器配置
  const proxyUpdateResult = await updateProxyServerConfig(updatedConfig)

  return {
    config: updatedConfig,
    proxyUpdate: proxyUpdateResult
  }
}

// 获取当前配置
function getCurrentConfig() {
  return getComfyUIConfig()
}

// 获取实际使用的API基础URL
function getApiBaseUrl() {
  const config = getComfyUIConfig()
  if (config.USE_PROXY) {
    return config.PROXY_SERVER_URL
  } else {
    return config.COMFYUI_SERVER_URL
  }
}

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
  try {
    const config = getComfyUIConfig()
    const apiBaseUrl = getApiBaseUrl()
    console.log('🔄 第一步：上传图片到ComfyUI服务器')
    console.log('📡 API地址:', `${apiBaseUrl}/upload/image`)
    console.log('🔧 使用代理:', config.USE_PROXY ? '是' : '否')

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

    // 尝试多种上传方式
    const uploadMethods = [
      {
        name: '标准FormData上传',
        method: async () => {
          const formData = new FormData()
          formData.append('image', blob, filename)
          formData.append('type', 'input')
          formData.append('subfolder', '')
          formData.append('overwrite', 'false')

          return fetch(`${apiBaseUrl}/upload/image`, {
            method: 'POST',
            body: formData,
            mode: 'cors',
            credentials: 'omit'
          })
        }
      },
      {
        name: '简化FormData上传',
        method: async () => {
          const formData = new FormData()
          formData.append('image', blob, filename)

          return fetch(`${apiBaseUrl}/upload/image`, {
            method: 'POST',
            body: formData,
            mode: 'cors',
            credentials: 'omit'
          })
        }
      },
      {
        name: '无CORS模式上传',
        method: async () => {
          const formData = new FormData()
          formData.append('image', blob, filename)
          formData.append('type', 'input')

          return fetch(`${config.BASE_URL}/upload/image`, {
            method: 'POST',
            body: formData,
            mode: 'no-cors'
          })
        }
      }
    ]

    let lastError = null

    // 尝试不同的上传方法
    for (const uploadMethod of uploadMethods) {
      try {
        console.log(`🔄 尝试: ${uploadMethod.name}`)

        const response = await uploadMethod.method()
        console.log('📥 上传响应状态:', response.status, response.statusText)

        if (response.ok) {
          const result = await response.json()
          console.log('✅ 图片上传成功:', result)

          // 验证返回结果
          if (!result.name) {
            throw new Error('上传响应中缺少文件名')
          }

          return result.name
        } else if (response.status !== 0) { // no-cors模式会返回status 0
          const errorText = await response.text()
          console.error(`❌ ${uploadMethod.name} 失败:`, errorText)
          lastError = new Error(`${uploadMethod.name} 失败: ${response.status} ${response.statusText} - ${errorText}`)
        }

      } catch (error) {
        console.error(`❌ ${uploadMethod.name} 错误:`, error)
        lastError = error
        continue
      }
    }

    // 如果所有方法都失败了
    throw lastError || new Error('所有上传方法都失败了')

  } catch (error) {
    console.error('❌ 图片上传失败:', error)

    // 提供更详细的错误信息和解决建议
    if (error.message.includes('CORS')) {
      throw new Error(`图片上传失败: CORS错误 - ComfyUI服务器可能没有设置正确的跨域头`)
    } else if (error.message.includes('网络连接中断') || error.message.includes('EPIPE') || error.message.includes('ECONNRESET')) {
      throw new Error(`图片上传失败: 网络连接不稳定 - 请检查网络连接或稍后重试`)
    } else if (error.message.includes('超时')) {
      throw new Error(`图片上传失败: 上传超时 - 文件可能过大或网络较慢`)
    } else if (error.message.includes('500')) {
      throw new Error(`图片上传失败: ComfyUI服务器内部错误 - 服务器可能过载，请稍后重试`)
    } else if (error.message.includes('network')) {
      throw new Error(`图片上传失败: 网络错误 - 请检查ComfyUI服务器是否运行正常`)
    } else {
      throw new Error(`图片上传失败: ${error.message}`)
    }
  }
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
  try {
    const config = getComfyUIConfig()
    const apiBaseUrl = getApiBaseUrl()
    console.log('🔄 第二步：提交工作流到ComfyUI')
    console.log('📡 API地址:', `${apiBaseUrl}/prompt`)
    console.log('🔧 使用代理:', config.USE_PROXY ? '是' : '否')

    // 构建请求体，按照ComfyUI API文档格式
    const requestBody = {
      client_id: config.CLIENT_ID,
      prompt: workflowPrompt
    }

    console.log('📋 请求体结构:', {
      client_id: requestBody.client_id,
      prompt_keys: Object.keys(requestBody.prompt),
      node_49_exists: !!requestBody.prompt['49'],
      node_49_image: requestBody.prompt['49']?.inputs?.image
    })

    // 第二步API调用：提交工作流到ComfyUI
    const promptUrl = `${apiBaseUrl}/prompt`
    console.log('🌐 调用工作流API:', promptUrl)

    const response = await fetch(promptUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody),
      mode: 'cors',
      credentials: 'omit'
    })

    console.log('📥 工作流响应状态:', response.status, response.statusText)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ 工作流提交失败响应:', errorText)
      throw new Error(`工作流提交失败: ${response.status} ${response.statusText} - ${errorText}`)
    }

    const result = await response.json()
    console.log('✅ 工作流提交成功:', result)

    // 验证返回结果
    if (!result.prompt_id) {
      throw new Error('工作流响应中缺少prompt_id')
    }

    return result.prompt_id // 返回任务ID

  } catch (error) {
    console.error('❌ 工作流提交失败:', error)
    throw new Error(`工作流提交失败: ${error.message}`)
  }
}

// 检查任务状态
async function checkTaskStatus(promptId) {
  try {
    const config = getComfyUIConfig()
    const apiBaseUrl = getApiBaseUrl()
    console.log('🔍 查询任务状态:', `${apiBaseUrl}/history/${promptId}`)
    const response = await fetch(`${apiBaseUrl}/history/${promptId}`)

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
    const config = getComfyUIConfig()
    const apiBaseUrl = getApiBaseUrl()

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
    const imageUrl = `${apiBaseUrl}/view?${params.toString()}`

    console.log('🌐 获取图片URL:', imageUrl)

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

// 等待任务完成
async function waitForTaskCompletion(promptId, maxWaitTime = 300000) {
  const startTime = Date.now()
  const pollInterval = 2000 // 2秒轮询一次

  while (Date.now() - startTime < maxWaitTime) {
    const taskResult = await checkTaskStatus(promptId)

    if (taskResult) {
      if (taskResult.status && taskResult.status.completed) {
        return taskResult
      } else if (taskResult.status && taskResult.status.status_str === 'error') {
        throw new Error(`任务执行失败: ${JSON.stringify(taskResult.status)}`)
      }
    }

    // 等待下次轮询
    await new Promise(resolve => setTimeout(resolve, pollInterval))
  }

  throw new Error('任务执行超时')
}

// 主要的换衣API函数 - 两步流程
async function processUndressImage(base64Image) {
  try {
    console.log('🚀 开始处理换衣请求...')
    console.log('📋 流程：第一步上传图片 → 第二步提交工作流')

    // 验证图片数据格式
    console.log('🔍 验证图片数据格式...')
    if (!base64Image || !base64Image.startsWith('data:image/')) {
      throw new Error('无效的图片数据格式')
    }

    // 第一步：上传图片到ComfyUI服务器
    console.log('📤 第一步：上传图片到 /api/upload/image')
    const uploadedImageName = await uploadImageToComfyUI(base64Image)
    console.log('✅ 第一步完成，获得文件名:', uploadedImageName)

    // 创建工作流提示词，将上传的图片关联到节点49
    console.log('🔧 配置工作流，关联图片到节点49...')
    const workflowPrompt = createUndressWorkflowPrompt(uploadedImageName)

    // 第二步：提交工作流
    console.log('🚀 第二步：提交工作流到 /api/prompt')
    const promptId = await submitWorkflow(workflowPrompt)
    console.log('✅ 第二步完成，获得任务ID:', promptId)

    // 等待任务完成
    console.log('⏳ 等待ComfyUI处理任务...')
    const taskResult = await waitForTaskCompletion(promptId)
    console.log('✅ 任务处理完成')

    // 获取生成的图片
    console.log('📥 获取生成的图片...')
    const resultImage = await getGeneratedImage(taskResult)
    console.log('🎉 换衣处理完全成功！')

    // 获取节点49的原图用于对比
    let originalImage = null
    try {
      // 构建节点49原图的URL
      const params = new URLSearchParams({
        filename: uploadedImageName,
        type: 'input',
        subfolder: ''
      })
      const config = getComfyUIConfig()
      const apiBaseUrl = getApiBaseUrl()
      originalImage = `${apiBaseUrl}/view?${params.toString()}`
      console.log('📷 获取节点49原图URL:', originalImage)
    } catch (error) {
      console.warn('⚠️ 获取节点49原图失败，使用用户上传的图片:', error)
    }

    return {
      success: true,
      resultImage: resultImage,
      originalImage: originalImage, // 新增：节点49的原图
      promptId: promptId,
      uploadedImageName: uploadedImageName,
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

// 检查ComfyUI服务器状态
async function checkComfyUIServerStatus() {
  try {
    const apiBaseUrl = getApiBaseUrl()
    console.log('🔍 检查ComfyUI服务器状态:', apiBaseUrl)

    const response = await fetch(`${apiBaseUrl}/system_stats`, {
      method: 'GET',
      signal: AbortSignal.timeout(10000) // 10秒超时
    })

    if (response.ok) {
      const stats = await response.json()
      console.log('✅ ComfyUI服务器状态正常:', stats)
      return { status: 'ok', stats }
    } else {
      console.warn('⚠️ ComfyUI服务器响应异常:', response.status)
      return { status: 'error', code: response.status }
    }
  } catch (error) {
    console.error('❌ ComfyUI服务器连接失败:', error)
    return { status: 'error', error: error.message }
  }
}

// 换脸处理函数
async function processFaceSwapImage({ facePhotos, targetImage, onProgress }) {
  try {
    console.log('🚀 开始换脸处理')

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
      console.log('✅ 节点670设置第一张人脸照片:', uploadedFacePhotos[0])
    }
    if (workflow['662']) {
      workflow['662'].inputs.image = uploadedFacePhotos[1]
      console.log('✅ 节点662设置第二张人脸照片:', uploadedFacePhotos[1])
    }
    if (workflow['658']) {
      workflow['658'].inputs.image = uploadedFacePhotos[2]
      console.log('✅ 节点658设置第三张人脸照片:', uploadedFacePhotos[2])
    }
    if (workflow['655']) {
      workflow['655'].inputs.image = uploadedFacePhotos[3]
      console.log('✅ 节点655设置第四张人脸照片:', uploadedFacePhotos[3])
    }
    if (workflow['737']) {
      workflow['737'].inputs.image = targetUploadedFilename
      console.log('✅ 节点737设置目标图片:', targetUploadedFilename)
    }

    if (onProgress) onProgress('正在提交换脸任务...', 80)

    // 提交工作流
    const promptId = await submitWorkflow(workflow)

    if (onProgress) onProgress('正在处理换脸...', 85)

    // 等待任务完成 - 换脸需要更长时间，设置10分钟超时
    const maxWaitTime = 600000 // 10分钟
    console.log(`⏳ 开始等待换脸任务完成，任务ID: ${promptId}，最大等待时间: ${maxWaitTime/1000}秒`)

    const taskResult = await waitForTaskCompletion(promptId, maxWaitTime)
    console.log('✅ 换脸任务处理完成，结果:', taskResult)

    if (onProgress) onProgress('正在获取处理结果...', 95)

    // 获取结果图片
    // 根据最新工作流，最终结果应该在节点812的输出
    console.log('📥 开始获取换脸结果图片，查找节点812的输出...')
    console.log('🔍 任务结果结构:', JSON.stringify(taskResult, null, 2))

    const imageUrl = await getGeneratedImage(taskResult)
    console.log('🖼️ 成功获取换脸结果图片URL')

    if (onProgress) onProgress('换脸完成！', 100)

    console.log('✅ 换脸处理完成')
    return {
      success: true,
      imageUrl: imageUrl,
      targetImageUrl: targetImage, // 返回目标图像用于对比
      promptId: promptId,
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
  processUndressImage,
  processFaceSwapImage
}
