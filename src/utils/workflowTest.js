// 工作流测试工具
import { processUndressImage, getCurrentConfig } from '../services/comfyui.js'

// 创建测试用的base64图片数据
function createTestImage() {
  // 这是一个1x1像素的透明PNG图片的base64数据
  return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
}

// 测试ComfyUI连接
export async function testComfyUIConnection() {
  try {
    const config = getCurrentConfig()
    console.log('测试ComfyUI连接...', config.BASE_URL)

    const response = await fetch(`${config.BASE_URL}/api/system_stats`)

    if (response.ok) {
      const stats = await response.json()
      console.log('ComfyUI连接成功:', stats)
      return { success: true, stats }
    } else {
      throw new Error(`连接失败: ${response.status}`)
    }
  } catch (error) {
    console.error('ComfyUI连接失败:', error)
    return { success: false, error: error.message }
  }
}

// 测试图片上传
export async function testImageUpload() {
  try {
    const config = getCurrentConfig()
    console.log('测试图片上传...', config.BASE_URL)

    const testImage = createTestImage()
    const formData = new FormData()

    // 将base64转换为blob
    const base64Data = testImage.split(',')[1]
    const byteCharacters = atob(base64Data)
    const byteNumbers = new Array(byteCharacters.length)
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    }
    const byteArray = new Uint8Array(byteNumbers)
    const blob = new Blob([byteArray], { type: 'image/png' })

    formData.append('image', blob, 'test.png')
    formData.append('type', 'input')
    formData.append('subfolder', '')

    const response = await fetch(`${config.BASE_URL}/upload/image`, {
      method: 'POST',
      body: formData
    })

    if (response.ok) {
      const result = await response.json()
      console.log('图片上传成功:', result)
      return { success: true, result }
    } else {
      throw new Error(`上传失败: ${response.status}`)
    }
  } catch (error) {
    console.error('图片上传失败:', error)
    return { success: false, error: error.message }
  }
}

// 测试工作流提交
export async function testWorkflowSubmission() {
  try {
    console.log('测试工作流提交...')

    // 使用正确的参数格式测试
    const config = getCurrentConfig()
    const requestBody = {
      client_id: config.CLIENT_ID,
      prompt: {
        "1": {
          "inputs": {
            "text": "test prompt"
          },
          "class_type": "CLIPTextEncode"
        }
      }
    }

    console.log('发送请求体:', JSON.stringify(requestBody, null, 2))

    const response = await fetch(`${config.BASE_URL}/api/prompt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })

    console.log('响应状态:', response.status)

    if (response.ok) {
      const result = await response.json()
      console.log('工作流提交成功:', result)
      return { success: true, result }
    } else {
      const errorText = await response.text()
      console.error('提交失败响应:', errorText)
      throw new Error(`提交失败: ${response.status} - ${errorText}`)
    }
  } catch (error) {
    console.error('工作流提交失败:', error)
    return { success: false, error: error.message }
  }
}

// 完整的换衣工作流测试
export async function testFullUndressWorkflow() {
  try {
    console.log('测试完整换衣工作流...')

    const testImage = createTestImage()
    const result = await processUndressImage(testImage)

    console.log('换衣工作流测试结果:', result)
    return result
  } catch (error) {
    console.error('换衣工作流测试失败:', error)
    return { success: false, error: error.message }
  }
}

// 运行所有测试
export async function runAllTests() {
  console.log('开始运行所有测试...')

  const results = {
    connection: await testComfyUIConnection(),
    upload: await testImageUpload(),
    workflow: await testWorkflowSubmission(),
    fullWorkflow: await testFullUndressWorkflow()
  }

  console.log('所有测试完成:', results)
  return results
}

// 在开发环境中自动运行测试
if (import.meta.env.DEV) {
  // 延迟执行，避免在模块加载时立即运行
  setTimeout(() => {
    if (window.location.search.includes('test=true')) {
      console.log('检测到测试参数，运行工作流测试...')
      runAllTests()
    }
  }, 1000)
}
