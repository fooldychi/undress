/**
 * 样式生成工具
 * 用于动态生成CSS样式，支持主题切换和配置化
 */

/**
 * 生成图标背景样式
 * @param {Object} config 图标配置
 * @param {string} config.color 主色调
 * @param {number} config.opacity 透明度
 * @param {boolean} isDark 是否为深色主题
 * @returns {Object} CSS样式对象
 */
export function generateIconStyle(config, isDark = false) {
  const { color, opacity = 0.2 } = config
  const baseOpacity = isDark ? opacity + 0.1 : opacity
  const borderOpacity = isDark ? opacity + 0.2 : opacity + 0.1
  
  // 将十六进制颜色转换为RGB
  const rgb = hexToRgb(color)
  if (!rgb) {
    console.warn('Invalid color format:', color)
    return {}
  }
  
  return {
    background: `linear-gradient(135deg, rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${baseOpacity}), rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${baseOpacity - 0.1}))`,
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    border: `1px solid rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${borderOpacity})`
  }
}

/**
 * 生成标签样式
 * @param {string} type 标签类型
 * @param {Object} customColors 自定义颜色配置
 * @returns {Object} CSS样式对象
 */
export function generateTagStyle(type, customColors = {}) {
  const defaultColors = {
    primary: { r: 102, g: 126, b: 234 },
    success: { r: 16, g: 185, b: 129 },
    warning: { r: 245, g: 158, b: 11 },
    danger: { r: 239, g: 68, b: 68 },
    info: { r: 144, g: 147, b: 153 }
  }
  
  const colors = { ...defaultColors, ...customColors }
  const color = colors[type] || colors.primary
  
  return {
    background: `rgba(${color.r}, ${color.g}, ${color.b}, 0.15)`,
    borderColor: `rgba(${color.r}, ${color.g}, ${color.b}, 0.3)`,
    color: `rgba(${color.r}, ${color.g}, ${color.b}, 0.9)`
  }
}

/**
 * 将十六进制颜色转换为RGB
 * @param {string} hex 十六进制颜色值
 * @returns {Object|null} RGB对象或null
 */
function hexToRgb(hex) {
  // 移除#号
  hex = hex.replace('#', '')
  
  // 支持3位和6位十六进制
  if (hex.length === 3) {
    hex = hex.split('').map(char => char + char).join('')
  }
  
  if (hex.length !== 6) {
    return null
  }
  
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)
  
  return { r, g, b }
}

/**
 * 生成渐变背景
 * @param {string} startColor 起始颜色
 * @param {string} endColor 结束颜色
 * @param {number} angle 渐变角度
 * @returns {string} CSS渐变字符串
 */
export function generateGradient(startColor, endColor, angle = 135) {
  return `linear-gradient(${angle}deg, ${startColor}, ${endColor})`
}

/**
 * 生成阴影样式
 * @param {Object} config 阴影配置
 * @param {number} config.x X偏移
 * @param {number} config.y Y偏移
 * @param {number} config.blur 模糊半径
 * @param {string} config.color 阴影颜色
 * @param {number} config.opacity 透明度
 * @returns {string} CSS阴影字符串
 */
export function generateShadow(config) {
  const { x = 0, y = 8, blur = 24, color = '#000000', opacity = 0.15 } = config
  const rgb = hexToRgb(color)
  
  if (!rgb) {
    return `${x}px ${y}px ${blur}px rgba(0, 0, 0, ${opacity})`
  }
  
  return `${x}px ${y}px ${blur}px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`
}

/**
 * 检测是否为深色主题
 * @returns {boolean} 是否为深色主题
 */
export function isDarkTheme() {
  if (typeof window === 'undefined') return false
  
  // 检查CSS媒体查询
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return true
  }
  
  // 检查HTML元素的data-theme属性
  const htmlElement = document.documentElement
  const theme = htmlElement.getAttribute('data-theme')
  
  return theme === 'dark'
}

/**
 * 应用动态样式到元素
 * @param {HTMLElement} element DOM元素
 * @param {Object} styles 样式对象
 */
export function applyStyles(element, styles) {
  if (!element || !styles) return
  
  Object.keys(styles).forEach(property => {
    const value = styles[property]
    if (value !== undefined && value !== null) {
      element.style[property] = value
    }
  })
}

/**
 * 创建CSS规则字符串
 * @param {string} selector CSS选择器
 * @param {Object} styles 样式对象
 * @returns {string} CSS规则字符串
 */
export function createCSSRule(selector, styles) {
  const styleStrings = Object.keys(styles).map(property => {
    const cssProperty = property.replace(/([A-Z])/g, '-$1').toLowerCase()
    return `  ${cssProperty}: ${styles[property]};`
  })
  
  return `${selector} {\n${styleStrings.join('\n')}\n}`
}

/**
 * 动态插入CSS样式
 * @param {string} css CSS字符串
 * @param {string} id 样式标签ID
 */
export function injectCSS(css, id = 'dynamic-styles') {
  if (typeof document === 'undefined') return
  
  let styleElement = document.getElementById(id)
  
  if (!styleElement) {
    styleElement = document.createElement('style')
    styleElement.id = id
    document.head.appendChild(styleElement)
  }
  
  styleElement.textContent = css
}
