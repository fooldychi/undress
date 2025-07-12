# 前端开发原则

## 概述

本文档定义了项目前端开发的核心原则和规范，确保代码质量、用户体验和团队协作的一致性。

## 1. 设计系统与风格统一

### 1.1 CSS变量系统
使用统一的CSS变量确保整个应用的视觉一致性：

```css
:root {
  /* 主色调 */
  --primary-color: #6366f1;
  --secondary-color: #8b5cf6;

  /* 背景色 */
  --bg-primary: #0f0f23;
  --bg-secondary: #1a1a2e;
  --bg-card: #16213e;

  /* 文字颜色 */
  --text-color: #e2e8f0;
  --text-light: #94a3b8;

  /* 边框和阴影 */
  --border-color: #334155;
  --border-light: #475569;
  --shadow-lg: 0 10px 25px rgba(0, 0, 0, 0.3);
  --shadow-xl: 0 20px 40px rgba(0, 0, 0, 0.4);
}
```

### 1.2 统一的卡片样式
所有功能卡片使用统一的 `feature-card` 样式：

```css
.feature-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 20px;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  position: relative;
}

.feature-content {
  padding: 32px;
  text-align: center;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
```

## 2. 图标使用规范

### 2.1 图标分类标准
严格按功能分类使用图标，确保语义一致性：

| 功能类别 | 图标名称 | 使用场景 | 对应内容 |
|----------|----------|----------|----------|
| **积分相关** | `diamond-o` | TopNavigation积分显示、积分卡片 | 我的积分、积分信息、积分状态 |
| **等级卡相关** | `credit-pay` | 等级卡列表、等级卡标题 | 我的等级卡、等级卡管理、卡片绑定 |
| **用户相关** | `user-o` | 用户头像、个人中心标题 | 用户信息、个人中心、用户管理 |
| **记录相关** | `records` | 积分记录、操作历史 | 最近记录、积分记录、操作历史 |

### 2.2 图标与内容映射规范
- **积分功能** → `diamond-o` + "我的积分"/"积分信息"
- **等级卡功能** → `credit-pay` + "我的等级卡"/"等级卡管理"
- **用户功能** → `user-o` + "用户信息"/"个人中心"
- **记录功能** → `records` + "最近记录"/"积分记录"

### 2.3 图标使用示例
```vue
<!-- 积分显示 -->
<van-icon name="diamond-o" size="24" color="var(--primary-color)" />

<!-- 等级卡 -->
<van-icon name="credit-pay" size="32" color="var(--primary-color)" />

<!-- 用户信息 -->
<van-icon name="user-o" size="48" color="var(--primary-color)" />
```

## 3. 组件化开发原则

### 3.1 组件设计原则
- **单一职责**：每个组件只负责一个明确的功能
- **可复用性**：组件应该在不同场景下可复用
- **统一接口**：相似功能的组件应有一致的API设计
- **响应式设计**：所有组件都应支持响应式布局

### 3.2 核心组件规范

#### TopNavigation 组件
- 固定在页面顶部
- 包含积分显示、用户登录状态
- 使用 `diamond-o` 图标显示积分
- 提供统一的登录/注册弹窗

#### 功能卡片组件
- 使用统一的 `feature-card` 样式
- 包含图标、标题、描述、操作按钮
- 支持悬停效果和点击交互
- 响应式布局适配

### 3.3 状态管理
- 使用 Vue 3 Composition API
- 响应式数据使用 `ref` 和 `reactive`
- 复杂状态逻辑封装为 composables
- 避免深层嵌套的状态结构

## 4. 用户体验设计

### 4.1 布局原则
- **整行布局**：重要信息卡片占据整行，确保信息完整展示
- **统一布局**：等级卡与最近记录使用相同的整行布局，不分列显示
- **信息层次**：按重要性排序，积分信息居中突出显示
- **视觉焦点**：使用颜色、大小、位置引导用户注意力
- **简洁性**：删除冗余元素，保持界面简洁

### 4.2 个人中心布局规范
- **等级卡布局**：使用整行布局，每张卡片占据完整宽度
- **记录布局**：与等级卡保持一致的整行布局风格
- **卡片间距**：统一的间距和圆角设计
- **响应式适配**：确保在不同屏幕尺寸下的一致性

