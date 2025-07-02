// 最简化的Vue应用，用于测试基础功能
console.log('🚀 开始加载简化版Vue应用...')

// 等待DOM加载完成
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp)
} else {
  initApp()
}

async function initApp() {
  try {
    console.log('📦 开始导入Vue...')
    
    // 动态导入Vue
    const { createApp, ref } = await import('vue')
    console.log('✅ Vue导入成功')
    
    // 创建简单的应用组件
    const SimpleApp = {
      setup() {
        console.log('🔧 设置Vue组件...')
        
        const message = ref('Vue应用正常运行!')
        const count = ref(0)
        const status = ref('应用已启动')
        
        const increment = () => {
          count.value++
          status.value = `按钮被点击了 ${count.value} 次`
        }
        
        const testNavigation = () => {
          status.value = '导航功能正常'
          alert('导航测试成功！')
        }
        
        const testAPI = async () => {
          status.value = '正在测试API...'
          try {
            const response = await fetch('https://w47dwct9xg-8188.cnb.run/system_stats')
            if (response.ok) {
              status.value = '✅ API连接成功'
              alert('ComfyUI API连接成功!')
            } else {
              status.value = '❌ API连接失败'
              alert('ComfyUI API连接失败')
            }
          } catch (error) {
            status.value = '❌ 网络错误'
            alert('网络连接错误: ' + error.message)
          }
        }
        
        return {
          message,
          count,
          status,
          increment,
          testNavigation,
          testAPI
        }
      },
      template: `
        <div style="
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
            max-width: 500px;
            border: 1px solid rgba(255, 255, 255, 0.2);
          ">
            <h1 style="margin: 0 0 20px 0; font-size: 2.5rem;">
              🎨 Imagic
            </h1>
            <p style="font-size: 1.2rem; margin: 0 0 30px 0;">
              {{ message }}
            </p>
            
            <div style="margin: 20px 0;">
              <p style="font-size: 1rem; opacity: 0.9;">
                状态: {{ status }}
              </p>
            </div>
            
            <div style="display: grid; gap: 12px; margin: 30px 0;">
              <button @click="increment" style="
                background: rgba(255, 255, 255, 0.2);
                color: white;
                border: 1px solid rgba(255, 255, 255, 0.3);
                padding: 12px 24px;
                border-radius: 8px;
                cursor: pointer;
                font-size: 1rem;
                transition: all 0.3s ease;
              " @mouseover="$event.target.style.background='rgba(255,255,255,0.3)'"
                 @mouseout="$event.target.style.background='rgba(255,255,255,0.2)'">
                🔢 计数测试 ({{ count }})
              </button>
              
              <button @click="testNavigation" style="
                background: rgba(255, 255, 255, 0.2);
                color: white;
                border: 1px solid rgba(255, 255, 255, 0.3);
                padding: 12px 24px;
                border-radius: 8px;
                cursor: pointer;
                font-size: 1rem;
                transition: all 0.3s ease;
              " @mouseover="$event.target.style.background='rgba(255,255,255,0.3)'"
                 @mouseout="$event.target.style.background='rgba(255,255,255,0.2)'">
                🧭 导航测试
              </button>
              
              <button @click="testAPI" style="
                background: rgba(255, 255, 255, 0.2);
                color: white;
                border: 1px solid rgba(255, 255, 255, 0.3);
                padding: 12px 24px;
                border-radius: 8px;
                cursor: pointer;
                font-size: 1rem;
                transition: all 0.3s ease;
              " @mouseover="$event.target.style.background='rgba(255,255,255,0.3)'"
                 @mouseout="$event.target.style.background='rgba(255,255,255,0.2)'">
                🔗 API测试
              </button>
            </div>
            
            <div style="margin-top: 30px; font-size: 0.9rem; opacity: 0.8;">
              <p>如果你看到这个页面，说明Vue应用运行正常</p>
              <p>可以点击上面的按钮测试各项功能</p>
            </div>
            
            <div style="margin-top: 20px;">
              <a href="/" style="
                color: rgba(255, 255, 255, 0.8);
                text-decoration: none;
                border-bottom: 1px solid rgba(255, 255, 255, 0.3);
              ">返回完整应用</a>
            </div>
          </div>
        </div>
      `
    }
    
    console.log('🔧 创建Vue应用实例...')
    const app = createApp(SimpleApp)
    
    // 添加错误处理
    app.config.errorHandler = (err, vm, info) => {
      console.error('Vue应用错误:', err, info)
      alert(`Vue错误: ${err.message}`)
    }
    
    console.log('🔧 挂载应用...')
    app.mount('#app')
    
    console.log('✅ 简化版Vue应用启动成功!')
    
  } catch (error) {
    console.error('❌ 简化版Vue应用启动失败:', error)
    
    // 显示错误信息
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
            <h1 style="margin: 0 0 20px 0; font-size: 2rem;">
              🚨 应用启动失败
            </h1>
            <p style="font-size: 1.1rem; margin: 0 0 20px 0;">
              <strong>错误:</strong> ${error.message}
            </p>
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
            <div style="margin-top: 20px;">
              <button onclick="location.reload()" style="
                background: #fff;
                color: #ee5a24;
                border: none;
                padding: 12px 24px;
                border-radius: 8px;
                cursor: pointer;
                font-weight: bold;
                font-size: 1rem;
              ">重新加载页面</button>
            </div>
          </div>
        </div>
      `
    }
  }
}
