// 自定义图标统一导出
export { default as UndressWomanIcon } from './UndressWomanIcon.vue'
export { default as FaceSwapIcon } from './FaceSwapIcon.vue'
export { default as SvgIcon } from './SvgIcon.vue'

// 图标配置映射
export const ICON_CONFIG = {
  'undress-woman': {
    component: 'UndressWomanIcon',
    description: '女性褪衣图标',
    category: 'custom'
  },
  'face-swap': {
    component: 'FaceSwapIcon',
    description: '换脸图标',
    category: 'custom'
  }
}

// 获取图标组件的辅助函数
export function getCustomIcon(name) {
  const config = ICON_CONFIG[name]
  if (!config) {
    console.warn(`Custom icon "${name}" not found`)
    return null
  }
  return config.component
}
