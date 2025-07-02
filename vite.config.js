import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],

  // 开发服务器配置
  server: {
    port: 3001,
    open: true
  },

  // 构建配置
  build: {
    outDir: 'dist',
    sourcemap: false
  },

  // 基础路径配置
  base: './'
})
