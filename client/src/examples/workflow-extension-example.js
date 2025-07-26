// ========================================
// 🔧 工作流扩展示例 - 如何添加新的工作流
// ========================================

/**
 * 这个文件展示了如何使用新的通用工作流处理器架构
 * 来添加新的工作流，而无需编写重复的处理代码
 */

import { workflowConfigManager, processWorkflowUniversal } from '../services/comfyui.js'

// ========================================
// 示例1: 添加图像超分辨率工作流
// ========================================

/**
 * 注册图像超分辨率工作流配置
 */
async function registerUpscaleWorkflow() {
  // 假设我们有一个超分辨率工作流JSON文件
  const upscaleWorkflowTemplate = {
    "1": {
      "inputs": {
        "image": "placeholder.jpg"
      },
      "class_type": "LoadImage"
    },
    "2": {
      "inputs": {
        "upscale_method": "nearest-exact",
        "width": 1024,
        "height": 1024,
        "crop": "disabled",
        "image": ["1", 0]
      },
      "class_type": "ImageScale"
    },
    "3": {
      "inputs": {
        "filename_prefix": "upscaled",
        "images": ["2", 0]
      },
      "class_type": "SaveImage"
    }
  }

  // 注册工作流配置
  workflowConfigManager.registerWorkflow('upscale', {
    type: 'upscale',
    displayName: '图像超分辨率',
    pointsCost: 10, // 较低的积分消耗
    checkServer: true,
    randomizeSeed: false, // 超分辨率不需要随机种子
    workflowTemplate: upscaleWorkflowTemplate,
    inputSchema: {
      sourceImage: {
        type: 'image',
        required: true,
        description: '源图片'
      },
      targetWidth: {
        type: 'number',
        required: false,
        description: '目标宽度',
        default: 1024
      },
      targetHeight: {
        type: 'number',
        required: false,
        description: '目标高度',
        default: 1024
      }
    },
    inputMapping: {
      sourceImage: 'sourceImage'
    },
    outputMapping: {
      primary: 'primary',
      secondary: 'secondary'
    }
  })

  console.log('✅ 图像超分辨率工作流注册完成')
}

/**
 * 使用超分辨率工作流的便捷函数
 */
async function processUpscaleImage(sourceImage, options = {}, onProgress = null) {
  try {
    // 确保工作流已注册
    await registerUpscaleWorkflow()

    // 使用通用处理器
    const result = await processWorkflowUniversal('upscale', {
      sourceImage: sourceImage,
      targetWidth: options.width || 1024,
      targetHeight: options.height || 1024
    }, onProgress)

    // 返回结果
    return {
      success: result.success,
      upscaledImage: result.resultImage,
      originalImage: result.originalImage,
      promptId: result.promptId,
      pointsConsumed: result.pointsConsumed,
      pointsRemaining: result.pointsRemaining,
      message: result.message
    }

  } catch (error) {
    console.error('❌ 图像超分辨率处理失败:', error)
    return {
      success: false,
      error: error.message,
      message: '图像超分辨率处理失败'
    }
  }
}

// ========================================
// 示例2: 添加风格转换工作流
// ========================================

/**
 * 注册风格转换工作流配置
 */
async function registerStyleTransferWorkflow() {
  // 假设的风格转换工作流模板
  const styleTransferWorkflowTemplate = {
    "1": {
      "inputs": {
        "image": "content.jpg"
      },
      "class_type": "LoadImage"
    },
    "2": {
      "inputs": {
        "image": "style.jpg"
      },
      "class_type": "LoadImage"
    },
    "3": {
      "inputs": {
        "content_image": ["1", 0],
        "style_image": ["2", 0],
        "strength": 0.8
      },
      "class_type": "StyleTransfer"
    },
    "4": {
      "inputs": {
        "filename_prefix": "styled",
        "images": ["3", 0]
      },
      "class_type": "SaveImage"
    }
  }

  workflowConfigManager.registerWorkflow('style_transfer', {
    type: 'style_transfer',
    displayName: '风格转换',
    pointsCost: 15,
    checkServer: true,
    randomizeSeed: false,
    workflowTemplate: styleTransferWorkflowTemplate,
    inputSchema: {
      contentImage: {
        type: 'image',
        required: true,
        description: '内容图片'
      },
      styleImage: {
        type: 'image',
        required: true,
        description: '风格图片'
      },
      strength: {
        type: 'number',
        required: false,
        description: '风格强度',
        default: 0.8
      }
    },
    inputMapping: {
      contentImage: 'contentImage',
      styleImage: 'styleImage'
    },
    outputMapping: {
      primary: 'primary',
      secondary: 'secondary'
    }
  })

  console.log('✅ 风格转换工作流注册完成')
}

/**
 * 使用风格转换工作流的便捷函数
 */
async function processStyleTransfer(contentImage, styleImage, options = {}, onProgress = null) {
  try {
    await registerStyleTransferWorkflow()

    const result = await processWorkflowUniversal('style_transfer', {
      contentImage: contentImage,
      styleImage: styleImage,
      strength: options.strength || 0.8
    }, onProgress)

    return {
      success: result.success,
      styledImage: result.resultImage,
      contentImage: result.originalImage,
      promptId: result.promptId,
      pointsConsumed: result.pointsConsumed,
      pointsRemaining: result.pointsRemaining,
      message: result.message
    }

  } catch (error) {
    console.error('❌ 风格转换处理失败:', error)
    return {
      success: false,
      error: error.message,
      message: '风格转换处理失败'
    }
  }
}

// ========================================
// 示例3: 从数据库动态加载工作流
// ========================================

/**
 * 动态处理任意工作流的通用函数
 */
async function processAnyWorkflow(workflowType, inputs, onProgress = null) {
  try {
    console.log(`🔄 开始处理工作流: ${workflowType}`)

    // 通用处理器会自动尝试从数据库加载配置
    const result = await processWorkflowUniversal(workflowType, inputs, onProgress)

    console.log(`✅ 工作流 ${workflowType} 处理完成`)
    return result

  } catch (error) {
    console.error(`❌ 工作流 ${workflowType} 处理失败:`, error)
    return {
      success: false,
      error: error.message,
      message: `${workflowType}处理失败`
    }
  }
}

// ========================================
// 导出示例函数
// ========================================

export {
  // 超分辨率
  registerUpscaleWorkflow,
  processUpscaleImage,
  
  // 风格转换
  registerStyleTransferWorkflow,
  processStyleTransfer,
  
  // 通用处理
  processAnyWorkflow
}

// ========================================
// 使用示例
// ========================================

/*
// 使用超分辨率工作流
const upscaleResult = await processUpscaleImage(
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...', // base64图片
  { width: 2048, height: 2048 }, // 选项
  (status, progress) => console.log(`${status}: ${progress}%`) // 进度回调
)

// 使用风格转换工作流
const styleResult = await processStyleTransfer(
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...', // 内容图片
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...', // 风格图片
  { strength: 0.9 }, // 选项
  (status, progress) => console.log(`${status}: ${progress}%`) // 进度回调
)

// 使用数据库配置的工作流
const customResult = await processAnyWorkflow(
  'custom_workflow_type', // 数据库中配置的工作流类型
  { 
    inputImage: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...',
    parameter1: 'value1',
    parameter2: 42
  },
  (status, progress) => console.log(`${status}: ${progress}%`)
)
*/
