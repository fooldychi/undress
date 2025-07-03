// ComfyUI配置
const config = {
  // 环境变量配置，支持生产环境部署
  BASE_URL: import.meta.env.VITE_COMFYUI_SERVER_URL || 'https://dzqgp58z0s-8188.cnb.run',
  CLIENT_ID: import.meta.env.VITE_COMFYUI_CLIENT_ID || 'abc1373d4ad648a3a81d0587fbe5534b',
  USE_PROXY: import.meta.env.VITE_USE_PROXY === 'true',

  // 开发环境配置
  DEV_PROXY_URL: 'http://localhost:3008/api',

  // 获取实际使用的URL
  getApiUrl() {
    // 在开发环境且启用代理时使用代理
    if (import.meta.env.DEV && this.USE_PROXY) {
      return this.DEV_PROXY_URL;
    }
    // 生产环境或不使用代理时直接连接
    return this.BASE_URL;
  }
};

export default config;