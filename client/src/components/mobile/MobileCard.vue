<template>
  <div
    class="mobile-card"
    :class="{
      'mobile-card--clickable': clickable,
      'mobile-card--inset': inset
    }"
    @click="handleClick"
  >
    <!-- 卡片头部 -->
    <div v-if="title || $slots.header" class="mobile-card-header">
      <div v-if="title" class="mobile-card-title">
        <van-icon
          v-if="icon"
          :name="icon"
          :size="iconSize"
          :color="iconColor"
          class="mobile-card-icon"
        />
        <span>{{ title }}</span>
      </div>
      <slot name="header" />
    </div>

    <!-- 卡片内容 -->
    <div class="mobile-card-content">
      <slot />
    </div>

    <!-- 卡片底部 -->
    <div v-if="$slots.footer" class="mobile-card-footer">
      <slot name="footer" />
    </div>

    <!-- 右箭头（可点击时显示） -->
    <van-icon
      v-if="clickable && showArrow"
      name="arrow"
      size="16"
      color="var(--van-text-color-3, #c8c9cc)"
      class="mobile-card-arrow"
    />
  </div>
</template>

<script setup>
// Props
const props = defineProps({
  title: {
    type: String,
    default: ''
  },
  icon: {
    type: String,
    default: ''
  },
  iconSize: {
    type: [String, Number],
    default: 16
  },
  iconColor: {
    type: String,
    default: 'var(--van-primary-color, #1989fa)'
  },
  clickable: {
    type: Boolean,
    default: false
  },
  showArrow: {
    type: Boolean,
    default: true
  },
  inset: {
    type: Boolean,
    default: false
  }
})

// Events
const emit = defineEmits(['click'])

// Methods
const handleClick = () => {
  if (props.clickable) {
    emit('click')
  }
}
</script>

<style scoped>
.mobile-card {
  /* 毛玻璃效果 - 降低透明度 */
  background: rgba(15, 15, 30, 0.6);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(30, 30, 60, 0.3);
  border-radius: 16px;
  margin-bottom: 16px;
  position: relative;
  overflow: hidden;
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.2),
    0 4px 16px rgba(0, 0, 0, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.mobile-card--inset {
  margin: 0 16px 16px 16px;
}

.mobile-card:hover {
  transform: translateY(-2px);
  box-shadow:
    0 12px 40px rgba(0, 0, 0, 0.3),
    0 6px 20px rgba(0, 0, 0, 0.15),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
}

.mobile-card--clickable {
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.mobile-card--clickable:active {
  transform: translateY(0);
  background: rgba(255, 255, 255, 0.12); /* Reduced from 0.25 */
}

.mobile-card-header {
  padding: 20px 20px 0 20px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%);
}

.mobile-card-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 17px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.95);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.mobile-card-icon {
  flex-shrink: 0;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1));
}

.mobile-card-content {
  padding: 20px;
  color: rgba(255, 255, 255, 0.9);
}

.mobile-card-footer {
  padding: 0 20px 20px 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  margin-top: 16px;
  padding-top: 16px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%);
}

.mobile-card-arrow {
  position: absolute;
  right: 20px;
  top: 50%;
  transform: translateY(-50%);
  color: rgba(255, 255, 255, 0.6);
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1));
}

/* 当有标题时，调整箭头位置 */
.mobile-card-header + .mobile-card-content ~ .mobile-card-arrow {
  top: 40px;
}

/* 移动端优化 */
@media (max-width: 768px) {
  .mobile-card-header,
  .mobile-card-content {
    padding: 16px;
  }

  .mobile-card-footer {
    padding: 0 16px 16px 16px;
  }

  .mobile-card--inset {
    margin: 0 12px 12px 12px;
  }

  .mobile-card-arrow {
    right: 16px;
  }
}

/* 深色主题适配 */
@media (prefers-color-scheme: dark) {
  .mobile-card {
    background: rgba(10, 10, 20, 0.6);
    border: 1px solid rgba(30, 30, 60, 0.2);
  }

  .mobile-card:hover {
    background: rgba(15, 15, 30, 0.7);
  }

  .mobile-card--clickable:active {
    background: rgba(20, 20, 40, 0.8);
  }

  .mobile-card-header {
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%);
  }

  .mobile-card-footer {
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.02) 0%, rgba(255, 255, 255, 0.01) 100%);
  }
}
</style>


