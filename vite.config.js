import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  return {
    plugins: [vue()],

    // 开发服务器配置
    server: {
      port: 3001,
      open: true
    },

    // 构建配置
    build: {
      outDir: 'dist',
      sourcemap: false,
      assetsDir: 'assets'
    },

    // 基础路径配置 - 自定义域名使用根路径
    base: '/',

    // 环境变量配置
    define: {
      __VUE_PROD_DEVTOOLS__: false,
      __VUE_OPTIONS_API__: true
    }
  }
})


