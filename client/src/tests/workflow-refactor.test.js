// ========================================
// 🧪 工作流重构功能测试
// ========================================

/**
 * 这个文件包含了重构后工作流处理器的基本测试
 * 注意：这些是示例测试，实际运行需要ComfyUI服务器环境
 */

import { 
  WorkflowConfigManager, 
  UniversalWorkflowProcessor,
  processWorkflowUniversal,
  processUndressImage,
  processFaceSwapImage
} from '../services/comfyui.js'

// ========================================
// 测试数据
// ========================================

const mockBase64Image = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k='

const mockWorkflowTemplate = {
  "1": {
    "inputs": {
      "image": "test.jpg"
    },
    "class_type": "LoadImage"
  },
  "2": {
    "inputs": {
      "filename_prefix": "test",
      "images": ["1", 0]
    },
    "class_type": "SaveImage"
  }
}

// ========================================
// 工作流配置管理器测试
// ========================================

describe('WorkflowConfigManager', () => {
  let configManager

  beforeEach(() => {
    configManager = new WorkflowConfigManager()
  })

  test('应该能够注册新的工作流配置', () => {
    const testConfig = {
      type: 'test',
      displayName: '测试工作流',
      pointsCost: 10,
      checkServer: true,
      randomizeSeed: false,
      workflowTemplate: mockWorkflowTemplate,
      inputSchema: {
        testImage: {
          type: 'image',
          required: true,
          description: '测试图片'
        }
      },
      inputMapping: {
        testImage: 'testImage'
      }
    }

    configManager.registerWorkflow('test', testConfig)
    
    expect(configManager.hasWorkflow('test')).toBe(true)
    expect(configManager.getWorkflowConfig('test')).toEqual(testConfig)
  })

  test('应该能够获取所有可用的工作流类型', async () => {
    await configManager.initialize()
    
    const workflows = configManager.getAvailableWorkflows()
    expect(workflows).toContain('undress')
    expect(workflows).toContain('faceswap')
  })

  test('获取不存在的工作流配置应该抛出错误', () => {
    expect(() => {
      configManager.getWorkflowConfig('nonexistent')
    }).toThrow('未找到工作流配置: nonexistent')
  })
})

// ========================================
// 通用工作流处理器测试
// ========================================

describe('UniversalWorkflowProcessor', () => {
  let processor
  let mockConfig

  beforeEach(() => {
    mockConfig = {
      type: 'test',
      displayName: '测试工作流',
      pointsCost: 10,
      checkServer: false, // 跳过服务器检查以便测试
      randomizeSeed: false,
      workflowTemplate: mockWorkflowTemplate,
      inputSchema: {
        testImage: {
          type: 'image',
          required: true,
          description: '测试图片'
        }
      },
      inputMapping: {
        testImage: 'testImage'
      }
    }

    processor = new UniversalWorkflowProcessor(mockConfig)
  })

  test('应该能够验证必需的输入参数', async () => {
    // 缺少必需参数应该抛出错误
    try {
      await processor.processInputs({}, null)
      fail('应该抛出错误')
    } catch (error) {
      expect(error.message).toContain('缺少必需的输入参数')
    }
  })

  test('应该能够验证图片格式', async () => {
    // 无效的图片格式应该抛出错误
    try {
      await processor.processInputs({
        testImage: 'invalid-image-data'
      }, null)
      fail('应该抛出错误')
    } catch (error) {
      expect(error.message).toContain('无效的图片数据格式')
    }
  })

  test('应该能够推断节点输入字段', () => {
    const loadImageNode = { class_type: 'LoadImage' }
    const ksamplerNode = { class_type: 'KSampler' }
    const unknownNode = { class_type: 'UnknownNode' }

    expect(processor.getInputFieldForNode(loadImageNode)).toBe('image')
    expect(processor.getInputFieldForNode(ksamplerNode)).toBe('seed')
    expect(processor.getInputFieldForNode(unknownNode)).toBe('image') // 默认值
  })

  test('应该能够处理错误', () => {
    const error = new Error('测试错误')
    const result = processor.handleError(error)

    expect(result.success).toBe(false)
    expect(result.error).toBe('测试错误')
    expect(result.message).toBe('测试工作流处理失败')
  })
})

// ========================================
// 向后兼容性测试
// ========================================

