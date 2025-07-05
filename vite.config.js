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
          manualChunks: undefined,
          // 规范化文件名，避免特殊字符
          entryFileNames: (chunkInfo) => {
            const name = chunkInfo.name.replace(/[^a-zA-Z0-9]/g, '-');
            return `assets/${name}-[hash].js`;
          },
          chunkFileNames: (chunkInfo) => {
            const name = chunkInfo.name.replace(/[^a-zA-Z0-9]/g, '-');
            return `assets/${name}-[hash].js`;
          },
          assetFileNames: (assetInfo) => {
            const name = assetInfo.name.replace(/[^a-zA-Z0-9.]/g, '-');
            return `assets/${name}-[hash].[ext]`;
          }
        }
      }
    },

    // 基础路径配置 - 根据环境变量决定基础路径
    // CUSTOM_DOMAIN=true 时使用 '/' (自定义域名)
    // 默认使用 '/undress/' (GitHub Pages默认域名)
    base: mode === 'production' ? (process.env.CUSTOM_DOMAIN === 'true' ? '/' : '/undress/') : '/',

    // 环境变量配置
    define: {
      __VUE_PROD_DEVTOOLS__: false,
      __VUE_OPTIONS_API__: true
    }
  }

  return config
})


