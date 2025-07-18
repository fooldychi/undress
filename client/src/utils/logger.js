// 日志管理工具
class Logger {
  constructor() {
    // 从环境变量或localStorage获取日志级别
    this.level = this.getLogLevel()
    this.isDev = import.meta.env.DEV
    this.showCorsDetails = this.getConfig('SHOW_CORS_DETAILS', false)
    this.showHealthDetails = this.getConfig('SHOW_HEALTH_DETAILS', false)
  }

  getLogLevel() {
    // 优先级：localStorage > 环境变量 > 默认值
    const stored = localStorage.getItem('log_level')
    if (stored) return stored
    
    const env = import.meta.env.VITE_LOG_LEVEL
    if (env) return env
    
    return import.meta.env.DEV ? 'info' : 'error'
  }

  getConfig(key, defaultValue) {
    const stored = localStorage.getItem(key.toLowerCase())
    if (stored !== null) return stored === 'true'
    
    const env = import.meta.env[`VITE_${key}`]
    if (env !== undefined) return env === 'true'
    
    return defaultValue
  }

  shouldLog(level) {
    const levels = ['silent', 'error', 'warn', 'info', 'debug']
    const currentIndex = levels.indexOf(this.level)
    const targetIndex = levels.indexOf(level)
    
    return currentIndex !== -1 && targetIndex !== -1 && targetIndex <= currentIndex
  }

  // 简化的日志方法
  info(message, ...args) {
    if (this.shouldLog('info')) {
      console.log(message, ...args)
    }
  }

  warn(message, ...args) {
    if (this.shouldLog('warn')) {
      console.warn(message, ...args)
    }
  }

  error(message, ...args) {
    if (this.shouldLog('error')) {
      console.error(message, ...args)
    }
  }

  debug(message, ...args) {
    if (this.shouldLog('debug')) {
      console.log(`[DEBUG] ${message}`, ...args)
    }
  }

  // 特殊日志方法
  cors(message, details) {
    if (this.showCorsDetails) {
      this.warn(`CORS: ${message}`, details)
    }
    // 否则静默处理
  }

  health(message, details) {
    if (this.showHealthDetails) {
      this.info(`Health: ${message}`, details)
    } else {
      // 只显示关键健康状态
      if (message.includes('失败') || message.includes('错误')) {
        this.warn(`Health: ${message}`)
      }
    }
  }

  // 用户操作日志（总是显示）
  user(message, ...args) {
    console.log(`👤 ${message}`, ...args)
  }

  // 系统状态日志（简化显示）
  status(message, ...args) {
    if (this.shouldLog('info')) {
      console.log(`📊 ${message}`, ...args)
    }
  }

  // 网络请求日志（可控制）
  network(message, details) {
    if (this.shouldLog('debug')) {
      console.log(`🌐 ${message}`, details)
    }
  }

  // 设置日志级别
  setLevel(level) {
    this.level = level
    localStorage.setItem('log_level', level)
    console.log(`📝 日志级别已设置为: ${level}`)
  }

  // 切换CORS详情显示
  toggleCorsDetails() {
    this.showCorsDetails = !this.showCorsDetails
    localStorage.setItem('show_cors_details', this.showCorsDetails.toString())
    console.log(`CORS详情显示: ${this.showCorsDetails ? '开启' : '关闭'}`)
  }

  // 切换健康检查详情显示
  toggleHealthDetails() {
    this.showHealthDetails = !this.showHealthDetails
    localStorage.setItem('show_health_details', this.showHealthDetails.toString())
    console.log(`健康检查详情显示: ${this.showHealthDetails ? '开启' : '关闭'}`)
  }
}

// 创建全局日志实例
const logger = new Logger()

// 暴露到全局，方便调试
if (import.meta.env.DEV) {
  window.logger = logger
  window.setLogLevel = (level) => logger.setLevel(level)
  window.toggleCorsDetails = () => logger.toggleCorsDetails()
  window.toggleHealthDetails = () => logger.toggleHealthDetails()
}

export default logger
