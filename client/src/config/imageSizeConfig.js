/**
 * 图片组件统一尺寸配置
 * 确保上传、展示、对比组件的视觉一致性
 */

// 基准尺寸配置
export const IMAGE_SIZE_CONFIG = {
  // 响应式高度配置
  MIN_HEIGHT: 300,
  MAX_HEIGHT: 500,

  // 响应式断点
  BREAKPOINTS: {
    mobile: 768,
    tablet: 1024
  },

  // 移动端配置
  MOBILE: {
    MIN_HEIGHT: 300,
    MAX_HEIGHT: 400,
  },

  // 获取响应式高度
  getResponsiveHeight(isMobile = false) {
    if (isMobile) {
      return {
        minHeight: this.MOBILE.MIN_HEIGHT,
        maxHeight: this.MOBILE.MAX_HEIGHT
      }
    }
    return {
      minHeight: this.MIN_HEIGHT,
      maxHeight: this.MAX_HEIGHT
    }
  }
}

// 组件特定配置
export const COMPONENT_CONFIGS = {
  // 上传组件配置
  UPLOAD: {
    // 固定高度，等比例缩放
    containerStyle: {
      minHeight: `${IMAGE_SIZE_CONFIG.MIN_HEIGHT}px`,
      maxHeight: `${IMAGE_SIZE_CONFIG.MAX_HEIGHT}px`,
      width: 'auto',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    },

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
    // 响应式高度，等比例展示，宽度自适应
    containerStyle: {
      minHeight: `${IMAGE_SIZE_CONFIG.MIN_HEIGHT}px`,
      maxHeight: `${IMAGE_SIZE_CONFIG.MAX_HEIGHT}px`,
      width: 'auto',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    },

    imageStyle: {
      minHeight: `${IMAGE_SIZE_CONFIG.MIN_HEIGHT}px`,
      maxHeight: `${IMAGE_SIZE_CONFIG.MAX_HEIGHT}px`,
      width: 'auto',
      objectFit: 'contain'
    }
  },

  // 对比组件配置
  COMPARISON: {
    // 响应式高度，等比例展示
    containerStyle: {
      minHeight: `${IMAGE_SIZE_CONFIG.MIN_HEIGHT}px`,
      maxHeight: `${IMAGE_SIZE_CONFIG.MAX_HEIGHT}px`,
      width: '100%',
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

    // 移动端调整高度
    if (isMobile) {
      const heights = IMAGE_SIZE_CONFIG.getResponsiveHeight(true)
      style.minHeight = `${heights.minHeight}px`
      style.maxHeight = `${heights.maxHeight}px`
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
      const heights = isMobile ? IMAGE_SIZE_CONFIG.getResponsiveHeight(true) : IMAGE_SIZE_CONFIG.getResponsiveHeight(false)
      return {
        minHeight: `${heights.minHeight}px`,
        maxHeight: `${heights.maxHeight}px`,
        width: 'auto',
        objectFit: 'contain'
      }
    }

    let style = { ...baseConfig.imageStyle }

    // 移动端调整
    if (isMobile) {
      const heights = IMAGE_SIZE_CONFIG.getResponsiveHeight(true)
      style.minHeight = `${heights.minHeight}px`
      style.maxHeight = `${heights.maxHeight}px`
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
