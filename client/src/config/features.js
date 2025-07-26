import { SvgIcon } from '../components/icons'

/**
 * 功能配置文件
 * 用于管理首页功能卡片的显示和配置
 * 后续可以改为从后台API获取
 */

// 功能配置数据结构
export const FEATURE_CONFIGS = [
  {
    id: 'clothes-swap',
    title: '一键褪衣',
    description: '智能识别人物轮廓，快速移除照片中的服装，体验前沿AI技术',
    route: '/clothes-swap',
    icon: {
      type: 'svg', // 'svg' | 'vant' | 'custom'
      name: 'undress-woman',
      size: 28,
      color: '#667eea'
    },
    iconClass: 'undress-icon',
    tags: [
      { text: 'AI识别', type: 'primary' },
      { text: '快速处理', type: 'success' }
    ],
    requireLogin: true,
    enabled: true,
    order: 1,
    // 后台管理相关字段
    category: 'image-processing',
    pointsCost: 20,
    description_admin: '一键褪衣功能管理'
  },
  {
    id: 'face-swap',
    title: '极速换脸',
    description: '精准面部识别技术，实现自然的人脸替换效果，创造有趣内容',
    route: '/face-swap',
    icon: {
      type: 'svg',
      name: 'face-swap',
      size: 28,
      color: '#f093fb'
    },
    iconClass: 'faceswap-icon',
    tags: [
      { text: '面部识别', type: 'warning' },
      { text: '自然效果', type: 'primary' }
    ],
    requireLogin: true,
    enabled: true,
    order: 2,
    category: 'image-processing',
    pointsCost: 20,
    description_admin: '极速换脸功能管理'
  },

]

// 图标样式配置
export const ICON_STYLES = {
  'undress-icon': {
    background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.2), rgba(102, 126, 234, 0.1))',
    border: '1px solid rgba(102, 126, 234, 0.3)',
    darkBackground: 'linear-gradient(135deg, rgba(102, 126, 234, 0.3), rgba(102, 126, 234, 0.1))',
    darkBorder: '1px solid rgba(102, 126, 234, 0.4)'
  },
  'faceswap-icon': {
    background: 'linear-gradient(135deg, rgba(240, 147, 251, 0.2), rgba(240, 147, 251, 0.1))',
    border: '1px solid rgba(240, 147, 251, 0.3)',
    darkBackground: 'linear-gradient(135deg, rgba(240, 147, 251, 0.3), rgba(240, 147, 251, 0.1))',
    darkBorder: '1px solid rgba(240, 147, 251, 0.4)'
  },

}

// 标签类型配置
export const TAG_TYPES = {
  primary: {
    background: 'rgba(102, 126, 234, 0.15)',
    borderColor: 'rgba(102, 126, 234, 0.3)',
    color: 'rgba(102, 126, 234, 0.9)'
  },
  success: {
    background: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
    color: 'rgba(16, 185, 129, 0.9)'
  },
  warning: {
    background: 'rgba(245, 158, 11, 0.15)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
    color: 'rgba(245, 158, 11, 0.9)'
  }
}

/**
 * 获取启用的功能配置
 * @returns {Array} 启用的功能配置列表
 */
export function getEnabledFeatures() {
  return FEATURE_CONFIGS
    .filter(feature => feature.enabled)
    .sort((a, b) => a.order - b.order)
}

/**
 * 根据ID获取功能配置
 * @param {string} id 功能ID
 * @returns {Object|null} 功能配置对象
 */
export function getFeatureById(id) {
  return FEATURE_CONFIGS.find(feature => feature.id === id) || null
}

/**
 * 获取功能的图标样式
 * @param {string} iconClass 图标类名
 * @returns {Object} 图标样式对象
 */
export function getIconStyle(iconClass) {
  return ICON_STYLES[iconClass] || {}
}

/**
 * 从后台API获取启用的功能配置
 * 根据工作流启用状态动态返回功能列表
 * @returns {Promise<Array>} 功能配置列表
 */
export async function fetchFeaturesFromAPI() {
  try {
    console.log('🔄 从API获取功能配置...');

    // 调用后台API获取启用的功能
    const response = await fetch('/api/workflow-config/features');

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.message || '获取功能配置失败');
    }

    // 修复API返回的图标配置
    const fixedFeatures = result.data.map(feature => {
      const fixedFeature = { ...feature };

      // 如果图标配置仍然是旧格式，转换为新格式
      if (fixedFeature.icon && fixedFeature.icon.type === 'custom') {
        if (fixedFeature.icon.component === 'UndressWomanIcon') {
          fixedFeature.icon = {
            type: 'svg',
            name: 'undress-woman',
            size: fixedFeature.icon.size || 28,
            color: fixedFeature.icon.color || '#667eea'
          };
        } else if (fixedFeature.icon.component === 'FaceSwapIcon') {
          fixedFeature.icon = {
            type: 'svg',
            name: 'face-swap',
            size: fixedFeature.icon.size || 28,
            color: fixedFeature.icon.color || '#f093fb'
          };
        }
      }

      return fixedFeature;
    });

    console.log(`✅ 获取到 ${fixedFeatures.length} 个启用的功能`);
    return fixedFeatures;

  } catch (error) {
    console.warn('⚠️ 从API获取功能配置失败，使用默认配置:', error.message);

    // 降级到静态配置
    return getEnabledFeatures();
  }
}

/**
 * 更新功能配置
 * 后续用于后台管理功能
 * @param {string} id 功能ID
 * @param {Object} updates 更新的配置
 * @returns {Promise<boolean>} 更新是否成功
 */
export async function updateFeatureConfig(id, updates) {
  // 模拟API调用
  console.log(`更新功能配置: ${id}`, updates)

  // 这里后续可以替换为真实的API调用
  // const response = await fetch(`/api/admin/features/${id}`, {
  //   method: 'PUT',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(updates)
  // })
  // return response.ok

  return true
}
