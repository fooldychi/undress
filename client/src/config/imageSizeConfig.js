/**
 * 图片组件统一尺寸配置
 * 确保上传、展示、对比组件的视觉一致性
 */

// 基准尺寸配置
export const IMAGE_SIZE_CONFIG = {
  // 基准比例 (宽:高)
  ASPECT_RATIO: 3 / 4, // 0.75
  
  // 最大高度 (px)
  MAX_HEIGHT: 300,
  
  // 计算得出的宽度 (px)
  get MAX_WIDTH() {
    return this.MAX_HEIGHT * this.ASPECT_RATIO // 225px
  },
  
  // CSS aspect-ratio 值
  get CSS_ASPECT_RATIO() {
    return `${3} / ${4}`
  },
  
  // 容器样式对象
  get CONTAINER_STYLE() {
    return {
      aspectRatio: this.CSS_ASPECT_RATIO,
      maxHeight: `${this.MAX_HEIGHT}px`,
      maxWidth: `${this.MAX_WIDTH}px`
    }
  },
  
  // 响应式断点
  BREAKPOINTS: {
    mobile: 768,
    tablet: 1024
  },
  
  // 移动端调整
  MOBILE: {
    get MAX_HEIGHT() {
      return IMAGE_SIZE_CONFIG.MAX_HEIGHT * 0.8 // 240px
    },
    get MAX_WIDTH() {
      return this.MAX_HEIGHT * IMAGE_SIZE_CONFIG.ASPECT_RATIO // 180px
    },
    get CONTAINER_STYLE() {
      return {
        aspectRatio: IMAGE_SIZE_CONFIG.CSS_ASPECT_RATIO,
        maxHeight: `${this.MAX_HEIGHT}px`,
        maxWidth: `${this.MAX_WIDTH}px`
      }
    }
  }
}

// 组件特定配置
export const COMPONENT_CONFIGS = {
  // 上传组件配置
  UPLOAD: {
    // 固定3:4比例，居中显示
    containerStyle: IMAGE_SIZE_CONFIG.CONTAINER_STYLE,
    
    // 占位符样式
    placeholderStyle: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      padding: '16px'
    }
  },
  
  // 上传后展示配置
  PREVIEW: {
    // 同等高度，等比例展示，宽度不限制
    containerStyle: {
      maxHeight: `${IMAGE_SIZE_CONFIG.MAX_HEIGHT}px`,
      width: 'auto',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    },
    
    imageStyle: {
      maxHeight: `${IMAGE_SIZE_CONFIG.MAX_HEIGHT}px`,
      width: 'auto',
      objectFit: 'contain'
    }
  },
  
  // 对比组件配置
  COMPARISON: {
    // 与上传展示相同大小
    containerStyle: {
      maxHeight: `${IMAGE_SIZE_CONFIG.MAX_HEIGHT}px`,
      aspectRatio: IMAGE_SIZE_CONFIG.CSS_ASPECT_RATIO,
      width: '100%',
      maxWidth: `${IMAGE_SIZE_CONFIG.MAX_WIDTH}px`,
      margin: '0 auto'
    }
  }
}

// 工具函数
export const ImageSizeUtils = {
  /**
   * 获取响应式容器样式
   * @param {string} type - 组件类型: 'upload' | 'preview' | 'comparison'
   * @param {boolean} isMobile - 是否为移动端
   * @returns {object} 样式对象
   */
  getContainerStyle(type, isMobile = false) {
    const baseConfig = COMPONENT_CONFIGS[type.toUpperCase()]
    if (!baseConfig) {
      console.warn(`Unknown component type: ${type}`)
      return {}
    }
    
    let style = { ...baseConfig.containerStyle }
    
    // 移动端调整
    if (isMobile) {
      if (type === 'upload' || type === 'comparison') {
        style.maxHeight = `${IMAGE_SIZE_CONFIG.MOBILE.MAX_HEIGHT}px`
        style.maxWidth = `${IMAGE_SIZE_CONFIG.MOBILE.MAX_WIDTH}px`
      } else if (type === 'preview') {
        style.maxHeight = `${IMAGE_SIZE_CONFIG.MOBILE.MAX_HEIGHT}px`
      }
    }
    
    return style
  },
  
  /**
   * 获取图片样式
   * @param {string} type - 组件类型
   * @param {boolean} isMobile - 是否为移动端
   * @returns {object} 样式对象
   */
  getImageStyle(type, isMobile = false) {
    const baseConfig = COMPONENT_CONFIGS[type.toUpperCase()]
    if (!baseConfig?.imageStyle) {
      return {
        width: '100%',
        height: '100%',
        objectFit: type === 'upload' ? 'cover' : 'contain'
      }
    }
    
    let style = { ...baseConfig.imageStyle }
    
    // 移动端调整
    if (isMobile && type === 'preview') {
      style.maxHeight = `${IMAGE_SIZE_CONFIG.MOBILE.MAX_HEIGHT}px`
    }
    
    return style
  },
  
  /**
   * 检测是否为移动端
   * @returns {boolean}
   */
  isMobile() {
    return window.innerWidth <= IMAGE_SIZE_CONFIG.BREAKPOINTS.mobile
  },
  
  /**
   * 计算图片在容器中的实际显示尺寸
   * @param {number} imageWidth - 图片原始宽度
   * @param {number} imageHeight - 图片原始高度
   * @param {string} type - 组件类型
   * @returns {object} { width, height }
   */
  calculateDisplaySize(imageWidth, imageHeight, type = 'preview') {
    const maxHeight = this.isMobile() 
      ? IMAGE_SIZE_CONFIG.MOBILE.MAX_HEIGHT 
      : IMAGE_SIZE_CONFIG.MAX_HEIGHT
    
    const aspectRatio = imageWidth / imageHeight
    
    if (type === 'upload' || type === 'comparison') {
      // 固定3:4比例
      return {
        width: maxHeight * IMAGE_SIZE_CONFIG.ASPECT_RATIO,
        height: maxHeight
      }
    } else {
      // 等比例缩放
      if (imageHeight > maxHeight) {
        return {
          width: maxHeight * aspectRatio,
          height: maxHeight
        }
      }
      return {
        width: imageWidth,
        height: imageHeight
      }
    }
  }
}

export default IMAGE_SIZE_CONFIG
