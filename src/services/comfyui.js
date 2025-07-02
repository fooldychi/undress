// ComfyUI工作流服务
import undressWorkflow from '../workflows/undress.json'

// API配置 - 支持动态配置
const DEFAULT_CONFIG = {
  // 使用独立代理服务器避免CORS问题
  BASE_URL: 'http://localhost:3006/api',
  // 原始服务器URL（用于直接连接测试）
  ORIGINAL_BASE_URL: 'https://dzqgp58z0s-8188.cnb.run',
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

// 更新配置
function updateComfyUIConfig(newConfig) {
  const currentConfig = getComfyUIConfig()
  const updatedConfig = { ...currentConfig, ...newConfig }
  saveComfyUIConfig(updatedConfig)
  return updatedConfig
}

// 获取当前配置
function getCurrentConfig() {
  return getComfyUIConfig()
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
    console.log('🔄 第一步：上传图片到ComfyUI服务器')
    console.log('📡 API地址:', `${config.BASE_URL}/upload/image`)

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

          return fetch(`${config.BASE_URL}/upload/image`, {
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

          return fetch(`${config.BASE_URL}/upload/image`, {
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

    // 提供更详细的错误信息
    if (error.message.includes('CORS')) {
      throw new Error(`图片上传失败: CORS错误 - ComfyUI服务器可能没有设置正确的跨域头`)
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
    console.log('🔄 第二步：提交工作流到ComfyUI')
    console.log('📡 API地址:', `${config.BASE_URL}/prompt`)

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
    const promptUrl = `${config.BASE_URL}/prompt`
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
    const response = await fetch(`${config.BASE_URL}/history/${promptId}`)

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

    // 从任务结果中找到输出图片
    const outputs = taskResult.outputs
    let imageInfo = null

    // 优先查找节点710的输出图片（最终处理结果）
    if (outputs['710'] && outputs['710'].images && outputs['710'].images.length > 0) {
      imageInfo = outputs['710'].images[0]
      console.log('📷 找到节点710的处理结果图片:', imageInfo)
    } else {
      // 如果节点710没有输出，则查找其他节点的输出图片
      console.log('⚠️ 节点710无输出，查找其他节点...')
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
    const imageUrl = `${config.BASE_URL}/view?${params.toString()}`

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

    return {
      success: true,
      resultImage: resultImage,
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

// 导出所有公共函数
export {
  getCurrentConfig,
  updateComfyUIConfig,
  resetToDefaultConfig,
  generateClientId,
  processUndressImage
}