### 4.3 交互设计
- **即时反馈**：所有用户操作都应有即时的视觉反馈
- **状态同步**：登录状态变化应立即同步到所有相关组件
- **错误处理**：友好的错误提示和恢复机制
- **加载状态**：长时间操作显示加载指示器

### 4.4 响应式设计
```css
/* 移动端适配 */
@media (max-width: 768px) {
  .feature-content {
    padding: 24px;
  }

  .feature-title {
    font-size: 1.3rem;
  }

  .points-grid {
    gap: 16px;
    padding: 16px;
  }
}
```

## 5. 代码质量标准

### 5.1 Vue 组件结构
```vue
<template>
  <!-- 模板内容 -->
</template>

<script setup>
// 导入
import { ref, computed, onMounted } from 'vue'

// Props 定义
const props = defineProps({
  // props 定义
})

// Emits 定义
const emit = defineEmits(['event-name'])

// 响应式数据
const data = ref(null)

// 计算属性
const computedValue = computed(() => {
  // 计算逻辑
})

// 方法
const handleAction = () => {
  // 方法实现
}

// 生命周期
onMounted(() => {
  // 初始化逻辑
})

// 暴露给父组件的方法
defineExpose({
  handleAction
})
</script>

<style scoped>
/* 组件样式 */
</style>
```

### 5.2 命名规范
- **组件名称**：使用 PascalCase，如 `TopNavigation`
- **文件名称**：与组件名称一致
- **CSS类名**：使用 kebab-case，如 `feature-card`
- **变量名称**：使用 camelCase，如 `userInfo`

### 5.3 注释规范
```javascript
/**
 * 处理用户登录成功后的状态同步
 * @param {Object} userData - 用户数据
 */
const handleAuthSuccess = (userData) => {
  // 立即更新用户信息
  userInfo.value = userData.user

  // 同步积分状态
  pointsStatus.isLoggedIn = true

  // 延迟更新积分数据，确保状态已同步
  setTimeout(() => {
    updatePointsStatus()
  }, 100)
}
```

## 6. 性能优化

### 6.1 组件优化
- 使用 `v-show` 而非 `v-if` 处理频繁切换的元素
- 合理使用 `computed` 缓存计算结果
- 避免在模板中使用复杂的表达式
- 使用 `defineAsyncComponent` 懒加载大型组件

### 6.2 资源优化
- 图片使用适当的格式和尺寸
- CSS 使用变量减少重复代码
- JavaScript 模块按需导入
- 避免不必要的依赖

## 7. 错误处理与调试

### 7.1 错误处理策略
```javascript
// API 调用错误处理
const loadUserData = async () => {
  try {
    loading.value = true
    const response = await userApi.getUserInfo()

    if (response.success) {
      userInfo.value = response.data
    } else {
      Toast.fail(response.message || '获取用户信息失败')
    }
  } catch (error) {
    console.error('获取用户信息失败:', error)
    Toast.fail('网络错误，请稍后重试')
  } finally {
    loading.value = false
  }
}
```

### 7.2 调试信息
- 使用有意义的 console.log 输出
- 包含 emoji 标识符便于快速定位
- 记录关键状态变化和API调用

```javascript
console.log('🔄 更新积分状态，当前登录状态:', isLoggedIn.value)
console.log('✅ 积分状态更新成功:', newStatus)
console.log('❌ 未登录，设置默认积分状态')
```

## 8. 安全性考虑

### 8.1 认证与授权
- 所有敏感操作都需要登录验证
- Token 存储在 localStorage 中
- 页面刷新时自动恢复登录状态
- 未登录时拦截需要权限的操作

### 8.2 数据验证
- 前端进行基础数据验证
- 后端进行完整的数据验证
- 用户输入进行适当的转义和过滤

## 9. 测试策略

### 9.1 组件测试
- 每个组件都应有对应的测试用例
- 测试组件的渲染、交互和状态变化
- 使用 Vue Test Utils 进行单元测试

### 9.2 集成测试
- 测试组件间的交互
- 测试路由跳转和状态同步
- 测试API调用和错误处理

## 10. 部署与维护

### 10.1 构建优化
- 使用 Vite 进行快速构建
- 启用代码分割和懒加载
- 压缩和优化静态资源

### 10.2 版本管理
- 使用语义化版本号
- 维护详细的更新日志
- 向后兼容性考虑

---

**注意：** 本文档是活文档，随着项目发展会持续更新。所有开发人员都应遵循这些原则，确保代码质量和用户体验的一致性。
