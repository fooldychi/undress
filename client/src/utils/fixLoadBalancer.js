// 负载均衡器修复工具
import configService from '../services/configService.js'
import loadBalancer from '../services/loadBalancer.js'

/**
 * 修复负载均衡器配置问题
 */
export async function fixLoadBalancerConfig() {
  console.log('🔧 开始修复负载均衡器配置...')
  
  try {
    // 1. 检查配置服务状态
    console.log('\n1️⃣ 检查配置服务状态...')
    let config = null
    try {
      config = await configService.getConfig()
      console.log('✅ 配置服务正常，获取到配置:', config)
    } catch (error) {
      console.warn('⚠️ 配置服务异常，使用本地配置:', error.message)
      
      // 使用本地配置
      const localConfig = localStorage.getItem('comfyui_config')
      if (localConfig) {
        const parsed = JSON.parse(localConfig)
        config = {
          'comfyui.server_url': parsed.COMFYUI_SERVER_URL,
          'comfyui.client_id': parsed.CLIENT_ID,
          'comfyui.timeout': parsed.TIMEOUT || 300000
        }
        console.log('✅ 使用本地配置:', config)
      } else {
        // 使用默认配置
        config = {
          'comfyui.server_url': 'https://your-comfyui-server.com',
          'comfyui.client_id': 'default-client-id',
          'comfyui.timeout': 300000
        }
        console.log('✅ 使用默认配置:', config)
      }
    }
    
    // 2. 检查负载均衡器状态
    console.log('\n2️⃣ 检查负载均衡器状态...')
    try {
      await loadBalancer.initialize()
      console.log('✅ 负载均衡器初始化成功')
    } catch (error) {
      console.warn('⚠️ 负载均衡器初始化失败:', error.message)
      
      // 手动设置服务器列表
      if (config['comfyui.server_url']) {
        loadBalancer.servers = [{
          url: config['comfyui.server_url'],
          type: 'primary',
          priority: 1
        }]
        console.log('✅ 手动设置服务器列表:', loadBalancer.servers)
      }
    }
    
    // 3. 测试服务器选择
    console.log('\n3️⃣ 测试服务器选择...')
    try {
      const selectedServer = await loadBalancer.getOptimalServer()
      console.log('✅ 服务器选择成功:', selectedServer)
      return selectedServer
    } catch (error) {
      console.warn('⚠️ 服务器选择失败，使用备用方案:', error.message)
      
      // 备用方案：直接返回配置的服务器
      const fallbackServer = config['comfyui.server_url'] || 'https://your-comfyui-server.com'
      console.log('✅ 使用备用服务器:', fallbackServer)
      return fallbackServer
    }
    
  } catch (error) {
    console.error('❌ 负载均衡器修复失败:', error)
    throw error
  }
}

/**
 * 检查并修复 ComfyUI 配置
 */
export async function checkComfyUIConfig() {
  console.log('🔍 检查 ComfyUI 配置...')
  
  try {
    // 检查本地存储配置
    const localConfig = localStorage.getItem('comfyui_config')
    if (localConfig) {
      const parsed = JSON.parse(localConfig)
      console.log('📋 本地配置:', parsed)
      
      if (parsed.COMFYUI_SERVER_URL && parsed.COMFYUI_SERVER_URL !== 'https://your-comfyui-server.com') {
        console.log('✅ 本地配置有效')
        return parsed
      }
    }
    
    // 如果本地配置无效，尝试从配置服务获取
    try {
      const serverConfig = await configService.getConfig()
      const comfyuiConfig = {
        COMFYUI_SERVER_URL: serverConfig['comfyui.server_url'],
        CLIENT_ID: serverConfig['comfyui.client_id'] || 'default-client-id',
        TIMEOUT: serverConfig['comfyui.timeout'] || 300000
      }
      
      // 保存到本地存储
      localStorage.setItem('comfyui_config', JSON.stringify(comfyuiConfig))
      console.log('✅ 从服务端更新配置:', comfyuiConfig)
      return comfyuiConfig
      
    } catch (error) {
      console.warn('⚠️ 无法从服务端获取配置:', error.message)
    }
    
    // 最后的备用配置
    const defaultConfig = {
      COMFYUI_SERVER_URL: 'https://your-comfyui-server.com',
      CLIENT_ID: 'default-client-id',
      TIMEOUT: 300000
    }
    
    localStorage.setItem('comfyui_config', JSON.stringify(defaultConfig))
    console.log('✅ 使用默认配置:', defaultConfig)
    return defaultConfig
    
  } catch (error) {
    console.error('❌ 检查 ComfyUI 配置失败:', error)
    throw error
  }
}

/**
 * 完整的修复流程
 */
export async function fullRepair() {
  console.log('🚀 开始完整修复流程...')
  
  try {
    // 1. 检查并修复 ComfyUI 配置
    const comfyuiConfig = await checkComfyUIConfig()
    
    // 2. 修复负载均衡器配置
    const selectedServer = await fixLoadBalancerConfig()
    
    // 3. 验证修复结果
    console.log('\n✅ 修复完成!')
    console.log('📋 最终配置:')
    console.log('   ComfyUI配置:', comfyuiConfig)
    console.log('   选择的服务器:', selectedServer)
    
    return {
      success: true,
      comfyuiConfig,
      selectedServer
    }
    
  } catch (error) {
    console.error('❌ 完整修复失败:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

// 在开发环境下自动暴露到全局
if (import.meta.env.DEV) {
  window.fixLoadBalancerConfig = fixLoadBalancerConfig
  window.checkComfyUIConfig = checkComfyUIConfig
  window.fullRepair = fullRepair
  
  console.log('🛠️ 负载均衡器修复工具已加载到全局:')
  console.log('  - window.fixLoadBalancerConfig() - 修复负载均衡器配置')
  console.log('  - window.checkComfyUIConfig() - 检查ComfyUI配置')
  console.log('  - window.fullRepair() - 完整修复流程')
}

export default {
  fixLoadBalancerConfig,
  checkComfyUIConfig,
  fullRepair
}