describe('向后兼容性', () => {
  test('processUndressImage 应该保持原有的API签名', () => {
    // 检查函数是否存在且可调用
    expect(typeof processUndressImage).toBe('function')
    expect(processUndressImage.length).toBe(2) // base64Image, onProgress
  })

  test('processFaceSwapImage 应该保持原有的API签名', () => {
    // 检查函数是否存在且可调用
    expect(typeof processFaceSwapImage).toBe('function')
    expect(processFaceSwapImage.length).toBe(1) // { facePhotos, targetImage, onProgress }
  })

  test('返回格式应该保持兼容', async () => {
    // 注意：这个测试需要mock相关依赖才能真正运行
    // 这里只是展示预期的返回格式

    const expectedUndressResult = {
      success: true,
      resultImage: expect.any(String),
      originalImage: expect.any(String),
      promptId: expect.any(String),
      uploadedImageName: expect.any(String),
      pointsConsumed: expect.any(Number),
      pointsRemaining: expect.any(Number),
      message: expect.any(String)
    }

    const expectedFaceSwapResult = {
      success: true,
      imageUrl: expect.any(String),
      targetImageUrl: expect.any(String),
      promptId: expect.any(String),
      pointsConsumed: expect.any(Number),
      pointsRemaining: expect.any(Number),
      message: expect.any(String)
    }

    // 实际测试需要mock所有依赖
    // expect(await processUndressImage(mockBase64Image)).toMatchObject(expectedUndressResult)
  })
})

// ========================================
// 集成测试示例
// ========================================

describe('集成测试 (需要ComfyUI服务器)', () => {
  // 这些测试需要实际的ComfyUI服务器环境
  // 在CI/CD环境中可以跳过这些测试

  const skipIntegrationTests = !process.env.COMFYUI_SERVER_URL

  test.skipIf(skipIntegrationTests)('应该能够处理真实的褪衣请求', async () => {
    const mockProgressCallback = jest.fn()
    
    const result = await processUndressImage(mockBase64Image, mockProgressCallback)
    
    expect(result.success).toBe(true)
    expect(result.resultImage).toBeDefined()
    expect(mockProgressCallback).toHaveBeenCalled()
  }, 60000) // 60秒超时

  test.skipIf(skipIntegrationTests)('应该能够处理真实的换脸请求', async () => {
    const mockProgressCallback = jest.fn()
    
    const result = await processFaceSwapImage({
      facePhotos: [mockBase64Image, mockBase64Image, mockBase64Image, mockBase64Image],
      targetImage: mockBase64Image,
      onProgress: mockProgressCallback
    })
    
    expect(result.success).toBe(true)
    expect(result.imageUrl).toBeDefined()
    expect(mockProgressCallback).toHaveBeenCalled()
  }, 120000) // 120秒超时

  test.skipIf(skipIntegrationTests)('应该能够使用通用处理器', async () => {
    const mockProgressCallback = jest.fn()
    
    const result = await processWorkflowUniversal('undress', {
      mainImage: mockBase64Image
    }, mockProgressCallback)
    
    expect(result.success).toBe(true)
    expect(result.resultImage).toBeDefined()
    expect(mockProgressCallback).toHaveBeenCalled()
  }, 60000)
})

// ========================================
// 性能测试
// ========================================

describe('性能测试', () => {
  test('工作流配置管理器初始化应该很快', async () => {
    const startTime = Date.now()
    
    const configManager = new WorkflowConfigManager()
    await configManager.initialize()
    
    const endTime = Date.now()
    const duration = endTime - startTime
    
    expect(duration).toBeLessThan(1000) // 应该在1秒内完成
  })

  test('配置查找应该很快', async () => {
    const configManager = new WorkflowConfigManager()
    await configManager.initialize()
    
    const startTime = Date.now()
    
    for (let i = 0; i < 1000; i++) {
      configManager.getWorkflowConfig('undress')
    }
    
    const endTime = Date.now()
    const duration = endTime - startTime
    
    expect(duration).toBeLessThan(100) // 1000次查找应该在100ms内完成
  })
})

// ========================================
// 错误处理测试
// ========================================

describe('错误处理', () => {
  test('应该能够处理网络错误', async () => {
    // Mock网络错误
    const originalFetch = global.fetch
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'))
    
    try {
      const result = await processWorkflowUniversal('undress', {
        mainImage: mockBase64Image
      })
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('Network error')
    } finally {
      global.fetch = originalFetch
    }
  })

  test('应该能够处理无效的工作流类型', async () => {
    const result = await processWorkflowUniversal('invalid_workflow', {
      someInput: 'value'
    })
    
    expect(result.success).toBe(false)
    expect(result.error).toContain('未找到工作流配置')
  })
})
