/**
 * 图片处理功能配置文件
 * 用于管理各种图片处理功能的界面配置和描述信息
 * 实现组件描述与模板的分离，便于后续自定义化
 */

// 基础上传配置模板
const createUploadConfig = (overrides = {}) => ({
  maxSize: 10 * 1024 * 1024, // 10MB
  accept: 'image/*',
  tips: [
    '支持 JPG、PNG 格式',
    '建议尺寸 512x512 以上',
    '图片清晰度影响处理效果'
  ],
  ...overrides
})

// 图片处理功能配置
export const IMAGE_PROCESSING_CONFIGS = {
  // 一键褪衣配置
  'clothes-swap': {
    id: 'clothes-swap',
    title: '一键褪衣',
    description: '上传人物照片，AI智能移除服装',
    processButtonText: '开始处理',
    processingTitle: '正在处理图片...',
    processingDescription: '请耐心等待，处理时间可能需要几分钟',

    // 上传面板配置
    uploadPanels: [
      {
        id: 'main-image',
        title: '人物照片',
        icon: 'photograph',
        iconColor: 'var(--van-primary-color)',
        uploadType: 'single',
        minCount: 1,
        maxCount: 1,
        uploadText: '选择人物照片',
        showCount: false,
        ...createUploadConfig({
          tips: [
            '支持 JPG、PNG 格式',
            '建议尺寸 512x512 以上',
            '人脸清晰、正面效果更佳',
            '单张照片处理'
          ]
        })
      }
    ],



    // 结果配置
    resultConfig: {
      showComparison: true,
      comparisonType: 'slider', // 'slider' | 'side-by-side'
      downloadEnabled: true,
      resetEnabled: true
    }
  },

  // 极速换脸配置
  'face-swap': {
    id: 'face-swap',
    title: '极速换脸',
    description: '上传人脸照片和目标图片，AI智能换脸',
    processButtonText: '开始换脸',
    processingTitle: '正在处理换脸...',
    processingDescription: '请耐心等待，处理时间可能需要几分钟',

    uploadPanels: [
      {
        id: 'face-photos',
        title: '人脸照片',
        icon: 'friends-o',
        iconColor: 'var(--van-warning-color)',
        uploadType: 'multi',
        minCount: 1,
        maxCount: 4,
        uploadText: '添加人脸',
        showCount: true,
        ...createUploadConfig({
          tips: [
            '支持 JPG、PNG 格式',
            '建议尺寸 512x512 以上',
            '人脸清晰、正面效果更佳',
            '可一次选择多张照片'
          ]
        })
      },
      {
        id: 'target-image',
        title: '目标图片',
        icon: 'photo-o',
        iconColor: 'var(--van-success-color)',
        uploadType: 'single',
        minCount: 1,
        maxCount: 1,
        uploadText: '选择目标图片',
        showCount: false,
        ...createUploadConfig({
          tips: [
            '支持 JPG、PNG 格式',
            '建议尺寸 512x512 以上',
            '图片清晰度影响换脸效果'
          ]
        })
      }
    ],



    resultConfig: {
      showComparison: true,
      comparisonType: 'slider',
      downloadEnabled: true,
      resetEnabled: true
    }
  },

  // 文生图配置
  'text-to-image': {
    id: 'text-to-image',
    title: '文生图',
    description: '输入文字描述，AI为您生成精美图像',
    processButtonText: '生成图像',
    processingTitle: '正在生成图像...',
    processingDescription: '请耐心等待，AI正在为您创作',

    // 文生图使用文本输入而不是图片上传
    inputPanels: [
      {
        id: 'text-prompt',
        type: 'text',
        title: '描述您想要的图像',
        icon: 'edit',
        iconColor: 'var(--van-success-color)',
        placeholder: '请详细描述您想要生成的图像，例如：一只橙色的猫坐在窗台上，窗外是蓝天白云，阳光透过窗户洒在猫咪身上，画面温馨美好，高清摄影风格',
        rows: 6,
        maxLength: 500,
        required: true,
        tips: [
          '描述越详细，生成效果越好',
          '可以包含风格、色彩、构图等要素',
          '支持中英文描述'
        ]
      }
    ],



    resultConfig: {
      showComparison: false,
      comparisonType: 'none',
      downloadEnabled: true,
      resetEnabled: true
    }
  }
}

/**
 * 获取指定功能的配置
 * @param {string} functionId 功能ID
 * @returns {Object|null} 功能配置对象
 */
export function getImageProcessingConfig(functionId) {
  return IMAGE_PROCESSING_CONFIGS[functionId] || null
}

/**
 * 获取所有图片处理功能配置
 * @returns {Object} 所有功能配置
 */
export function getAllImageProcessingConfigs() {
  return IMAGE_PROCESSING_CONFIGS
}

/**
 * 更新功能配置
 * @param {string} functionId 功能ID
 * @param {Object} updates 更新的配置
 * @returns {boolean} 更新是否成功
 */
export function updateImageProcessingConfig(functionId, updates) {
  if (!IMAGE_PROCESSING_CONFIGS[functionId]) {
    console.warn(`功能配置不存在: ${functionId}`)
    return false
  }

  // 深度合并配置
  IMAGE_PROCESSING_CONFIGS[functionId] = {
    ...IMAGE_PROCESSING_CONFIGS[functionId],
    ...updates
  }

  return true
}

/**
 * 验证上传配置
 * @param {Object} config 上传配置
 * @returns {boolean} 配置是否有效
 */
export function validateUploadConfig(config) {
  const requiredFields = ['id', 'title', 'uploadType', 'minCount', 'maxCount']

  for (const field of requiredFields) {
    if (!(field in config)) {
      console.error(`上传配置缺少必需字段: ${field}`)
      return false
    }
  }

  if (config.uploadType !== 'single' && config.uploadType !== 'multi') {
    console.error(`无效的上传类型: ${config.uploadType}`)
    return false
  }

  if (config.minCount > config.maxCount) {
    console.error('最小数量不能大于最大数量')
    return false
  }

  return true
}

/**
 * 模拟从后台API获取功能配置
 * @param {string} functionId 功能ID
 * @returns {Promise<Object>} 功能配置
 */
export async function fetchImageProcessingConfigFromAPI(functionId) {
  // 模拟API延迟
  await new Promise(resolve => setTimeout(resolve, 100))

  // 这里后续可以替换为真实的API调用
  // const response = await fetch(`/api/admin/image-processing-configs/${functionId}`)
  // return response.json()

  return getImageProcessingConfig(functionId)
}

/**
 * 创建自定义功能配置
 * @param {Object} baseConfig 基础配置
 * @returns {Object} 完整的功能配置
 */
export function createCustomImageProcessingConfig(baseConfig) {
  const defaultConfig = {
    processButtonText: '开始处理',
    processingTitle: '正在处理...',
    processingDescription: '请耐心等待',
    uploadPanels: [],
    resultConfig: {
      showComparison: true,
      comparisonType: 'slider',
      downloadEnabled: true,
      resetEnabled: true
    }
  }

  return {
    ...defaultConfig,
    ...baseConfig
  }
}

// 导出配置类型定义（用于TypeScript支持）
export const CONFIG_TYPES = {
  UPLOAD_TYPE: {
    SINGLE: 'single',
    MULTI: 'multi'
  },
  COMPARISON_TYPE: {
    SLIDER: 'slider',
    SIDE_BY_SIDE: 'side-by-side',
    NONE: 'none'
  },
  INPUT_TYPE: {
    IMAGE: 'image',
    TEXT: 'text'
  }
}
