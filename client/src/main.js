import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

// 引入配置服务和负载均衡器
import configService from './services/configService.js'
import loadBalancer from './services/loadBalancer.js'
import { initializeWebSocket } from './services/comfyui.js'

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

// 全局错误处理
window.addEventListener('error', (event) => {
  console.error('全局错误:', event.error)
})

window.addEventListener('unhandledrejection', (event) => {
  console.error('未处理的Promise拒绝:', event.reason)
})

// 确保DOM加载完成
async function initApp() {
  try {
    console.log('🚀 初始化配置服务...')
    // 初始化配置服务
    try {
      await configService.initialize()
    } catch (error) {
      console.warn('⚠️ 配置服务初始化失败，使用默认配置:', error)
      // 使用默认配置
    }

    // 初始化负载均衡器
    await loadBalancer.initialize()

    // 初始化服务器连接测试，提供详细的服务器状态反馈
    console.log('🔍 开始服务器连接测试...')
    try {
      await loadBalancer.initializeServerConnection()
      
      // 显示负载均衡状态
      console.log('🎯 显示负载均衡状态...')
      await loadBalancer.showLoadBalancingStatus()
    } catch (error) {
      console.warn('⚠️ 服务器连接测试失败，将在需要时重试:', error.message)
    }

    // WebSocket 连接将在用户发起生图请求时自动初始化

    const app = createApp(App)
    app.use(router)
    app.use(Vant)

    // 全局错误处理
    app.config.errorHandler = (err, vm, info) => {
      console.error('Vue应用错误:', err, info)
      
      // 显示用户友好的错误提示
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
