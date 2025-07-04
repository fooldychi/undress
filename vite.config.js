import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  const config = {
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
      // 确保资源路径正确
      assetsDir: 'assets',
      // 确保模块预加载
      rollupOptions: {
        output: {
          manualChunks: undefined
        }
      }
    },

    // 基础路径配置 - 使用自定义域名时基础路径为 '/'
    base: mode === 'production' ? '/' : '/',

    // 环境变量配置
    define: {
      __VUE_PROD_DEVTOOLS__: false,
      __VUE_OPTIONS_API__: true
    }
  }

  return config
})


