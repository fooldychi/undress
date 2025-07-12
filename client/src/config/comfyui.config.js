// ComfyUI配置 - 直连模式
const config = {
  // ComfyUI服务器URL（支持环境变量配置）
  BASE_URL: import.meta.env.VITE_COMFYUI_SERVER_URL || 'https://hwf0p724ub-8188.cnb.run',
  CLIENT_ID: import.meta.env.VITE_COMFYUI_CLIENT_ID || 'abc1373d4ad648a3a81d0587fbe5534b',

  // 获取API URL（直连模式）
  getApiUrl() {
    return this.BASE_URL;
  }
};

export default config;