import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

// 引入配置服务和负载均衡器
import configService from './services/configService.js'
import loadBalancer from './services/loadBalancer.js'
// 恢复使用直连模式
import { initializeComfyUIConnection } from './services/comfyui.js'
import { setupGlobalErrorHandler } from './services/globalErrorHandler.js'

// 开发环境下引入测试工具
if (import.meta.env.DEV) {
  import('./utils/testPointsConsumption.js')
  import('./utils/testSimpleLoadBalancer.js')
}

// 引入Vant UI
import Vant, { Toast } from 'vant'
import 'vant/lib/index.css'

// 引入自定义样式（包含暗黑主题）
import './style.css'
import './styles/vant-theme.css'

console.log('🚀 开始初始化Vue应用...');

// 处理GitHub Pages SPA路由重定向
if (window.location.search.includes('redirect=')) {
  const redirectPath = new URLSearchParams(window.location.search).get('redirect')
  if (redirectPath) {
    window.history.replaceState({}, '', redirectPath)
  }
}

// 设置全局错误处理器
setupGlobalErrorHandler()

import logger from './utils/logger.js'

// 确保DOM加载完成
async function initApp() {
  try {
    logger.info('🚀 正在初始化应用...')

    // 初始化配置服务
    try {
      await configService.initialize()
      logger.info('✅ 配置服务初始化完成')
    } catch (error) {
      logger.warn('⚠️ 配置服务初始化失败，使用默认配置')
      // 使用默认配置
    }

    // 初始化负载均衡器
    await loadBalancer.initialize()

    // 初始化服务器连接测试（静默模式）
    try {
      await loadBalancer.initializeServerConnection()
      await loadBalancer.showLoadBalancingStatus()
      logger.info('✅ 服务器连接测试完成')
    } catch (error) {
      logger.warn('⚠️ 服务器连接测试失败，将在需要时重试')
    }

    // 🔧 恢复直连模式：初始化ComfyUI直连
    try {
      logger.info('🔌 正在初始化ComfyUI直连...')
      await initializeComfyUIConnection()
      logger.info('✅ ComfyUI直连初始化完成')
    } catch (error) {
      logger.warn('⚠️ ComfyUI直连初始化失败，将在需要时重试:', error.message)
    }

    const app = createApp(App)
    app.use(router)
    app.use(Vant)

    // 全局错误处理
    app.config.errorHandler = (err, vm, info) => {
      logger.error('Vue应用错误:', err, info)
      Toast.fail('应用发生错误，请刷新页面重试')
    }

    // 全局属性
    app.config.globalProperties.$toast = Toast

    // 挂载应用
    app.mount('#app')
    console.log('✅ Vue应用启动成功!')

    // 测试函数已在各自的模块中自动暴露到全局

  } catch (error) {
    console.error('❌ Vue应用启动失败:', error)

    // 显示启动失败页面
    document.body.innerHTML = `
      <div class="error-page">
        <div class="error-content">
          <h1 class="error-title">应用启动失败</h1>
          <p class="error-message">抱歉，应用无法正常启动。请尝试刷新页面或联系技术支持。</p>
          <div class="error-actions">
            <button class="error-button" onclick="window.location.reload()">刷新页面</button>
            <a class="error-button secondary" href="/">返回首页</a>
          </div>
          <details style="margin-top: 20px; text-align: left;">
            <summary style="cursor: pointer;">技术详情</summary>
            <pre style="margin-top: 10px; padding: 10px; background: rgba(0,0,0,0.2); border-radius: 4px; font-size: 12px; overflow: auto;">${error.stack || error.message}</pre>
          </details>
        </div>
      </div>
    `
  }
}

// 启动应用
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp)
} else {
  initApp()
}
