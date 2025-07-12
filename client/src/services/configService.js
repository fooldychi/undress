// 配置服务 - 从服务端API获取配置数据
import { updateComfyUIConfig, getCurrentConfig } from './comfyui.js'
import { updateAPIConfig } from './api.js'

// 配置服务类
class ConfigService {
  constructor() {
    this.configCache = null
    this.lastFetchTime = 0
    this.cacheTimeout = 5 * 60 * 1000 // 5分钟缓存
  }

  /**
   * 从服务端获取公开配置
   */
  async fetchServerConfig() {
    try {
      console.log('🔄 从服务端获取配置...')

      const response = await fetch('/api/config', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()

      if (result.success && result.data) {
        console.log('✅ 服务端配置获取成功:', result.data)
        this.configCache = result.data
        this.lastFetchTime = Date.now()
        return result.data
      } else {
        throw new Error(result.message || '获取配置失败')
      }
    } catch (error) {
      console.error('❌ 获取服务端配置失败:', error)
      throw error
    }
  }

  /**
   * 获取配置（带缓存）
   */
  async getConfig(forceRefresh = false) {
    const now = Date.now()

    // 如果有缓存且未过期，直接返回缓存
    if (!forceRefresh && this.configCache && (now - this.lastFetchTime) < this.cacheTimeout) {
      console.log('📋 使用缓存的配置')
      return this.configCache
    }

    try {
      // 从服务端获取最新配置
      return await this.fetchServerConfig()
    } catch (error) {
      // 如果获取失败，返回缓存的配置（如果有）
      if (this.configCache) {
        console.warn('⚠️ 使用缓存配置作为备用')
        return this.configCache
      }
      throw error
    }
  }

  /**
   * 同步ComfyUI配置到本地
   */
  async syncComfyUIConfig() {
    try {
      const serverConfig = await this.getConfig()

      // 提取ComfyUI相关配置
      const comfyuiConfig = {
        COMFYUI_SERVER_URL: serverConfig['comfyui.server_url'],
        CLIENT_ID: serverConfig['comfyui.client_id'],
        TIMEOUT: serverConfig['comfyui.timeout'] || 300000
      }

      // 过滤掉空值
      const filteredConfig = Object.fromEntries(
        Object.entries(comfyuiConfig).filter(([key, value]) => value != null && value !== '')
      )

      if (Object.keys(filteredConfig).length > 0) {
        console.log('🔄 同步ComfyUI配置到本地:', filteredConfig)

        // 更新本地ComfyUI配置
        await updateComfyUIConfig(filteredConfig)

        // 同时更新API配置
        updateAPIConfig(filteredConfig)

        console.log('✅ ComfyUI配置同步完成')
        return filteredConfig
      } else {
        console.warn('⚠️ 服务端未提供有效的ComfyUI配置')
        return null
      }
    } catch (error) {
      console.error('❌ 同步ComfyUI配置失败:', error)
      throw error
    }
  }

  /**
   * 获取AI功能积分配置
   */
  async getAIPointsConfig() {
    try {
      const config = await this.getConfig()
      return {
        textToImage: config['ai.text_to_image_points'] || 20,
        faceSwap: config['ai.face_swap_points'] || 20,
        undress: config['ai.undress_points'] || 20
      }
    } catch (error) {
      console.error('❌ 获取AI积分配置失败:', error)
      // 返回默认值
      return {
        textToImage: 20,
        faceSwap: 20,
        undress: 20
      }
    }
  }

  /**
   * 获取前端配置
   */
  async getFrontendConfig() {
    try {
      const config = await this.getConfig()
      return {
        title: config['frontend.title'] || 'AI Magic - AI图像处理平台',
        apiBaseUrl: config['frontend.api_base_url'],
        version: config['frontend.version'] || '1.0.0'
      }
    } catch (error) {
      console.error('❌ 获取前端配置失败:', error)
      // 返回默认值
      return {
        title: 'AI Magic - AI图像处理平台',
        apiBaseUrl: '',
        version: '1.0.0'
      }
    }
  }

  /**
   * 清除配置缓存
   */
  clearCache() {
    this.configCache = null
    this.lastFetchTime = 0
    console.log('🗑️ 配置缓存已清除')
  }

  /**
   * 初始化配置服务
   */
  async initialize() {
    try {
      console.log('🚀 初始化配置服务...')

      // 获取服务端配置
      await this.getConfig()

      // 同步ComfyUI配置
      await this.syncComfyUIConfig()

      console.log('✅ 配置服务初始化完成')
    } catch (error) {
      console.error('❌ 配置服务初始化失败:', error)
      // 不抛出错误，允许应用继续运行
    }
  }
}

// 创建单例实例
const configService = new ConfigService()

export default configService
