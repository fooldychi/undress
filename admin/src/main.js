import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

// Element Plus
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'

// 自定义样式
import './styles/index.scss'

// 工具库
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import relativeTime from 'dayjs/plugin/relativeTime'

// 配置dayjs
dayjs.locale('zh-cn')
dayjs.extend(relativeTime)

console.log('🚀 开始初始化管理系统...')

const app = createApp(App)

// 注册Element Plus图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

// 全局属性
app.config.globalProperties.$dayjs = dayjs

// 使用插件
app.use(ElementPlus)
app.use(router)

// 全局错误处理
app.config.errorHandler = (err, vm, info) => {
  console.error('Vue应用错误:', err, info)
  
  // 显示错误提示
  if (window.ElMessage) {
    window.ElMessage.error('应用发生错误，请刷新页面重试')
  }
}

// 挂载应用
app.mount('#app')

console.log('✅ 管理系统启动成功!')
