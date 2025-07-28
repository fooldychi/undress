import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

// 部署配置
const deploymentConfig = {
  // 自定义域名部署 (undress.icomfy.co)
  custom: {
    base: '/',
    publicPath: '/'
  },
  // GitHub Pages 子目录部署 (fooldychi.github.io/undress/)
  github: {
    base: '/undress/',
    publicPath: '/undress/'
  }
}

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  // 加载环境变量
  const env = loadEnv(mode, process.cwd(), '')

  // 从环境变量获取端口，如果没有则使用默认值
  const clientPort = parseInt(env.CLIENT_PORT) || 3001
  const serverPort = parseInt(env.SERVER_PORT) || 3007

  // 确定部署类型
  const deployType = env.VITE_DEPLOY_TYPE || 'custom'
  const config = deploymentConfig[deployType] || deploymentConfig.custom

  console.log(`🚀 构建模式: ${mode}`)
  console.log(`📦 部署类型: ${deployType}`)
  console.log(`🌐 基础路径: ${config.base}`)

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

    // 动态基础路径配置
    base: config.base,

    // 环境变量配置
    define: {
      __VUE_PROD_DEVTOOLS__: false,
      __VUE_OPTIONS_API__: true,
      __DEPLOY_TYPE__: JSON.stringify(deployType),
      __PUBLIC_PATH__: JSON.stringify(config.publicPath)
    }
  }
})


