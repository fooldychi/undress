// UI组件统一导出
export { default as AppButton } from './AppButton.vue'
export { default as AppProgressBar } from './AppProgressBar.vue'
export { default as AppToast } from './AppToast.vue'
export { default as AppToastContainer } from './AppToastContainer.vue'
export { default as AppProcessingStatus } from './AppProcessingStatus.vue'

// 组合式函数导出
export { useToast } from '../../composables/useToast.js'

// 全局安装函数
export const installUIComponents = (app) => {
  // 可以在这里注册全局组件
  // app.component('AppButton', AppButton)
  // app.component('AppProgressBar', AppProgressBar)
  // 等等...
}
