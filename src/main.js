import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

// 引入Vant UI
import Vant, { Toast } from 'vant'
import 'vant/lib/index.css'

// 引入自定义样式（包含暗黑主题）
import './style.css'
import './styles/vant-theme.css'

console.log('🚀 开始初始化Vue应用...')

// 处理GitHub Pages SPA路由重定向
(function() {
  const redirect = new URLSearchParams(window.location.search).get('redirect');
  if (redirect) {
    console.log('🔄 检测到路由重定向:', redirect);
    history.replaceState(null, null, redirect);
  }
})();

// 添加全局错误处理
window.addEventListener('error', (event) => {
  console.error('全局JavaScript错误:', event.error)
})

window.addEventListener('unhandledrejection', (event) => {
  console.error('未处理的Promise拒绝:', event.reason)
})

// 确保DOM加载完成
function initApp() {
  try {
    console.log('📦 创建Vue应用实例...')
    const app = createApp(App)

    console.log('🔧 配置路由...')
    app.use(router)

    console.log('🎨 配置Vant UI...')
    app.use(Vant)

    // 添加Vue错误处理
    app.config.errorHandler = (err, vm, info) => {
      console.error('Vue应用错误:', err, info)

      // 显示用户友好的错误信息
      const errorDiv = document.createElement('div')
      errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #ff4444;
        color: white;
        padding: 15px;
        border-radius: 8px;
        z-index: 10000;
        max-width: 300px;
        font-family: monospace;
        font-size: 12px;
      `
      errorDiv.innerHTML = `
        <strong>Vue错误:</strong><br>
        ${err.message}<br>
        <small>${info}</small>
        <button onclick="this.parentElement.remove()" style="
          background: rgba(255,255,255,0.2);
          border: none;
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          cursor: pointer;
          margin-top: 8px;
          display: block;
        ">关闭</button>
      `
      document.body.appendChild(errorDiv)

      // 5秒后自动移除
      setTimeout(() => {
        if (errorDiv.parentElement) {
          errorDiv.remove()
        }
      }, 5000)
    }

    console.log('🔧 挂载应用到#app...')
    app.mount('#app')

    console.log('✅ Vue应用启动成功!')

  } catch (error) {
    console.error('❌ Vue应用启动失败:', error)

    // 显示启动失败页面
    const appElement = document.getElementById('app')
    if (appElement) {
      appElement.innerHTML = `
        <div style="
          min-height: 100vh;
          background: linear-gradient(135deg, #ff6b6b, #ee5a24);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          color: white;
          text-align: center;
          padding: 20px;
        ">
          <div style="
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border-radius: 16px;
            padding: 40px;
            max-width: 600px;
            border: 1px solid rgba(255, 255, 255, 0.2);
          ">
            <h1 style="margin: 0 0 20px 0; font-size: 2rem;">🚨 应用启动失败</h1>
            <p style="font-size: 1.1rem; margin: 0 0 20px 0;">
              <strong>错误:</strong> ${error.message}
            </p>
            <div style="margin: 20px 0;">
              <button onclick="location.reload()" style="
                background: #fff;
                color: #ee5a24;
                border: none;
                padding: 12px 24px;
                border-radius: 8px;
                cursor: pointer;
                font-weight: bold;
                font-size: 1rem;
                margin-right: 10px;
              ">重新加载</button>
              <a href="/simple.html" style="
                background: rgba(255,255,255,0.2);
                color: white;
                text-decoration: none;
                padding: 12px 24px;
                border-radius: 8px;
                display: inline-block;
                font-weight: bold;
              ">简化版本</a>
            </div>
            <details style="margin: 20px 0; text-align: left;">
              <summary style="cursor: pointer; font-weight: bold; text-align: center;">查看详细错误信息</summary>
              <pre style="
                background: rgba(0,0,0,0.3);
                padding: 15px;
                border-radius: 8px;
                overflow: auto;
                margin: 10px 0;
                font-size: 12px;
                white-space: pre-wrap;
              ">${error.stack || '无堆栈信息'}</pre>
            </details>
          </div>
        </div>
      `
    }
  }
}

// 等待DOM加载完成
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp)
} else {
  initApp()
}
