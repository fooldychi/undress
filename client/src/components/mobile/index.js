// 移动端组件库
export { default as MobilePageContainer } from './MobilePageContainer.vue'
export { default as MobileCard } from './MobileCard.vue'
export { default as MobileActionButton } from './MobileActionButton.vue'
export { default as MobileStatusCard } from './MobileStatusCard.vue'

// 通用组件 (保留旧组件以兼容性)
export { default as VantImageUpload } from '../common/VantImageUpload.vue'
export { default as VantMultiImageUpload } from '../common/VantMultiImageUpload.vue'
export { default as VantImageComparison } from '../common/VantImageComparison.vue'
export { default as VantTextInput } from '../common/VantTextInput.vue'

// 新的统一组件系统
export { default as UnifiedImageUploadPanel } from '../common/UnifiedImageUploadPanel.vue'
export { default as SingleImageUpload } from '../common/SingleImageUpload.vue'
export { default as MultiImageUpload } from '../common/MultiImageUpload.vue'

// 模板组件
export { default as AIProcessingTemplate } from '../templates/AIProcessingTemplate.vue'
export { default as UnifiedImageProcessingTemplate } from '../templates/UnifiedImageProcessingTemplate.vue'

// 配置管理
export { getImageProcessingConfig, fetchImageProcessingConfigFromAPI } from '../../config/imageProcessingConfigs.js'
