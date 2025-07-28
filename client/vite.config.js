import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  // 加载环境变量
  const env = loadEnv(mode, process.cwd(), '')

  // 从环境变量获取端口，如果没有则使用默认值
  const clientPort = parseInt(env.CLIENT_PORT) || 3001
  const serverPort = parseInt(env.SERVER_PORT) || 3007

  return {
    plugins: [vue()],

    // 开发服务器配置
    server: {
      port: clientPort,
      open: true,
      proxy: {
        '/api': {
          target: `http://localhost:${serverPort}`,
          changeOrigin: true,
          secure: false,
          configure: (proxy, options) => {
            proxy.on('error', (err, req, res) => {
              console.log('proxy error', err);
            });
            proxy.on('proxyReq', (proxyReq, req, res) => {
              console.log('Sending Request to the Target:', req.method, req.url);
            });
            proxy.on('proxyRes', (proxyRes, req, res) => {
              console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
            });
          }
        }
      }
    },

    // 构建配置
    build: {
      outDir: 'dist',
      sourcemap: false,
      assetsDir: 'assets'
    },

    // 基础路径配置 - 根据部署目标动态设置
    // 如果设置了GITHUB_PAGES_SUBDIRECTORY环境变量，使用子目录路径
    // 否则使用根路径（适用于自定义域名）
    base: process.env.GITHUB_PAGES_SUBDIRECTORY === 'true' ? '/undress/' : '/',

    // 环境变量配置
    define: {
      __VUE_PROD_DEVTOOLS__: false,
      __VUE_OPTIONS_API__: true
    }
  }
})


